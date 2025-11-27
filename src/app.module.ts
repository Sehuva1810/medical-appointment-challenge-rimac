import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';

// Configuration
import { awsConfig, rdsConfig, appConfig } from '@infrastructure/config/aws.config';

// Modules
import { AppointmentsModule } from './appointments.module';

// Filters
import { DomainExceptionFilter } from '@presentation/filters/domain-exception.filter';

/**
 * Módulo: App (Root)
 *
 * Módulo raíz de la aplicación NestJS.
 * Configura módulos globales:
 * - ConfigModule: Variables de entorno y configuración
 * - ThrottlerModule: Rate limiting
 * - AppointmentsModule: Bounded context de citas
 *
 * También registra filtros globales de excepciones.
 */
@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [awsConfig, rdsConfig, appConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate Limiting - 100 requests por minuto por IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Feature modules
    AppointmentsModule,
  ],
  providers: [
    // Filtro global de excepciones de dominio
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
