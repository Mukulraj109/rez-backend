@echo off
REM Agent 4: Bulk Endpoints Testing Script (Windows)
REM Tests the 2 missing bulk operation endpoints

echo.
echo Testing Bulk Operation Endpoints
echo =====================================
echo.

REM Configuration
set BASE_URL=http://localhost:5001
set API_PREFIX=/api/merchant/bulk

REM Check if JWT token is provided
if "%1"=="" (
    echo Usage: test-bulk-endpoints.bat ^<MERCHANT_JWT_TOKEN^>
    echo.
    echo Example:
    echo   test-bulk-endpoints.bat eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    echo.
    exit /b 1
)

set JWT_TOKEN=%1

echo Configuration:
echo   Base URL: %BASE_URL%
echo   API Prefix: %API_PREFIX%
echo.

REM Test 1: Template Download (CSV)
echo -------------------------------------------
echo Test 1: Template Download (CSV)
echo -------------------------------------------
echo Endpoint: GET %API_PREFIX%/products/template?format=csv
echo.

curl -s -H "Authorization: Bearer %JWT_TOKEN%" "%BASE_URL%%API_PREFIX%/products/template?format=csv" -o template.csv

if exist template.csv (
    echo [SUCCESS] File saved: template.csv
    echo.
) else (
    echo [FAILED] Could not download template
    echo.
)

REM Test 2: Template Download (Excel)
echo -------------------------------------------
echo Test 2: Template Download (Excel)
echo -------------------------------------------
echo Endpoint: GET %API_PREFIX%/products/template?format=xlsx
echo.

curl -s -H "Authorization: Bearer %JWT_TOKEN%" "%BASE_URL%%API_PREFIX%/products/template?format=xlsx" -o template.xlsx

if exist template.xlsx (
    echo [SUCCESS] File saved: template.xlsx
    echo.
) else (
    echo [FAILED] Could not download template
    echo.
)

REM Test 3: Products Export (CSV)
echo -------------------------------------------
echo Test 3: Products Export (CSV)
echo -------------------------------------------
echo Endpoint: GET %API_PREFIX%/products/export?format=csv
echo.

curl -s -H "Authorization: Bearer %JWT_TOKEN%" "%BASE_URL%%API_PREFIX%/products/export?format=csv" -o export.csv

if exist export.csv (
    echo [SUCCESS] File saved: export.csv
    echo.
) else (
    echo [FAILED] Could not export products
    echo.
)

REM Test 4: Products Export (Excel)
echo -------------------------------------------
echo Test 4: Products Export (Excel)
echo -------------------------------------------
echo Endpoint: GET %API_PREFIX%/products/export?format=xlsx
echo.

curl -s -H "Authorization: Bearer %JWT_TOKEN%" "%BASE_URL%%API_PREFIX%/products/export?format=xlsx" -o export.xlsx

if exist export.xlsx (
    echo [SUCCESS] File saved: export.xlsx
    echo.
) else (
    echo [FAILED] Could not export products
    echo.
)

REM Summary
echo ===========================================
echo Test Summary
echo ===========================================
echo.
echo Files generated:
dir /b template.csv template.xlsx export.csv export.xlsx 2>nul
echo.
echo All tests completed!
echo.
echo To view CSV files, use: type template.csv
echo.
