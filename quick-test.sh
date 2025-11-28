#!/bin/bash

# Quick Test Script for Backend API
# Run this after starting the backend server
# Usage: bash quick-test.sh

BASE_URL="http://localhost:5001"
API_PREFIX="/api"

echo "=========================================="
echo "  QUICK BACKEND API TEST"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
  TOTAL=$((TOTAL + 1))
  local name=$1
  local url=$2
  local method=${3:-GET}
  local data=${4:-}
  local auth=${5:-}

  echo -e "${BLUE}Testing: $name${NC}"

  if [ "$method" = "GET" ]; then
    if [ -z "$auth" ]; then
      response=$(curl -s -w "\n%{http_code}" "$url")
    else
      response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $auth" "$url")
    fi
  else
    if [ -z "$auth" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $auth" -d "$data" "$url")
    fi
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
    echo "$body" | python -m json.tool 2>/dev/null | head -5 || echo "$body" | head -5
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    FAILED=$((FAILED + 1))
    echo "$body"
  fi
  echo ""
}

# 1. Check backend health
echo "=========================================="
echo "  1. HEALTH CHECK"
echo "=========================================="
echo ""
test_endpoint "Backend Health" "$BASE_URL/health"

# 2. Test Authentication
echo "=========================================="
echo "  2. AUTHENTICATION"
echo "=========================================="
echo ""

# Send OTP
echo "Sending OTP..."
otp_response=$(curl -s -X POST "$BASE_URL$API_PREFIX/user/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"test@example.com"}')

dev_otp=$(echo "$otp_response" | grep -o '"devOtp":"[^"]*"' | cut -d'"' -f4)

if [ -z "$dev_otp" ]; then
  dev_otp="123456"
fi

test_endpoint "Send OTP" "$BASE_URL$API_PREFIX/user/auth/send-otp" "POST" '{"phoneNumber":"9876543210","email":"test@example.com"}'

# Verify OTP and get token
echo "Verifying OTP..."
verify_response=$(curl -s -X POST "$BASE_URL$API_PREFIX/user/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"9876543210\",\"otp\":\"$dev_otp\"}")

AUTH_TOKEN=$(echo "$verify_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

test_endpoint "Verify OTP" "$BASE_URL$API_PREFIX/user/auth/verify-otp" "POST" "{\"phoneNumber\":\"9876543210\",\"otp\":\"$dev_otp\"}"

# 3. Test Data APIs
echo "=========================================="
echo "  3. DATA APIs"
echo "=========================================="
echo ""

test_endpoint "Products API" "$BASE_URL$API_PREFIX/products?page=1&limit=10"
test_endpoint "Featured Products" "$BASE_URL$API_PREFIX/products/featured"
test_endpoint "Stores API" "$BASE_URL$API_PREFIX/stores?page=1&limit=10"
test_endpoint "Offers API" "$BASE_URL$API_PREFIX/offers"
test_endpoint "Videos API" "$BASE_URL$API_PREFIX/videos"
test_endpoint "Projects API" "$BASE_URL$API_PREFIX/projects"
test_endpoint "Categories API" "$BASE_URL$API_PREFIX/categories"
test_endpoint "Homepage API" "$BASE_URL$API_PREFIX/homepage"

# 4. Test Protected Endpoints
if [ -n "$AUTH_TOKEN" ]; then
  echo "=========================================="
  echo "  4. PROTECTED ENDPOINTS"
  echo "=========================================="
  echo ""

  test_endpoint "Get Current User" "$BASE_URL$API_PREFIX/user/auth/me" "GET" "" "$AUTH_TOKEN"
  test_endpoint "Get Cart" "$BASE_URL$API_PREFIX/cart" "GET" "" "$AUTH_TOKEN"
  test_endpoint "Get Wishlist" "$BASE_URL$API_PREFIX/wishlist" "GET" "" "$AUTH_TOKEN"
else
  echo -e "${YELLOW}⚠ Skipping protected endpoint tests (no auth token)${NC}"
  echo ""
fi

# 5. Summary
echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
  exit 0
else
  PASS_RATE=$((PASSED * 100 / TOTAL))
  echo -e "\nPass Rate: $PASS_RATE%\n"
  echo -e "${YELLOW}⚠ Some tests failed. Run 'node comprehensive-api-test.js' for detailed results.${NC}\n"
  exit 1
fi
