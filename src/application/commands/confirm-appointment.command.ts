import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Confirmar Cita
 *
 * Se ejecuta cuando el Lambda de confirmación recibe el evento de EventBridge.
 * Actualiza el estado en DynamoDB a "completed".
 */
export class ConfirmAppointmentCommand implements ICommand {
  constructor(
    public readonly appointmentId: string,
    public readonly insuredId: string,
    public readonly scheduleId: number,
    public readonly countryISO: string,
  ) {}
}
