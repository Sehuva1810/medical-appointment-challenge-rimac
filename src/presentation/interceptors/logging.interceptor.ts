import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Interceptor: Logging
 *
 * Registra información de cada solicitud HTTP:
 * - Método y URL
 * - Tiempo de respuesta
 * - Código de estado
 * - IP del cliente
 *
 * Implementa logging estructurado para observabilidad.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, body } = request;

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Log de entrada
    this.logger.log({
      type: 'request',
      requestId,
      method,
      url,
      ip,
      body: this.sanitizeBody(body),
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data): void => {
          const duration = Date.now() - startTime;
          this.logger.log({
            type: 'response',
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error): void => {
          const duration = Date.now() - startTime;
          this.logger.error({
            type: 'error',
            requestId,
            method,
            url,
            statusCode: error.status || 500,
            error: error.message,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  /**
   * Genera un ID único para la solicitud
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitiza el body para evitar loguear datos sensibles
   */
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
