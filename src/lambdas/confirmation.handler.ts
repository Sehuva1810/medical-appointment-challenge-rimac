import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { CommandBus } from '@nestjs/cqrs';
import { AppModule } from '../app.module';
import { ConfirmAppointmentCommand } from '@application/commands/confirm-appointment.command';

/**
 * Lambda Handler: Confirmation
 *
 * Procesa eventos de confirmación de citas desde EventBridge.
 * El evento llega a través de un SQS que está suscrito a EventBridge.
 *
 * Flujo:
 * 1. EventBridge recibe evento 'appointment.completed'
 * 2. Regla de EventBridge envía a SQS de confirmación
 * 3. Este Lambda procesa el mensaje
 * 4. Actualiza DynamoDB con status 'completed'
 *
 * Este es el paso final del flujo de 6 pasos.
 */

let appContext: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | null = null;

/**
 * Inicializa el contexto de NestJS (singleton)
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
 * Parsea el mensaje del SQS (que viene de EventBridge)
 */
function parseMessage(record: SQSRecord): {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
} {
  const body = JSON.parse(record.body);

  // El evento de EventBridge tiene el detalle en 'detail'
  if (body.detail) {
    return {
      appointmentId: body.detail.aggregateId,
      insuredId: body.detail.insuredId,
      scheduleId: body.detail.scheduleId,
      countryISO: body.detail.countryISO,
    };
  }

  // Fallback para mensajes directos
  return body;
}

/**
 * Handler principal del Lambda de confirmación
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const logger = new Logger('ConfirmationHandler');

  logger.log(`Procesando ${event.Records.length} eventos de confirmación`);

  const app = await getAppContext();
  const commandBus = app.get(CommandBus);

  const results = await Promise.allSettled(
    event.Records.map(async record => {
      try {
        const message = parseMessage(record);

        logger.log(
          `Confirmando cita ${message.appointmentId} - País: ${message.countryISO}`,
        );

        const command = new ConfirmAppointmentCommand(
          message.appointmentId,
          message.insuredId,
          message.scheduleId,
          message.countryISO,
        );

        await commandBus.execute(command);

        logger.log(`Cita ${message.appointmentId} confirmada - Status: completed`);
      } catch (error) {
        logger.error(
          `Error confirmando cita: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    }),
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.log(`Confirmación completada - Exitosos: ${successful}, Fallidos: ${failed}`);

  if (failed > 0) {
    throw new Error(`${failed} confirmaciones fallaron`);
  }
};
