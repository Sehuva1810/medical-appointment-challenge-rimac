import { Module, Logger } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { AppointmentsController } from '@presentation/controllers/appointments.controller';

// Handlers
import { AllHandlers } from '@application/handlers';

// Infrastructure - AWS Services (Real implementations)
import { DynamoDBAppointmentRepository } from '@infrastructure/persistence/dynamodb-appointment.repository';
import { MySQLRepositoryFactory } from '@infrastructure/persistence/mysql-appointment.repository';
import { SNSMessagePublisher } from '@infrastructure/messaging/sns-message.publisher';
import { EventBridgePublisher } from '@infrastructure/messaging/eventbridge.publisher';

// Infrastructure - SQS Consumer for local development (simulates Lambda)
import { SqsConsumerService } from '@infrastructure/messaging/sqs-consumer.service';

// Repository tokens
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface';
import { MESSAGE_PUBLISHER } from '@domain/repositories/message-publisher.interface';
import { EVENT_PUBLISHER } from '@domain/repositories/event-publisher.interface';
import { MYSQL_APPOINTMENT_REPOSITORY } from '@domain/repositories/mysql-appointment.repository.interface';

// Guards
import { ApiKeyGuard } from '@presentation/guards/api-key.guard';

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [AppointmentsController],
  providers: [
    ...AllHandlers,
    ApiKeyGuard,

    // DynamoDB
    {
      provide: APPOINTMENT_REPOSITORY,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('AppointmentsModule');
        logger.log('✅ Initializing DynamoDB repository');
        return new DynamoDBAppointmentRepository(configService);
      },
      inject: [ConfigService],
    },

    // MySQL (por país)
    MySQLRepositoryFactory,
    {
      provide: MYSQL_APPOINTMENT_REPOSITORY,
      useFactory: (factory: MySQLRepositoryFactory) => factory,
      inject: [MySQLRepositoryFactory],
    },

    // SNS
    {
      provide: MESSAGE_PUBLISHER,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('AppointmentsModule');
        logger.log('✅ Initializing SNS publisher');
        return new SNSMessagePublisher(configService);
      },
      inject: [ConfigService],
    },

    // EventBridge
    {
      provide: EVENT_PUBLISHER,
      useClass: EventBridgePublisher,
    },

    // SQS Consumer (simula Lambdas en local)
    SqsConsumerService,
  ],
  exports: [
    APPOINTMENT_REPOSITORY,
    MESSAGE_PUBLISHER,
    EVENT_PUBLISHER,
    MySQLRepositoryFactory,
  ],
})
export class AppointmentsModule {}
