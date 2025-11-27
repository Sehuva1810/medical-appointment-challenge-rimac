# ADR 002: Uso de AWS CDK para Infraestructura

## Estado
Aceptado

## Contexto
Necesitamos una forma de:
- Definir infraestructura como código (IaC)
- Mantener consistencia entre ambientes (dev, prod)
- Facilitar revisiones de código de infraestructura
- Integrar con el flujo de CI/CD

## Decisión
Usamos AWS CDK (Cloud Development Kit) con TypeScript para definir toda la infraestructura AWS.

### Recursos Gestionados por CDK
- VPC con subnets públicas, privadas e isoladas
- DynamoDB con GSI para consultas por insuredId
- SNS Topic con filtros por país
- SQS Queues (PE, CL, Confirmation, DLQ)
- EventBridge Event Bus y Rules
- RDS MySQL por país (PE, CL)
- Lambda Functions
- API Gateway con API Key y Usage Plans
- IAM Roles y Policies (least privilege)

## Consecuencias

### Positivas
- Infraestructura tipada en TypeScript
- Reutilización de constructos
- Mejor integración con CI/CD
- Revisión de código de infraestructura
- Drift detection automático

### Negativas
- Requiere conocimiento de CDK
- Tiempo de síntesis más lento que CloudFormation directo
- Dependencia del SDK de AWS

## Alternativas Consideradas
1. **Serverless Framework**: Ya usado antes, menos control sobre IAM
2. **Terraform**: Multiplataforma pero sin tipado fuerte
3. **CloudFormation directo**: Verboso y propenso a errores

## Referencias
- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/)
- [CDK Patterns](https://cdkpatterns.com/)
