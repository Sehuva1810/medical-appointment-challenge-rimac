import { v4 as uuidv4 } from 'uuid';
import { IDomainEvent } from '@shared/interfaces/base.interface';

/**
 * Clase base abstracta para eventos de dominio
 * Implementa el patrón Domain Events de DDD
 */
abstract class BaseDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public abstract readonly eventType: string;
  public readonly aggregateId: string;
  public readonly payload: Record<string, unknown>;

  constructor(aggregateId: string, payload: Record<string, unknown>) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
    this.payload = payload;
  }

  /**
   * Serializa el evento para publicación en EventBridge
   */
  toEventBridgeFormat(): Record<string, unknown> {
    return {
      Source: 'medical-appointments',
      DetailType: this.eventType,
      Detail: JSON.stringify({
        eventId: this.eventId,
        occurredOn: this.occurredOn.toISOString(),
        aggregateId: this.aggregateId,
        ...this.payload,
      }),
    };
  }
}

/**
 * Evento: Cita Creada
 * Se emite cuando se crea una nueva cita en DynamoDB
 */
export class AppointmentCreatedEvent extends BaseDomainEvent {
  public readonly eventType = 'appointment.created';

  constructor(
    appointmentId: string,
    insuredId: string,
    scheduleId: number,
    countryISO: string,
  ) {
    super(appointmentId, {
      insuredId,
      scheduleId,
      countryISO,
      status: 'pending',
    });
  }
}

/**
 * Evento: Cita en Procesamiento
 * Se emite cuando el Lambda del país comienza a procesar la cita
 */
export class AppointmentProcessingEvent extends BaseDomainEvent {
  public readonly eventType = 'appointment.processing';

  constructor(appointmentId: string, countryISO: string) {
    super(appointmentId, {
      countryISO,
      status: 'processing',
    });
  }
}

/**
 * Evento: Cita Completada
 * Se emite cuando la cita se guarda exitosamente en MySQL
 * Este evento dispara la actualización de DynamoDB a "completed"
 */
export class AppointmentCompletedEvent extends BaseDomainEvent {
  public readonly eventType = 'appointment.completed';

  constructor(
    appointmentId: string,
    insuredId: string,
    scheduleId: number,
    countryISO: string,
  ) {
    super(appointmentId, {
      insuredId,
      scheduleId,
      countryISO,
      status: 'completed',
    });
  }
}

/**
 * Evento: Cita Fallida
 * Se emite cuando ocurre un error durante el procesamiento
 */
export class AppointmentFailedEvent extends BaseDomainEvent {
  public readonly eventType = 'appointment.failed';

  constructor(
    appointmentId: string,
    countryISO: string,
    errorMessage: string,
  ) {
    super(appointmentId, {
      countryISO,
      status: 'failed',
      error: errorMessage,
    });
  }
}

/**
 * Evento: Cita Cancelada
 * Se emite cuando una cita es cancelada
 */
export class AppointmentCancelledEvent extends BaseDomainEvent {
  public readonly eventType = 'appointment.cancelled';

  constructor(appointmentId: string, reason: string) {
    super(appointmentId, {
      status: 'cancelled',
      reason,
    });
  }
}
