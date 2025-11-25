import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import {
  ConfirmationEvent,
  IEventPublisher,
} from '../../domain/repositories/IEventPublisher';

export class EventBridgePublisher implements IEventPublisher {
  private readonly client: EventBridgeClient;
  private readonly eventBusName: string;

  constructor(client?: EventBridgeClient) {
    // Usar endpoint de LocalStack cuando se ejecuta localmente
    const endpoint = process.env.LOCALSTACK_ENDPOINT;
    const clientConfig = endpoint
      ? {
          endpoint,
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
          },
        }
      : {};

    this.client = client || new EventBridgeClient(clientConfig);
    this.eventBusName = process.env.EVENTBRIDGE_BUS_NAME || 'default';
  }

  async publishConfirmation(event: ConfirmationEvent): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: this.eventBusName,
          Source: 'appointment.service',
          DetailType: 'AppointmentCompleted',
          Detail: JSON.stringify(event),
        },
      ],
    });

    const result = await this.client.send(command);

    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      throw new Error(
        `Failed to publish event to EventBridge: ${JSON.stringify(result.Entries)}`
      );
    }

    console.log(
      `Confirmation event published to EventBridge for appointment ${event.appointmentId}`
    );
  }
}
