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
            total: number;
            withStores: number;
            withoutStores: number;
        };
        stores: {
            total: number;
            syncedFromMerchants: number;
        };
        products: {
            merchantSide: number;
            userSide: number;
            synced: number;
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
