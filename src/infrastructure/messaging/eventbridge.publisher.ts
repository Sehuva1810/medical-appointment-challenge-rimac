import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { IEventPublisher } from '@domain/repositories/event-publisher.interface';
import { IDomainEvent } from '@shared/interfaces/base.interface';
import { InfrastructureException } from '@domain/exceptions/domain.exception';

/**
 * Implementación del publicador de eventos usando EventBridge
 *
 * Publica eventos de dominio en un Event Bus de EventBridge.
 * Los eventos son capturados por reglas que enrutan a SQS de confirmación.
 *
 * Evento principal: appointment.completed
 * - Se publica cuando el Lambda del país guarda la cita en MySQL
 * - Dispara el Lambda de confirmación que actualiza DynamoDB
 */
@Injectable()
export class EventBridgePublisher implements IEventPublisher {
  private readonly logger = new Logger(EventBridgePublisher.name);
  private readonly client: EventBridgeClient;
  private readonly busName: string;

  constructor(private readonly configService: ConfigService) {
    const isLocal = this.configService.get<string>('app.stage') === 'local';
    const endpoint = this.configService.get<string>('aws.localstack.endpoint');

    this.client = new EventBridgeClient({
      region: this.configService.get<string>('aws.region'),
      ...(isLocal && endpoint
        ? {
            endpoint,
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          }
        : {}),
    });

    this.busName = this.configService.get<string>('aws.eventbridge.busName')!;
    this.logger.log(`EventBridge Publisher inicializado - Bus: ${this.busName}`);
  }

  /**
   * Publica un evento de dominio en EventBridge
   */
  async publish(event: IDomainEvent): Promise<void> {
    try {
      const command = new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.busName,
            Source: 'medical-appointments',
            DetailType: event.eventType,
            Detail: JSON.stringify({
              eventId: event.eventId,
              occurredOn: event.occurredOn.toISOString(),
              aggregateId: event.aggregateId,
              ...event.payload,
            }),
          },
        ],
      });

      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failedEntry = response.Entries?.find(e => e.ErrorCode);
        throw new Error(
          `EventBridge publish failed: ${failedEntry?.ErrorCode} - ${failedEntry?.ErrorMessage}`,
        );
      }

      this.logger.debug(
        `Evento ${event.eventType} publicado en EventBridge - EventId: ${event.eventId}`,
      );
    } catch (error) {
      this.logger.error(`Error publicando evento en EventBridge: ${error}`);
      throw new InfrastructureException(
        'EventBridge',
        `Error al publicar evento: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Publica múltiples eventos en batch
   * EventBridge permite hasta 10 eventos por llamada
   */
  async publishBatch(events: IDomainEvent[]): Promise<void> {
    const BATCH_SIZE = 10;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);

      const command = new PutEventsCommand({
        Entries: batch.map(event => ({
          EventBusName: this.busName,
          Source: 'medical-appointments',
          DetailType: event.eventType,
          Detail: JSON.stringify({
            eventId: event.eventId,
            occurredOn: event.occurredOn.toISOString(),
            aggregateId: event.aggregateId,
            ...event.payload,
          }),
        })),
      });

      try {
        const response = await this.client.send(command);

        if (response.FailedEntryCount && response.FailedEntryCount > 0) {
          this.logger.warn(
            `${response.FailedEntryCount} eventos fallaron en el batch`,
          );
        }
      } catch (error) {
        this.logger.error(`Error publicando batch de eventos: ${error}`);
        throw new InfrastructureException(
          'EventBridge',
          `Error al publicar batch: ${(error as Error).message}`,
          error as Error,
        );
      }
    }

    this.logger.debug(`Batch de ${events.length} eventos publicados en EventBridge`);
  }
}
