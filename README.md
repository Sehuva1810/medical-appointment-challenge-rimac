# Medical Appointments API

API serverless para gestión de citas médicas con arquitectura orientada a eventos (AWS).

## Arquitectura

```
Cliente → API Gateway → Lambda (NestJS) → DynamoDB (pending)
                                        ↓
                                       SNS (filtro por país)
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                       ↓
               SQS (PE)                                SQS (CL)
                    ↓                                       ↓
            Lambda PE → MySQL PE                   Lambda CL → MySQL CL
                    ↓                                       ↓
                    └───────────→ EventBridge ←─────────────┘
                                       ↓
                              Lambda Confirmación
                                       ↓
                              DynamoDB (completed)
```

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Framework | NestJS 10 + TypeScript |
| Arquitectura | CQRS, DDD, Clean Architecture |
| IaC | AWS CDK |
| Base de datos | DynamoDB, MySQL (RDS) |
| Mensajería | SNS, SQS, EventBridge |
| Testing | Jest (80% coverage) |

## Quick Start

### 1. Prerrequisitos

```bash
node --version  # Node 18+ requerido
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar servidor

```bash
# Modo rápido (sin Docker) - recomendado para evaluación
npm run start:dev
```

### 4. Probar la API

**Opción A: Swagger UI**
```
http://localhost:3000/docs
```

**Opción B: Script de prueba**
```bash
# En otra terminal (mientras el servidor corre)
./scripts/test-flow.sh
```

**Opción C: curl manual**
```bash
# Crear cita para Perú
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'

# Crear cita para Chile
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "00001", "scheduleId": 200, "countryISO": "CL"}'

# Consultar citas de un asegurado
curl http://localhost:3000/api/v1/appointments/00001
```

## API Endpoints

### POST /api/v1/appointments

Crea una nueva cita médica (proceso asíncrono).

**Request:**
```json
{
  "insuredId": "00001",    // 5 dígitos exactos
  "scheduleId": 100,       // número positivo
  "countryISO": "PE"       // "PE" o "CL"
}
```

**Response (202):**
```json
{
  "message": "Appointment scheduling is in process",
  "appointmentId": "uuid-de-la-cita"
}
```

### GET /api/v1/appointments/{insuredId}

Obtiene las citas de un asegurado.

**Response (200):**
```json
{
  "appointments": [
    {
      "appointmentId": "...",
      "insuredId": "00001",
      "scheduleId": 100,
      "countryISO": "PE",
      "status": "pending",
      "createdAt": "2024-10-15T10:30:00.000Z",
      "updatedAt": "2024-10-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

## Testing

```bash
# Tests unitarios
npm test

# Tests con cobertura
npm run test:cov
```

## Estructura del Proyecto

```
src/
├── domain/                 # Capa de Dominio (DDD)
│   ├── entities/           # Aggregate Roots
│   ├── value-objects/      # InsuredId, CountryISO, AppointmentStatus
│   ├── events/             # Domain Events
│   ├── repositories/       # Interfaces
│   └── exceptions/         # Excepciones de dominio
│
├── application/            # Capa de Aplicación (CQRS)
│   ├── commands/           # CreateAppointment, ProcessAppointment
│   ├── queries/            # GetAppointments
│   ├── handlers/           # Command/Query Handlers
│   └── dto/                # Data Transfer Objects
│
├── infrastructure/         # Capa de Infraestructura
│   ├── persistence/        # DynamoDB, MySQL, In-Memory
│   ├── messaging/          # SNS, EventBridge, Console
│   └── config/             # AWS Config
│
├── presentation/           # Capa de Presentación
│   ├── controllers/        # REST Controllers
│   ├── guards/             # API Key Guard
│   ├── interceptors/       # Logging
│   └── filters/            # Exception Filters
│
└── lambdas/                # Lambda Handlers
    ├── country-processor   # Procesa por país
    └── confirmation        # Confirma en DynamoDB
```

## Patrones Implementados

- **CQRS**: Separación de comandos y queries
- **DDD**: Value Objects, Entities, Aggregate Roots, Domain Events
- **Repository Pattern**: Abstracción de persistencia
- **Factory Pattern**: Creación de repositorios MySQL por país
- **Clean Architecture**: Capas independientes y testables

## Modos de Ejecución

| Modo | Comando | Descripción |
|------|---------|-------------|
| **Dev (rápido)** | `npm run start:dev` | In-Memory + Console logs (sin Docker) |
| **Local completo** | `npm run start:local` | Docker + LocalStack + MySQL |
| **Producción** | `npm run cdk:deploy:prod` | AWS real |

## Flujo del Sistema

1. **POST /appointments** recibe la petición
2. Se crea la entidad `Appointment` con validaciones de dominio
3. Se guarda en **DynamoDB** con status `pending`
4. Se publica mensaje en **SNS** con atributo `countryISO`
5. **SNS** filtra y enruta al **SQS** correspondiente (PE o CL)
6. **Lambda del país** procesa y guarda en **MySQL**
7. Se emite evento en **EventBridge** (`appointment.completed`)
8. **Lambda de confirmación** actualiza **DynamoDB** a `completed`

## Validaciones

| Campo | Regla |
|-------|-------|
| `insuredId` | Exactamente 5 dígitos (ej: "00001") |
| `scheduleId` | Número entero positivo |
| `countryISO` | Solo "PE" o "CL" |

## Logs del Flujo

Al ejecutar en modo desarrollo, verás logs detallados:

```
[CreateAppointmentHandler] Procesando creación de cita - InsuredId: 00001, Country: PE
[CreateAppointmentHandler] Cita creada con ID: uuid-xxx
[InMemoryAppointmentRepository] [IN-MEMORY] Saving appointment: uuid-xxx
[ConsoleMessagePublisher] 📤 [CONSOLE] Message Published (simulated):
   Appointment ID: uuid-xxx
   Country: PE
   → Would route to: appointments-pe-queue
```

## Documentación Adicional

- `docs/adr/` - Architecture Decision Records
- `docs/diagrams/` - Diagramas C4 y UML
- `/docs` endpoint - Swagger UI (solo en dev)

## Comandos Útiles

```bash
# Desarrollo
npm run start:dev       # Servidor en modo watch
npm run build           # Compilar TypeScript
npm run lint            # Verificar código

# Testing
npm test                # Tests unitarios
npm run test:cov        # Tests con cobertura
./scripts/test-flow.sh  # Test del flujo completo

# Docker (modo completo)
npm run docker:up       # Levantar LocalStack + MySQL
npm run docker:down     # Detener contenedores

# CDK (deploy)
npm run cdk:synth       # Generar CloudFormation
npm run cdk:deploy:dev  # Deploy a dev
```

## Licencia

MIT
