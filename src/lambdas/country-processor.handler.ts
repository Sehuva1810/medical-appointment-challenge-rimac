import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { CommandBus } from '@nestjs/cqrs';
import { AppModule } from '../app.module';
import { ProcessAppointmentCommand } from '@application/commands/process-appointment.command';

/**
 * Lambda Handler: Country Processor
 *
 * Procesa mensajes del SQS del país correspondiente (PE o CL).
 * Se despliega como dos Lambdas separadas, una por país.
 *
 * Flujo:
 * 1. Recibe mensaje de SQS (filtrado por SNS según countryISO)
 * 2. Parsea el mensaje de cita
 * 3. Ejecuta ProcessAppointmentCommand
 * 4. El comando guarda en MySQL y publica en EventBridge
 *
 * Variables de entorno requeridas:
 * - COUNTRY_ISO: PE o CL (configurado en el despliegue)
 */

let appContext: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | null = null;

/**
 * Inicializa el contexto de NestJS (singleton para reusar en warm starts)
 */
async function getAppContext() {
  if (!appContext) {
    appContext = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
  }
  return appContext;
}

/**
 * Parsea el mensaje del SQS
 * El mensaje puede venir directamente de SNS (wrapped) o como JSON directo
 */
function parseMessage(record: SQSRecord): {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
} {
  const body = JSON.parse(record.body);

  // Si viene de SNS, el mensaje real está en 'Message'
  if (body.Message) {
    return JSON.parse(body.Message);
  }

  return body;
}

/**
 * Handler principal del Lambda
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const logger = new Logger('CountryProcessor');
  const countryISO = process.env.COUNTRY_ISO || 'UNKNOWN';

  logger.log(`Procesando ${event.Records.length} mensajes para ${countryISO}`);

  const app = await getAppContext();
  const commandBus = app.get(CommandBus);

  const results = await Promise.allSettled(
    event.Records.map(async record => {
      try {
        const message = parseMessage(record);

        logger.log(
          `Procesando cita ${message.appointmentId} - Asegurado: ${message.insuredId}`,
        );

        const command = new ProcessAppointmentCommand(
          message.appointmentId,
          message.insuredId,
          message.scheduleId,
          message.countryISO,
        );

        await commandBus.execute(command);

        logger.log(`Cita ${message.appointmentId} procesada exitosamente`);
      } catch (error) {
        logger.error(
          `Error procesando mensaje: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error; // Re-throw para que el mensaje vuelva a la cola
      }
    }),
  );

  // Contar resultados
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.log(`Procesamiento completado - Exitosos: ${successful}, Fallidos: ${failed}`);

  // Si hay errores, lanzar excepción para que SQS reintente
  if (failed > 0) {
    throw new Error(`${failed} mensajes fallaron el procesamiento`);
  }
};
