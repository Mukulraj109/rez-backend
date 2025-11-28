import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to log all API calls
 */
export declare function auditMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to capture state before change
 * Use this before update/delete operations
 */
export declare function captureBeforeState(modelGetter: (req: Request) => Promise<any>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to log after successful operation
 * Use this after update/delete operations
 */
export declare function logAfterChange(resourceType: string, action: string, getAfterState?: (req: Request, res: Response) => any): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check for suspicious activity
 */
export declare function checkSuspiciousActivity(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to log authentication events
 */
export declare function logAuthEvent(action: 'login' | 'logout' | 'failed_login' | 'password_reset'): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to log bulk operations
 */
export declare function logBulkOperation(resourceType: string, action: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    auditMiddleware: typeof auditMiddleware;
    captureBeforeState: typeof captureBeforeState;
    logAfterChange: typeof logAfterChange;
    checkSuspiciousActivity: typeof checkSuspiciousActivity;
    logAuthEvent: typeof logAuthEvent;
    logBulkOperation: typeof logBulkOperation;
};
export default _default;
