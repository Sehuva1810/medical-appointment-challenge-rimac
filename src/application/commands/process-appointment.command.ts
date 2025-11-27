import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Procesar Cita por País
 *
 * Se ejecuta cuando el Lambda del país recibe un mensaje del SQS.
 * Flujo:
 * 1. Recibe mensaje del SQS (PE o CL)
 * 2. Guarda la cita en MySQL del país correspondiente
 * 3. Publica evento en EventBridge para confirmación
 */
export class ProcessAppointmentCommand implements ICommand {
  constructor(
    public readonly appointmentId: string,
    public readonly insuredId: string,
    public readonly scheduleId: number,
    public readonly countryISO: string,
  ) {}
}
