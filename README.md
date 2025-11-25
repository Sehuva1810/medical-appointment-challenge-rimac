# Medical Appointment API

API serverless para agendar citas médicas. Soporta asegurados de Perú y Chile.

## Arquitectura

El flujo es así:

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
│  MySQL (RDS)    │  ← Base de datos por país
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

## Cómo correrlo

### Instalación

```bash
npm install
```

### Opción rápida (solo endpoints)

Si solo quieres probar los endpoints sin todo el flujo de AWS:

```bash
npm run offline
```

Y en otra terminal:
```bash
curl -X POST http://localhost:3000/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'
```

### Opción completa con Docker (recomendado)

Esto levanta LocalStack (emula servicios AWS) y MySQL.

**Requisitos:**
- Docker y Docker Compose
- Node.js 18+ (yo uso Node 22)
- AWS CLI

**Pasos:**

```bash
# Copiar el archivo de variables de entorno
cp .env.local .env

# Levantar todo
npm run start:local
```

Eso inicia Docker, crea las tablas en DynamoDB, el topic SNS, y arranca el servidor.

**Para probar:**
```bash
# En otra terminal
./scripts/test-local.sh
```

O si quieres probar el flujo completo end-to-end:
```bash
npm run test:e2e
```

**Nota para Windows:** Los scripts .sh no corren directo en Windows. Usa Git Bash o WSL. O simplemente prueba los endpoints con Postman.

### Detener todo

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

## Tests

```bash
# Tests unitarios
npm test

# Con cobertura
npm test -- --coverage
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

## Deploy

```bash
# Dev
npm run deploy:dev

# Prod
npm run deploy:prod
```

## Variables de entorno

Para producción necesitas configurar en `.env`:

```
RDS_PE_HOST=...
RDS_PE_DATABASE=medical_appointments_pe
RDS_PE_USERNAME=...
RDS_PE_PASSWORD=...

RDS_CL_HOST=...
RDS_CL_DATABASE=medical_appointments_cl
RDS_CL_USERNAME=...
RDS_CL_PASSWORD=...
```

Para local, usa `cp .env.local .env` y listo.
