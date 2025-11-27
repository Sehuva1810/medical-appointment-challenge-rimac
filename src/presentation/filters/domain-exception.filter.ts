import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  ValidationException,
  NotFoundException,
  ConflictException,
  BusinessRuleViolationException,
  InfrastructureException,
} from '@domain/exceptions/domain.exception';

/**
 * Filter: Domain Exception
 *
 * Captura excepciones del dominio y las transforma en respuestas HTTP apropiadas.
 * Mapea códigos de error de dominio a códigos HTTP.
 *
 * Mapeo:
 * - ValidationException -> 400 Bad Request
 * - NotFoundException -> 404 Not Found
 * - ConflictException -> 409 Conflict
 * - BusinessRuleViolationException -> 422 Unprocessable Entity
 * - InfrastructureException -> 503 Service Unavailable
 * - DomainException (otros) -> 500 Internal Server Error
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.getHttpStatus(exception);
    const errorResponse = this.buildErrorResponse(exception, status);

    // Log del error
    this.logger.error({
      type: 'domain_exception',
      code: exception.code,
      message: exception.message,
      status,
      timestamp: exception.timestamp.toISOString(),
      stack: exception.stack,
    });

    response.status(status).json(errorResponse);
  }

  /**
   * Determina el código HTTP basado en el tipo de excepción
   */
  private getHttpStatus(exception: DomainException): number {
    if (exception instanceof ValidationException) {
      return HttpStatus.BAD_REQUEST;
    }

    if (exception instanceof NotFoundException) {
      return HttpStatus.NOT_FOUND;
    }

    if (exception instanceof ConflictException) {
      return HttpStatus.CONFLICT;
    }

    if (exception instanceof BusinessRuleViolationException) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    if (exception instanceof InfrastructureException) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Construye la respuesta de error
   */
  private buildErrorResponse(
    exception: DomainException,
    status: number,
  ): Record<string, unknown> {
    const baseResponse = {
      statusCode: status,
      code: exception.code,
      message: exception.message,
      timestamp: exception.timestamp.toISOString(),
    };

    // Agregar campos específicos según el tipo
    if (exception instanceof ValidationException) {
      return {
        ...baseResponse,
        field: exception.field,
        constraints: exception.constraints,
      };
    }

    if (exception instanceof NotFoundException) {
      return {
        ...baseResponse,
        resourceType: exception.resourceType,
        resourceId: exception.resourceId,
      };
    }

    if (exception instanceof BusinessRuleViolationException) {
      return {
        ...baseResponse,
        ruleName: exception.ruleName,
      };
    }

    if (exception instanceof InfrastructureException) {
      return {
        ...baseResponse,
        service: exception.service,
      };
    }

    return baseResponse;
  }
}
