import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateAppointmentCommand } from '@application/commands/create-appointment.command';
import { GetAppointmentsByInsuredIdQuery } from '@application/queries/get-appointments.query';
import {
  CreateAppointmentDto,
  CreateAppointmentResponseDto,
} from '@application/dto/create-appointment.dto';
import {
  AppointmentResponseDto,
  GetAppointmentsResponseDto,
} from '@application/dto/appointment-response.dto';
import {
  AppointmentTraceResponseDto,
  FlowStepDto,
} from '@application/dto/appointment-trace.dto';
import { LoggingInterceptor } from '@presentation/interceptors/logging.interceptor';
import { ApiKeyGuard } from '@presentation/guards/api-key.guard';
import { GetAppointmentByIdQuery } from '@application/queries/get-appointment-by-id.query';

/**
 * Controller: Appointments
 *
 * Expone los endpoints REST para gestión de citas médicas.
 * Implementa validación, documentación Swagger, rate limiting y logging.
 *
 * Endpoints:
 * - POST /appointments - Crear una nueva cita
 * - GET /appointments/:insuredId - Obtener citas de un asegurado
 */
@ApiTags('Appointments')
@Controller('appointments')
@UseInterceptors(LoggingInterceptor)
@UseGuards(ThrottlerGuard)
export class AppointmentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Crea una nueva cita médica
   *
   * El proceso es asíncrono:
   * 1. Se guarda en DynamoDB con status "pending"
   * 2. Se envía a SNS para procesamiento por país
   * 3. El Lambda del país guarda en MySQL
   * 4. EventBridge notifica finalización
   * 5. Se actualiza DynamoDB a "completed"
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Crear cita médica',
    description: 'Crea una nueva cita médica. El proceso es asíncrono.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Cita en proceso de agendamiento',
    type: CreateAppointmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'API Key inválida o no proporcionada',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiadas solicitudes - Rate limit excedido',
  })
  async createAppointment(
    @Body() dto: CreateAppointmentDto,
  ): Promise<CreateAppointmentResponseDto> {
    const command = new CreateAppointmentCommand(
      dto.insuredId,
      dto.scheduleId,
      dto.countryISO,
    );

    const result = await this.commandBus.execute(command);

    return {
      message: result.message,
      appointmentId: result.appointmentId,
    };
  }

  /**
   * Obtiene las citas de un asegurado
   */
  @Get(':insuredId')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Obtener citas por asegurado',
    description: 'Retorna todas las citas de un asegurado específico',
  })
  @ApiParam({
    name: 'insuredId',
    description: 'ID del asegurado (5 dígitos)',
    example: '00001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de citas del asegurado',
    type: GetAppointmentsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID de asegurado inválido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'API Key inválida o no proporcionada',
  })
  async getAppointments(
    @Param('insuredId') insuredId: string,
  ): Promise<GetAppointmentsResponseDto> {
    const query = new GetAppointmentsByInsuredIdQuery(insuredId);
    const appointments = await this.queryBus.execute(query);

    return GetAppointmentsResponseDto.fromEntities(appointments);
  }

  /**
   * Obtiene el tracing completo del flujo de una cita
   * Muestra cada paso del flujo y su estado actual
   */
  @Get(':appointmentId/trace')
  @ApiOperation({
    summary: 'Ver flujo de procesamiento de una cita',
    description: `Muestra el estado de cada paso del flujo asíncrono:

1. **API Gateway** → Recibe la solicitud
2. **DynamoDB** → Guarda cita con status "pending"
3. **SNS** → Publica mensaje para enrutamiento por país
4. **SQS** → Cola específica del país (PE o CL)
5. **Lambda Processor** → Procesa y guarda en MySQL
6. **MySQL** → Base de datos del país
7. **EventBridge** → Emite evento "appointment.completed"
8. **Lambda Confirm** → Actualiza DynamoDB a "completed"

Use este endpoint para verificar en qué paso se encuentra una cita.`,
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'UUID de la cita',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracing del flujo de la cita',
    type: AppointmentTraceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cita no encontrada',
  })
  async getAppointmentTrace(
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentTraceResponseDto> {
    const query = new GetAppointmentByIdQuery(appointmentId);
    const appointment = await this.queryBus.execute(query);

    // Construir los pasos del flujo basándose en el estado actual
    const flowSteps = this.buildFlowSteps(appointment);
    const completedSteps = flowSteps.filter(s => s.status === 'completed').length;
    const completionPercentage = Math.round((completedSteps / flowSteps.length) * 100);

    const response = new AppointmentTraceResponseDto();
    response.appointmentId = appointment.id;
    response.insuredId = appointment.insuredId.value;
    response.countryISO = appointment.countryISO.value;
    response.currentStatus = appointment.status.value;
    response.flowSteps = flowSteps;
    response.completionPercentage = completionPercentage;
    response.summary = this.getSummaryMessage(appointment.status.value, completionPercentage);

    return response;
  }

  /**
   * Construye los pasos del flujo basándose en el estado de la cita
   */
  private buildFlowSteps(appointment: any): FlowStepDto[] {
    const status = appointment.status.value;
    const country = appointment.countryISO.value;
    const createdAt = appointment.createdAt.toISOString();
    const updatedAt = appointment.updatedAt.toISOString();

    const steps: FlowStepDto[] = [
      {
        step: 1,
        component: 'API Gateway',
        action: 'Solicitud recibida y validada',
        status: 'completed',
        timestamp: createdAt,
      },
      {
        step: 2,
        component: 'DynamoDB',
        action: 'Cita guardada con status "pending"',
        status: 'completed',
        timestamp: createdAt,
        details: { table: 'appointments', status: 'pending' },
      },
      {
        step: 3,
        component: 'SNS',
        action: `Mensaje publicado con filtro countryISO=${country}`,
        status: status === 'pending' ? 'in_progress' : 'completed',
        details: { topic: 'appointments-topic', filterAttribute: 'countryISO' },
      },
      {
        step: 4,
        component: `SQS (${country})`,
        action: `Mensaje encolado en appointments-${country.toLowerCase()}-queue`,
        status: status === 'pending' ? 'pending' : status === 'processing' ? 'in_progress' : 'completed',
        details: { queue: `appointments-${country.toLowerCase()}-queue` },
      },
      {
        step: 5,
        component: `Lambda Processor (${country})`,
        action: 'Procesando cita y guardando en MySQL',
        status: status === 'processing' ? 'in_progress' : status === 'completed' ? 'completed' : 'pending',
      },
      {
        step: 6,
        component: `MySQL (${country})`,
        action: `Cita guardada en medical_appointments_${country.toLowerCase()}`,
        status: status === 'completed' ? 'completed' : 'pending',
        details: { database: `medical_appointments_${country.toLowerCase()}` },
      },
      {
        step: 7,
        component: 'EventBridge',
        action: 'Evento "appointment.completed" emitido',
        status: status === 'completed' ? 'completed' : 'pending',
        details: { eventBus: 'appointments-bus', detailType: 'appointment.completed' },
      },
      {
        step: 8,
        component: 'DynamoDB (Update)',
        action: 'Status actualizado a "completed"',
        status: status === 'completed' ? 'completed' : 'pending',
        timestamp: status === 'completed' ? updatedAt : undefined,
        details: { finalStatus: status },
      },
    ];

    // Marcar pasos como failed si la cita falló
    if (status === 'failed') {
      const failedStepIndex = steps.findIndex(s => s.status === 'in_progress' || s.status === 'pending');
      if (failedStepIndex !== -1) {
        steps[failedStepIndex].status = 'failed';
        steps[failedStepIndex].action += ' - ERROR';
      }
    }

    return steps;
  }

  /**
   * Genera mensaje resumen según el estado
   */
  private getSummaryMessage(status: string, percentage: number): string {
    const messages: Record<string, string> = {
      pending: `Cita en cola de procesamiento (${percentage}% completado). Esperando procesamiento por país.`,
      processing: `Cita siendo procesada (${percentage}% completado). Guardando en base de datos del país.`,
      completed: 'Cita procesada exitosamente. Flujo completo.',
      failed: 'Error en el procesamiento de la cita. Revisar logs para más detalles.',
      cancelled: 'Cita cancelada.',
    };
    return messages[status] || `Estado: ${status}`;
  }
}
