export interface AppointmentRecord {
  id?: number;
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMySQLAppointmentRepository {
  save(record: AppointmentRecord): Promise<void>;
  findByAppointmentId(appointmentId: string): Promise<AppointmentRecord | null>;
}
