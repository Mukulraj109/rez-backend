"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderLogger = void 0;
const logger_1 = require("../../config/logger");
const orderLogger = (0, logger_1.createServiceLogger)('OrderService');
class OrderLogger {
    static logOrderCreation(userId, orderId, totalAmount, itemCount, correlationId) {
        orderLogger.info('Order created', {
            orderId,
            userId,
            totalAmount,
            itemCount,
            status: 'PENDING',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderConfirmation(orderId, userId, totalAmount, correlationId) {
        orderLogger.info('Order confirmed', {
            orderId,
            userId,
            totalAmount,
            status: 'CONFIRMED',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderProcessing(orderId, userId, correlationId) {
        orderLogger.info('Order processing', {
            orderId,
            userId,
            status: 'PROCESSING',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderShipped(orderId, trackingNumber, carrier, correlationId) {
        orderLogger.info('Order shipped', {
            orderId,
            trackingNumber,
            carrier,
            status: 'SHIPPED',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderDelivered(orderId, deliveryDate, correlationId) {
        orderLogger.info('Order delivered', {
            orderId,
            deliveryDate,
            status: 'DELIVERED',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderCancellation(orderId, userId, reason, correlationId) {
        orderLogger.warn('Order cancelled', {
            orderId,
            userId,
            reason,
            status: 'CANCELLED',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderRefund(orderId, refundAmount, reason, correlationId) {
        orderLogger.info('Order refund processed', {
            orderId,
            refundAmount,
            reason,
            status: 'REFUNDED',
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderError(orderId, error, context, correlationId) {
        orderLogger.error(`Order error: ${context}`, error, {
            orderId,
            errorCode: error?.code,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderStatusUpdate(orderId, oldStatus, newStatus, correlationId) {
        orderLogger.info('Order status updated', {
            orderId,
            oldStatus,
            newStatus,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderItemRestockIssue(orderId, itemId, requestedQty, availableQty, correlationId) {
        orderLogger.warn('Restock issue detected', {
            orderId,
            itemId,
            requestedQty,
            availableQty,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logBulkOrderCreation(orderCount, totalAmount, correlationId) {
        orderLogger.info('Bulk orders created', {
            orderCount,
            totalAmount,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
    static logOrderExport(exportId, format, recordCount, correlationId) {
        orderLogger.info('Orders exported', {
            exportId,
            format,
            recordCount,
            timestamp: new Date().toISOString()
        }, correlationId);
    }
}
exports.OrderLogger = OrderLogger;
