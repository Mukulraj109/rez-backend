import * as Sentry from '@sentry/node';
/**
 * Custom Error Tracking Utilities for Sentry
 * Provides domain-specific error capturing and context management
 */
export interface OrderErrorContext {
    orderId?: string;
    userId?: string;
    storeId?: string;
    amount?: number;
    status?: string;
    items?: number;
    paymentMethod?: string;
    error?: string;
}
export declare const captureOrderError: (error: Error, context: OrderErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface PaymentErrorContext {
    paymentId?: string;
    orderId?: string;
    userId?: string;
    amount?: number;
    gateway?: string;
    status?: string;
    transactionId?: string;
    errorCode?: string;
    retryCount?: number;
    error?: string;
}
export declare const capturePaymentError: (error: Error, context: PaymentErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface AuthErrorContext {
    userId?: string;
    email?: string;
    phone?: string;
    method?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    attemptCount?: number;
    error?: string;
}
export declare const captureAuthError: (error: Error, context: AuthErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface DatabaseErrorContext {
    operation?: string;
    collection?: string;
    query?: string;
    duration?: number;
    connectionError?: boolean;
    timeout?: boolean;
    error?: string;
}
export declare const captureDatabaseError: (error: Error, context: DatabaseErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface APIErrorContext {
    service?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    retryable?: boolean;
    attemptNumber?: number;
    error?: string;
}
export declare const captureAPIError: (error: Error, context: APIErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface ValidationErrorContext {
    field?: string;
    value?: any;
    rule?: string;
    message?: string;
    userId?: string;
    error?: string;
}
export declare const captureValidationError: (error: Error, context: ValidationErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface BusinessErrorContext {
    type?: string;
    userId?: string;
    resourceId?: string;
    resourceType?: string;
    expectedValue?: any;
    actualValue?: any;
    error?: string;
}
export declare const captureBusinessError: (error: Error, context: BusinessErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface PerformanceErrorContext {
    operation?: string;
    duration?: number;
    threshold?: number;
    userId?: string;
    endpoint?: string;
    error?: string;
}
export declare const capturePerformanceIssue: (error: Error, context: PerformanceErrorContext, severity?: Sentry.SeverityLevel) => void;
export interface BreadcrumbData {
    category: string;
    message: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
}
export declare const addBreadcrumb: (breadcrumb: BreadcrumbData) => void;
export declare const startTransaction: (name: string, op: string) => Sentry.Transaction | null;
export declare const setTransactionTag: (transaction: any, key: string, value: string | number) => void;
export declare const finishTransaction: (transaction: any, status?: string) => void;
export declare const getSeverityFromStatusCode: (statusCode: number) => Sentry.SeverityLevel;
