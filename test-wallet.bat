@echo off
REM REZ Wallet API Test Script for Windows
REM Run this after backend server starts

set BASE_URL=http://localhost:5001/api/wallet
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMxNDVkNWYwMTY1MTVkOGViMzFjMGMiLCJyb2xlIjoidXNlciIsImlhdCI6MTc1OTE5NjM1MiwiZXhwIjoxNzU5MjgyNzUyfQ.CIza7AP8kgvtl6q2y3eKHoscj_uBNYCdLjDhA7_xJpk

echo.
echo ================================
echo    REZ Wallet API Tests
echo ================================
echo.

echo Test 1: GET /api/wallet/balance
echo --------------------------------
curl -X GET "%BASE_URL%/balance" -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo Test 2: POST /api/wallet/topup (5000 RC)
echo ----------------------------------------
curl -X POST "%BASE_URL%/topup" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"amount\": 5000, \"paymentMethod\": \"UPI\", \"paymentId\": \"TEST_PAY_001\"}"
echo.
echo.

echo Test 3: GET /api/wallet/balance (After Topup)
echo ----------------------------------------------
curl -X GET "%BASE_URL%/balance" -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo Test 4: POST /api/wallet/payment (1500 RC)
echo -------------------------------------------
curl -X POST "%BASE_URL%/payment" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"amount\": 1500, \"storeName\": \"Test Store\", \"description\": \"Test purchase\"}"
echo.
echo.

echo Test 5: GET /api/wallet/transactions
echo -------------------------------------
curl -X GET "%BASE_URL%/transactions?page=1&limit=10" -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo Test 6: GET /api/wallet/summary
echo --------------------------------
curl -X GET "%BASE_URL%/summary?period=month" -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo.
echo ================================
echo    All Tests Completed!
echo ================================
echo.
echo Expected Results:
echo   - Test 1: Wallet created with 0 balance
echo   - Test 2: 5000 RC added successfully
echo   - Test 3: Balance = 5000 RC
echo   - Test 4: 1500 RC spent successfully
echo   - Test 5: 2 transactions visible
echo   - Test 6: Summary shows credit and debit
echo.
pause