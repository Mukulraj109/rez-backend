import { Order, OrderStatus, PaymentStatus } from '../types/shared';
declare const OrderMongoModel: any;
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
        orders: any;
        totalCount: any;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrevious: boolean;
    }>;
    static getAnalytics(merchantId: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<{
        totalOrders: any;
        pendingOrders: any;
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
