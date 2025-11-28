#!/bin/bash

# REZ Wallet API Test Script
# Run this after backend server starts

BASE_URL="http://localhost:5001/api/wallet"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMxNDVkNWYwMTY1MTVkOGViMzFjMGMiLCJyb2xlIjoidXNlciIsImlhdCI6MTc1OTE5NjM1MiwiZXhwIjoxNzU5MjgyNzUyfQ.CIza7AP8kgvtl6q2y3eKHoscj_uBNYCdLjDhA7_xJpk"

echo "🧪 Testing REZ Wallet API"
echo "========================="
echo ""

# Test 1: Get Balance (creates wallet if not exists)
echo "Test 1: GET /api/wallet/balance"
echo "--------------------------------"
curl -s -X GET "$BASE_URL/balance" \
  -H "Authorization: Bearer $TOKEN" \
  | json_pp
echo ""
echo ""

# Test 2: Topup Wallet
echo "Test 2: POST /api/wallet/topup (5000 RC)"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/topup" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "paymentMethod": "UPI",
    "paymentId": "TEST_PAY_001"
  }' \
  | json_pp
echo ""
echo ""

# Test 3: Get Balance After Topup
echo "Test 3: GET /api/wallet/balance (After Topup)"
echo "----------------------------------------------"
curl -s -X GET "$BASE_URL/balance" \
  -H "Authorization: Bearer $TOKEN" \
  | json_pp
echo ""
echo ""

# Test 4: Process Payment
echo "Test 4: POST /api/wallet/payment (1500 RC)"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500,
    "storeName": "Test Store",
    "description": "Test purchase for integration testing"
  }' \
  | json_pp
echo ""
echo ""

# Test 5: Get Transactions
echo "Test 5: GET /api/wallet/transactions"
echo "-------------------------------------"
curl -s -X GET "$BASE_URL/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | json_pp
echo ""
echo ""

# Test 6: Get Summary
echo "Test 6: GET /api/wallet/summary"
echo "--------------------------------"
curl -s -X GET "$BASE_URL/summary?period=month" \
  -H "Authorization: Bearer $TOKEN" \
  | json_pp
echo ""
echo ""

# Test 7: Get Categories Breakdown
echo "Test 7: GET /api/wallet/categories"
echo "-----------------------------------"
curl -s -X GET "$BASE_URL/categories" \
  -H "Authorization: Bearer $TOKEN" \
  | json_pp
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "Expected Results:"
echo "  • Test 1: Wallet created with 0 balance"
echo "  • Test 2: 5000 RC added"
echo "  • Test 3: Balance = 5000 RC"
echo "  • Test 4: 1500 RC spent"
echo "  • Test 5: 2 transactions (topup + payment)"
echo "  • Test 6: Credit: 5000, Debit: 1500"
echo "  • Test 7: 2 categories (topup, spending)"