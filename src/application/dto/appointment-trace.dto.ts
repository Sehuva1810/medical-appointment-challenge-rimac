import { ApiProperty } from '@nestjs/swagger';

/**
 * Representa un paso individual en el flujo de la cita
 */
export class FlowStepDto {
  @ApiProperty({
    description: 'Número del paso',
    example: 1,
  })
  step!: number;

  @ApiProperty({
    description: 'Nombre del componente',
    example: 'DynamoDB',
  })
  component!: string;

  @ApiProperty({
    description: 'Acción realizada',
    example: 'Cita guardada con status pending',
  })
  action!: string;

  @ApiProperty({
    description: 'Estado del paso',
    enum: ['completed', 'pending', 'in_progress', 'failed'],
    example: 'completed',
  })
  status!: 'completed' | 'pending' | 'in_progress' | 'failed';

  @ApiProperty({
    description: 'Timestamp del paso',
    example: '2024-10-15T10:30:00.000Z',
    required: false,
  })
  timestamp?: string;

  @ApiProperty({
    description: 'Datos adicionales del paso',
    required: false,
  })
  details?: Record<string, unknown>;
}

/**
 * DTO de respuesta para el tracing completo de una cita
 */
export class AppointmentTraceResponseDto {
  @ApiProperty({
    description: 'ID de la cita',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  appointmentId!: string;

  @ApiProperty({
    description: 'ID del asegurado',
    example: '00001',
  })
  insuredId!: string;

  @ApiProperty({
    description: 'País de la cita',
    example: 'PE',
  })
  countryISO!: string;

  @ApiProperty({
    description: 'Estado actual de la cita',
    example: 'completed',
  })
  currentStatus!: string;

  @ApiProperty({
    description: 'Pasos del flujo',
    type: [FlowStepDto],
  })
  flowSteps!: FlowStepDto[];

  @ApiProperty({
    description: 'Porcentaje de completitud del flujo',
    example: 100,
  })
  completionPercentage!: number;

  @ApiProperty({
    description: 'Mensaje descriptivo del estado actual',
    example: 'Cita procesada exitosamente',
  })
  summary!: string;
}
