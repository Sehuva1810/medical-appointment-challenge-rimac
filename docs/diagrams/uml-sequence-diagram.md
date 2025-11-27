# Diagrama de Secuencia - Crear Cita Médica

## Flujo Principal (Happy Path)

```
┌───────┐     ┌───────────┐     ┌─────────┐     ┌────────┐     ┌─────┐     ┌─────┐     ┌───────┐     ┌───────────┐     ┌────────┐
│Cliente│     │API Gateway│     │ Lambda  │     │Handler │     │Repo │     │ SNS │     │  SQS  │     │Lambda Proc│     │  MySQL │
└───┬───┘     └─────┬─────┘     └────┬────┘     └───┬────┘     └──┬──┘     └──┬──┘     └───┬───┘     └─────┬─────┘     └────┬───┘
    │               │                │              │             │           │            │               │                │
    │ POST /appointments             │              │             │           │            │               │                │
    │──────────────>│                │              │             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │ Validate API Key              │             │           │            │               │                │
    │               │────────────────│              │             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │ Invoke Lambda  │              │             │           │            │               │                │
    │               │───────────────>│              │             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │ execute(cmd) │             │           │            │               │                │
    │               │                │─────────────>│             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │              │ Appointment.create()    │            │               │                │
    │               │                │              │─────────────│           │            │               │                │
    │               │                │              │   (valida)  │           │            │               │                │
    │               │                │              │<────────────│           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │              │ save(appt)  │           │            │               │                │
    │               │                │              │────────────>│           │            │               │                │
    │               │                │              │             │ PutItem   │            │               │                │
    │               │                │              │             │──────────>│ DynamoDB   │               │                │
    │               │                │              │             │<──────────│            │               │                │
    │               │                │              │<────────────│           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │              │ publish(msg)│           │            │               │                │
    │               │                │              │─────────────────────────>│            │               │                │
    │               │                │              │             │           │ Publish    │               │                │
    │               │                │              │             │           │ (country   │               │                │
    │               │                │              │             │           │  filter)   │               │                │
    │               │                │              │<─────────────────────────│            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │ {appointmentId}            │           │ Filter:    │               │                │
    │               │                │<────────────│             │           │ countryISO │               │                │
    │               │                │              │             │           │───────────>│               │                │
    │               │ 202 Accepted   │              │             │           │            │               │                │
    │               │<───────────────│              │             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │ 202 {appointmentId}            │              │             │           │            │               │                │
    │<──────────────│                │              │             │           │            │               │                │
    │               │                │              │             │           │            │               │                │
    │               │                │              │             │           │            │ ReceiveMsg   │                │
    │               │                │              │             │           │            │<──────────────│                │
    │               │                │              │             │           │            │               │                │
    │               │                │              │             │           │            │               │ INSERT         │
    │               │                │              │             │           │            │               │───────────────>│
    │               │                │              │             │           │            │               │<───────────────│
    │               │                │              │             │           │            │               │                │
```

## Flujo de Confirmación (EventBridge)

```
┌───────────┐     ┌───────────┐     ┌─────────────┐     ┌───────────────┐     ┌────────┐
│Lambda Proc│     │EventBridge│     │SQS Confirm  │     │Lambda Confirm │     │DynamoDB│
└─────┬─────┘     └─────┬─────┘     └──────┬──────┘     └───────┬───────┘     └───┬────┘
      │                 │                  │                    │                 │
      │ PutEvents       │                  │                    │                 │
      │ (appointment.   │                  │                    │                 │
      │  completed)     │                  │                    │                 │
      │────────────────>│                  │                    │                 │
      │                 │                  │                    │                 │
      │                 │ Rule Match       │                    │                 │
      │                 │─────────────────>│                    │                 │
      │                 │                  │                    │                 │
      │                 │                  │ Trigger            │                 │
      │                 │                  │───────────────────>│                 │
      │                 │                  │                    │                 │
      │                 │                  │                    │ UpdateItem      │
      │                 │                  │                    │ status=completed│
      │                 │                  │                    │────────────────>│
      │                 │                  │                    │<────────────────│
      │                 │                  │                    │                 │
      │                 │                  │ DeleteMessage      │                 │
      │                 │                  │<───────────────────│                 │
      │                 │                  │                    │                 │
```

## Notas

- El flujo es **asíncrono** después del paso SNS
- Cliente recibe respuesta inmediata (202) mientras el procesamiento continúa
- SNS filtra mensajes por `countryISO` (PE → SQS PE, CL → SQS CL)
- EventBridge coordina la confirmación final
