"use strict";
// Audit Middleware
// Automatically logs API calls and changes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = auditMiddleware;
exports.captureBeforeState = captureBeforeState;
exports.logAfterChange = logAfterChange;
exports.checkSuspiciousActivity = checkSuspiciousActivity;
exports.logAuthEvent = logAuthEvent;
exports.logBulkOperation = logBulkOperation;
const AuditService_1 = __importDefault(require("../services/AuditService"));
const AuditAlertService_1 = __importDefault(require("../services/AuditAlertService"));
/**
 * Middleware to log all API calls
 */
function auditMiddleware() {
    return async (req, res, next) => {
        const startTime = Date.now();
        // Capture original send and json methods
        const originalSend = res.send;
        const originalJson = res.json;
        // Flag to ensure we only log once
        let logged = false;
        const logRequest = async () => {
            if (logged)
                return;
            logged = true;
            const duration = Date.now() - startTime;
            try {
                await AuditService_1.default.logApiCall(req, res, duration);
            }
            catch (error) {
                console.error('❌ [AUDIT MIDDLEWARE] Failed to log API call:', error);
            }
        };
        // Override send
        res.send = function (data) {
            logRequest();
            return originalSend.call(this, data);
        };
        // Override json
        res.json = function (data) {
            logRequest();
            return originalJson.call(this, data);
        };
        // Handle request completion
        res.on('finish', () => {
            logRequest();
        });
        next();
    };
}
/**
 * Middleware to capture state before change
 * Use this before update/delete operations
 */
function captureBeforeState(modelGetter) {
    return async (req, res, next) => {
        try {
            const before = await modelGetter(req);
            req.auditBefore = before;
            next();
        }
        catch (error) {
            console.error('❌ [AUDIT] Failed to capture before state:', error);
            next(); // Continue even if audit fails
        }
    };
}
/**
 * Middleware to log after successful operation
 * Use this after update/delete operations
 */
function logAfterChange(resourceType, action, getAfterState = () => null) {
    return async (req, res, next) => {
        // Capture original send
        const originalSend = res.send;
        const originalJson = res.json;
        const logChange = async (data) => {
            try {
                const merchant = req.merchant;
                if (!merchant)
                    return;
                const before = req.auditBefore;
                const after = getAfterState(req, res) || data;
                await AuditService_1.default.log({
                    merchantId: merchant._id,
                    merchantUserId: req.merchantUser?._id,
                    action,
                    resourceType,
                    resourceId: req.params.id || after?._id || after?.id,
                    details: {
                        before,
                        after,
                        metadata: {
                            method: req.method,
                            path: req.path
                        }
                    },
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    severity: action.includes('delete') ? 'warning' : 'info'
                });
            }
            catch (error) {
                console.error('❌ [AUDIT] Failed to log change:', error);
            }
        };
        // Override send
        res.send = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logChange(data);
            }
            return originalSend.call(this, data);
        };
        // Override json
        res.json = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logChange(data);
            }
            return originalJson.call(this, data);
        };
        next();
    };
}
/**
 * Middleware to check for suspicious activity
 */
function checkSuspiciousActivity() {
    return async (req, res, next) => {
        try {
            const merchant = req.merchant;
            if (!merchant) {
                next();
                return;
            }
            const result = await AuditAlertService_1.default.checkSuspiciousActivity(merchant._id);
            if (result.suspicious) {
                console.warn('⚠️ [AUDIT] Suspicious activity detected:', result.reasons);
                // Log security event
                await AuditService_1.default.logSecurityEvent(merchant._id, 'suspicious_activity', {
                    reasons: result.reasons,
                    endpoint: req.path,
                    method: req.method
                }, req);
                // Optionally block the request
                // return res.status(403).json({
                //   success: false,
                //   message: 'Suspicious activity detected. Please contact support.'
                // });
            }
            next();
        }
        catch (error) {
            console.error('❌ [AUDIT] Failed to check suspicious activity:', error);
            next(); // Continue even if check fails
        }
    };
}
/**
 * Middleware to log authentication events
 */
function logAuthEvent(action) {
    return async (req, res, next) => {
        // Capture original send
        const originalSend = res.send;
        const originalJson = res.json;
        const logEvent = async () => {
            try {
                const merchant = req.merchant || (req.body.merchantId ? { _id: req.body.merchantId } : null);
                if (!merchant)
                    return;
                await AuditService_1.default.logAuth(merchant._id, action, {
                    email: req.body.email,
                    success: res.statusCode >= 200 && res.statusCode < 300
                }, req);
                // Check for multiple failed logins
                if (action === 'failed_login') {
                    const failedCount = await AuditAlertService_1.default.getFailedLoginCount(merchant._id);
                    if (failedCount >= 3) {
                        await AuditService_1.default.logSecurityEvent(merchant._id, 'multiple_failed_logins', {
                            count: failedCount,
                            email: req.body.email
                        }, req);
                    }
                }
            }
            catch (error) {
                console.error('❌ [AUDIT] Failed to log auth event:', error);
            }
        };
        // Override send
        res.send = function (data) {
            logEvent();
            return originalSend.call(this, data);
        };
        // Override json
        res.json = function (data) {
            logEvent();
            return originalJson.call(this, data);
        };
        next();
    };
}
/**
 * Middleware to log bulk operations
 */
function logBulkOperation(resourceType, action) {
    return async (req, res, next) => {
        // Capture original send
        const originalSend = res.send;
        const originalJson = res.json;
        const logOperation = async (data) => {
            try {
                const merchant = req.merchant;
                if (!merchant)
                    return;
                const count = data?.count || data?.affected || data?.deleted || 0;
                await AuditService_1.default.logBulkOperation(merchant._id, action, resourceType, count, req.merchantUser?._id, req);
                // Alert on large bulk deletions
                if (action.includes('delete') && count > 10) {
                    await AuditService_1.default.logSecurityEvent(merchant._id, 'bulk_deletion_warning', {
                        resourceType,
                        count,
                        action
                    }, req);
                }
            }
            catch (error) {
                console.error('❌ [AUDIT] Failed to log bulk operation:', error);
            }
        };
        // Override send
        res.send = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logOperation(data);
            }
            return originalSend.call(this, data);
        };
        // Override json
        res.json = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logOperation(data);
            }
            return originalJson.call(this, data);
        };
        next();
    };
}
exports.default = {
    auditMiddleware,
    captureBeforeState,
    logAfterChange,
    checkSuspiciousActivity,
    logAuthEvent,
    logBulkOperation
};
