# ADR 001: Uso del Patrón CQRS

## Estado
Aceptado

## Contexto
El sistema de citas médicas requiere:
- Operaciones de escritura (crear citas) con procesamiento asíncrono
- Operaciones de lectura (consultar citas) con baja latencia
- Escalabilidad independiente para lecturas y escrituras
- Trazabilidad de cambios en el sistema

## Decisión
Implementamos CQRS (Command Query Responsibility Segregation) usando:
- **Commands**: CreateAppointment, ProcessAppointment, ConfirmAppointment
- **Queries**: GetAppointmentsByInsuredId
- **Handlers**: Lógica de negocio separada por responsabilidad

## Consecuencias

### Positivas
- Separación clara de responsabilidades
- Escalabilidad independiente de lectura/escritura
- Facilita el testing unitario
- Preparado para Event Sourcing si se requiere

### Negativas
- Mayor complejidad inicial
- Más archivos y abstracciones
- Curva de aprendizaje para nuevos desarrolladores

## Alternativas Consideradas
1. **CRUD tradicional**: Más simple pero menos escalable
2. **Event Sourcing completo**: Demasiado complejo para el alcance actual

## Referencias
- [CQRS Pattern - Microsoft](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [@nestjs/cqrs Documentation](https://docs.nestjs.com/recipes/cqrs)
