import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Obtener Cita por ID
 *
 * Implementa el patrón Query de CQRS.
 * Permite obtener una cita específica por su UUID.
 */
export class GetAppointmentByIdQuery implements IQuery {
  constructor(public readonly appointmentId: string) {}
}
