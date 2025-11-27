import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Crear Cita
 *
 * Implementa el patrón Command de CQRS.
 * Los Commands representan intenciones de cambio en el sistema.
 *
 * Este comando inicia el flujo:
 * 1. Crear cita en DynamoDB (status: pending)
 * 2. Publicar mensaje en SNS
 * 3. SNS filtra y envía al SQS del país correspondiente
 */
export class CreateAppointmentCommand implements ICommand {
  constructor(
    public readonly insuredId: string,
    public readonly scheduleId: number,
    public readonly countryISO: string,
  ) {}
}
