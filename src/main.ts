import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Bootstrap de la aplicación NestJS
 *
 * Configura:
 * - Validación global de DTOs
 * - Documentación Swagger/OpenAPI
 * - Helmet para seguridad de headers
 * - CORS
 * - Prefijo de API
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const stage = configService.get<string>('app.stage') || 'local';
  const port = configService.get<number>('app.port') || 3000;

  // Seguridad
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: stage === 'prod' ? ['https://your-domain.com'] : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI
  if (stage !== 'prod') {
    const config = new DocumentBuilder()
      .setTitle('Medical Appointments API')
      .setDescription(
        `API empresarial para gestión de citas médicas.

## Arquitectura
- **DynamoDB**: Almacén principal de citas
- **SNS**: Enrutamiento por país (PE/CL)
- **SQS**: Colas por país para procesamiento
- **MySQL (RDS)**: Bases de datos por país
- **EventBridge**: Eventos de dominio

## Flujo de Cita
1. POST /appointments → DynamoDB (pending)
2. SNS filtra por país → SQS (PE o CL)
3. Lambda procesa → MySQL del país
4. EventBridge notifica → Lambda confirmación
5. DynamoDB actualizado → (completed)`,
      )
      .setVersion('1.0.0')
      .addTag('Appointments', 'Gestión de citas médicas')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API Key para autenticación',
        },
        'api-key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger disponible en: http://localhost:${port}/docs`);
  }

  await app.listen(port);
  logger.log(`Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`Stage: ${stage}`);
}

bootstrap();
