export declare class MerchantUserSyncService {
    /**
     * Sync all existing merchants to create corresponding stores
     */
    static syncAllMerchantsToStores(): Promise<void>;
    /**
     * Sync all merchant products to user-side products
     */
    static syncAllMerchantProductsToUserProducts(): Promise<void>;
    /**
     * Create a store for a merchant
     */
    static createStoreForMerchant(merchant: any): Promise<void>;
    /**
     * Create user-side product from merchant product
     */
    static createUserSideProduct(merchantProduct: any, merchantId: string): Promise<void>;
    /**
     * Get sync status and statistics
     */
    static getSyncStatus(): Promise<{
        merchants: {
            total: any;
            withStores: any;
            withoutStores: number;
        };
        stores: {
            total: any;
            syncedFromMerchants: any;
        };
        products: {
            merchantSide: any;
            userSide: any;
            synced: any;
            needsSync: number;
        };
        syncHealth: {
            merchantStoreSync: number;
            productSync: number;
        };
    } | null>;
    /**
     * Force full sync - sync all merchants and products
     */
    static forceFullSync(): Promise<void>;
}
