import { v4 as uuidv4 } from 'uuid';
import { IEntity } from '@shared/interfaces/base.interface';
import { InsuredId } from '@domain/value-objects/insured-id.vo';
import { CountryISO } from '@domain/value-objects/country-iso.vo';
import { AppointmentStatus, AppointmentStatusEnum } from '@domain/value-objects/appointment-status.vo';
import { ValidationException } from '@domain/exceptions/domain.exception';

export interface CreateAppointmentProps {
  insuredId: string;
  scheduleId: number;
  countryISO: string;
}

export interface AppointmentProps {
  id: string;
  insuredId: InsuredId;
  scheduleId: number;
  countryISO: CountryISO;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate Root para citas médicas.
 *
 * Estados: PENDING -> PROCESSING -> COMPLETED/FAILED
 */
export class Appointment implements IEntity<string> {
  private readonly _id: string;
  private readonly _insuredId: InsuredId;
  private readonly _scheduleId: number;
  private readonly _countryISO: CountryISO;
  private _status: AppointmentStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AppointmentProps) {
    this._id = props.id;
    this._insuredId = props.insuredId;
    this._scheduleId = props.scheduleId;
    this._countryISO = props.countryISO;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /** Crea una nueva cita con validaciones */
  public static create(props: CreateAppointmentProps): Appointment {
    // Validar scheduleId
    if (!props.scheduleId || props.scheduleId <= 0) {
      throw new ValidationException(
        'El ID de horario debe ser un número positivo',
        'scheduleId',
        ['positive_number'],
      );
    }

    const now = new Date();

    return new Appointment({
      id: uuidv4(),
      insuredId: InsuredId.create(props.insuredId),
      scheduleId: props.scheduleId,
      countryISO: CountryISO.create(props.countryISO),
      status: AppointmentStatus.pending(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye desde DB (sin validar, datos ya son confiables) */
  public static fromPersistence(data: {
    id: string;
    insuredId: string;
    scheduleId: number;
    countryISO: string;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): Appointment {
    return new Appointment({
      id: data.id,
      insuredId: InsuredId.fromPersistence(data.insuredId),
      scheduleId: data.scheduleId,
      countryISO: CountryISO.fromPersistence(data.countryISO),
      status: AppointmentStatus.fromString(data.status),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get insuredId(): InsuredId {
    return this._insuredId;
  }

  get scheduleId(): number {
    return this._scheduleId;
  }

  get countryISO(): CountryISO {
    return this._countryISO;
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Transiciones de estado
  public markAsProcessing(): void {
    this._status = this._status.transitionTo(AppointmentStatusEnum.PROCESSING);
    this._updatedAt = new Date();
  }

  public markAsCompleted(): void {
    this._status = this._status.transitionTo(AppointmentStatusEnum.COMPLETED);
    this._updatedAt = new Date();
  }

  public markAsFailed(): void {
    this._status = this._status.transitionTo(AppointmentStatusEnum.FAILED);
    this._updatedAt = new Date();
  }

  public cancel(): void {
    this._status = this._status.transitionTo(AppointmentStatusEnum.CANCELLED);
    this._updatedAt = new Date();
  }

  public retry(): void {
    this._status = this._status.transitionTo(AppointmentStatusEnum.PENDING);
    this._updatedAt = new Date();
  }

  equals(entity: IEntity<string>): boolean {
    if (!entity) return false;
    return this._id === entity.id;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      insuredId: this._insuredId.value,
      scheduleId: this._scheduleId,
      countryISO: this._countryISO.value,
      status: this._status.value,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  toDTO(): Record<string, unknown> {
    return {
      appointmentId: this._id,
      insuredId: this._insuredId.value,
      scheduleId: this._scheduleId,
      countryISO: this._countryISO.value,
      status: this._status.value,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  toString(): string {
    return `Appointment[${this._id}] - Insured: ${this._insuredId.value}, Country: ${this._countryISO.value}, Status: ${this._status.value}`;
  }
}
