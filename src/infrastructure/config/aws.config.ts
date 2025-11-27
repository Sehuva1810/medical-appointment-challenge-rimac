import { registerAs } from '@nestjs/config';

/**
 * Configuración de AWS
 * Usa registerAs para namespace y tipado seguro
 */
export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',

  // Endpoints locales (LocalStack)
  localstack: {
    endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566',
  },

  // DynamoDB
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT || process.env.LOCALSTACK_ENDPOINT,
    tableName: process.env.DYNAMODB_TABLE_NAME || 'appointments',
  },

  // SNS
  sns: {
    topicArn:
      process.env.SNS_TOPIC_ARN ||
      'arn:aws:sns:us-east-1:000000000000:appointments-topic',
  },

  // EventBridge
  eventbridge: {
    busName: process.env.EVENTBRIDGE_BUS_NAME || 'appointments-bus',
  },

  // SQS Queues por país
  sqs: {
    pe: {
      queueUrl:
        process.env.SQS_PE_QUEUE_URL ||
        'http://localhost:4566/000000000000/appointments-pe-queue',
    },
    cl: {
      queueUrl:
        process.env.SQS_CL_QUEUE_URL ||
        'http://localhost:4566/000000000000/appointments-cl-queue',
    },
    confirmation: {
      queueUrl:
        process.env.SQS_CONFIRMATION_QUEUE_URL ||
        'http://localhost:4566/000000000000/appointments-confirmation-queue',
    },
  },
}));

/**
 * Configuración de RDS MySQL por país
 */
export const rdsConfig = registerAs('rds', () => ({
  pe: {
    host: process.env.RDS_PE_HOST || 'localhost',
    port: parseInt(process.env.RDS_PE_PORT || '3306', 10),
    database: process.env.RDS_PE_DATABASE || 'medical_appointments_pe',
    username: process.env.RDS_PE_USERNAME || 'admin',
    password: process.env.RDS_PE_PASSWORD || 'password',
  },
  cl: {
    host: process.env.RDS_CL_HOST || 'localhost',
    port: parseInt(process.env.RDS_CL_PORT || '3306', 10),
    database: process.env.RDS_CL_DATABASE || 'medical_appointments_cl',
    username: process.env.RDS_CL_USERNAME || 'admin',
    password: process.env.RDS_CL_PASSWORD || 'password',
  },
}));

/**
 * Configuración general de la aplicación
 */
export const appConfig = registerAs('app', () => ({
  stage: process.env.STAGE || 'local',
  isLocal: process.env.STAGE === 'local',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
}));
