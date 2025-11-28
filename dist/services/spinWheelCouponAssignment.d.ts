/**
 * Spin Wheel Coupon Assignment Service
 *
 * Handles smart assignment of coupons to stores/products when user wins from spin wheel
 *
 * Strategy:
 * - 70% store-wide coupons (any product from selected store)
 * - 30% product-specific coupons (specific product only)
 * - Randomly selects active stores/products from database
 */
export interface StoreAssignment {
    storeId: string;
    storeName: string;
    storeImage?: string;
}
export interface ProductAssignment {
    productId: string;
    productName: string;
    productImage?: string;
    storeId: string;
    storeName: string;
    originalPrice: number;
}
export interface CouponApplicability {
    isProductSpecific: boolean;
    storeId: string;
    storeName: string;
    productId?: string;
    productName?: string;
    productImage?: string;
    originalPrice?: number;
}
export interface CouponDescriptionParams {
    type: 'cashback' | 'discount' | 'voucher';
    value: number;
    applicability: CouponApplicability;
}
/**
 * Decide if coupon should be product-specific or store-wide
 * 30% chance for product-specific, 70% for store-wide
 */
export declare function shouldBeProductSpecific(): boolean;
/**
 * Get random popular store from database
 * Criteria: Active stores with products
 */
export declare function getRandomStore(): Promise<StoreAssignment>;
/**
 * Get random product from database
 * Optionally from a specific store
 */
export declare function getRandomProduct(storeId?: string): Promise<ProductAssignment>;
/**
 * Get coupon applicability (store-wide or product-specific)
 */
export declare function getCouponApplicability(forceStoreWide?: boolean): Promise<CouponApplicability>;
/**
 * Generate user-friendly coupon description with store/product details
 */
export declare function generateCouponDescription(params: CouponDescriptionParams): string;
/**
 * Generate user-friendly coupon title
 */
export declare function generateCouponTitle(params: CouponDescriptionParams): string;
/**
 * Generate applicability text for UI display
 */
export declare function generateApplicabilityText(applicability: CouponApplicability): string;
declare const _default: {
    shouldBeProductSpecific: typeof shouldBeProductSpecific;
    getRandomStore: typeof getRandomStore;
    getRandomProduct: typeof getRandomProduct;
    getCouponApplicability: typeof getCouponApplicability;
    generateCouponDescription: typeof generateCouponDescription;
    generateCouponTitle: typeof generateCouponTitle;
    generateApplicabilityText: typeof generateApplicabilityText;
};
export default _default;
