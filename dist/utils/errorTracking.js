"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeverityFromStatusCode = exports.finishTransaction = exports.setTransactionTag = exports.startTransaction = exports.addBreadcrumb = exports.capturePerformanceIssue = exports.captureBusinessError = exports.captureValidationError = exports.captureAPIError = exports.captureDatabaseError = exports.captureAuthError = exports.capturePaymentError = exports.captureOrderError = void 0;
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = require("../config/logger");
const captureOrderError = (error, context, severity = 'error') => {
    const tags = {
        domain: 'order',
        orderId: context.orderId || 'unknown',
        userId: context.userId || 'unknown',
        storeId: context.storeId || 'unknown',
        status: context.status || 'unknown'
    };
    const breadcrumb = {
        message: `Order Error: ${error.message}`,
        level: severity,
        category: 'order',
        data: {
            orderId: context.orderId,
            userId: context.userId,
            amount: context.amount,
            itemCount: context.items,
            paymentMethod: context.paymentMethod
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                order: {
                    id: context.orderId,
                    userId: context.userId,
                    amount: context.amount,
                    itemCount: context.items,
                    status: context.status,
                    paymentMethod: context.paymentMethod
                }
            }
        });
    }
    logger_1.logger.error('Order error captured', error, {
        ...context,
        tags
    });
};
exports.captureOrderError = captureOrderError;
const capturePaymentError = (error, context, severity = 'error') => {
    const tags = {
        domain: 'payment',
        paymentId: context.paymentId || 'unknown',
        gateway: context.gateway || 'unknown',
        status: context.status || 'unknown',
        retryable: ['timeout', 'network', 'temporarily_unavailable'].includes(context.errorCode || '') ? 'true' : 'false'
    };
    const breadcrumb = {
        message: `Payment Error: ${error.message}`,
        level: severity,
        category: 'payment',
        data: {
            paymentId: context.paymentId,
            orderId: context.orderId,
            amount: context.amount,
            gateway: context.gateway,
            errorCode: context.errorCode
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                payment: {
                    id: context.paymentId,
                    orderId: context.orderId,
                    userId: context.userId,
                    amount: context.amount,
                    gateway: context.gateway,
                    status: context.status,
                    transactionId: context.transactionId,
                    errorCode: context.errorCode,
                    retryCount: context.retryCount
                }
            }
        });
    }
    logger_1.logger.error('Payment error captured', error, {
        ...context,
        tags
    });
};
exports.capturePaymentError = capturePaymentError;
const captureAuthError = (error, context, severity = 'warning') => {
    const tags = {
        domain: 'authentication',
        method: context.method || 'unknown',
        reason: context.reason || 'unknown',
        suspicious: context.attemptCount && context.attemptCount > 3 ? 'true' : 'false'
    };
    const breadcrumb = {
        message: `Auth Error: ${error.message}`,
        level: severity,
        category: 'auth',
        data: {
            email: context.email,
            method: context.method,
            reason: context.reason,
            attemptCount: context.attemptCount
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                auth: {
                    userId: context.userId,
                    email: context.email,
                    phone: context.phone,
                    method: context.method,
                    reason: context.reason,
                    ipAddress: context.ipAddress,
                    attemptCount: context.attemptCount
                }
            }
        });
    }
    logger_1.logger.warn('Auth error captured', error, {
        ...context,
        tags
    });
};
exports.captureAuthError = captureAuthError;
const captureDatabaseError = (error, context, severity = 'error') => {
    const tags = {
        domain: 'database',
        operation: context.operation || 'unknown',
        collection: context.collection || 'unknown',
        critical: context.connectionError ? 'true' : 'false'
    };
    const breadcrumb = {
        message: `Database Error: ${error.message}`,
        level: severity,
        category: 'database',
        data: {
            operation: context.operation,
            collection: context.collection,
            duration: context.duration,
            connectionError: context.connectionError
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                database: {
                    operation: context.operation,
                    collection: context.collection,
                    duration: context.duration,
                    connectionError: context.connectionError,
                    timeout: context.timeout
                }
            }
        });
    }
    logger_1.logger.error('Database error captured', error, {
        ...context,
        tags
    });
};
exports.captureDatabaseError = captureDatabaseError;
const captureAPIError = (error, context, severity = 'error') => {
    const tags = {
        domain: 'api-integration',
        service: context.service || 'unknown',
        retryable: context.retryable ? 'true' : 'false',
        statusCode: context.statusCode?.toString() || 'unknown'
    };
    const breadcrumb = {
        message: `API Error: ${context.service} - ${error.message}`,
        level: severity,
        category: 'api',
        data: {
            service: context.service,
            endpoint: context.endpoint,
            statusCode: context.statusCode,
            responseTime: context.responseTime
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                api: {
                    service: context.service,
                    endpoint: context.endpoint,
                    method: context.method,
                    statusCode: context.statusCode,
                    responseTime: context.responseTime,
                    retryable: context.retryable,
                    attemptNumber: context.attemptNumber
                }
            }
        });
    }
    logger_1.logger.error('API error captured', error, {
        ...context,
        tags
    });
};
exports.captureAPIError = captureAPIError;
const captureValidationError = (error, context, severity = 'info') => {
    const tags = {
        domain: 'validation',
        field: context.field || 'unknown',
        rule: context.rule || 'unknown'
    };
    const breadcrumb = {
        message: `Validation Error: ${context.field}`,
        level: severity,
        category: 'validation',
        data: {
            field: context.field,
            rule: context.rule,
            message: context.message
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                validation: {
                    field: context.field,
                    rule: context.rule,
                    message: context.message
                }
            }
        });
    }
    logger_1.logger.info('Validation error captured', error, {
        ...context,
        tags
    });
};
exports.captureValidationError = captureValidationError;
const captureBusinessError = (error, context, severity = 'warning') => {
    const tags = {
        domain: 'business-logic',
        type: context.type || 'unknown',
        resourceType: context.resourceType || 'unknown'
    };
    const breadcrumb = {
        message: `Business Error: ${context.type}`,
        level: severity,
        category: 'business',
        data: {
            type: context.type,
            resourceId: context.resourceId,
            expectedValue: context.expectedValue,
            actualValue: context.actualValue
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                business: {
                    type: context.type,
                    userId: context.userId,
                    resourceId: context.resourceId,
                    resourceType: context.resourceType,
                    expectedValue: context.expectedValue,
                    actualValue: context.actualValue
                }
            }
        });
    }
    logger_1.logger.warn('Business error captured', error, {
        ...context,
        tags
    });
};
exports.captureBusinessError = captureBusinessError;
const capturePerformanceIssue = (error, context, severity = 'warning') => {
    const tags = {
        domain: 'performance',
        operation: context.operation || 'unknown',
        slowQuery: context.duration && context.threshold && context.duration > context.threshold ? 'true' : 'false'
    };
    const breadcrumb = {
        message: `Performance Issue: ${context.operation}`,
        level: severity,
        category: 'performance',
        data: {
            operation: context.operation,
            duration: `${context.duration}ms`,
            threshold: `${context.threshold}ms`,
            exceeded: context.duration > context.threshold
        }
    };
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
        Sentry.captureException(error, {
            tags,
            level: severity,
            contexts: {
                performance: {
                    operation: context.operation,
                    duration: context.duration,
                    threshold: context.threshold,
                    endpoint: context.endpoint
                }
            }
        });
    }
    logger_1.logger.warn('Performance issue captured', error, {
        ...context,
        tags
    });
};
exports.capturePerformanceIssue = capturePerformanceIssue;
const addBreadcrumb = (breadcrumb) => {
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
            message: breadcrumb.message,
            level: breadcrumb.level || 'info',
            category: breadcrumb.category,
            data: breadcrumb.data
        });
    }
    logger_1.logger.info(`Breadcrumb: ${breadcrumb.message}`, {
        category: breadcrumb.category,
        data: breadcrumb.data
    });
};
exports.addBreadcrumb = addBreadcrumb;
// ============================================================================
// TRANSACTION TRACKING FOR PERFORMANCE MONITORING
// ============================================================================
const startTransaction = (name, op) => {
    if (process.env.SENTRY_DSN) {
        return Sentry.startTransaction({
            name,
            op
        });
    }
    return null;
};
exports.startTransaction = startTransaction;
const setTransactionTag = (transaction, key, value) => {
    if (transaction && process.env.SENTRY_DSN) {
        transaction.setTag(key, value);
    }
};
exports.setTransactionTag = setTransactionTag;
const finishTransaction = (transaction, status = 'ok') => {
    if (transaction && process.env.SENTRY_DSN) {
        transaction.setStatus(status);
        transaction.finish();
    }
};
exports.finishTransaction = finishTransaction;
// ============================================================================
// HELPER: Get severity level based on HTTP status code
// ============================================================================
const getSeverityFromStatusCode = (statusCode) => {
    if (statusCode < 400)
        return 'info';
    if (statusCode < 500)
        return 'warning';
    return 'error';
};
exports.getSeverityFromStatusCode = getSeverityFromStatusCode;
