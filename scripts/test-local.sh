#!/bin/bash

# =============================================================================
# Local Testing Script for Medical Appointment API
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000/local}"

echo "=========================================="
echo "Medical Appointment API - Local Testing"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$2" = "success" ]; then
        echo -e "${GREEN}✓ $1${NC}"
    elif [ "$2" = "error" ]; then
        echo -e "${RED}✗ $1${NC}"
    else
        echo -e "${YELLOW}→ $1${NC}"
    fi
}

# =============================================================================
# Test 1: Create Appointment (Peru)
# =============================================================================
echo ""
echo "1. Testing POST /appointments (Peru)"
echo "-----------------------------------"
RESPONSE_PE=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d '{
        "insuredId": "00001",
        "scheduleId": 100,
        "countryISO": "PE"
    }')

echo "Response: $RESPONSE_PE"
if echo "$RESPONSE_PE" | grep -q "appointmentId"; then
    print_status "Appointment created for Peru" "success"
    APPOINTMENT_ID_PE=$(echo "$RESPONSE_PE" | grep -o '"appointmentId":"[^"]*"' | cut -d'"' -f4)
    echo "Appointment ID (PE): $APPOINTMENT_ID_PE"
else
    print_status "Failed to create appointment for Peru" "error"
fi

# =============================================================================
# Test 2: Create Appointment (Chile)
# =============================================================================
echo ""
echo "2. Testing POST /appointments (Chile)"
echo "------------------------------------"
RESPONSE_CL=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d '{
        "insuredId": "00002",
        "scheduleId": 200,
        "countryISO": "CL"
    }')

echo "Response: $RESPONSE_CL"
if echo "$RESPONSE_CL" | grep -q "appointmentId"; then
    print_status "Appointment created for Chile" "success"
    APPOINTMENT_ID_CL=$(echo "$RESPONSE_CL" | grep -o '"appointmentId":"[^"]*"' | cut -d'"' -f4)
    echo "Appointment ID (CL): $APPOINTMENT_ID_CL"
else
    print_status "Failed to create appointment for Chile" "error"
fi

# =============================================================================
# Test 3: Get Appointments by InsuredId
# =============================================================================
echo ""
echo "3. Testing GET /appointments/{insuredId}"
echo "----------------------------------------"
RESPONSE_GET=$(curl -s -X GET "$BASE_URL/appointments/00001")

echo "Response: $RESPONSE_GET"
if echo "$RESPONSE_GET" | grep -q "appointments"; then
    print_status "Retrieved appointments for insuredId 00001" "success"
else
    print_status "Failed to retrieve appointments" "error"
fi

# =============================================================================
# Test 4: Validation - Invalid InsuredId
# =============================================================================
echo ""
echo "4. Testing Validation - Invalid InsuredId (too short)"
echo "-----------------------------------------------------"
RESPONSE_INVALID=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d '{
        "insuredId": "123",
        "scheduleId": 100,
        "countryISO": "PE"
    }')

echo "Response: $RESPONSE_INVALID"
if echo "$RESPONSE_INVALID" | grep -q "Validation Error"; then
    print_status "Validation working correctly" "success"
else
    print_status "Validation not working as expected" "error"
fi

# =============================================================================
# Test 5: Validation - Invalid CountryISO
# =============================================================================
echo ""
echo "5. Testing Validation - Invalid CountryISO"
echo "------------------------------------------"
RESPONSE_INVALID_COUNTRY=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d '{
        "insuredId": "00001",
        "scheduleId": 100,
        "countryISO": "US"
    }')

echo "Response: $RESPONSE_INVALID_COUNTRY"
if echo "$RESPONSE_INVALID_COUNTRY" | grep -q "Validation Error"; then
    print_status "Country validation working correctly" "success"
else
    print_status "Country validation not working as expected" "error"
fi

# =============================================================================
# Test 6: Missing Required Fields
# =============================================================================
echo ""
echo "6. Testing Validation - Missing Fields"
echo "--------------------------------------"
RESPONSE_MISSING=$(curl -s -X POST "$BASE_URL/appointments" \
    -H "Content-Type: application/json" \
    -d '{
        "insuredId": "00001"
    }')

echo "Response: $RESPONSE_MISSING"
if echo "$RESPONSE_MISSING" | grep -q "Bad Request"; then
    print_status "Missing fields validation working correctly" "success"
else
    print_status "Missing fields validation not working as expected" "error"
fi

echo ""
echo "=========================================="
echo "Testing Complete"
echo "=========================================="
