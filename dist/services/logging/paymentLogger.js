"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLogger = void 0;
const logger_1 = require("../../config/logger");
const paymentLogger = (0, logger_1.createServiceLogger)('PaymentService');
class PaymentLogger {
    static logPaymentInitiation(userId, amount, method, correlationId) {
        paymentLogger.info('Payment initiation', {
            userId,
            amount,
            method,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPaymentProcessing(transactionId, userId, amount, correlationId) {
        paymentLogger.info('Processing payment', {
            transactionId,
            userId,
            amount,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPaymentSuccess(transactionId, userId, amount, method, correlationId) {
        paymentLogger.info('Payment successful', {
            transactionId,
            userId,
            amount,
            method,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPaymentFailure(transactionId, userId, amount, error, reason, correlationId) {
        paymentLogger.error('Payment failed', error, {
            transactionId,
            userId,
            amount,
            reason,
            errorCode: error?.code,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRefund(transactionId, amount, reason, correlationId) {
        paymentLogger.info('Processing refund', {
            transactionId,
            amount,
            reason,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRefundSuccess(transactionId, refundId, amount, correlationId) {
        paymentLogger.info('Refund successful', {
            transactionId,
            refundId,
            amount,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRefundFailure(transactionId, amount, error, correlationId) {
        paymentLogger.error('Refund failed', error, {
            transactionId,
            amount,
            errorCode: error?.code,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPaymentRetry(transactionId, attempt, maxAttempts, correlationId) {
        paymentLogger.warn('Retrying payment', {
            transactionId,
            attempt,
            maxAttempts,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logPaymentTimeout(transactionId, timeout, correlationId) {
        paymentLogger.warn('Payment timeout', {
            transactionId,
            timeoutMs: timeout,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logStripeEvent(eventType, eventId, data, correlationId) {
        paymentLogger.info('Stripe webhook event', {
            eventType,
            eventId,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logRazorpayEvent(eventType, paymentId, data, correlationId) {
        paymentLogger.info('Razorpay webhook event', {
            eventType,
            paymentId,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
}
exports.PaymentLogger = PaymentLogger;
