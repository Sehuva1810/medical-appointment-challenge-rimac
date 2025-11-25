import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  AppointmentMessage,
  IMessagePublisher,
} from '../../domain/repositories/IMessagePublisher';

export class SNSMessagePublisher implements IMessagePublisher {
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor(client?: SNSClient) {
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

    this.client = client || new SNSClient(clientConfig);
    this.topicArn = process.env.SNS_TOPIC_ARN || '';
  }

  async publish(message: AppointmentMessage): Promise<void> {
    if (!this.topicArn) {
      throw new Error('SNS_TOPIC_ARN environment variable is not set');
    }

    const command = new PublishCommand({
      TopicArn: this.topicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        countryISO: {
          DataType: 'String',
          StringValue: message.countryISO,
        },
      },
    });

    await this.client.send(command);

    console.log(
      `Message published to SNS for appointment ${message.appointmentId} (${message.countryISO})`
    );
  }
}
