# ADR 003: Aplicación de Domain-Driven Design (DDD)

## Estado
Aceptado

## Contexto
El sistema de citas médicas tiene reglas de negocio específicas que deben ser encapsuladas y protegidas de cambios técnicos.

## Decisión
Implementamos DDD con los siguientes patrones:

### Aggregate Root
- `Appointment`: Entidad principal que encapsula toda la lógica de citas

### Value Objects
- `InsuredId`: Validación de formato (5 dígitos)
- `CountryISO`: Países válidos (PE, CL) con configuración
- `AppointmentStatus`: Máquina de estados con transiciones válidas

### Domain Events
- `AppointmentCreated`
- `AppointmentProcessing`
- `AppointmentCompleted`
- `AppointmentFailed`

### Repository Pattern
- `IAppointmentRepository`: Abstracción para DynamoDB
- `IMySQLAppointmentRepository`: Abstracción para MySQL
- `IMessagePublisher`: Abstracción para SNS
- `IEventPublisher`: Abstracción para EventBridge

### Domain Exceptions
- `ValidationException`
- `NotFoundException`
- `BusinessRuleViolationException`
- `InfrastructureException`

## Consecuencias

### Positivas
- Lógica de negocio aislada y testeable
- Ubiquitous Language en el código
- Cambios técnicos no afectan el dominio
- Value Objects inmutables previenen bugs

### Negativas
- Más código boilerplate
- Curva de aprendizaje DDD
- Overhead para sistemas simples

## Referencias
- "Domain-Driven Design" - Eric Evans
- "Implementing Domain-Driven Design" - Vaughn Vernon
