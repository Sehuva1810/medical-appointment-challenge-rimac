import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfirmAppointmentCommand } from '@application/commands/confirm-appointment.command';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '@domain/repositories/appointment.repository.interface';

/**
 * Handler: Confirmar Cita
 *
 * Se ejecuta cuando el Lambda de confirmación recibe el evento de EventBridge.
 * Este handler finaliza el ciclo de vida de la cita.
 *
 * Flujo:
 * 1. Recibe evento AppointmentCompleted desde EventBridge
 * 2. Actualiza el estado en DynamoDB a "completed"
 *
 * Este es el paso final del flujo de 6 pasos:
 * POST -> DynamoDB(pending) -> SNS -> SQS -> MySQL -> EventBridge -> DynamoDB(completed)
 */
@CommandHandler(ConfirmAppointmentCommand)
export class ConfirmAppointmentHandler
  implements ICommandHandler<ConfirmAppointmentCommand, void>
{
  private readonly logger = new Logger(ConfirmAppointmentHandler.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  /**
   * Ejecuta la confirmación de la cita
   */
  async execute(command: ConfirmAppointmentCommand): Promise<void> {
    this.logger.log(
      `Confirmando cita ${command.appointmentId} desde país ${command.countryISO}`,
    );

    // Actualizar estado a "completed" en DynamoDB
    await this.appointmentRepository.updateStatus(command.appointmentId, 'completed');

    this.logger.log(
      `Cita ${command.appointmentId} confirmada exitosamente - Status: completed`,
    );
  }
}
