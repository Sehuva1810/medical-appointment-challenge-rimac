import { AppointmentStatus } from '../value-objects/AppointmentStatus';
import { CountryISO } from '../value-objects/CountryISO';
import { InsuredId } from '../value-objects/InsuredId';

export interface AppointmentProps {
  appointmentId: string;
  insuredId: InsuredId;
  scheduleId: number;
  countryISO: CountryISO;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Appointment {
  private readonly props: AppointmentProps;

  private constructor(props: AppointmentProps) {
    this.props = props;
  }

  static create(params: {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: string;
  }): Appointment {
    const insuredIdVO = InsuredId.create(params.insuredId);
    const countryISOVO = CountryISO.create(params.countryISO);
    const now = new Date();

    return new Appointment({
      appointmentId: params.appointmentId,
      insuredId: insuredIdVO,
      scheduleId: params.scheduleId,
      countryISO: countryISOVO,
      status: AppointmentStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  get appointmentId(): string {
    return this.props.appointmentId;
  }

  get insuredId(): InsuredId {
    return this.props.insuredId;
  }

  get scheduleId(): number {
    return this.props.scheduleId;
  }

  get countryISO(): CountryISO {
    return this.props.countryISO;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  markAsCompleted(): void {
    this.props.status = AppointmentStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }

  markAsFailed(): void {
    this.props.status = AppointmentStatus.FAILED;
    this.props.updatedAt = new Date();
  }

  isPending(): boolean {
    return this.props.status === AppointmentStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.props.status === AppointmentStatus.COMPLETED;
  }

  toJSON(): Record<string, unknown> {
    return {
      appointmentId: this.props.appointmentId,
      insuredId: this.props.insuredId.value,
      scheduleId: this.props.scheduleId,
      countryISO: this.props.countryISO.value,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
