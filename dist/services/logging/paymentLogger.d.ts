export declare class PaymentLogger {
    static logPaymentInitiation(userId: string, amount: number, method: string, correlationId?: string): void;
    static logPaymentProcessing(transactionId: string, userId: string, amount: number, correlationId?: string): void;
    static logPaymentSuccess(transactionId: string, userId: string, amount: number, method: string, correlationId?: string): void;
    static logPaymentFailure(transactionId: string, userId: string, amount: number, error: any, reason: string, correlationId?: string): void;
    static logRefund(transactionId: string, amount: number, reason: string, correlationId?: string): void;
    static logRefundSuccess(transactionId: string, refundId: string, amount: number, correlationId?: string): void;
    static logRefundFailure(transactionId: string, amount: number, error: any, correlationId?: string): void;
    static logPaymentRetry(transactionId: string, attempt: number, maxAttempts: number, correlationId?: string): void;
    static logPaymentTimeout(transactionId: string, timeout: number, correlationId?: string): void;
    static logStripeEvent(eventType: string, eventId: string, data: any, correlationId?: string): void;
    static logRazorpayEvent(eventType: string, paymentId: string, data: any, correlationId?: string): void;
}
