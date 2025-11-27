import { IDomainEvent } from '@shared/interfaces/base.interface';

/**
 * Interfaz para publicador de eventos de dominio
 * Abstrae la comunicación con EventBridge
 */
export interface IEventPublisher {
  /**
   * Publica un evento de dominio en EventBridge
   * @param event - El evento a publicar
   */
  publish(event: IDomainEvent): Promise<void>;

  /**
   * Publica múltiples eventos en batch
   * @param events - Lista de eventos a publicar
   */
  publishBatch(events: IDomainEvent[]): Promise<void>;
}

/**
 * Token de inyección de dependencias
 */
export const EVENT_PUBLISHER = Symbol('IEventPublisher');
