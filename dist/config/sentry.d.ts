import * as Sentry from '@sentry/node';
import { Express } from 'express';
export declare const initSentry: (app: Express) => void;
export declare const sentryRequestHandler: (req: any, res: any, next: any) => any;
export declare const sentryTracingHandler: (req: any, res: any, next: any) => any;
export declare const sentryErrorHandler: (req: any, res: any, next: any) => any;
export interface UserContext {
    id: string;
    email?: string;
    username?: string;
    ip?: string;
    userType?: 'user' | 'merchant' | 'admin';
}
/**
 * Set user context for error tracking
 */
export declare const setUserContext: (user: UserContext) => void;
/**
 * Clear user context
 */
export declare const clearUserContext: () => void;
/**
 * Set request context with additional metadata
 */
export declare const setRequestContext: (context: Record<string, any>) => void;
/**
 * Set additional tags for filtering and searching
 */
export declare const setTags: (tags: Record<string, string | number | boolean>) => void;
/**
 * Set additional context
 */
export declare const setContext: (name: string, context: Record<string, any>) => void;
/**
 * Capture exception with optional context
 */
export declare const captureException: (error: Error, context?: Record<string, any>, level?: Sentry.SeverityLevel) => void;
/**
 * Capture message with optional context
 */
export declare const captureMessage: (message: string, level?: Sentry.SeverityLevel, context?: Record<string, any>) => void;
/**
 * Add custom breadcrumb for tracking important operations
 */
export declare const addBreadcrumb: (message: string, category: string, level?: Sentry.SeverityLevel, data?: Record<string, any>) => void;
/**
 * Start a transaction for performance monitoring
 */
export declare const startTransaction: (name: string, op: string) => Sentry.Transaction | null;
/**
 * Get current transaction
 */
export declare const getCurrentTransaction: () => Sentry.Transaction | undefined;
