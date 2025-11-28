#!/bin/bash

# Authentication Fixes Testing Script
# This script tests all the authentication endpoint fixes

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Authentication Endpoint Fixes - Testing Script        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:5000/api/auth"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name=$1
    local endpoint=$2
    local payload=$3
    local expected_success=$4

    TESTS_RUN=$((TESTS_RUN + 1))
    echo ""
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${YELLOW}TEST #${TESTS_RUN}: ${test_name}${NC}"
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📤 Request:"
    echo "   Endpoint: POST ${endpoint}"
    echo "   Payload:  ${payload}"
    echo ""

    response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -d "${payload}")

    echo "📥 Response:"
    echo "${response}" | jq '.'
    echo ""

    success=$(echo "${response}" | jq -r '.success')

    if [ "$success" == "$expected_success" ]; then
        echo "${GREEN}✅ PASS${NC} - Test passed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "${RED}❌ FAIL${NC} - Expected success: ${expected_success}, got: ${success}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # Extract devOtp if available
    if [ "$success" == "true" ] && [[ "$endpoint" == "/send-otp" ]]; then
        DEV_OTP=$(echo "${response}" | jq -r '.data.devOtp // empty')
        if [ ! -z "$DEV_OTP" ]; then
            echo ""
            echo "${GREEN}🔑 Dev OTP: ${DEV_OTP}${NC}"
        fi
    fi
}

echo ""
echo "Starting tests..."
echo ""

# Test 1: Send OTP with plain 10-digit phone number
run_test \
    "Send OTP - Plain 10-digit format" \
    "/send-otp" \
    '{"phoneNumber": "9876543210", "email": "test1@example.com"}' \
    "true"

# Test 2: Send OTP with +91 prefix
run_test \
    "Send OTP - +91 prefix format" \
    "/send-otp" \
    '{"phoneNumber": "+919876543211", "email": "test2@example.com"}' \
    "true"

# Test 3: Send OTP with 91 prefix
run_test \
    "Send OTP - 91 prefix format" \
    "/send-otp" \
    '{"phoneNumber": "919876543212", "email": "test3@example.com"}' \
    "true"

# Test 4: Send OTP with space after country code
run_test \
    "Send OTP - Format with space (+91 XXXXXXXXXX)" \
    "/send-otp" \
    '{"phoneNumber": "+91 9876543213", "email": "test4@example.com"}' \
    "true"

# Test 5: Existing user login (no email)
run_test \
    "Login - Existing user without email" \
    "/send-otp" \
    '{"phoneNumber": "9876543210"}' \
    "true"

# Test 6: New user without email (should fail)
run_test \
    "Signup - New user without email (should fail)" \
    "/send-otp" \
    '{"phoneNumber": "9999999999"}' \
    "false"

# Test 7: Verify OTP with development bypass
if [ ! -z "$DEV_OTP" ]; then
    run_test \
        "Verify OTP - Using devOtp from response" \
        "/verify-otp" \
        "{\"phoneNumber\": \"9876543210\", \"otp\": \"${DEV_OTP}\"}" \
        "true"
fi

# Test 8: Verify OTP with development bypass (123456)
run_test \
    "Verify OTP - Development bypass (123456)" \
    "/verify-otp" \
    '{"phoneNumber": "9876543210", "otp": "123456"}' \
    "true"

# Test 9: Verify OTP with different phone format
run_test \
    "Verify OTP - Different phone format (+91)" \
    "/verify-otp" \
    '{"phoneNumber": "+919876543210", "otp": "123789"}' \
    "true"

# Test 10: Invalid OTP (wrong format)
run_test \
    "Verify OTP - Wrong OTP (should fail)" \
    "/verify-otp" \
    '{"phoneNumber": "9876543210", "otp": "000000"}' \
    "false"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:  ${TESTS_RUN}"
echo "${GREEN}Passed:       ${TESTS_PASSED}${NC}"
echo "${RED}Failed:       ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi
