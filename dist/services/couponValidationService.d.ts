/**
 * Coupon Validation Service
 *
 * Validates coupons during cart/checkout operations
 * Handles store-wide and product-specific coupon validation
 */
export interface ValidationContext {
    cartItems: Array<{
        productId: string;
        storeId: string;
        quantity: number;
        price: number;
    }>;
    userId: string;
}
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    applicableItems?: string[];
    discountAmount?: number;
}
/**
 * Validate if coupon can be applied to cart
 */
export declare function validateCouponForCart(couponId: string, context: ValidationContext): Promise<ValidationResult>;
/**
 * Mark coupon as used after successful order
 */
export declare function markCouponAsUsed(couponId: string, userId: string, orderId: string): Promise<boolean>;
declare const _default: {
    validateCouponForCart: typeof validateCouponForCart;
    markCouponAsUsed: typeof markCouponAsUsed;
};
export default _default;
