// Cargar variables de entorno desde archivo .env (para desarrollo local)
import * as dotenv from 'dotenv';
dotenv.config();

import { SQSEvent, SQSHandler, Context } from 'aws-lambda';
import { ProcessAppointmentUseCase } from '../../application/use-cases/ProcessAppointmentUseCase';
import { MySQLAppointmentRepository } from '../../infrastructure/database/MySQLAppointmentRepository';
import { EventBridgePublisher } from '../../infrastructure/messaging/EventBridgePublisher';
import { AppointmentMessage } from '../../domain/repositories/IMessagePublisher';

// Patrón Factory - crea el procesador apropiado según el país
class AppointmentProcessorFactory {
  static create(countryISO: string): ProcessAppointmentUseCase {
    // Crear repositorio MySQL con configuración específica del país
    const mysqlRepository = new MySQLAppointmentRepository(countryISO);
    const eventPublisher = new EventBridgePublisher();

    return new ProcessAppointmentUseCase(
      mysqlRepository,
      eventPublisher,
      countryISO
    );
  }
}

async function processMessage(
  event: SQSEvent,
  countryISO: string
): Promise<void> {
  const processor = AppointmentProcessorFactory.create(countryISO);

  for (const record of event.Records) {
    try {
      console.log(`[${countryISO}] Processing message:`, record.body);

      const message: AppointmentMessage = JSON.parse(record.body);

      // Validar que el mensaje sea para el país correcto
      if (message.countryISO !== countryISO) {
        console.warn(
          `[${countryISO}] Received message for wrong country: ${message.countryISO}`
        );
        continue;
      }

      await processor.execute(message);

      console.log(
        `[${countryISO}] Successfully processed appointment: ${message.appointmentId}`
      );
    } catch (error) {
      console.error(`[${countryISO}] Error processing message:`, error);
      throw error; // Re-lanzar para activar el retry de SQS
    }
  }
}

/**
 * Handler Lambda para citas de Perú (SQS_PE)
 */
export const peHandler: SQSHandler = async (
  event: SQSEvent,
  _context: Context
): Promise<void> => {
  console.log('PE Handler - Received events:', JSON.stringify(event));
  await processMessage(event, 'PE');
};

/**
 * Handler Lambda para citas de Chile (SQS_CL)
 */
export const clHandler: SQSHandler = async (
  event: SQSEvent,
  _context: Context
): Promise<void> => {
  console.log('CL Handler - Received events:', JSON.stringify(event));
  await processMessage(event, 'CL');
};
