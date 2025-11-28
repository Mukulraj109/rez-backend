#!/bin/bash

# Agent 4: Bulk Endpoints Testing Script
# Tests the 2 missing bulk operation endpoints

echo "🧪 Testing Bulk Operation Endpoints"
echo "====================================="
echo ""

# Configuration
BASE_URL="http://localhost:5001"
API_PREFIX="/api/merchant/bulk"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if JWT token is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./test-bulk-endpoints.sh <MERCHANT_JWT_TOKEN>${NC}"
    echo ""
    echo "Example:"
    echo "  ./test-bulk-endpoints.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    echo ""
    exit 1
fi

JWT_TOKEN="$1"

echo "📋 Configuration:"
echo "  Base URL: $BASE_URL"
echo "  API Prefix: $API_PREFIX"
echo ""

# Test 1: GET /api/merchant/bulk/products/template (CSV)
echo "-------------------------------------------"
echo "Test 1: Template Download (CSV)"
echo "-------------------------------------------"
echo "Endpoint: GET ${API_PREFIX}/products/template?format=csv"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${BASE_URL}${API_PREFIX}/products/template?format=csv" \
  -o template.csv)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success! HTTP Status: $HTTP_CODE${NC}"
    echo "   File saved: template.csv"
    if [ -f "template.csv" ]; then
        echo "   File size: $(ls -lh template.csv | awk '{print $5}')"
        echo "   First line: $(head -n1 template.csv)"
    fi
else
    echo -e "${RED}❌ Failed! HTTP Status: $HTTP_CODE${NC}"
    cat template.csv 2>/dev/null || echo "No response body"
fi
echo ""

# Test 2: GET /api/merchant/bulk/products/template (Excel)
echo "-------------------------------------------"
echo "Test 2: Template Download (Excel)"
echo "-------------------------------------------"
echo "Endpoint: GET ${API_PREFIX}/products/template?format=xlsx"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${BASE_URL}${API_PREFIX}/products/template?format=xlsx" \
  -o template.xlsx)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success! HTTP Status: $HTTP_CODE${NC}"
    echo "   File saved: template.xlsx"
    if [ -f "template.xlsx" ]; then
        echo "   File size: $(ls -lh template.xlsx | awk '{print $5}')"
    fi
else
    echo -e "${RED}❌ Failed! HTTP Status: $HTTP_CODE${NC}"
fi
echo ""

# Test 3: GET /api/merchant/bulk/products/export (CSV)
echo "-------------------------------------------"
echo "Test 3: Products Export (CSV)"
echo "-------------------------------------------"
echo "Endpoint: GET ${API_PREFIX}/products/export?format=csv"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${BASE_URL}${API_PREFIX}/products/export?format=csv" \
  -o export.csv)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success! HTTP Status: $HTTP_CODE${NC}"
    echo "   File saved: export.csv"
    if [ -f "export.csv" ]; then
        FILE_SIZE=$(ls -lh export.csv | awk '{print $5}')
        LINE_COUNT=$(wc -l < export.csv)
        echo "   File size: $FILE_SIZE"
        echo "   Total lines: $LINE_COUNT (including header)"
        echo "   Products exported: $((LINE_COUNT - 1))"
        echo "   First line: $(head -n1 export.csv)"
    fi
else
    echo -e "${RED}❌ Failed! HTTP Status: $HTTP_CODE${NC}"
    cat export.csv 2>/dev/null || echo "No response body"
fi
echo ""

# Test 4: GET /api/merchant/bulk/products/export (Excel)
echo "-------------------------------------------"
echo "Test 4: Products Export (Excel)"
echo "-------------------------------------------"
echo "Endpoint: GET ${API_PREFIX}/products/export?format=xlsx"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${BASE_URL}${API_PREFIX}/products/export?format=xlsx" \
  -o export.xlsx)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success! HTTP Status: $HTTP_CODE${NC}"
    echo "   File saved: export.xlsx"
    if [ -f "export.xlsx" ]; then
        echo "   File size: $(ls -lh export.xlsx | awk '{print $5}')"
    fi
else
    echo -e "${RED}❌ Failed! HTTP Status: $HTTP_CODE${NC}"
fi
echo ""

# Summary
echo "==========================================="
echo "📊 Test Summary"
echo "==========================================="
echo ""
echo "Files generated:"
ls -lh template.csv template.xlsx export.csv export.xlsx 2>/dev/null || echo "No files generated"
echo ""
echo "✨ All tests completed!"
echo ""
echo "To view CSV files:"
echo "  cat template.csv"
echo "  cat export.csv"
echo ""
