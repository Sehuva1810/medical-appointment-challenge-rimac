import { IMySQLAppointmentRepository } from '../../domain/repositories/IMySQLAppointmentRepository';
import { IEventPublisher } from '../../domain/repositories/IEventPublisher';
import { AppointmentMessage } from '../../domain/repositories/IMessagePublisher';

export class ProcessAppointmentUseCase {
  constructor(
    private readonly mysqlRepository: IMySQLAppointmentRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly countryISO: string
  ) {}

  async execute(message: AppointmentMessage): Promise<void> {
    const now = new Date();

    // Paso 4: Guardar en MySQL (RDS) para el país correspondiente
    await this.mysqlRepository.save({
      appointmentId: message.appointmentId,
      insuredId: message.insuredId,
      scheduleId: message.scheduleId,
      countryISO: message.countryISO,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });

    // Paso 5: Publicar evento de confirmación a EventBridge
    await this.eventPublisher.publishConfirmation({
      appointmentId: message.appointmentId,
      insuredId: message.insuredId,
      countryISO: message.countryISO,
      processedAt: now.toISOString(),
    });

    console.log(
      `[${this.countryISO}] Appointment ${message.appointmentId} processed successfully`
    );
  }
}
