#!/bin/bash

# =============================================================================
# Start Local Development Environment
# Single script to start everything needed for testing with LocalStack
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# AWS credentials for LocalStack (required to avoid security token errors)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

echo "=========================================="
echo "Medical Appointment API - Local Start"
echo "=========================================="

# =============================================================================
# Step 0: Setup Node.js version (if nvm is available)
# =============================================================================
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    if nvm list 22 > /dev/null 2>&1; then
        echo -e "${YELLOW}→ Switching to Node.js 22...${NC}"
        nvm use 22
        echo -e "${GREEN}✓ Using Node.js $(node --version)${NC}"
    fi
fi

# =============================================================================
# Step 1: Check if Docker is running
# =============================================================================
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# =============================================================================
# Step 2: Start Docker containers if not running
# =============================================================================
echo -e "${YELLOW}→ Checking Docker containers...${NC}"

if ! docker ps | grep -q medical-api-localstack; then
    echo "  Starting Docker containers..."
    docker-compose up -d

    echo "  Waiting for containers to be ready..."
    sleep 10
else
    echo -e "${GREEN}✓ Containers already running${NC}"
fi

# =============================================================================
# Step 3: Wait for LocalStack
# =============================================================================
echo -e "${YELLOW}→ Waiting for LocalStack...${NC}"

MAX_ATTEMPTS=30
ATTEMPT=0

while ! curl -s http://localhost:4566/_localstack/health 2>/dev/null | grep -qE '"dynamodb":\s*"(available|running)"'; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}LocalStack did not become ready in time${NC}"
        exit 1
    fi
    sleep 2
done

echo -e "${GREEN}✓ LocalStack is ready${NC}"

# =============================================================================
# Step 4: Create AWS resources if they don't exist
# =============================================================================
echo -e "${YELLOW}→ Setting up AWS resources in LocalStack...${NC}"

# Create DynamoDB table
aws --endpoint-url=http://localhost:4566 dynamodb describe-table \
    --table-name medical-appointment-api-appointments-local \
    --region us-east-1 > /dev/null 2>&1 || \
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name medical-appointment-api-appointments-local \
    --attribute-definitions \
        AttributeName=appointmentId,AttributeType=S \
        AttributeName=insuredId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=appointmentId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"insuredId-createdAt-index","KeySchema":[{"AttributeName":"insuredId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1 > /dev/null 2>&1

# Create SNS Topic
aws --endpoint-url=http://localhost:4566 sns create-topic \
    --name medical-appointment-api-appointments-local \
    --region us-east-1 > /dev/null 2>&1 || true

echo -e "${GREEN}✓ AWS resources ready${NC}"

# =============================================================================
# Step 5: Kill any existing processes on ports 3000 and 3002
# =============================================================================
echo -e "${YELLOW}→ Checking for port conflicts...${NC}"
lsof -ti:3000,3002 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Ports available${NC}"

# =============================================================================
# Step 6: Start serverless offline
# =============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN}Starting API Server...${NC}"
echo "=========================================="
echo ""
echo "API will be available at: http://localhost:3000/local"
echo ""
echo "Test endpoints:"
echo "  POST http://localhost:3000/local/appointments"
echo "  GET  http://localhost:3000/local/appointments/{insuredId}"
echo ""
echo "Example curl commands:"
echo ""
echo '  # Create appointment (Peru)'
echo '  curl -X POST http://localhost:3000/local/appointments \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'\'''
echo ""
echo '  # Create appointment (Chile)'
echo '  curl -X POST http://localhost:3000/local/appointments \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"insuredId": "00002", "scheduleId": 200, "countryISO": "CL"}'\'''
echo ""
echo '  # Get appointments'
echo '  curl http://localhost:3000/local/appointments/00001'
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Load .env file and start serverless offline with 'local' stage
if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}→ Loading .env file...${NC}"
    set -a
    source "$PROJECT_DIR/.env"
    set +a
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
fi

npm run offline -- --stage local
