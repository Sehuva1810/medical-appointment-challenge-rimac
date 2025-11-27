import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Matches, Min, IsIn } from 'class-validator';

/**
 * DTO para creación de citas
 * Implementa validación declarativa con class-validator
 */
export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID del asegurado (5 dígitos)',
    example: '00001',
    pattern: '^\\d{5}$',
  })
  @IsString({ message: 'El ID del asegurado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del asegurado es requerido' })
  @Matches(/^\d{5}$/, {
    message: 'El ID del asegurado debe ser exactamente 5 dígitos numéricos',
  })
  insuredId!: string;

  @ApiProperty({
    description: 'ID del horario de la cita',
    example: 100,
    minimum: 1,
  })
  @IsNumber({}, { message: 'El ID del horario debe ser un número' })
  @Min(1, { message: 'El ID del horario debe ser mayor a 0' })
  scheduleId!: number;

  @ApiProperty({
    description: 'Código ISO del país',
    example: 'PE',
    enum: ['PE', 'CL'],
  })
  @IsString({ message: 'El código de país debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de país es requerido' })
  @IsIn(['PE', 'CL'], { message: 'El código de país debe ser PE o CL' })
  countryISO!: string;
}

/**
 * DTO de respuesta para creación de cita
 */
export class CreateAppointmentResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Appointment scheduling is in process',
  })
  message!: string;

  @ApiProperty({
    description: 'UUID de la cita creada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  appointmentId!: string;
}
