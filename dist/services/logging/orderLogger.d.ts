export declare class OrderLogger {
    static logOrderCreation(userId: string, orderId: string, totalAmount: number, itemCount: number, correlationId?: string): void;
    static logOrderConfirmation(orderId: string, userId: string, totalAmount: number, correlationId?: string): void;
    static logOrderProcessing(orderId: string, userId: string, correlationId?: string): void;
    static logOrderShipped(orderId: string, trackingNumber: string, carrier: string, correlationId?: string): void;
    static logOrderDelivered(orderId: string, deliveryDate: Date, correlationId?: string): void;
    static logOrderCancellation(orderId: string, userId: string, reason: string, correlationId?: string): void;
    static logOrderRefund(orderId: string, refundAmount: number, reason: string, correlationId?: string): void;
    static logOrderError(orderId: string, error: any, context: string, correlationId?: string): void;
    static logOrderStatusUpdate(orderId: string, oldStatus: string, newStatus: string, correlationId?: string): void;
    static logOrderItemRestockIssue(orderId: string, itemId: string, requestedQty: number, availableQty: number, correlationId?: string): void;
    static logBulkOrderCreation(orderCount: number, totalAmount: number, correlationId?: string): void;
    static logOrderExport(exportId: string, format: string, recordCount: number, correlationId?: string): void;
}
