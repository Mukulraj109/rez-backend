import { Types } from 'mongoose';
import { ICoupon } from '../models/Coupon';
import { IUserCoupon } from '../models/UserCoupon';
interface CartItem {
    product: Types.ObjectId;
    quantity: number;
    price: number;
    category?: Types.ObjectId;
    store?: Types.ObjectId;
}
interface CartData {
    items: CartItem[];
    subtotal: number;
    userId: Types.ObjectId;
}
interface CouponValidationResult {
    valid: boolean;
    coupon?: ICoupon;
    userCoupon?: IUserCoupon;
    discount: number;
    message: string;
    error?: string;
}
interface ApplyCouponResult {
    success: boolean;
    discount: number;
    finalAmount: number;
    couponApplied?: {
        code: string;
        type: string;
        value: number;
    };
    message: string;
    error?: string;
}
declare class CouponService {
    /**
     * Validate if a coupon can be applied to the cart
     */
    validateCoupon(couponCode: string, cartData: CartData): Promise<CouponValidationResult>;
    /**
     * Apply coupon to cart and calculate final amount
     */
    applyCouponToCart(couponCode: string, cartData: CartData): Promise<ApplyCouponResult>;
    /**
     * Get best applicable coupon for cart
     */
    getBestCouponForCart(cartData: CartData): Promise<ICoupon | null>;
    /**
     * Check if coupon is applicable to cart items
     */
    private checkCouponApplicability;
    /**
     * Calculate discount amount
     */
    private calculateDiscount;
    /**
     * Claim a coupon for a user
     */
    claimCoupon(userId: Types.ObjectId, couponId: Types.ObjectId): Promise<{
        success: boolean;
        userCoupon?: IUserCoupon;
        message: string;
    }>;
    /**
     * Mark coupon as used in an order
     */
    markCouponAsUsed(userId: Types.ObjectId, couponCode: string, orderId: Types.ObjectId): Promise<void>;
    /**
     * Search coupons
     */
    searchCoupons(query: string, filters?: any): Promise<ICoupon[]>;
}
declare const _default: CouponService;
export default _default;
