@echo off
REM Authentication Fixes Testing Script (Windows)
REM This script tests all the authentication endpoint fixes

echo ================================================================
echo    Authentication Endpoint Fixes - Testing Script (Windows)
echo ================================================================
echo.

set BASE_URL=http://localhost:5000/api/auth

echo Starting tests...
echo.

REM Test 1: Send OTP with plain 10-digit phone number
echo ================================================================
echo TEST #1: Send OTP - Plain 10-digit format
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"9876543210\", \"email\": \"test1@example.com\"}"
echo.
echo.

REM Test 2: Send OTP with +91 prefix
echo ================================================================
echo TEST #2: Send OTP - +91 prefix format
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"+919876543211\", \"email\": \"test2@example.com\"}"
echo.
echo.

REM Test 3: Send OTP with 91 prefix
echo ================================================================
echo TEST #3: Send OTP - 91 prefix format
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"919876543212\", \"email\": \"test3@example.com\"}"
echo.
echo.

REM Test 4: Send OTP with space after country code
echo ================================================================
echo TEST #4: Send OTP - Format with space (+91 XXXXXXXXXX)
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"+91 9876543213\", \"email\": \"test4@example.com\"}"
echo.
echo.

REM Test 5: Existing user login (no email)
echo ================================================================
echo TEST #5: Login - Existing user without email
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"9876543210\"}"
echo.
echo.

REM Test 6: New user without email (should fail)
echo ================================================================
echo TEST #6: Signup - New user without email (should fail)
echo ================================================================
echo.
curl -X POST "%BASE_URL%/send-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"9999999999\"}"
echo.
echo.

REM Test 7: Verify OTP with development bypass (123456)
echo ================================================================
echo TEST #7: Verify OTP - Development bypass (123456)
echo ================================================================
echo.
curl -X POST "%BASE_URL%/verify-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"9876543210\", \"otp\": \"123456\"}"
echo.
echo.

REM Test 8: Verify OTP with different phone format
echo ================================================================
echo TEST #8: Verify OTP - Different phone format (+91)
echo ================================================================
echo.
curl -X POST "%BASE_URL%/verify-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"+919876543210\", \"otp\": \"123789\"}"
echo.
echo.

REM Test 9: Invalid OTP (wrong format)
echo ================================================================
echo TEST #9: Verify OTP - Wrong OTP (should fail)
echo ================================================================
echo.
curl -X POST "%BASE_URL%/verify-otp" -H "Content-Type: application/json" -d "{\"phoneNumber\": \"9876543210\", \"otp\": \"000000\"}"
echo.
echo.

echo ================================================================
echo                        Test Complete
echo ================================================================
echo.
echo Review the results above to verify all tests passed.
echo.
pause
