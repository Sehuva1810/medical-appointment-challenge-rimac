import { v4 as uuidv4 } from 'uuid';
import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { IMessagePublisher } from '../../domain/repositories/IMessagePublisher';
import {
  CreateAppointmentDTO,
  CreateAppointmentResponseDTO,
} from '../dtos/AppointmentDTO';

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly messagePublisher: IMessagePublisher
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<CreateAppointmentResponseDTO> {
    // Generar ID único para la cita
    const appointmentId = uuidv4();

    // Crear entidad de dominio (valida reglas de negocio mediante Value Objects)
    const appointment = Appointment.create({
      appointmentId,
      insuredId: dto.insuredId,
      scheduleId: dto.scheduleId,
      countryISO: dto.countryISO,
    });

    // Paso 1: Guardar en DynamoDB con estado pendiente
    await this.appointmentRepository.save(appointment);

    // Paso 2: Publicar a SNS para procesamiento específico por país
    await this.messagePublisher.publish({
      appointmentId: appointment.appointmentId,
      insuredId: appointment.insuredId.value,
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO.value,
    });

    return {
      message: 'Appointment scheduling is in process',
      appointmentId: appointment.appointmentId,
    };
  }
}
