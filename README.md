# Medical Appointments API

API serverless para gestión de citas médicas con arquitectura orientada a eventos.

## Stack

- **NestJS 10** + TypeScript
- **AWS**: Lambda, API Gateway, DynamoDB, SNS, SQS, EventBridge, RDS MySQL
- **Patrones**: CQRS, DDD, Clean Architecture
- **IaC**: AWS CDK

## Arquitectura

```
POST /appointments → DynamoDB (pending) → SNS → SQS (PE/CL) → MySQL → EventBridge → DynamoDB (completed)
```

## Quick Start (Local)

```bash
# 1. Instalar
npm install

# 2. Levantar LocalStack + MySQL + App
npm run start:local

# 3. Probar el flujo completo (en otra terminal)
./scripts/test-flow.sh
```

Los logs muestran el flujo completo ejecutándose:
```
DynamoDB (pending) → SNS → SQS → Lambda → MySQL → EventBridge → DynamoDB (completed)
```

## Probar manualmente

```bash
# Crear cita
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'

# Consultar citas
curl http://localhost:3000/api/v1/appointments/00001
```

## Tests

```bash
npm test              # Unit tests
npm run test:cov      # Con coverage
```

## Documentación

- Swagger UI: `http://localhost:3000/docs`
- ADRs: `docs/adr/`
- Diagramas: `docs/diagrams/`
