import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  IMessagePublisher,
  AppointmentMessage,
} from '@domain/repositories/message-publisher.interface';
import { InfrastructureException } from '@domain/exceptions/domain.exception';

/**
 * Implementación del publicador de mensajes usando SNS
 *
 * Publica mensajes de citas en un topic SNS que tiene suscripciones
 * filtradas por countryISO:
 * - PE -> SQS Peru
 * - CL -> SQS Chile
 *
 * El filtro se aplica usando Message Attributes
 */
@Injectable()
export class SNSMessagePublisher implements IMessagePublisher {
  private readonly logger = new Logger(SNSMessagePublisher.name);
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor(private readonly configService: ConfigService) {
    const isLocal = this.configService.get<string>('app.stage') === 'local';
    const endpoint = this.configService.get<string>('aws.localstack.endpoint');

    this.client = new SNSClient({
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

    this.topicArn = this.configService.get<string>('aws.sns.topicArn')!;
    this.logger.log(`SNS Publisher inicializado - Topic: ${this.topicArn}`);
  }

  /**
   * Publica un mensaje de cita en SNS
   * Incluye MessageAttributes para filtrado por país
   */
  async publish(message: AppointmentMessage): Promise<void> {
    try {
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: message.countryISO,
          },
          eventType: {
            DataType: 'String',
            StringValue: 'appointment.created',
          },
        },
      });

      const response = await this.client.send(command);

      this.logger.debug(
        `Mensaje publicado en SNS - MessageId: ${response.MessageId}, Country: ${message.countryISO}`,
      );
    } catch (error) {
      this.logger.error(`Error publicando mensaje en SNS: ${error}`);
      throw new InfrastructureException(
        'SNS',
        `Error al publicar mensaje: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}
