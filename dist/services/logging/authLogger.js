"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLogger = void 0;
const logger_1 = require("../../config/logger");
const authLogger = (0, logger_1.createServiceLogger)('AuthService');
class AuthLogger {
    static logLoginAttempt(email, method, ipAddress, correlationId) {
        authLogger.info('Login attempt', {
            email,
            method,
            ipAddress,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logLoginSuccess(userId, email, method, ipAddress, correlationId) {
        authLogger.info('Login successful', {
            userId,
            email,
            method,
            ipAddress,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logLoginFailure(email, reason, ipAddress, correlationId) {
        authLogger.warn('Login failed', {
            email,
            reason,
            ipAddress,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logInvalidCredentials(email, attemptCount, ipAddress, correlationId) {
        authLogger.warn('Invalid credentials', {
            email,
            attemptCount,
            ipAddress,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logAccountLocked(userId, email, reason, correlationId) {
        authLogger.warn('Account locked', {
            userId,
            email,
            reason,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPasswordReset(userId, email, method, correlationId) {
        authLogger.info('Password reset initiated', {
            userId,
            email,
            method,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPasswordResetSuccess(userId, email, correlationId) {
        authLogger.info('Password reset successful', {
            userId,
            email,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPasswordResetFailure(email, error, correlationId) {
        authLogger.error('Password reset failed', error, {
            email,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRegistration(userId, email, registrationMethod, correlationId) {
        authLogger.info('User registered', {
            userId,
            email,
            registrationMethod,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRegistrationFailure(email, reason, error, correlationId) {
        authLogger.warn('Registration failed', {
            email,
            reason,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logLogout(userId, method, correlationId) {
        authLogger.info('User logged out', {
            userId,
            method,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logTokenRefresh(userId, tokenType, correlationId) {
        authLogger.debug('Token refreshed', {
            userId,
            tokenType,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logTokenExpiration(userId, tokenType, correlationId) {
        authLogger.warn('Token expired', {
            userId,
            tokenType,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logMFASetup(userId, method, correlationId) {
        authLogger.info('MFA setup initiated', {
            userId,
            method,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logMFAVerification(userId, method, success, correlationId) {
        authLogger.info('MFA verification', {
            userId,
            method,
            success,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logSuspiciousActivity(userId, activity, details, correlationId) {
        authLogger.warn('Suspicious activity detected', {
            userId,
            activity,
            details,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logSecurityBreach(severity, description, affectedUsers, correlationId) {
        authLogger.error('Security breach detected', null, {
            severity,
            description,
            affectedUsers,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOTPGeneration(userId, phoneNumber, correlationId) {
        authLogger.info('OTP generated', {
            userId,
            phoneNumber: phoneNumber.replace(/\d(?=\d{2})/g, '*'),
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOTPVerification(userId, success, correlationId) {
        authLogger.info('OTP verification', {
            userId,
            success,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logAPIKeyGeneration(userId, keyName, correlationId) {
        authLogger.info('API key generated', {
            userId,
            keyName,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logAPIKeyRevocation(userId, keyId, correlationId) {
        authLogger.info('API key revoked', {
            userId,
            keyId,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
}
exports.AuthLogger = AuthLogger;
