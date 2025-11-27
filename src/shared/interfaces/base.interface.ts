/**
 * Interfaz base para entidades del dominio
 * Todas las entidades deben implementar esta interfaz para garantizar
 * identificación única y comparación de igualdad
 */
export interface IEntity<T> {
  readonly id: T;
  equals(entity: IEntity<T>): boolean;
}

/**
 * Interfaz base para Value Objects
 * Los Value Objects son inmutables y se comparan por valor, no por referencia
 */
export interface IValueObject<T> {
  readonly value: T;
  equals(vo: IValueObject<T>): boolean;
}

/**
 * Interfaz para eventos de dominio
 * Implementa el patrón Domain Events para comunicación entre agregados
 */
export interface IDomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Interfaz para el patrón Repository
 * Define operaciones CRUD básicas siguiendo el principio de inversión de dependencias
 */
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

/**
 * Interfaz para Unit of Work
 * Garantiza transacciones atómicas en operaciones de persistencia
 */
export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Tipo para resultado de operaciones que pueden fallar
 * Implementa el patrón Result/Either para manejo funcional de errores
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Helper para crear resultados exitosos
 */
export const success = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

/**
 * Helper para crear resultados fallidos
 */
export const failure = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});
