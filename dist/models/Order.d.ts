import mongoose, { Document, Types } from 'mongoose';
export interface IOrderItem {
    product: Types.ObjectId;
    store: Types.ObjectId;
    name: string;
    image: string;
    quantity: number;
    variant?: {
        type: string;
        value: string;
    };
    price: number;
    originalPrice?: number;
    discount?: number;
    subtotal: number;
}
export interface IOrderTotals {
    subtotal: number;
    tax: number;
    delivery: number;
    discount: number;
    cashback: number;
    total: number;
    paidAmount: number;
    refundAmount?: number;
}
export interface IOrderPayment {
    method: 'wallet' | 'card' | 'upi' | 'cod' | 'netbanking' | 'razorpay' | 'stripe';
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    transactionId?: string;
    paymentGateway?: string;
    failureReason?: string;
    paidAt?: Date;
    refundId?: string;
    refundedAt?: Date;
    coinsUsed?: {
        wasilCoins?: number;
        promoCoins?: number;
        storePromoCoins?: number;
        totalCoinsValue?: number;
    };
}
export interface IOrderAddress {
    name: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    coordinates?: [number, number];
    landmark?: string;
    addressType?: 'home' | 'work' | 'other';
}
export interface IOrderDelivery {
    method: 'standard' | 'express' | 'pickup' | 'scheduled';
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
    address: IOrderAddress;
    estimatedTime?: Date;
    actualTime?: Date;
    dispatchedAt?: Date;
    deliveredAt?: Date;
    trackingId?: string;
    deliveryPartner?: string;
    deliveryFee: number;
    instructions?: string;
    deliveryOTP?: string;
    attempts?: {
        attemptNumber: number;
        attemptedAt: Date;
        status: 'successful' | 'failed';
        reason?: string;
        nextAttemptAt?: Date;
    }[];
}
export interface IOrderTimeline {
    status: string;
    message: string;
    timestamp: Date;
    updatedBy?: string;
    metadata?: any;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    deliveryPartner?: {
        name: string;
        phone: string;
        vehicleNumber?: string;
        photo?: string;
    };
}
export interface IOrderAnalytics {
    source: 'app' | 'web' | 'social' | 'referral';
    campaign?: string;
    referralCode?: string;
    deviceInfo?: {
        platform: string;
        version: string;
        userAgent?: string;
    };
}
export interface IOrder extends Document {
    orderNumber: string;
    user: Types.ObjectId;
    items: IOrderItem[];
    totals: IOrderTotals;
    payment: IOrderPayment;
    delivery: IOrderDelivery;
    timeline: IOrderTimeline[];
    analytics?: IOrderAnalytics;
    status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
    couponCode?: string;
    notes?: string;
    specialInstructions?: string;
    cancelReason?: string;
    cancelledAt?: Date;
    cancelledBy?: Types.ObjectId;
    returnReason?: string;
    returnedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    invoiceUrl?: string;
    invoiceGeneratedAt?: Date;
    shippingLabelUrl?: string;
    packingSlipUrl?: string;
    cancellation?: {
        reason?: string;
        cancelledAt?: Date;
        cancelledBy?: Types.ObjectId;
        refundAmount?: number;
        refundStatus?: 'pending' | 'completed' | 'failed' | 'not_applicable';
    };
    paymentStatus?: string;
    tracking?: {
        trackingId?: string;
        estimatedDelivery?: Date;
        deliveredAt?: Date;
    };
    estimatedDeliveryTime?: Date;
    deliveredAt?: Date;
    totalAmount?: number;
    rating?: {
        score: number;
        review?: string;
        ratedAt: Date;
    };
    paymentGateway?: {
        gatewayOrderId?: string;
        gatewayPaymentId?: string;
        gatewaySignature?: string;
        gateway: 'razorpay' | 'cod' | 'wallet';
        currency?: string;
        amountPaid?: number;
        paidAt?: Date;
        failureReason?: string;
        refundId?: string;
        refundedAt?: Date;
        refundAmount?: number;
    };
    updateStatus(newStatus: string, message?: string, updatedBy?: string): Promise<void>;
    calculateRefund(): number;
    canBeCancelled(): boolean;
    canBeReturned(): boolean;
    generateInvoice(): Promise<string>;
    sendStatusUpdate(): Promise<void>;
}
export declare const Order: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
