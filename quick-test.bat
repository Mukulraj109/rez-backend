@echo off
REM Quick Test Script for Backend API (Windows)
REM Run this after starting the backend server
REM Usage: quick-test.bat

setlocal enabledelayedexpansion

set BASE_URL=http://localhost:5001
set API_PREFIX=/api
set TOTAL=0
set PASSED=0
set FAILED=0

echo ==========================================
echo   QUICK BACKEND API TEST
echo ==========================================
echo.

REM 1. Health Check
echo ==========================================
echo   1. HEALTH CHECK
echo ==========================================
echo.
curl -s %BASE_URL%/health
if %errorlevel% equ 0 (
  echo [PASS] Backend is running
  set /a PASSED+=1
) else (
  echo [FAIL] Backend is not responding
  set /a FAILED+=1
  exit /b 1
)
set /a TOTAL+=1
echo.

REM 2. Authentication
echo ==========================================
echo   2. AUTHENTICATION
echo ==========================================
echo.

echo Testing: Send OTP
curl -s -X POST %BASE_URL%%API_PREFIX%/user/auth/send-otp -H "Content-Type: application/json" -d "{\"phoneNumber\":\"9876543210\",\"email\":\"test@example.com\"}" > otp_response.json
if %errorlevel% equ 0 (
  echo [PASS] Send OTP
  set /a PASSED+=1
) else (
  echo [FAIL] Send OTP
  set /a FAILED+=1
)
set /a TOTAL+=1
echo.

echo Testing: Verify OTP
curl -s -X POST %BASE_URL%%API_PREFIX%/user/auth/verify-otp -H "Content-Type: application/json" -d "{\"phoneNumber\":\"9876543210\",\"otp\":\"123456\"}" > verify_response.json
if %errorlevel% equ 0 (
  echo [PASS] Verify OTP
  set /a PASSED+=1
) else (
  echo [FAIL] Verify OTP
  set /a FAILED+=1
)
set /a TOTAL+=1
echo.

REM 3. Data APIs
echo ==========================================
echo   3. DATA APIs
echo ==========================================
echo.

echo Testing: Products API
curl -s "%BASE_URL%%API_PREFIX%/products?page=1&limit=10" > nul
if %errorlevel% equ 0 (
  echo [PASS] Products API
  set /a PASSED+=1
) else (
  echo [FAIL] Products API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Stores API
curl -s "%BASE_URL%%API_PREFIX%/stores?page=1&limit=10" > nul
if %errorlevel% equ 0 (
  echo [PASS] Stores API
  set /a PASSED+=1
) else (
  echo [FAIL] Stores API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Offers API
curl -s %BASE_URL%%API_PREFIX%/offers > nul
if %errorlevel% equ 0 (
  echo [PASS] Offers API
  set /a PASSED+=1
) else (
  echo [FAIL] Offers API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Videos API
curl -s %BASE_URL%%API_PREFIX%/videos > nul
if %errorlevel% equ 0 (
  echo [PASS] Videos API
  set /a PASSED+=1
) else (
  echo [FAIL] Videos API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Projects API
curl -s %BASE_URL%%API_PREFIX%/projects > nul
if %errorlevel% equ 0 (
  echo [PASS] Projects API
  set /a PASSED+=1
) else (
  echo [FAIL] Projects API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Categories API
curl -s %BASE_URL%%API_PREFIX%/categories > nul
if %errorlevel% equ 0 (
  echo [PASS] Categories API
  set /a PASSED+=1
) else (
  echo [FAIL] Categories API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo Testing: Homepage API
curl -s %BASE_URL%%API_PREFIX%/homepage > nul
if %errorlevel% equ 0 (
  echo [PASS] Homepage API
  set /a PASSED+=1
) else (
  echo [FAIL] Homepage API
  set /a FAILED+=1
)
set /a TOTAL+=1

echo.
echo ==========================================
echo   TEST SUMMARY
echo ==========================================
echo.
echo Total Tests: %TOTAL%
echo Passed: %PASSED%
echo Failed: %FAILED%
echo.

if %FAILED% equ 0 (
  echo [SUCCESS] All tests passed!
  exit /b 0
) else (
  echo [WARNING] Some tests failed. Run 'node comprehensive-api-test.js' for detailed results.
  exit /b 1
)
