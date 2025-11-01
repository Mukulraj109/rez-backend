import mongoose, { Schema, Document } from 'mongoose';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../types/shared';
interface OrderDocument extends Document, Omit<Order, 'id'> {
    _id: string;
}
declare const OrderMongoModel: mongoose.Model<OrderDocument, {}, {}, {}, mongoose.Document<unknown, {}, OrderDocument, {}, {}> & OrderDocument & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export { OrderMongoModel };
export declare class OrderModel {
    private static orderCounter;
    static generateOrderNumber(): string;
    static create(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order>;
    static findById(id: string): Promise<Order | null>;
    static findByMerchantId(merchantId: string): Promise<Order[]>;
    static findByOrderNumber(orderNumber: string): Promise<Order | null>;
    static update(id: string, updates: Partial<Order>): Promise<Order | null>;
    static updateStatus(id: string, status: OrderStatus, notes?: string): Promise<Order | null>;
    static delete(id: string): Promise<boolean>;
    static search(params: {
        merchantId: string;
        status?: OrderStatus;
        paymentStatus?: PaymentStatus;
        dateRange?: {
            start: Date;
            end: Date;
        };
        customerId?: string;
        orderNumber?: string;
        sortBy?: 'created' | 'updated' | 'total' | 'priority';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }): Promise<{
        orders: {
            createdAt: Date;
            updatedAt: Date;
            _id: string;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: mongoose.Collection;
            db: mongoose.Connection;
            errors?: mongoose.Error.ValidationError;
            id: any;
            isNew: boolean;
            schema: Schema;
            source?: any;
            merchantId: string;
            cashback?: any;
            pricing?: any;
            items: OrderItem[];
            deliveryAddress?: import("../types/shared").Address | undefined;
            subtotal: number;
            tax: number;
            delivery?: any;
            total: number;
            orderNumber: string;
            payment?: any;
            timeline?: Array<{
                status: OrderStatus;
                timestamp: Date;
                notes?: string;
                by?: string;
            }> | undefined;
            status: OrderStatus;
            cancelledAt?: Date | undefined;
            paymentStatus: PaymentStatus;
            tracking?: {
                trackingNumber?: string;
                carrier?: string;
                status?: string;
            } | undefined;
            deliveredAt?: Date | undefined;
            estimatedDelivery?: Date | undefined;
            priority?: "normal" | "high" | "urgent" | undefined;
            customerName: string;
            shipping: number;
            internalNotes?: string | undefined;
            customerId: string;
            customerEmail: string;
            shippingAddress: import("../types/shared").Address;
            billingAddress: import("../types/shared").Address;
            confirmedAt?: Date | undefined;
            fulfilledAt?: Date | undefined;
            fulfillmentStatus?: string | undefined;
            customer?: any;
            __v: number;
        }[];
        totalCount: number;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrevious: boolean;
    }>;
    static getAnalytics(merchantId: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<{
        totalOrders: number;
        pendingOrders: number;
        averageOrderValue: number;
        averageProcessingTime: number;
        orderCompletionRate: number;
        topSellingProducts: {
            productId: string;
            productName: string;
            quantitySold: number;
            revenue: number;
        }[];
        hourlyOrderDistribution: {
            hour: number;
            orderCount: number;
        }[];
        dailyOrderTrends: {
            date: string;
            orderCount: number;
            revenue: number;
        }[];
    }>;
    static createSampleOrders(merchantId: string): Promise<void>;
    static countByMerchant(merchantId: string): Promise<number>;
    static countByStatus(merchantId: string, status: OrderStatus): Promise<number>;
    static findByStatus(merchantId: string, status: OrderStatus): Promise<Order[]>;
}
