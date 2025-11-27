# Diagrama C4 - Nivel 1: Contexto del Sistema

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CONTEXTO DEL SISTEMA                            │
└──────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
                        │      Usuario        │
                        │   (Asegurado/App)   │
                        └──────────┬──────────┘
                                   │
                                   │ HTTPS / JSON
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │                              │
                    │   Medical Appointments API   │
                    │                              │
                    │   Sistema de agendamiento    │
                    │   de citas médicas para      │
                    │   asegurados de PE y CL      │
                    │                              │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │   DynamoDB      │  │   MySQL (RDS)   │  │   AWS Services  │
    │                 │  │                 │  │                 │
    │ Almacén NoSQL   │  │ Bases de datos  │  │ SNS, SQS,       │
    │ principal       │  │ por país        │  │ EventBridge     │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Actores

| Actor | Descripción |
|-------|-------------|
| Usuario | Asegurado o aplicación cliente que agenda citas médicas |

## Sistemas Externos

| Sistema | Descripción |
|---------|-------------|
| DynamoDB | Almacén principal NoSQL para estado de citas |
| MySQL (RDS) | Bases de datos relacionales por país (PE, CL) |
| AWS Services | SNS, SQS, EventBridge para mensajería y eventos |
