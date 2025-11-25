import { Appointment } from '../entities/Appointment';

export interface IAppointmentRepository {
  save(appointment: Appointment): Promise<void>;
  findById(appointmentId: string): Promise<Appointment | null>;
  findByInsuredId(insuredId: string): Promise<Appointment[]>;
  updateStatus(appointmentId: string, status: string): Promise<void>;
}
