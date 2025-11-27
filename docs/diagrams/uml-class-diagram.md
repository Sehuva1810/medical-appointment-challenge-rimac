# Diagrama de Clases UML - Domain Layer

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN LAYER - CLASS DIAGRAM                            │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  <<Entity>>                                          │
│                                 Appointment                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ - _id: string                                                                        │
│ - _insuredId: InsuredId                                                              │
│ - _scheduleId: number                                                                │
│ - _countryISO: CountryISO                                                            │
│ - _status: AppointmentStatus                                                         │
│ - _createdAt: Date                                                                   │
│ - _updatedAt: Date                                                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ + static create(props: CreateAppointmentProps): Appointment                          │
│ + static fromPersistence(data: object): Appointment                                  │
│ + markAsProcessing(): void                                                           │
│ + markAsCompleted(): void                                                            │
│ + markAsFailed(): void                                                               │
│ + cancel(): void                                                                     │
│ + retry(): void                                                                      │
│ + toPersistence(): Record<string, unknown>                                           │
│ + toDTO(): Record<string, unknown>                                                   │
│ + equals(entity: IEntity<string>): boolean                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
                │              │               │
                │              │               │
                ▼              ▼               ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
│  <<Value Object>> │ │  <<Value Object>> │ │     <<Value Object>>      │
│     InsuredId     │ │    CountryISO     │ │    AppointmentStatus      │
├───────────────────┤ ├───────────────────┤ ├───────────────────────────┤
│ - _value: string  │ │ - _value: Country │ │ - _value: AppointmentStat │
│                   │ │   Code            │ │   usEnum                  │
│                   │ │ - _config: Country│ │                           │
│                   │ │   Config          │ │                           │
├───────────────────┤ ├───────────────────┤ ├───────────────────────────┤
│ + create(value)   │ │ + create(value)   │ │ + pending(): Status       │
│ + fromPersistence │ │ + fromPersistence │ │ + processing(): Status    │
│   (value)         │ │   (value)         │ │ + completed(): Status     │
│ + equals(other)   │ │ + isPeru(): bool  │ │ + failed(): Status        │
│ + toString()      │ │ + isChile(): bool │ │ + canTransitionTo(target) │
│                   │ │ + config: Config  │ │ + transitionTo(target)    │
│                   │ │ + equals(other)   │ │ + isFinal(): boolean      │
└───────────────────┘ └───────────────────┘ └───────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              <<Interface>>                                           │
│                           IAppointmentRepository                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ + save(appointment: Appointment): Promise<void>                                      │
│ + findById(id: string): Promise<Appointment | null>                                  │
│ + findByInsuredId(insuredId: string): Promise<Appointment[]>                         │
│ + updateStatus(id: string, status: string): Promise<void>                            │
│ + delete(id: string): Promise<void>                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    △
                                    │ implements
                                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          DynamoDBAppointmentRepository                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ - client: DynamoDBClient                                                             │
│ - tableName: string                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ + save(appointment): Promise<void>                                                   │
│ + findById(id): Promise<Appointment | null>                                          │
│ + findByInsuredId(insuredId): Promise<Appointment[]>                                 │
│ + updateStatus(id, status): Promise<void>                                            │
│ + delete(id): Promise<void>                                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN EVENTS                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

            ┌─────────────────────────────────┐
            │      <<abstract>>               │
            │      BaseDomainEvent            │
            ├─────────────────────────────────┤
            │ + eventId: string               │
            │ + occurredOn: Date              │
            │ + aggregateId: string           │
            │ + payload: Record               │
            ├─────────────────────────────────┤
            │ + toEventBridgeFormat()         │
            └─────────────────────────────────┘
                          △
                          │ extends
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Appointment   │ │ Appointment   │ │ Appointment   │
│ CreatedEvent  │ │ CompletedEvent│ │ FailedEvent   │
├───────────────┤ ├───────────────┤ ├───────────────┤
│ eventType:    │ │ eventType:    │ │ eventType:    │
│ "appointment. │ │ "appointment. │ │ "appointment. │
│  created"     │ │  completed"   │ │  failed"      │
└───────────────┘ └───────────────┘ └───────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN EXCEPTIONS                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │      <<abstract>>           │
                    │      DomainException        │
                    ├─────────────────────────────┤
                    │ + code: string              │
                    │ + timestamp: Date           │
                    ├─────────────────────────────┤
                    │ + toJSON()                  │
                    └─────────────────────────────┘
                                △
                                │ extends
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│ Validation      │   │ NotFoundException │   │ BusinessRuleViolation   │
│ Exception       │   │                 │   │ Exception               │
├─────────────────┤   ├─────────────────┤   ├─────────────────────────┤
│ + field?: string│   │ + resourceType  │   │ + ruleName: string      │
│ + constraints[] │   │ + resourceId    │   │                         │
└─────────────────┘   └─────────────────┘   └─────────────────────────┘
```

## Relaciones

| Tipo | De | A | Descripción |
|------|----|----|-------------|
| Composición | Appointment | InsuredId | Appointment contiene InsuredId |
| Composición | Appointment | CountryISO | Appointment contiene CountryISO |
| Composición | Appointment | AppointmentStatus | Appointment contiene Status |
| Implementa | DynamoDBRepository | IAppointmentRepository | Implementación concreta |
| Herencia | AppointmentCreatedEvent | BaseDomainEvent | Evento específico |
| Herencia | ValidationException | DomainException | Excepción específica |
