import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateAppointmentCommand } from '@application/commands/create-appointment.command';
import { Appointment } from '@domain/entities/appointment.entity';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '@domain/repositories/appointment.repository.interface';
import {
  IMessagePublisher,
  MESSAGE_PUBLISHER,
} from '@domain/repositories/message-publisher.interface';

export interface CreateAppointmentResult {
  appointmentId: string;
  message: string;
}

/**
 * Crea cita en DynamoDB y publica a SNS para procesamiento async
 */
@CommandHandler(CreateAppointmentCommand)
export class CreateAppointmentHandler
  implements ICommandHandler<CreateAppointmentCommand, CreateAppointmentResult>
{
  private readonly logger = new Logger(CreateAppointmentHandler.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<CreateAppointmentResult> {
    this.logger.log(
      `Procesando creación de cita - InsuredId: ${command.insuredId}, Country: ${command.countryISO}`,
    );

    const appointment = Appointment.create({
      insuredId: command.insuredId,
      scheduleId: command.scheduleId,
      countryISO: command.countryISO,
    });

    this.logger.debug(`Cita creada con ID: ${appointment.id}`);

    await this.appointmentRepository.save(appointment);
    this.logger.debug(`Cita guardada en DynamoDB`);

    // Publicar a SNS para que SQS del país lo procese
    await this.messagePublisher.publish({
      appointmentId: appointment.id,
      insuredId: appointment.insuredId.value,
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO.value,
      status: appointment.status.value,
      createdAt: appointment.createdAt.toISOString(),
    });
    this.logger.debug(`Mensaje publicado en SNS`);

    this.logger.log(
      `Cita ${appointment.id} creada exitosamente, pendiente de procesamiento`,
    );

    return {
      appointmentId: appointment.id,
      message: 'Appointment scheduling is in process',
    };
  }
}
