import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Obtener Citas por Asegurado
 *
 * Implementa el patrón Query de CQRS.
 * Los Queries son operaciones de solo lectura que no modifican el estado.
 */
export class GetAppointmentsByInsuredIdQuery implements IQuery {
  constructor(public readonly insuredId: string) {}
}
