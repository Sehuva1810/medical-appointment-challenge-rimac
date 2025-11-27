import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { ProcessAppointmentCommand } from '../../application/commands/process-appointment.command';
import { ConfirmAppointmentCommand } from '../../application/commands/confirm-appointment.command';

/**
 * SQS Consumer Service for Local Development
 *
 * This service polls SQS queues and processes messages locally,
 * simulating what Lambda functions do in production.
 *
 * ONLY runs in local/development mode to enable full flow testing.
 *
 * Flow simulated:
 * - PE Queue -> ProcessAppointmentHandler -> MySQL PE -> EventBridge
 * - CL Queue -> ProcessAppointmentHandler -> MySQL CL -> EventBridge
 * - Confirmation Queue -> ConfirmAppointmentHandler -> DynamoDB (completed)
 */
@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly client: SQSClient;
  private isRunning = false;
  private pollIntervalMs = 2000; // Poll every 2 seconds

  private readonly peQueueUrl: string;
  private readonly clQueueUrl: string;
  private readonly confirmationQueueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
  ) {
    const isLocal = this.configService.get<string>('app.stage') === 'local';
    const endpoint = this.configService.get<string>('aws.localstack.endpoint');

    this.client = new SQSClient({
      region: this.configService.get<string>('aws.region') || 'us-east-1',
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

    this.peQueueUrl =
      this.configService.get<string>('aws.sqs.pe.queueUrl') ||
      'http://localhost:4566/000000000000/appointments-pe-queue';
    this.clQueueUrl =
      this.configService.get<string>('aws.sqs.cl.queueUrl') ||
      'http://localhost:4566/000000000000/appointments-cl-queue';
    this.confirmationQueueUrl =
      this.configService.get<string>('aws.sqs.confirmation.queueUrl') ||
      'http://localhost:4566/000000000000/appointments-confirmation-queue';
  }

  async onModuleInit() {
    const stage = this.configService.get<string>('app.stage') || 'local';

    // Start polling in local/dev mode (Lambda handles this in production)
    if (stage === 'local' || stage === 'dev') {
      this.logger.log('═══════════════════════════════════════════════════════');
      this.logger.log('🚀 Starting SQS Consumer (simulates Lambda in local)');
      this.logger.log('═══════════════════════════════════════════════════════');
      this.logger.log(`  📥 PE Queue: ${this.peQueueUrl}`);
      this.logger.log(`  📥 CL Queue: ${this.clQueueUrl}`);
      this.logger.log(`  📥 Confirmation Queue: ${this.confirmationQueueUrl}`);
      this.isRunning = true;
      this.startPolling();
    } else {
      this.logger.log('SQS Consumer disabled - Lambda handles SQS in production');
    }
  }

  async onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('SQS Consumer stopped');
  }

  private async startPolling() {
    while (this.isRunning) {
      try {
        // Poll all queues in parallel
        await Promise.all([
          this.pollQueue(this.peQueueUrl, 'PE'),
          this.pollQueue(this.clQueueUrl, 'CL'),
          this.pollConfirmationQueue(),
        ]);
      } catch (error) {
        this.logger.error(`Error polling queues: ${error}`);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }
  }

  private async pollQueue(queueUrl: string, country: string) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      });

      const response = await this.client.send(command);

      if (response.Messages && response.Messages.length > 0) {
        this.logger.log(
          `Received ${response.Messages.length} messages from ${country} queue`,
        );

        for (const message of response.Messages) {
          await this.processCountryMessage(message, queueUrl, country);
        }
      }
    } catch (error) {
      // Silently ignore if queue doesn't exist yet
      if (!(error as Error).message?.includes('does not exist')) {
        this.logger.debug(`Error polling ${country} queue: ${error}`);
      }
    }
  }

  private async pollConfirmationQueue() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.confirmationQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      });

      const response = await this.client.send(command);

      if (response.Messages && response.Messages.length > 0) {
        this.logger.log(
          `Received ${response.Messages.length} confirmation messages`,
        );

        for (const message of response.Messages) {
          await this.processConfirmationMessage(message);
        }
      }
    } catch (error) {
      if (!(error as Error).message?.includes('does not exist')) {
        this.logger.debug(`Error polling confirmation queue: ${error}`);
      }
    }
  }

  private async processCountryMessage(
    message: { Body?: string; ReceiptHandle?: string },
    queueUrl: string,
    country: string,
  ) {
    try {
      if (!message.Body) return;

      // Parse SNS wrapper if present
      let payload = JSON.parse(message.Body);
      if (payload.Message) {
        // It's wrapped by SNS
        payload = JSON.parse(payload.Message);
      }

      this.logger.log(
        `Processing appointment ${payload.appointmentId} for ${country}`,
      );

      // Execute the ProcessAppointmentCommand
      const processCommand = new ProcessAppointmentCommand(
        payload.appointmentId,
        payload.insuredId,
        payload.scheduleId,
        payload.countryISO || country,
      );

      await this.commandBus.execute(processCommand);

      // Delete message from queue
      if (message.ReceiptHandle) {
        await this.client.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }

      this.logger.log(
        `Successfully processed appointment ${payload.appointmentId}`,
      );
    } catch (error) {
      this.logger.error(`Error processing country message: ${error}`);
    }
  }

  private async processConfirmationMessage(message: {
    Body?: string;
    ReceiptHandle?: string;
  }) {
    try {
      if (!message.Body) return;

      // Parse EventBridge wrapper if present
      let payload = JSON.parse(message.Body);
      if (payload.detail) {
        // It's from EventBridge - the detail contains the event data
        payload = payload.detail;
      }

      // EventBridge events use aggregateId as the appointmentId
      const appointmentId = payload.appointmentId || payload.aggregateId;
      const insuredId = payload.insuredId;
      const scheduleId = payload.scheduleId;
      const countryISO = payload.countryISO;

      this.logger.log(`Confirming appointment ${appointmentId}`);

      // Execute the ConfirmAppointmentCommand
      const confirmCommand = new ConfirmAppointmentCommand(
        appointmentId,
        insuredId,
        scheduleId,
        countryISO,
      );

      await this.commandBus.execute(confirmCommand);

      // Delete message from queue
      if (message.ReceiptHandle) {
        await this.client.send(
          new DeleteMessageCommand({
            QueueUrl: this.confirmationQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }

      this.logger.log(
        `Successfully confirmed appointment ${payload.appointmentId}`,
      );
    } catch (error) {
      this.logger.error(`Error processing confirmation message: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
