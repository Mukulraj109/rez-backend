@echo off
echo ========================================
echo Testing Loyalty Points Credit Endpoint
echo ========================================
echo.

set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVmNGQ0MTA2MWZhYWYwNDUyMjI1MDYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MTYzNzk0MiwiZXhwIjoxNzYxNzI0MzQyfQ.d_RKprSZO8CT-7v9HUzwVpHPLXWVpCeaIY-2udc9FCI

echo Step 1: Getting current wallet balance...
echo.
curl -X GET http://localhost:5001/api/wallet/balance ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo Step 2: Crediting 50 loyalty points...
echo.
curl -X POST http://localhost:5001/api/wallet/credit-loyalty-points ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"amount\": 50, \"source\": {\"type\": \"test\", \"description\": \"Test credit\"}}"
echo.
echo.

echo Step 3: Verifying new balance...
echo.
curl -X GET http://localhost:5001/api/wallet/balance ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo ========================================
echo Test Complete!
echo ========================================
pause
