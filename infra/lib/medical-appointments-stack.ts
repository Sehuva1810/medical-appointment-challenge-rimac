import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * Props extendidas del stack
 */
interface MedicalAppointmentsStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * Stack: Medical Appointments
 *
 * Infraestructura completa para el sistema de citas médicas.
 *
 * Recursos:
 * - VPC con subnets públicas y privadas
 * - DynamoDB para almacén principal
 * - SNS Topic para enrutamiento por país
 * - SQS Queues (PE, CL, Confirmation)
 * - Lambda Functions (API, Country Processors, Confirmation)
 * - API Gateway con API Key y Usage Plans
 * - RDS MySQL para cada país
 * - EventBridge para eventos de dominio
 * - IAM Roles con least privilege
 */
export class MedicalAppointmentsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MedicalAppointmentsStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // ==================== VPC ====================
    const vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `medical-appointments-vpc-${stage}`,
      maxAzs: 2,
      natGateways: stage === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ==================== DYNAMODB ====================
    const appointmentsTable = new dynamodb.Table(this, 'AppointmentsTable', {
      tableName: `appointments-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: stage === 'prod',
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para consultas por insuredId
    appointmentsTable.addGlobalSecondaryIndex({
      indexName: 'insuredId-index',
      partitionKey: { name: 'insuredId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==================== SNS TOPIC ====================
    const appointmentsTopic = new sns.Topic(this, 'AppointmentsTopic', {
      topicName: `appointments-topic-${stage}`,
      displayName: 'Medical Appointments Topic',
    });

    // ==================== SQS QUEUES ====================
    // Dead Letter Queue compartida
    const dlq = new sqs.Queue(this, 'DLQ', {
      queueName: `appointments-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Cola para Perú
    const peruQueue = new sqs.Queue(this, 'PeruQueue', {
      queueName: `appointments-pe-queue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Cola para Chile
    const chileQueue = new sqs.Queue(this, 'ChileQueue', {
      queueName: `appointments-cl-queue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Cola de confirmación
    const confirmationQueue = new sqs.Queue(this, 'ConfirmationQueue', {
      queueName: `appointments-confirmation-queue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Suscripciones SNS -> SQS con filtros por país
    appointmentsTopic.addSubscription(
      new subscriptions.SqsSubscription(peruQueue, {
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({
            allowlist: ['PE'],
          }),
        },
      }),
    );

    appointmentsTopic.addSubscription(
      new subscriptions.SqsSubscription(chileQueue, {
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({
            allowlist: ['CL'],
          }),
        },
      }),
    );

    // ==================== EVENTBRIDGE ====================
    const eventBus = new events.EventBus(this, 'AppointmentsBus', {
      eventBusName: `appointments-bus-${stage}`,
    });

    // Regla para capturar eventos appointment.completed
    const completedRule = new events.Rule(this, 'AppointmentCompletedRule', {
      eventBus,
      ruleName: `appointment-completed-rule-${stage}`,
      eventPattern: {
        source: ['medical-appointments'],
        detailType: ['appointment.completed'],
      },
    });

    completedRule.addTarget(new targets.SqsQueue(confirmationQueue));

    // ==================== RDS MYSQL ====================
    // Security Group para RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
      vpc,
      description: 'Security group for RDS MySQL instances',
      allowAllOutbound: true,
    });

    // Parámetros de conexión
    const dbCredentials = rds.Credentials.fromGeneratedSecret('admin', {
      secretName: `medical-appointments-db-credentials-${stage}`,
    });

    // RDS Perú
    const peruDb = new rds.DatabaseInstance(this, 'PeruDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        stage === 'prod' ? ec2.InstanceSize.MEDIUM : ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [rdsSecurityGroup],
      databaseName: 'medical_appointments_pe',
      credentials: dbCredentials,
      multiAz: stage === 'prod',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      deletionProtection: stage === 'prod',
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      backupRetention: cdk.Duration.days(stage === 'prod' ? 7 : 1),
    });

    // RDS Chile
    const chileDb = new rds.DatabaseInstance(this, 'ChileDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        stage === 'prod' ? ec2.InstanceSize.MEDIUM : ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [rdsSecurityGroup],
      databaseName: 'medical_appointments_cl',
      credentials: dbCredentials,
      multiAz: stage === 'prod',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      deletionProtection: stage === 'prod',
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      backupRetention: cdk.Duration.days(stage === 'prod' ? 7 : 1),
    });

    // ==================== LAMBDA LAYER ====================
    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      layerVersionName: `dependencies-layer-${stage}`,
      code: lambda.Code.fromAsset('../node_modules'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Node.js dependencies for Medical Appointments API',
    });

    // ==================== LAMBDA SECURITY GROUP ====================
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Permitir conexiones desde Lambda a RDS
    rdsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(3306),
      'Allow MySQL connections from Lambda',
    );

    // ==================== IAM ROLES ====================
    // Rol base para Lambdas
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `medical-appointments-lambda-role-${stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Permisos específicos
    const lambdaPolicy = new iam.Policy(this, 'LambdaPolicy', {
      policyName: `medical-appointments-lambda-policy-${stage}`,
      statements: [
        // DynamoDB
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:PutItem',
            'dynamodb:GetItem',
            'dynamodb:Query',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
          ],
          resources: [
            appointmentsTable.tableArn,
            `${appointmentsTable.tableArn}/index/*`,
          ],
        }),
        // SNS
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sns:Publish'],
          resources: [appointmentsTopic.topicArn],
        }),
        // SQS
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'sqs:SendMessage',
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
          ],
          resources: [
            peruQueue.queueArn,
            chileQueue.queueArn,
            confirmationQueue.queueArn,
          ],
        }),
        // EventBridge
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['events:PutEvents'],
          resources: [eventBus.eventBusArn],
        }),
        // Secrets Manager (para credenciales de RDS) - Least Privilege
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [
            dbCredentials.secret!.secretArn,
          ],
        }),
      ],
    });

    lambdaRole.attachInlinePolicy(lambdaPolicy);

    // ==================== LAMBDA FUNCTIONS ====================
    // Ambiente común para todas las Lambdas
    const commonEnv = {
      STAGE: stage,
      DYNAMODB_TABLE_NAME: appointmentsTable.tableName,
      SNS_TOPIC_ARN: appointmentsTopic.topicArn,
      EVENTBRIDGE_BUS_NAME: eventBus.eventBusName,
    };

    // Lambda API (NestJS)
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      functionName: `medical-appointments-api-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/main.handler',
      code: lambda.Code.fromAsset('../dist'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ...commonEnv,
        NODE_ENV: stage === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Lambda Procesador Perú
    const peruProcessorLambda = new lambda.Function(this, 'PeruProcessorLambda', {
      functionName: `medical-appointments-processor-pe-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/lambdas/country-processor.handler.handler',
      code: lambda.Code.fromAsset('../dist'),
      role: lambdaRole,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        ...commonEnv,
        COUNTRY_ISO: 'PE',
        RDS_PE_HOST: peruDb.instanceEndpoint.hostname,
        RDS_PE_PORT: '3306',
        RDS_PE_DATABASE: 'medical_appointments_pe',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Lambda Procesador Chile
    const chileProcessorLambda = new lambda.Function(this, 'ChileProcessorLambda', {
      functionName: `medical-appointments-processor-cl-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/lambdas/country-processor.handler.handler',
      code: lambda.Code.fromAsset('../dist'),
      role: lambdaRole,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        ...commonEnv,
        COUNTRY_ISO: 'CL',
        RDS_CL_HOST: chileDb.instanceEndpoint.hostname,
        RDS_CL_PORT: '3306',
        RDS_CL_DATABASE: 'medical_appointments_cl',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Lambda Confirmación
    const confirmationLambda = new lambda.Function(this, 'ConfirmationLambda', {
      functionName: `medical-appointments-confirmation-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/lambdas/confirmation.handler.handler',
      code: lambda.Code.fromAsset('../dist'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Event sources (SQS -> Lambda)
    peruProcessorLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(peruQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      }),
    );

    chileProcessorLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(chileQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      }),
    );

    confirmationLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(confirmationQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      }),
    );

    // ==================== API GATEWAY ====================
    const api = new apigateway.RestApi(this, 'MedicalAppointmentsApi', {
      restApiName: `medical-appointments-api-${stage}`,
      description: 'API for Medical Appointments Management',
      deployOptions: {
        stageName: stage,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
      },
    });

    // API Key
    const apiKey = api.addApiKey('ApiKey', {
      apiKeyName: `medical-appointments-api-key-${stage}`,
      description: 'API Key for Medical Appointments API',
    });

    // Usage Plan
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: `medical-appointments-usage-plan-${stage}`,
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    // Integración Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(apiLambda);

    // Rutas
    const appointments = api.root.addResource('api').addResource('v1').addResource('appointments');

    appointments.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true,
    });

    const appointmentById = appointments.addResource('{insuredId}');
    appointmentById.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true,
    });

    // ==================== OUTPUTS ====================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: `${id}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID (get value from console)',
      exportName: `${id}-ApiKeyId`,
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: appointmentsTable.tableName,
      description: 'DynamoDB Table Name',
      exportName: `${id}-DynamoDBTable`,
    });

    new cdk.CfnOutput(this, 'SNSTopicArn', {
      value: appointmentsTopic.topicArn,
      description: 'SNS Topic ARN',
      exportName: `${id}-SNSTopic`,
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: eventBus.eventBusName,
      description: 'EventBridge Bus Name',
      exportName: `${id}-EventBus`,
    });
  }
}
