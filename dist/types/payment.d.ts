import { Types } from 'mongoose';
export interface IRazorpayOrderRequest {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, any>;
    payment_capture?: 0 | 1;
}
export interface IRazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, any>;
    created_at: number;
}
export interface IRazorpayPaymentVerification {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
export interface IPaymentGatewayDetails {
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    transactionId?: string;
    gateway: 'razorpay' | 'cod' | 'wallet';
    currency?: string;
    amountPaid?: number;
    paidAt?: Date;
    failureReason?: string;
    refundId?: string;
    refundedAt?: Date;
    refundAmount?: number;
}
export interface ICreatePaymentOrderRequest {
    orderId: string;
    amount: number;
    currency?: string;
}
export interface ICreatePaymentOrderResponse {
    success: boolean;
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
    orderId: string;
    orderNumber: string;
    notes?: Record<string, any>;
}
export interface IVerifyPaymentRequest {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
export interface IVerifyPaymentResponse {
    success: boolean;
    message: string;
    order?: any;
    verified?: boolean;
}
export interface IRazorpayWebhookEvent {
    entity: string;
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payment: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                currency: string;
                status: string;
                order_id: string;
                invoice_id: string | null;
                international: boolean;
                method: string;
                amount_refunded: number;
                refund_status: string | null;
                captured: boolean;
                description: string;
                card_id: string | null;
                bank: string | null;
                wallet: string | null;
                vpa: string | null;
                email: string;
                contact: string;
                notes: Record<string, any>;
                fee: number;
                tax: number;
                error_code: string | null;
                error_description: string | null;
                error_source: string | null;
                error_step: string | null;
                error_reason: string | null;
                created_at: number;
            };
        };
        order: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                amount_paid: number;
                amount_due: number;
                currency: string;
                receipt: string;
                status: string;
                attempts: number;
                notes: Record<string, any>;
                created_at: number;
            };
        };
    };
    created_at: number;
}
export interface IRefundRequest {
    orderId: string;
    amount?: number;
    reason?: string;
}
export interface IRefundResponse {
    success: boolean;
    message: string;
    refundId?: string;
    refundAmount?: number;
    refundStatus?: string;
}
export interface IPaymentStatusResponse {
    orderId: string;
    orderNumber: string;
    paymentStatus: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    amount: number;
    currency: string;
    paidAt?: Date;
    failureReason?: string;
}
export interface IStockReservation {
    orderId: Types.ObjectId;
    items: Array<{
        productId: Types.ObjectId;
        quantity: number;
        variant?: {
            type: string;
            value: string;
        };
    }>;
    reservedAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired' | 'completed' | 'cancelled';
}
