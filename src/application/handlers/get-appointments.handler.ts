import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetAppointmentsByInsuredIdQuery } from '@application/queries/get-appointments.query';
import { Appointment } from '@domain/entities/appointment.entity';
import { InsuredId } from '@domain/value-objects/insured-id.vo';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '@domain/repositories/appointment.repository.interface';

/**
 * Handler: Obtener Citas por Asegurado
 *
 * Implementa el patrón Query Handler de CQRS.
 * Ejecuta consultas de solo lectura contra DynamoDB.
 */
@QueryHandler(GetAppointmentsByInsuredIdQuery)
export class GetAppointmentsByInsuredIdHandler
  implements IQueryHandler<GetAppointmentsByInsuredIdQuery, Appointment[]>
{
  private readonly logger = new Logger(GetAppointmentsByInsuredIdHandler.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  /**
   * Ejecuta la consulta de citas
   */
  async execute(query: GetAppointmentsByInsuredIdQuery): Promise<Appointment[]> {
    this.logger.log(`Consultando citas para asegurado: ${query.insuredId}`);

    // Validar formato del insuredId
    InsuredId.create(query.insuredId);

    // Buscar citas en DynamoDB
    const appointments = await this.appointmentRepository.findByInsuredId(query.insuredId);

    this.logger.log(`Encontradas ${appointments.length} citas para ${query.insuredId}`);

    return appointments;
  }
}
