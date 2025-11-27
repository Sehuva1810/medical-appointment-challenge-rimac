# Diagrama C4 - Nivel 2: Contenedores

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                 CONTENEDORES                                         │
└──────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │      Cliente        │
                              │   (Web/Mobile App)  │
                              └──────────┬──────────┘
                                         │
                                         │ HTTPS + API Key
                                         ▼
                    ┌────────────────────────────────────────┐
                    │           API Gateway                   │
                    │                                         │
                    │  • Rate Limiting (100 req/min)         │
                    │  • API Key Authentication              │
                    │  • CORS                                 │
                    │  • Request Validation                   │
                    └────────────────────┬───────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Lambda: API Handler                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Controllers │──│  Handlers   │──│   Domain    │──│Infrastructure│                │
│  │  (NestJS)   │  │   (CQRS)    │  │  (DDD)      │  │ (AWS SDK)   │                │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                │
└────────────┬────────────────────────────────────────────────┬───────────────────────┘
             │                                                │
             │ Save (pending)                                 │ Publish
             ▼                                                ▼
  ┌─────────────────────┐                         ┌─────────────────────┐
  │      DynamoDB       │                         │      SNS Topic      │
  │                     │                         │                     │
  │  Table: appointments│                         │  FilterPolicy:      │
  │  GSI: insuredId     │                         │  countryISO: PE|CL  │
  └─────────────────────┘                         └──────────┬──────────┘
                                                             │
                                              ┌──────────────┴──────────────┐
                                              │                             │
                                              ▼                             ▼
                                   ┌─────────────────────┐      ┌─────────────────────┐
                                   │     SQS Queue PE    │      │     SQS Queue CL    │
                                   └──────────┬──────────┘      └──────────┬──────────┘
                                              │                             │
                                              ▼                             ▼
                              ┌─────────────────────────┐   ┌─────────────────────────┐
                              │  Lambda: Processor PE   │   │  Lambda: Processor CL   │
                              │                         │   │                         │
                              │  • Guarda en MySQL PE   │   │  • Guarda en MySQL CL   │
                              │  • Publica en EventBr.  │   │  • Publica en EventBr.  │
                              └─────────────┬───────────┘   └─────────────┬───────────┘
                                            │                             │
                                            ▼                             ▼
                              ┌─────────────────────────┐   ┌─────────────────────────┐
                              │      MySQL RDS PE       │   │      MySQL RDS CL       │
                              │  medical_appointments_pe│   │  medical_appointments_cl│
                              └─────────────────────────┘   └─────────────────────────┘
                                            │                             │
                                            └──────────────┬──────────────┘
                                                           │
                                                           ▼
                                              ┌─────────────────────────┐
                                              │      EventBridge        │
                                              │                         │
                                              │  Event: appointment.    │
                                              │         completed       │
                                              └─────────────┬───────────┘
                                                            │
                                                            ▼
                                              ┌─────────────────────────┐
                                              │  SQS: Confirmation Queue│
                                              └─────────────┬───────────┘
                                                            │
                                                            ▼
                                              ┌─────────────────────────┐
                                              │  Lambda: Confirmation   │
                                              │                         │
                                              │  • Actualiza DynamoDB   │
                                              │    status: completed    │
                                              └─────────────────────────┘
```

## Contenedores

| Contenedor | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| API Gateway | AWS API Gateway | Entrada HTTP, autenticación, rate limiting |
| Lambda API | NestJS + Node.js 18 | Lógica de aplicación, CQRS handlers |
| Lambda Processor PE | Node.js 18 | Procesa citas de Perú |
| Lambda Processor CL | Node.js 18 | Procesa citas de Chile |
| Lambda Confirmation | Node.js 18 | Confirma citas en DynamoDB |
| DynamoDB | AWS DynamoDB | Almacén principal NoSQL |
| MySQL PE | AWS RDS MySQL | Base de datos Perú |
| MySQL CL | AWS RDS MySQL | Base de datos Chile |
| SNS Topic | AWS SNS | Enrutamiento por país |
| SQS Queues | AWS SQS | Colas de mensajes |
| EventBridge | AWS EventBridge | Eventos de dominio |
