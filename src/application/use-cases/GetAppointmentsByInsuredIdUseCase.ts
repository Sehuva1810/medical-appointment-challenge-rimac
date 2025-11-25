import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { InsuredId } from '../../domain/value-objects/InsuredId';
import {
  AppointmentResponseDTO,
  GetAppointmentsResponseDTO,
} from '../dtos/AppointmentDTO';

export class GetAppointmentsByInsuredIdUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(insuredIdValue: string): Promise<GetAppointmentsResponseDTO> {
    // Validar insuredId mediante Value Object
    const insuredId = InsuredId.create(insuredIdValue);

    // Obtener citas del repositorio
    const appointments = await this.appointmentRepository.findByInsuredId(
      insuredId.value
    );

    // Mapear a DTOs de respuesta
    const appointmentDTOs: AppointmentResponseDTO[] = appointments.map(
      (appointment) => ({
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId.value,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO.value,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      })
    );

    return {
      appointments: appointmentDTOs,
      total: appointmentDTOs.length,
    };
  }
}
