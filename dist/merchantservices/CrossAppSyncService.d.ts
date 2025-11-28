export interface CrossAppUpdate {
    type: 'order_status' | 'product_update' | 'cashback_update' | 'merchant_update';
    merchantId: string;
    customerId?: string;
    orderId?: string;
    productId?: string;
    data: any;
    timestamp: Date;
    source: 'merchant_app' | 'customer_app';
}
export interface OrderStatusUpdate {
    orderId: string;
    oldStatus: string;
    newStatus: string;
    statusMessage?: string;
    estimatedDelivery?: Date;
    tracking?: {
        trackingNumber: string;
        carrier: string;
        trackingUrl?: string;
    };
    timeline: Array<{
        status: string;
        timestamp: Date;
        message: string;
        location?: string;
    }>;
}
export interface ProductAvailabilityUpdate {
    productId: string;
    inStock: boolean;
    quantity?: number;
    priceChanged?: boolean;
    newPrice?: number;
    backInStockDate?: Date;
}
export interface CashbackStatusUpdate {
    requestId: string;
    orderId: string;
    customerId: string;
    oldStatus: string;
    newStatus: string;
    approvedAmount?: number;
    rejectionReason?: string;
    timeline: Array<{
        status: string;
        timestamp: Date;
        message: string;
        amount?: number;
    }>;
}
export declare class CrossAppSyncService {
    private static customerAppWebhooks;
    private static updateQueue;
    private static isProcessing;
    static initialize(): void;
    static registerCustomerAppWebhook(merchantId: string, webhookUrl: string): void;
    static sendOrderStatusUpdate(merchantId: string, orderId: string, customerId: string, update: OrderStatusUpdate): Promise<void>;
    static sendProductUpdate(merchantId: string, productId: string, update: ProductAvailabilityUpdate): Promise<void>;
    static sendCashbackUpdate(merchantId: string, customerId: string, update: CashbackStatusUpdate): Promise<void>;
    private static processUpdateQueue;
    private static processUpdate;
    private static sendToCustomerApp;
    private static triggerSyncForUpdate;
    static handleCustomerAppUpdate(update: CrossAppUpdate): Promise<void>;
    private static handleCustomerOrderUpdate;
    private static handleCustomerCashbackUpdate;
    static getCrossAppSyncStatus(merchantId: string): {
        merchantId: string;
        hasCustomerAppWebhook: boolean;
        webhookUrl: string | null | undefined;
        pendingUpdates: number;
        isProcessing: boolean;
        lastSync: import("./SyncService").SyncResult;
    };
    static getCrossAppStatistics(): {
        totalPendingUpdates: number;
        updatesByType: Record<string, number>;
        registeredWebhooks: number;
        isProcessing: boolean;
    };
    static cleanup(): void;
    static sendMerchantUpdate(merchantId: string, updateData: any): Promise<void>;
}
export declare const createOrderStatusTimeline: (currentStatus: string, newStatus: string, message?: string, location?: string) => {
    status: string;
    timestamp: Date;
    message: string;
    location: string | undefined;
};
export declare const createProductAvailabilityUpdate: (productId: string, currentStock: number, newStock: number, price?: number, oldPrice?: number) => ProductAvailabilityUpdate;
export declare const createCashbackStatusUpdate: (requestId: string, orderId: string, customerId: string, oldStatus: string, newStatus: string, approvedAmount?: number, rejectionReason?: string) => CashbackStatusUpdate;
