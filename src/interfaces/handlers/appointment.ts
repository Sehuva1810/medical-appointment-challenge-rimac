// Cargar variables de entorno desde archivo .env (para desarrollo local)
import * as dotenv from 'dotenv';
dotenv.config();

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  SQSEvent,
  SQSHandler,
} from 'aws-lambda';
import { CreateAppointmentUseCase } from '../../application/use-cases/CreateAppointmentUseCase';
import { GetAppointmentsByInsuredIdUseCase } from '../../application/use-cases/GetAppointmentsByInsuredIdUseCase';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/ConfirmAppointmentUseCase';
import { DynamoDBAppointmentRepository } from '../../infrastructure/persistence/DynamoDBAppointmentRepository';
import { SNSMessagePublisher } from '../../infrastructure/messaging/SNSMessagePublisher';
import { ValidationError } from '../../shared/errors/ValidationError';
import { CreateAppointmentDTO } from '../../application/dtos/AppointmentDTO';
import { ConfirmationEvent } from '../../domain/repositories/IEventPublisher';

// Inyección de dependencias - usa servicios reales de AWS
// Para pruebas locales, usar Docker con LocalStack
const appointmentRepository = new DynamoDBAppointmentRepository();
const messagePublisher = new SNSMessagePublisher();

const createAppointmentUseCase = new CreateAppointmentUseCase(
  appointmentRepository,
  messagePublisher
);

const getAppointmentsUseCase = new GetAppointmentsByInsuredIdUseCase(
  appointmentRepository
);

const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
  appointmentRepository
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Error:', error);

  if (error instanceof ValidationError) {
    return createResponse(error.statusCode, {
      error: 'Validation Error',
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }

  return createResponse(500, {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}

/**
 * POST /appointments
 * Crea una nueva solicitud de cita médica
 */
export async function createHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    console.log('Received create appointment request:', event.body);

    if (!event.body) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Request body is required',
      });
    }

    const dto: CreateAppointmentDTO = JSON.parse(event.body);

    // Validar campos requeridos
    if (!dto.insuredId || dto.scheduleId === undefined || !dto.countryISO) {
      return createResponse(400, {
        error: 'Bad Request',
        message:
          'Missing required fields: insuredId, scheduleId, and countryISO are required',
      });
    }

    const result = await createAppointmentUseCase.execute(dto);

    return createResponse(202, result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /appointments/{insuredId}
 * Obtiene todas las citas de un asegurado específico
 */
export async function getByInsuredIdHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const insuredId = event.pathParameters?.insuredId;

    console.log('Received get appointments request for insuredId:', insuredId);

    if (!insuredId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'insuredId path parameter is required',
      });
    }

    const result = await getAppointmentsUseCase.execute(insuredId);

    return createResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Interfaz para la estructura del mensaje de EventBridge
 */
interface EventBridgeMessage {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: ConfirmationEvent;
}

/**
 * Handler SQS - Paso 6
 * Lee eventos de confirmación desde SQS y actualiza el estado de la cita a completado en DynamoDB
 * Se activa mediante la cola SQS que recibe eventos de EventBridge
 */
export const confirmationHandler: SQSHandler = async (
  event: SQSEvent,
  _context: Context
): Promise<void> => {
  console.log('Confirmation Handler - Received events:', JSON.stringify(event));

  for (const record of event.Records) {
    try {
      console.log('Processing confirmation message:', record.body);

      // El mensaje de EventBridge viene envuelto en un envelope
      const eventBridgeMessage: EventBridgeMessage = JSON.parse(record.body);
      const confirmationEvent = eventBridgeMessage.detail;

      if (!confirmationEvent || !confirmationEvent.appointmentId) {
        console.error('Invalid confirmation event:', record.body);
        continue;
      }

      await confirmAppointmentUseCase.execute(confirmationEvent);

      console.log(
        `Successfully confirmed appointment: ${confirmationEvent.appointmentId}`
      );
    } catch (error) {
      console.error('Error processing confirmation message:', error);
      throw error; // Re-lanzar para activar el retry de SQS
    }
  }
};
