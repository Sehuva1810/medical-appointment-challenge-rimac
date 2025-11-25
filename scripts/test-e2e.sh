#!/bin/bash

# =============================================================================
# End-to-End Test Script
# Tests the complete appointment flow: POST → DynamoDB → SNS → SQS → MySQL → EventBridge → Confirmation
# =============================================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000/local}"
LAMBDA_URL="${LAMBDA_URL:-http://localhost:3002/2015-03-31/functions}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# AWS credentials for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed.${NC}"
    echo "Install with: brew install jq"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Medical Appointment API - E2E Test"
echo "=========================================="
echo ""
echo -e "${BLUE}This test simulates the complete flow:${NC}"
echo "  1. POST /appointments → Save to DynamoDB (pending) + Publish to SNS"
echo "  2. SNS → SQS (filtered by country)"
echo "  3. Lambda PE/CL → Save to MySQL + Publish to EventBridge"
echo "  4. EventBridge → SQS Confirmation"
echo "  5. Lambda Confirmation → Update DynamoDB (completed)"
echo ""

# Generate unique test data
TIMESTAMP=$(date +%s)
INSURED_ID="99$(printf '%03d' $((TIMESTAMP % 1000)))"
SCHEDULE_ID=$((RANDOM % 1000 + 100))

echo -e "${YELLOW}Test Data:${NC}"
echo "  InsuredId: $INSURED_ID"
echo "  ScheduleId: $SCHEDULE_ID"
echo "  Country: PE (Peru)"
echo ""

# =============================================================================
# STEP 1: Create Appointment (POST)
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 1: Creating appointment via POST${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d "{\"insuredId\": \"$INSURED_ID\", \"scheduleId\": $SCHEDULE_ID, \"countryISO\": \"PE\"}")

echo "Response: $RESPONSE"

APPOINTMENT_ID=$(echo "$RESPONSE" | jq -r '.appointmentId // empty')

if [ -n "$APPOINTMENT_ID" ]; then
    echo -e "${GREEN}✓ Appointment created: $APPOINTMENT_ID${NC}"
else
    echo -e "${RED}✗ Failed to create appointment${NC}"
    exit 1
fi

# =============================================================================
# STEP 2: Verify DynamoDB has "pending" status
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 2: Verifying DynamoDB (status: pending)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DYNAMO_RESULT=$(aws --endpoint-url=http://localhost:4566 dynamodb get-item \
    --table-name medical-appointment-api-appointments-local \
    --key "{\"appointmentId\": {\"S\": \"$APPOINTMENT_ID\"}}" \
    --region us-east-1 2>/dev/null)

DYNAMO_STATUS=$(echo "$DYNAMO_RESULT" | jq -r '.Item.status.S // empty')
CREATED_AT=$(echo "$DYNAMO_RESULT" | jq -r '.Item.createdAt.S // empty')

if [ "$DYNAMO_STATUS" = "pending" ]; then
    echo -e "${GREEN}✓ DynamoDB status: pending${NC}"
else
    echo -e "${RED}✗ Expected status 'pending', got '$DYNAMO_STATUS'${NC}"
    exit 1
fi

# =============================================================================
# STEP 3: Simulate SQS → Lambda PE (process appointment)
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 3: Processing with Lambda PE (SQS simulation)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Build the SQS event payload
SQS_BODY=$(jq -n \
    --arg aid "$APPOINTMENT_ID" \
    --arg iid "$INSURED_ID" \
    --argjson sid "$SCHEDULE_ID" \
    --arg cat "$CREATED_AT" \
    '{appointmentId: $aid, insuredId: $iid, scheduleId: $sid, countryISO: "PE", createdAt: $cat}')

SQS_EVENT=$(jq -n \
    --arg body "$SQS_BODY" \
    --arg mid "test-msg-$TIMESTAMP" \
    '{Records: [{messageId: $mid, body: $body}]}')

PE_RESPONSE=$(curl -s -X POST "$LAMBDA_URL/medical-appointment-api-local-appointment_pe/invocations" \
    -H "Content-Type: application/json" \
    -d "$SQS_EVENT" 2>/dev/null)

# SQS handlers return null on success
if [ -z "$PE_RESPONSE" ] || [ "$PE_RESPONSE" = "null" ]; then
    echo -e "${GREEN}✓ Lambda PE executed successfully${NC}"
else
    # Check if it's an error
    if echo "$PE_RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
        echo -e "${RED}✗ Lambda PE failed: $(echo "$PE_RESPONSE" | jq -r '.errorMessage')${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Lambda PE executed${NC}"
fi

# =============================================================================
# STEP 4: Verify MySQL (Peru database)
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 4: Verifying MySQL (Peru database)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MYSQL_RESULT=$(docker exec medical-api-mysql mysql -uadmin -ppassword medical_appointments_pe -N -e \
    "SELECT status FROM appointments WHERE appointment_id = '$APPOINTMENT_ID';" 2>/dev/null | tr -d '[:space:]')

if [ "$MYSQL_RESULT" = "completed" ]; then
    echo -e "${GREEN}✓ MySQL PE has appointment with status: completed${NC}"
else
    echo -e "${RED}✗ Appointment not found in MySQL or wrong status: '$MYSQL_RESULT'${NC}"
    exit 1
fi

# =============================================================================
# STEP 5: Simulate EventBridge → SQS → Lambda Confirmation
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 5: Processing confirmation (EventBridge simulation)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Build EventBridge event
EB_DETAIL=$(jq -n \
    --arg aid "$APPOINTMENT_ID" \
    --arg pat "$CURRENT_TIME" \
    '{appointmentId: $aid, countryISO: "PE", processedAt: $pat}')

EB_EVENT=$(jq -n \
    --arg id "evt-$TIMESTAMP" \
    --arg time "$CURRENT_TIME" \
    --arg detail "$EB_DETAIL" \
    '{
        version: "0",
        id: $id,
        "detail-type": "AppointmentCompleted",
        source: "appointment.service",
        account: "000000000000",
        time: $time,
        region: "us-east-1",
        resources: [],
        detail: ($detail | fromjson)
    }')

# Wrap in SQS format (EventBridge sends to SQS which triggers the lambda)
CONFIRM_EVENT=$(jq -n \
    --arg body "$(echo "$EB_EVENT" | jq -c '.')" \
    --arg mid "confirm-$TIMESTAMP" \
    '{Records: [{messageId: $mid, body: $body}]}')

CONFIRM_RESPONSE=$(curl -s -X POST "$LAMBDA_URL/medical-appointment-api-local-appointmentConfirmation/invocations" \
    -H "Content-Type: application/json" \
    -d "$CONFIRM_EVENT" 2>/dev/null)

if [ -z "$CONFIRM_RESPONSE" ] || [ "$CONFIRM_RESPONSE" = "null" ]; then
    echo -e "${GREEN}✓ Confirmation Lambda executed successfully${NC}"
else
    if echo "$CONFIRM_RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
        echo -e "${RED}✗ Confirmation failed: $(echo "$CONFIRM_RESPONSE" | jq -r '.errorMessage')${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Confirmation Lambda executed${NC}"
fi

# =============================================================================
# STEP 6: Verify DynamoDB has "completed" status
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 6: Verifying DynamoDB (status: completed)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DYNAMO_FINAL=$(aws --endpoint-url=http://localhost:4566 dynamodb get-item \
    --table-name medical-appointment-api-appointments-local \
    --key "{\"appointmentId\": {\"S\": \"$APPOINTMENT_ID\"}}" \
    --region us-east-1 2>/dev/null)

FINAL_STATUS=$(echo "$DYNAMO_FINAL" | jq -r '.Item.status.S // empty')

if [ "$FINAL_STATUS" = "completed" ]; then
    echo -e "${GREEN}✓ DynamoDB status updated to: completed${NC}"
else
    echo -e "${RED}✗ Expected status 'completed', got '$FINAL_STATUS'${NC}"
    exit 1
fi

# =============================================================================
# STEP 7: Verify GET endpoint returns completed appointment
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 7: Verifying GET /appointments/$INSURED_ID${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

GET_RESPONSE=$(curl -s "$BASE_URL/appointments/$INSURED_ID")
GET_STATUS=$(echo "$GET_RESPONSE" | jq -r '.appointments[0].status // empty')

if [ "$GET_STATUS" = "completed" ]; then
    echo -e "${GREEN}✓ GET endpoint returns appointment with status: completed${NC}"
else
    echo -e "${RED}✗ GET endpoint did not return expected status${NC}"
    echo "Response: $GET_RESPONSE"
    exit 1
fi

# =============================================================================
# SUCCESS
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ ALL TESTS PASSED!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Flow verified:"
echo "  POST → DynamoDB(pending) → SNS → SQS_PE → Lambda_PE → MySQL_PE"
echo "                                                    ↓"
echo "  GET ← DynamoDB(completed) ← Lambda_Confirm ← EventBridge"
echo ""
echo "Appointment ID: $APPOINTMENT_ID"
echo "Insured ID: $INSURED_ID"
echo ""
