# Diagrama de Estados - Appointment

## Estado de Cita Médica

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                    APPOINTMENT                          │
                                    └─────────────────────────────────────────────────────────┘

                                                         ┌───────┐
                                                         │ START │
                                                         └───┬───┘
                                                             │
                                                             │ create()
                                                             ▼
                                                    ┌─────────────────┐
                                         ┌─────────│     PENDING     │─────────┐
                                         │         └────────┬────────┘         │
                                         │                  │                  │
                                         │ cancel()         │ process()        │
                                         │                  │                  │
                                         ▼                  ▼                  │
                                ┌─────────────────┐ ┌─────────────────┐        │
                                │   CANCELLED     │ │   PROCESSING    │        │
                                └─────────────────┘ └────────┬────────┘        │
                                         │                  │                  │
                                         │         ┌────────┴────────┐         │
                                         │         │                 │         │
                                         │         │ complete()      │ fail()  │
                                         │         ▼                 ▼         │
                                         │ ┌─────────────────┐ ┌─────────────────┐
                                         │ │   COMPLETED     │ │     FAILED      │
                                         │ └─────────────────┘ └────────┬────────┘
                                         │         │                    │
                                         │         │                    │ retry()
                                         │         │                    │
                                         │         │                    └────────────────────┐
                                         │         │                                         │
                                         ▼         ▼                                         │
                                    ┌─────────────────┐                                      │
                                    │      END        │◄─────────────────────────────────────┘
                                    └─────────────────┘          (vuelve a PENDING)


                    ┌────────────────────────────────────────────────────────────────────────────┐
                    │                         ESTADOS FINALES                                    │
                    │                                                                            │
                    │   COMPLETED ───── Estado final exitoso (cita procesada)                   │
                    │   CANCELLED ───── Estado final (cancelada por usuario)                    │
                    │   FAILED    ───── Puede reintentar con retry() → PENDING                  │
                    │                                                                            │
                    └────────────────────────────────────────────────────────────────────────────┘
```

## Transiciones Válidas

| Estado Actual | Acción | Estado Siguiente | Trigger |
|---------------|--------|------------------|---------|
| (inicio) | `create()` | PENDING | POST /appointments |
| PENDING | `process()` | PROCESSING | Lambda recibe de SQS |
| PENDING | `cancel()` | CANCELLED | Usuario cancela |
| PROCESSING | `complete()` | COMPLETED | Guardado en MySQL exitoso |
| PROCESSING | `fail()` | FAILED | Error en procesamiento |
| FAILED | `retry()` | PENDING | Reintento manual/automático |

## Transiciones Inválidas (lanza excepción)

```
COMPLETED → cualquier estado     (estado final)
CANCELLED → cualquier estado     (estado final)
PENDING → COMPLETED              (debe pasar por PROCESSING)
PROCESSING → PENDING             (no hay rollback directo)
```

## Implementación en Código

```typescript
// AppointmentStatus Value Object
class AppointmentStatus {
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['processing', 'cancelled'],
    processing: ['completed', 'failed'],
    failed: ['pending'], // retry
    completed: [],       // final
    cancelled: [],       // final
  };

  canTransitionTo(target: string): boolean {
    return VALID_TRANSITIONS[this.value].includes(target);
  }

  transitionTo(target: string): AppointmentStatus {
    if (!this.canTransitionTo(target)) {
      throw new InvalidStateTransitionException(this.value, target);
    }
    return new AppointmentStatus(target);
  }
}
```
