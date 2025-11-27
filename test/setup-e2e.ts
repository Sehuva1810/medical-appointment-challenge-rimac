/**
 * E2E Test Setup
 *
 * This file runs before all E2E tests.
 * Sets up environment variables for local testing.
 */

// Set environment for E2E tests
process.env.NODE_ENV = 'test';
process.env.STAGE = 'local';

// LocalStack configuration
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';

// DynamoDB
process.env.DYNAMODB_TABLE_NAME = 'appointments';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:4566';

// SNS
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:appointments-topic';
process.env.SNS_ENDPOINT = 'http://localhost:4566';

// EventBridge
process.env.EVENTBRIDGE_BUS_NAME = 'appointments-bus';
process.env.EVENTBRIDGE_ENDPOINT = 'http://localhost:4566';

// MySQL
process.env.MYSQL_PE_HOST = 'localhost';
process.env.MYSQL_PE_PORT = '3306';
process.env.MYSQL_PE_DATABASE = 'medical_appointments_pe';
process.env.MYSQL_PE_USER = 'admin';
process.env.MYSQL_PE_PASSWORD = 'admin123';

process.env.MYSQL_CL_HOST = 'localhost';
process.env.MYSQL_CL_PORT = '3306';
process.env.MYSQL_CL_DATABASE = 'medical_appointments_cl';
process.env.MYSQL_CL_USER = 'admin';
process.env.MYSQL_CL_PASSWORD = 'admin123';

// API
process.env.API_KEY = 'test-api-key';
process.env.PORT = '3000';

console.log('E2E Test environment configured for local testing');
