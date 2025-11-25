import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { AppointmentStatus } from '../../domain/value-objects/AppointmentStatus';
import { ConfirmationEvent } from '../../domain/repositories/IEventPublisher';

export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(event: ConfirmationEvent): Promise<void> {
    // Paso 6: Actualizar estado de la cita a completado en DynamoDB
    await this.appointmentRepository.updateStatus(
      event.appointmentId,
      AppointmentStatus.COMPLETED
    );

    console.log(
      `Appointment ${event.appointmentId} confirmed and status updated to completed`
    );
  }
}
