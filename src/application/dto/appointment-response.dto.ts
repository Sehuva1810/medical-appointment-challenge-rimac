import { ApiProperty } from '@nestjs/swagger';
import { Appointment } from '@domain/entities/appointment.entity';

/**
 * DTO de respuesta para una cita individual
 */
export class AppointmentResponseDto {
  @ApiProperty({
    description: 'UUID de la cita',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  appointmentId!: string;

  @ApiProperty({
    description: 'ID del asegurado',
    example: '00001',
  })
  insuredId!: string;

  @ApiProperty({
    description: 'ID del horario',
    example: 100,
  })
  scheduleId!: number;

  @ApiProperty({
    description: 'Código ISO del país',
    example: 'PE',
    enum: ['PE', 'CL'],
  })
  countryISO!: string;

  @ApiProperty({
    description: 'Estado de la cita',
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  })
  status!: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-10-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-10-15T10:31:00.000Z',
  })
  updatedAt!: string;

  /**
   * Factory method para crear desde la entidad de dominio
   */
  static fromEntity(appointment: Appointment): AppointmentResponseDto {
    const dto = new AppointmentResponseDto();
    dto.appointmentId = appointment.id;
    dto.insuredId = appointment.insuredId.value;
    dto.scheduleId = appointment.scheduleId;
    dto.countryISO = appointment.countryISO.value;
    dto.status = appointment.status.value;
    dto.createdAt = appointment.createdAt.toISOString();
    dto.updatedAt = appointment.updatedAt.toISOString();
    return dto;
  }
}

/**
 * DTO de respuesta para listado de citas
 */
export class GetAppointmentsResponseDto {
  @ApiProperty({
    description: 'Lista de citas',
    type: [AppointmentResponseDto],
  })
  appointments!: AppointmentResponseDto[];

  @ApiProperty({
    description: 'Total de citas encontradas',
    example: 5,
  })
  total!: number;

  /**
   * Factory method para crear desde lista de entidades
   */
  static fromEntities(appointments: Appointment[]): GetAppointmentsResponseDto {
    const dto = new GetAppointmentsResponseDto();
    dto.appointments = appointments.map(AppointmentResponseDto.fromEntity);
    dto.total = appointments.length;
    return dto;
  }
}
