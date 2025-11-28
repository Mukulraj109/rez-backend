export interface SyncConfig {
    merchantId: string;
    lastSync?: Date;
    syncTypes: ('products' | 'orders' | 'cashback' | 'merchant')[];
    batchSize: number;
}
export interface SyncResult {
    success: boolean;
    syncId: string;
    merchantId: string;
    syncedAt: Date;
    results: {
        products?: {
            created: number;
            updated: number;
            deleted: number;
            errors: number;
        };
        orders?: {
            created: number;
            updated: number;
            errors: number;
        };
        cashback?: {
            created: number;
            updated: number;
            errors: number;
        };
        merchant?: {
            updated: boolean;
            errors: number;
        };
    };
    errors: string[];
    duration: number;
}
export interface CustomerAppProduct {
    merchantId: string;
    productId: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: string;
    subcategory?: string;
    brand?: string;
    images: string[];
    availability: {
        inStock: boolean;
        quantity?: number;
        estimatedDelivery?: string;
    };
    cashback: {
        percentage: number;
        maxAmount?: number;
        conditions?: string[];
    };
    ratings: {
        average: number;
        count: number;
    };
    attributes: {
        size?: string[];
        color?: string[];
        material?: string;
        weight?: string;
        dimensions?: string;
        [key: string]: any;
    };
    seo: {
        slug: string;
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
    };
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SyncService {
    private static activeSyncs;
    private static syncHistory;
    static syncToCustomerApp(config: SyncConfig): Promise<SyncResult>;
    private static syncProducts;
    private static syncOrders;
    private static syncCashback;
    private static syncMerchantProfile;
    private static syncToDatabase;
    private static syncProductsToDatabase;
    private static syncMerchantToDatabase;
    static getSyncStatus(merchantId: string): {
        isActive: boolean;
        lastSync: SyncResult;
        nextScheduledSync: Date | null;
    };
    static getSyncHistory(merchantId: string, limit?: number): SyncResult[];
    static scheduleAutoSync(merchantId: string, intervalMinutes?: number): void;
    static clearAutoSync(merchantId: string): void;
    private static getLastSyncDate;
    private static getNextScheduledSync;
    static forceFullSync(merchantId: string): Promise<SyncResult>;
    static getSyncStatistics(): {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageDuration: number;
        activeSyncs: number;
        merchantsWithAutoSync: any;
    };
}
