/**
 * Excepción base del dominio
 * Todas las excepciones de negocio deben extender esta clase
 * Facilita el manejo centralizado de errores y logging
 */
export abstract class DomainException extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializa la excepción para logging estructurado
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error de validación de datos de entrada
 * Se lanza cuando los datos no cumplen con las reglas de negocio
 */
export class ValidationException extends DomainException {
  public readonly field?: string;
  public readonly constraints: string[];

  constructor(message: string, field?: string, constraints: string[] = []) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
    this.constraints = constraints;
  }
}

/**
 * Error cuando no se encuentra un recurso
 * Mapea a HTTP 404
 */
export class NotFoundException extends DomainException {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} con ID '${resourceId}' no encontrado`, 'NOT_FOUND');
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error de conflicto de estado
 * Se lanza cuando una operación viola las invariantes del dominio
 */
export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

/**
 * Error de operación no permitida
 * Se lanza cuando se intenta una acción que viola reglas de negocio
 */
export class BusinessRuleViolationException extends DomainException {
  public readonly ruleName: string;

  constructor(ruleName: string, message: string) {
    super(message, 'BUSINESS_RULE_VIOLATION');
    this.ruleName = ruleName;
  }
}

/**
 * Error de infraestructura
 * Se lanza cuando falla la comunicación con servicios externos
 */
export class InfrastructureException extends DomainException {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message: string, originalError?: Error) {
    super(message, 'INFRASTRUCTURE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}
