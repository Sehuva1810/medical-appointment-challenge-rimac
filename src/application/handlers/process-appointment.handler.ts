import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ProcessAppointmentCommand } from '@application/commands/process-appointment.command';
import { Appointment } from '@domain/entities/appointment.entity';
import { MYSQL_APPOINTMENT_REPOSITORY } from '@domain/repositories/mysql-appointment.repository.interface';
import { MySQLRepositoryFactory } from '@infrastructure/persistence/mysql-appointment.repository';
import {
  IEventPublisher,
  EVENT_PUBLISHER,
} from '@domain/repositories/event-publisher.interface';
import { AppointmentCompletedEvent } from '@domain/events/appointment.events';
import { CountryCode } from '@domain/value-objects/country-iso.vo';

/**
 * Handler: Procesar Cita por País
 *
 * Se ejecuta cuando el Lambda del país recibe un mensaje del SQS.
 * Este handler procesa citas específicas de un país (PE o CL).
 *
 * Flujo:
 * 1. Reconstruye la entidad desde el mensaje SQS
 * 2. Guarda la cita en MySQL del país correspondiente
 * 3. Publica evento AppointmentCompleted en EventBridge
 *
 * El evento publicado será capturado por el Lambda de confirmación
 * que actualizará el estado en DynamoDB a "completed".
 */
@CommandHandler(ProcessAppointmentCommand)
export class ProcessAppointmentHandler
  implements ICommandHandler<ProcessAppointmentCommand, void>
{
  private readonly logger = new Logger(ProcessAppointmentHandler.name);

  constructor(
    @Inject(MYSQL_APPOINTMENT_REPOSITORY)
    private readonly mysqlRepositoryFactory: MySQLRepositoryFactory,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  /**
   * Ejecuta el procesamiento de la cita
   */
  async execute(command: ProcessAppointmentCommand): Promise<void> {
    this.logger.log(
      `Procesando cita ${command.appointmentId} para país ${command.countryISO}`,
    );

    // 1. Reconstruir la entidad desde los datos del comando
    const appointment = Appointment.fromPersistence({
      id: command.appointmentId,
      insuredId: command.insuredId,
      scheduleId: command.scheduleId,
      countryISO: command.countryISO,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Obtener el repositorio para el país correspondiente y guardar
    const countryCode =
      command.countryISO === 'PE' ? CountryCode.PERU : CountryCode.CHILE;
    const mysqlRepository = this.mysqlRepositoryFactory.getRepository(countryCode);
    await mysqlRepository.save(appointment);
    this.logger.debug(`Cita guardada en MySQL (${command.countryISO})`);

    // 3. Publicar evento de completado en EventBridge
    const completedEvent = new AppointmentCompletedEvent(
      command.appointmentId,
      command.insuredId,
      command.scheduleId,
      command.countryISO,
    );

    await this.eventPublisher.publish(completedEvent);
    this.logger.debug(`Evento AppointmentCompleted publicado en EventBridge`);

    this.logger.log(
      `Cita ${command.appointmentId} procesada exitosamente en ${command.countryISO}`,
    );
  }
}
