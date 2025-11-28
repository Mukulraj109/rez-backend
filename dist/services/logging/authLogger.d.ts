export declare class AuthLogger {
    static logLoginAttempt(email: string, method: string, ipAddress?: string, correlationId?: string): void;
    static logLoginSuccess(userId: string, email: string, method: string, ipAddress?: string, correlationId?: string): void;
    static logLoginFailure(email: string, reason: string, ipAddress?: string, correlationId?: string): void;
    static logInvalidCredentials(email: string, attemptCount: number, ipAddress?: string, correlationId?: string): void;
    static logAccountLocked(userId: string, email: string, reason: string, correlationId?: string): void;
    static logPasswordReset(userId: string, email: string, method: string, correlationId?: string): void;
    static logPasswordResetSuccess(userId: string, email: string, correlationId?: string): void;
    static logPasswordResetFailure(email: string, error: any, correlationId?: string): void;
    static logRegistration(userId: string, email: string, registrationMethod: string, correlationId?: string): void;
    static logRegistrationFailure(email: string, reason: string, error?: any, correlationId?: string): void;
    static logLogout(userId: string, method: string, correlationId?: string): void;
    static logTokenRefresh(userId: string, tokenType: string, correlationId?: string): void;
    static logTokenExpiration(userId: string, tokenType: string, correlationId?: string): void;
    static logMFASetup(userId: string, method: string, correlationId?: string): void;
    static logMFAVerification(userId: string, method: string, success: boolean, correlationId?: string): void;
    static logSuspiciousActivity(userId: string, activity: string, details: any, correlationId?: string): void;
    static logSecurityBreach(severity: string, description: string, affectedUsers?: number, correlationId?: string): void;
    static logOTPGeneration(userId: string, phoneNumber: string, correlationId?: string): void;
    static logOTPVerification(userId: string, success: boolean, correlationId?: string): void;
    static logAPIKeyGeneration(userId: string, keyName: string, correlationId?: string): void;
    static logAPIKeyRevocation(userId: string, keyId: string, correlationId?: string): void;
}
