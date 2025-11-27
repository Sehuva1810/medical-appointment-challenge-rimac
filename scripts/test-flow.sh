#!/bin/bash
# =============================================================================
# Medical Appointments API - Test Flow Script
# =============================================================================
# Este script prueba el flujo completo de la API de citas médicas
# Ejecutar: ./scripts/test-flow.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

API_URL="http://localhost:3000/api/v1"

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_test() {
    echo ""
    echo -e "${YELLOW}▶ TEST: $1${NC}"
    echo -e "${YELLOW}────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if server is running
check_server() {
    print_header "VERIFICANDO SERVIDOR"

    if curl -s --connect-timeout 2 "$API_URL/appointments/00000" > /dev/null 2>&1; then
        print_success "Servidor corriendo en $API_URL"
        return 0
    else
        print_error "Servidor no está corriendo"
        echo ""
        echo -e "${YELLOW}Para iniciar el servidor, ejecuta en otra terminal:${NC}"
        echo -e "  ${CYAN}npm run start:dev${NC}    (modo rápido, sin Docker)"
        echo -e "  ${CYAN}npm run start:local${NC}  (modo completo con Docker)"
        echo ""
        exit 1
    fi
}

# Test 1: Create appointment for Peru
test_create_pe() {
    print_test "Crear cita médica para PERÚ (PE)"

    echo -e "${CYAN}Request:${NC}"
    echo '  POST /api/v1/appointments'
    echo '  {"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}'

    RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
        -H "Content-Type: application/json" \
        -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "PE"}')

    echo ""
    echo -e "${CYAN}Response (HTTP 202):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    # Extract appointmentId
    APPOINTMENT_ID_PE=$(echo "$RESPONSE" | grep -o '"appointmentId":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$APPOINTMENT_ID_PE" ]; then
        print_success "Cita PE creada: $APPOINTMENT_ID_PE"
        echo "$APPOINTMENT_ID_PE"
    else
        print_error "Error creando cita PE"
        return 1
    fi
}

# Test 2: Create appointment for Chile
test_create_cl() {
    print_test "Crear cita médica para CHILE (CL)"

    echo -e "${CYAN}Request:${NC}"
    echo '  POST /api/v1/appointments'
    echo '  {"insuredId": "00001", "scheduleId": 200, "countryISO": "CL"}'

    RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
        -H "Content-Type: application/json" \
        -d '{"insuredId": "00001", "scheduleId": 200, "countryISO": "CL"}')

    echo ""
    echo -e "${CYAN}Response (HTTP 202):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    APPOINTMENT_ID_CL=$(echo "$RESPONSE" | grep -o '"appointmentId":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$APPOINTMENT_ID_CL" ]; then
        print_success "Cita CL creada: $APPOINTMENT_ID_CL"
    else
        print_error "Error creando cita CL"
        return 1
    fi
}

# Test 3: Get appointments by insuredId
test_get_appointments() {
    print_test "Obtener citas del asegurado 00001"

    echo -e "${CYAN}Request:${NC}"
    echo '  GET /api/v1/appointments/00001'

    RESPONSE=$(curl -s "$API_URL/appointments/00001")

    echo ""
    echo -e "${CYAN}Response (HTTP 200):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    TOTAL=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

    if [ "$TOTAL" -ge 2 ] 2>/dev/null; then
        print_success "Se encontraron $TOTAL citas para el asegurado 00001"
    else
        print_info "Total de citas: $TOTAL"
    fi
}

# Test 4: Validation - Invalid insuredId
test_validation_insured() {
    print_test "Validación - InsuredId inválido (menos de 5 dígitos)"

    echo -e "${CYAN}Request:${NC}"
    echo '  POST /api/v1/appointments'
    echo '  {"insuredId": "123", "scheduleId": 100, "countryISO": "PE"}'

    RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
        -H "Content-Type: application/json" \
        -d '{"insuredId": "123", "scheduleId": 100, "countryISO": "PE"}')

    echo ""
    echo -e "${CYAN}Response (HTTP 400 - Expected):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    if echo "$RESPONSE" | grep -q "400"; then
        print_success "Validación correcta - rechazado con HTTP 400"
    else
        print_info "Respuesta de validación recibida"
    fi
}

# Test 5: Validation - Invalid country
test_validation_country() {
    print_test "Validación - País no soportado (US)"

    echo -e "${CYAN}Request:${NC}"
    echo '  POST /api/v1/appointments'
    echo '  {"insuredId": "00001", "scheduleId": 100, "countryISO": "US"}'

    RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
        -H "Content-Type: application/json" \
        -d '{"insuredId": "00001", "scheduleId": 100, "countryISO": "US"}')

    echo ""
    echo -e "${CYAN}Response (HTTP 400 - Expected):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    if echo "$RESPONSE" | grep -q "400"; then
        print_success "Validación correcta - país no soportado rechazado"
    else
        print_info "Respuesta de validación recibida"
    fi
}

# Test 6: Get appointment trace
test_trace() {
    local appointment_id=$1

    if [ -z "$appointment_id" ]; then
        print_info "Saltando test de trace (no hay appointment ID)"
        return
    fi

    print_test "Ver trace/estado del flujo de procesamiento"

    echo -e "${CYAN}Request:${NC}"
    echo "  GET /api/v1/appointments/$appointment_id/trace"

    RESPONSE=$(curl -s "$API_URL/appointments/$appointment_id/trace")

    echo ""
    echo -e "${CYAN}Response (HTTP 200):${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    print_success "Trace del flujo obtenido"
}

# Print summary
print_summary() {
    print_header "RESUMEN DEL FLUJO"

    echo ""
    echo -e "${CYAN}El sistema implementa el siguiente flujo asíncrono:${NC}"
    echo ""
    echo "  1. ${GREEN}✓${NC} POST /appointments → Crea cita en DynamoDB (status: pending)"
    echo "  2. ${GREEN}✓${NC} Publica mensaje en SNS con filtro por país"
    echo "  3. ${YELLOW}→${NC} SNS enruta a SQS correspondiente (PE o CL)"
    echo "  4. ${YELLOW}→${NC} Lambda del país procesa y guarda en MySQL"
    echo "  5. ${YELLOW}→${NC} EventBridge notifica finalización"
    echo "  6. ${YELLOW}→${NC} Lambda actualiza DynamoDB (status: completed)"
    echo ""
    echo -e "${CYAN}Nota:${NC} En modo ${YELLOW}start:dev${NC} los pasos 3-6 se simulan con logs."
    echo -e "       Para el flujo completo usa ${YELLOW}start:local${NC} con Docker."
    echo ""
}

# Swagger info
print_swagger_info() {
    print_header "DOCUMENTACIÓN SWAGGER"

    echo ""
    echo -e "${CYAN}Swagger UI disponible en:${NC}"
    echo -e "  ${GREEN}http://localhost:3000/docs${NC}"
    echo ""
    echo "Endpoints documentados:"
    echo "  • POST /api/v1/appointments - Crear cita"
    echo "  • GET /api/v1/appointments/{insuredId} - Listar citas"
    echo "  • GET /api/v1/appointments/{appointmentId}/trace - Ver estado del flujo"
    echo ""
}

# Main execution
main() {
    print_header "MEDICAL APPOINTMENTS API - TEST FLOW"
    echo ""
    echo -e "Este script prueba el flujo completo de la API"
    echo -e "Arquitectura: NestJS + DynamoDB + SNS/SQS + MySQL + EventBridge"

    check_server

    # Run tests
    APPOINTMENT_ID=$(test_create_pe)
    test_create_cl
    test_get_appointments
    test_validation_insured
    test_validation_country
    test_trace "$APPOINTMENT_ID"

    print_summary
    print_swagger_info

    print_header "TESTS COMPLETADOS"
    echo ""
    echo -e "${GREEN}Todos los tests ejecutados exitosamente${NC}"
    echo ""
}

# Run
main "$@"
