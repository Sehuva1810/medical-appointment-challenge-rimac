import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetAppointmentByIdQuery } from '@application/queries/get-appointment-by-id.query';
import { Appointment } from '@domain/entities/appointment.entity';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '@domain/repositories/appointment.repository.interface';

/**
 * Handler: Obtener Cita por ID
 *
 * Implementa el patrón Query Handler de CQRS.
 * Busca una cita específica por su UUID.
 */
@QueryHandler(GetAppointmentByIdQuery)
export class GetAppointmentByIdHandler
  implements IQueryHandler<GetAppointmentByIdQuery, Appointment>
{
  private readonly logger = new Logger(GetAppointmentByIdHandler.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  /**
   * Ejecuta la consulta de cita por ID
   */
  async execute(query: GetAppointmentByIdQuery): Promise<Appointment> {
    this.logger.log(`Buscando cita con ID: ${query.appointmentId}`);

    const appointment = await this.appointmentRepository.findById(query.appointmentId);

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${query.appointmentId} no encontrada`);
    }

    this.logger.log(`Cita encontrada: ${appointment.id}, status: ${appointment.status.value}`);

    return appointment;
  }
}
