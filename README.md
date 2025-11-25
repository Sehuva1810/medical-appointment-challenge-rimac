# Medical Appointment API

API serverless para agendar citas médicas. Soporta asegurados de Perú y Chile.

## Arquitectura

```
POST /appointments
       │
       ▼
┌─────────────────┐
│    DynamoDB     │  ← Guarda con status "pending"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      SNS        │  ← Filtra por país (PE o CL)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│SQS_PE │ │SQS_CL │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Lambda │ │Lambda │  ← Cada país tiene su lambda
│  PE   │ │  CL   │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│  MySQL (RDS)    │  ← Guarda en BD por país
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EventBridge    │  ← Notifica que terminó
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SQS Confirmation│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Lambda Confirm   │  ← Actualiza DynamoDB a "completed"
└─────────────────┘
```

## Tecnologías

- Node.js 18+
- TypeScript
- Serverless Framework
- DynamoDB + MySQL
- SNS, SQS, EventBridge

## Cómo correrlo en local

**Requisitos:**
- Docker y Docker Compose
- Node.js 18+
- AWS CLI

**Windows:** Usar Git Bash para correr los comandos.

**Pasos:**

```bash
npm install
npm run start:local
```

Eso levanta todo automáticamente: Docker (LocalStack + MySQL), crea las tablas en DynamoDB, el topic SNS, y arranca el servidor en `http://localhost:3000/local`.

**Probar los endpoints:**

```bash
# Crear cita
curl -X POST http://localhost:3000/local/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'

# Consultar citas
curl http://localhost:3000/local/appointments/00001
```

**Probar el flujo completo (E2E):**

```bash
npm run test:e2e
```

**Detener todo:**

```bash
npm run docker:down
```

## Endpoints

### POST /appointments

Crea una cita.

```json
{
  "insuredId": "00001",
  "scheduleId": 100,
  "countryISO": "PE"
}
```

Respuesta (202):
```json
{
  "message": "Appointment scheduling is in process",
  "appointmentId": "uuid-de-la-cita"
}
```

### GET /appointments/{insuredId}

Obtiene las citas de un asegurado.

```json
{
  "appointments": [
    {
      "appointmentId": "...",
      "insuredId": "00001",
      "scheduleId": 100,
      "countryISO": "PE",
      "status": "completed",
      "createdAt": "2024-10-15T10:30:00.000Z",
      "updatedAt": "2024-10-15T10:31:00.000Z"
    }
  ],
  "total": 1
}
```

## Validaciones

- `insuredId`: exactamente 5 dígitos (ej: "00001", "12345")
- `countryISO`: solo "PE" o "CL"
- `scheduleId`: número

## Tests unitarios

```bash
npm test
```

## Estructura del proyecto

Usa Clean Architecture:

```
src/
├── domain/           # Entidades y reglas de negocio
├── application/      # Casos de uso
├── infrastructure/   # DynamoDB, MySQL, SNS, etc
└── interfaces/       # Handlers de Lambda
```

## Deploy a AWS

```bash
npm run deploy:dev
npm run deploy:prod
```
