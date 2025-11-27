#!/bin/bash
# Script para iniciar el ambiente de desarrollo local
# Levanta Docker, inicializa LocalStack y arranca NestJS

set -e

echo "=================================================="
echo "Medical Appointments API - Ambiente Local"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no está instalado${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker no está corriendo. Por favor inicia Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}Docker está corriendo...${NC}"

# Detener contenedores anteriores
echo -e "${YELLOW}Deteniendo contenedores anteriores...${NC}"
docker-compose down -v 2>/dev/null || true

# Levantar contenedores
echo -e "${YELLOW}Levantando contenedores Docker...${NC}"
docker-compose up -d

# Esperar a que LocalStack esté listo
echo -e "${YELLOW}Esperando a que LocalStack esté listo...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:4566/_localstack/health | grep -q '"dynamodb": "available"'; then
        echo -e "${GREEN}LocalStack está listo!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Intento $attempt de $max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Error: LocalStack no respondió a tiempo${NC}"
    exit 1
fi

# Esperar a MySQL
echo -e "${YELLOW}Esperando a que MySQL esté listo...${NC}"
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec medical-api-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo -e "${GREEN}MySQL está listo!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Intento $attempt de $max_attempts..."
    sleep 2
done

# Inicializar recursos de LocalStack
echo -e "${YELLOW}Inicializando recursos AWS en LocalStack...${NC}"
chmod +x ./scripts/localstack-init.sh
./scripts/localstack-init.sh

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm install
fi

# Compilar proyecto
echo -e "${YELLOW}Compilando proyecto...${NC}"
npm run build

# Configurar variables de entorno para LocalStack
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export STAGE=local

# Iniciar servidor NestJS
echo ""
echo -e "${GREEN}=================================================="
echo "Servidor listo!"
echo "==================================================${NC}"
echo ""
echo "API: http://localhost:3000/api/v1"
echo "Swagger: http://localhost:3000/docs"
echo ""
echo "Endpoints disponibles:"
echo "  POST /api/v1/appointments - Crear cita"
echo "  GET /api/v1/appointments/:insuredId - Obtener citas"
echo ""
echo "Usando servicios reales:"
echo "  - DynamoDB (LocalStack): $AWS_ENDPOINT_URL"
echo "  - SNS/SQS (LocalStack): $AWS_ENDPOINT_URL"
echo "  - MySQL: localhost:3306"
echo ""

npm run start:dev
