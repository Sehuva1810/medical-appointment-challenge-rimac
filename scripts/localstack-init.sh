#!/bin/bash
# Script de inicialización de LocalStack
# Se ejecuta automáticamente cuando LocalStack está listo

set -e

echo "Inicializando recursos AWS en LocalStack..."

# Configurar AWS CLI para LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""  # Deshabilitar pager para evitar 'less'

# Función para llamar AWS CLI con endpoint de LocalStack
aws_local() {
    aws --endpoint-url=http://localhost:4566 "$@"
}

# Crear tabla DynamoDB
echo "Creando tabla DynamoDB..."
aws_local dynamodb create-table \
    --table-name appointments \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=insuredId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        '[{
            "IndexName": "insuredId-index",
            "KeySchema": [
                {"AttributeName": "insuredId", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    2>/dev/null || echo "Tabla ya existe"

# Crear Topics SNS
echo "Creando Topics SNS..."
# Topic principal para el flujo
TOPIC_ARN=$(aws_local sns create-topic --name appointments-topic --query 'TopicArn' --output text)
echo "Topic ARN: $TOPIC_ARN"

# Topic adicional usado por NestJS (si está configurado diferente)
TOPIC_ARN_ALT=$(aws_local sns create-topic --name medical-appointment-api-appointments-local --query 'TopicArn' --output text)
echo "Topic ARN (alt): $TOPIC_ARN_ALT"

# Crear Colas SQS
echo "Creando colas SQS..."
aws_local sqs create-queue --queue-name appointments-pe-queue
aws_local sqs create-queue --queue-name appointments-cl-queue
aws_local sqs create-queue --queue-name appointments-confirmation-queue
aws_local sqs create-queue --queue-name appointments-dlq

# Obtener URLs de colas
PE_QUEUE_URL=$(aws_local sqs get-queue-url --queue-name appointments-pe-queue --query 'QueueUrl' --output text)
CL_QUEUE_URL=$(aws_local sqs get-queue-url --queue-name appointments-cl-queue --query 'QueueUrl' --output text)
CONFIRM_QUEUE_URL=$(aws_local sqs get-queue-url --queue-name appointments-confirmation-queue --query 'QueueUrl' --output text)

# Obtener ARNs de colas
PE_QUEUE_ARN=$(aws_local sqs get-queue-attributes --queue-url $PE_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
CL_QUEUE_ARN=$(aws_local sqs get-queue-attributes --queue-url $CL_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
CONFIRM_QUEUE_ARN=$(aws_local sqs get-queue-attributes --queue-url $CONFIRM_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Suscribir colas a SNS con filtros por país
echo "Configurando suscripciones SNS -> SQS con filtros..."

# Suscripción para Perú (PE)
aws_local sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol sqs \
    --notification-endpoint $PE_QUEUE_ARN \
    --attributes '{"FilterPolicy":"{\"countryISO\":[\"PE\"]}"}'

# Suscripción para Chile (CL)
aws_local sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol sqs \
    --notification-endpoint $CL_QUEUE_ARN \
    --attributes '{"FilterPolicy":"{\"countryISO\":[\"CL\"]}"}'

# Suscripciones para el topic alternativo usado por NestJS
echo "Creando suscripciones para topic NestJS..."
aws_local sns subscribe \
    --topic-arn $TOPIC_ARN_ALT \
    --protocol sqs \
    --notification-endpoint $PE_QUEUE_ARN \
    --attributes '{"FilterPolicy":"{\"countryISO\":[\"PE\"]}"}'

aws_local sns subscribe \
    --topic-arn $TOPIC_ARN_ALT \
    --protocol sqs \
    --notification-endpoint $CL_QUEUE_ARN \
    --attributes '{"FilterPolicy":"{\"countryISO\":[\"CL\"]}"}'

# Crear EventBridge Event Bus
echo "Creando EventBridge Event Bus..."
aws_local events create-event-bus --name appointments-bus 2>/dev/null || echo "Event Bus ya existe"

# Crear regla para appointment.completed
echo "Creando regla de EventBridge..."
aws_local events put-rule \
    --name appointment-completed-rule \
    --event-bus-name appointments-bus \
    --event-pattern '{"source":["medical-appointments"],"detail-type":["appointment.completed"]}'

# Agregar target a la regla (SQS confirmation queue)
aws_local events put-targets \
    --rule appointment-completed-rule \
    --event-bus-name appointments-bus \
    --targets "Id"="confirmation-queue","Arn"="$CONFIRM_QUEUE_ARN"

echo ""
echo "=========================================="
echo "LocalStack inicializado correctamente!"
echo "=========================================="
echo ""
echo "Recursos creados:"
echo "  - DynamoDB Table: appointments"
echo "  - SNS Topic: $TOPIC_ARN"
echo "  - SQS Queue PE: $PE_QUEUE_URL"
echo "  - SQS Queue CL: $CL_QUEUE_URL"
echo "  - SQS Queue Confirmation: $CONFIRM_QUEUE_URL"
echo "  - EventBridge Bus: appointments-bus"
echo ""
