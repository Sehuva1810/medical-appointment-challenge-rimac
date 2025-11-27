import { IValueObject } from '@shared/interfaces/base.interface';
import { BusinessRuleViolationException } from '@domain/exceptions/domain.exception';

/**
 * Enum de estados de cita
 * Define el ciclo de vida de una cita médica
 */
export enum AppointmentStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Matriz de transiciones de estado válidas
 * Implementa el patrón State Machine para garantizar transiciones válidas
 */
const VALID_TRANSITIONS: Record<AppointmentStatusEnum, AppointmentStatusEnum[]> = {
  [AppointmentStatusEnum.PENDING]: [
    AppointmentStatusEnum.PROCESSING,
    AppointmentStatusEnum.CANCELLED,
  ],
  [AppointmentStatusEnum.PROCESSING]: [
    AppointmentStatusEnum.COMPLETED,
    AppointmentStatusEnum.FAILED,
  ],
  [AppointmentStatusEnum.COMPLETED]: [],
  [AppointmentStatusEnum.FAILED]: [
    AppointmentStatusEnum.PENDING, // Permite reintentar
  ],
  [AppointmentStatusEnum.CANCELLED]: [],
};

/**
 * Descripción de cada estado para UI/documentación
 */
const STATUS_DESCRIPTIONS: Record<AppointmentStatusEnum, string> = {
  [AppointmentStatusEnum.PENDING]: 'Cita pendiente de procesamiento',
  [AppointmentStatusEnum.PROCESSING]: 'Cita siendo procesada por el sistema',
  [AppointmentStatusEnum.COMPLETED]: 'Cita confirmada exitosamente',
  [AppointmentStatusEnum.FAILED]: 'Error en el procesamiento de la cita',
  [AppointmentStatusEnum.CANCELLED]: 'Cita cancelada por el usuario o sistema',
};

/**
 * Value Object: AppointmentStatus
 *
 * Representa el estado de una cita médica.
 * Implementa el patrón State Machine para validar transiciones de estado.
 *
 * Estados:
 * - PENDING: Cita creada, esperando procesamiento
 * - PROCESSING: Siendo procesada por el Lambda del país
 * - COMPLETED: Guardada en MySQL y confirmada en DynamoDB
 * - FAILED: Error durante el procesamiento
 * - CANCELLED: Cancelada manualmente
 *
 * Diagrama de transiciones:
 * ```
 * PENDING -> PROCESSING -> COMPLETED
 *    |          |
 *    v          v
 * CANCELLED   FAILED -> PENDING (retry)
 * ```
 *
 * @example
 * const status = AppointmentStatus.pending();
 * const newStatus = status.transitionTo(AppointmentStatusEnum.PROCESSING);
 */
export class AppointmentStatus implements IValueObject<AppointmentStatusEnum> {
  private readonly _value: AppointmentStatusEnum;

  /**
   * Constructor privado
   */
  private constructor(value: AppointmentStatusEnum) {
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Factory methods para crear estados específicos
   */
  public static pending(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.PENDING);
  }

  public static processing(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.PROCESSING);
  }

  public static completed(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.COMPLETED);
  }

  public static failed(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.FAILED);
  }

  public static cancelled(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.CANCELLED);
  }

  /**
   * Crea un estado desde un string (para deserialización)
   */
  public static fromString(value: string): AppointmentStatus {
    const status = value as AppointmentStatusEnum;
    if (!Object.values(AppointmentStatusEnum).includes(status)) {
      throw new BusinessRuleViolationException(
        'InvalidStatus',
        `Estado '${value}' no es válido`,
      );
    }
    return new AppointmentStatus(status);
  }

  /**
   * Getter para el valor del estado
   */
  get value(): AppointmentStatusEnum {
    return this._value;
  }

  /**
   * Obtiene la descripción del estado
   */
  get description(): string {
    return STATUS_DESCRIPTIONS[this._value];
  }

  /**
   * Verifica si una transición es válida sin ejecutarla
   */
  canTransitionTo(targetStatus: AppointmentStatusEnum): boolean {
    return VALID_TRANSITIONS[this._value].includes(targetStatus);
  }

  /**
   * Ejecuta una transición de estado
   * @throws BusinessRuleViolationException si la transición no es válida
   */
  transitionTo(targetStatus: AppointmentStatusEnum): AppointmentStatus {
    if (!this.canTransitionTo(targetStatus)) {
      const allowedTransitions = VALID_TRANSITIONS[this._value].join(', ') || 'ninguna';
      throw new BusinessRuleViolationException(
        'InvalidStateTransition',
        `No se puede cambiar de '${this._value}' a '${targetStatus}'. ` +
          `Transiciones permitidas: ${allowedTransitions}`,
      );
    }
    return new AppointmentStatus(targetStatus);
  }

  /**
   * Getters de conveniencia para verificar estado
   */
  isPending(): boolean {
    return this._value === AppointmentStatusEnum.PENDING;
  }

  isProcessing(): boolean {
    return this._value === AppointmentStatusEnum.PROCESSING;
  }

  isCompleted(): boolean {
    return this._value === AppointmentStatusEnum.COMPLETED;
  }

  isFailed(): boolean {
    return this._value === AppointmentStatusEnum.FAILED;
  }

  isCancelled(): boolean {
    return this._value === AppointmentStatusEnum.CANCELLED;
  }

  /**
   * Verifica si el estado es final (no permite más transiciones)
   */
  isFinal(): boolean {
    return VALID_TRANSITIONS[this._value].length === 0;
  }

  /**
   * Compara igualdad por valor
   */
  equals(other: IValueObject<AppointmentStatusEnum>): boolean {
    if (!other) return false;
    return this._value === other.value;
  }

  /**
   * Representación string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Serialización JSON
   */
  toJSON(): string {
    return this._value;
  }
}
