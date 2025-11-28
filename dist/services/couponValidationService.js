"use strict";
/**
 * Coupon Validation Service
 *
 * Validates coupons during cart/checkout operations
 * Handles store-wide and product-specific coupon validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCouponForCart = validateCouponForCart;
exports.markCouponAsUsed = markCouponAsUsed;
/**
 * Validate if coupon can be applied to cart
 */
async function validateCouponForCart(couponId, context) {
    try {
        const { Coupon } = await Promise.resolve().then(() => __importStar(require('../models/Coupon')));
        const { UserCoupon } = await Promise.resolve().then(() => __importStar(require('../models/UserCoupon')));
        // 1. Find the coupon
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return {
                isValid: false,
                error: 'Coupon not found'
            };
        }
        // 2. Check if coupon is active and valid
        if (coupon.status !== 'active') {
            return {
                isValid: false,
                error: 'This coupon is no longer active'
            };
        }
        const now = new Date();
        if (coupon.validFrom > now) {
            return {
                isValid: false,
                error: 'This coupon is not yet valid'
            };
        }
        if (coupon.validTo < now) {
            return {
                isValid: false,
                error: 'This coupon has expired'
            };
        }
        // 3. Check user coupon ownership and status
        const userCoupon = await UserCoupon.findOne({
            user: context.userId,
            coupon: couponId
        });
        if (!userCoupon) {
            return {
                isValid: false,
                error: 'You do not own this coupon'
            };
        }
        if (userCoupon.status === 'used') {
            return {
                isValid: false,
                error: 'This coupon has already been used'
            };
        }
        if (userCoupon.status === 'expired') {
            return {
                isValid: false,
                error: 'This coupon has expired'
            };
        }
        // 4. Check usage limits
        if (coupon.usageLimit && coupon.usageLimit.perUser > 0) {
            const usageCount = await UserCoupon.countDocuments({
                user: context.userId,
                coupon: couponId,
                status: 'used'
            });
            if (usageCount >= coupon.usageLimit.perUser) {
                return {
                    isValid: false,
                    error: 'You have reached the usage limit for this coupon'
                };
            }
        }
        // 5. Validate applicability based on metadata (for spin wheel coupons)
        if (coupon.metadata && coupon.metadata.source === 'spin_wheel') {
            return validateSpinWheelCoupon(coupon, context);
        }
        // 6. Validate applicability based on products/stores/categories
        return validateStandardCoupon(coupon, context);
    }
    catch (error) {
        console.error('❌ [COUPON_VALIDATION] Error validating coupon:', error);
        return {
            isValid: false,
            error: 'Failed to validate coupon. Please try again.'
        };
    }
}
/**
 * Validate spin wheel coupons (with metadata)
 */
function validateSpinWheelCoupon(coupon, context) {
    const metadata = coupon.metadata;
    // Product-specific coupon
    if (metadata.isProductSpecific && metadata.productId) {
        const applicableItems = context.cartItems.filter(item => item.productId === metadata.productId);
        if (applicableItems.length === 0) {
            return {
                isValid: false,
                error: `This coupon is only valid for ${metadata.productName} from ${metadata.storeName}. Please add this product to your cart to use this coupon.`
            };
        }
        // Calculate discount for applicable items
        const subtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = calculateDiscount(coupon, subtotal);
        return {
            isValid: true,
            applicableItems: applicableItems.map(item => item.productId),
            discountAmount
        };
    }
    // Store-wide coupon
    if (!metadata.isProductSpecific && metadata.storeId && metadata.storeId !== 'generic') {
        const applicableItems = context.cartItems.filter(item => item.storeId === metadata.storeId);
        if (applicableItems.length === 0) {
            return {
                isValid: false,
                error: `This coupon is only valid for products from ${metadata.storeName}. Please add products from this store to use this coupon.`
            };
        }
        // Calculate discount for applicable items
        const subtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Check minimum order value
        if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
            return {
                isValid: false,
                error: `Minimum order value of ₹${coupon.minOrderValue} required for products from ${metadata.storeName}`
            };
        }
        const discountAmount = calculateDiscount(coupon, subtotal);
        return {
            isValid: true,
            applicableItems: applicableItems.map(item => item.productId),
            discountAmount
        };
    }
    // Generic/fallback (shouldn't happen but handle it)
    return {
        isValid: false,
        error: 'This coupon configuration is invalid'
    };
}
/**
 * Validate standard coupons (based on applicableTo fields)
 */
function validateStandardCoupon(coupon, context) {
    const { applicableTo } = coupon;
    // Find applicable items
    let applicableItems = context.cartItems;
    // Filter by products if specified
    if (applicableTo.products && applicableTo.products.length > 0) {
        const productIds = applicableTo.products.map((p) => p.toString());
        applicableItems = applicableItems.filter(item => productIds.includes(item.productId));
    }
    // Filter by stores if specified
    if (applicableTo.stores && applicableTo.stores.length > 0) {
        const storeIds = applicableTo.stores.map((s) => s.toString());
        applicableItems = applicableItems.filter(item => storeIds.includes(item.storeId));
    }
    if (applicableItems.length === 0) {
        return {
            isValid: false,
            error: 'This coupon is not applicable to any items in your cart'
        };
    }
    // Calculate discount for applicable items
    const subtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Check minimum order value
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        return {
            isValid: false,
            error: `Minimum order value of ₹${coupon.minOrderValue} required`
        };
    }
    const discountAmount = calculateDiscount(coupon, subtotal);
    return {
        isValid: true,
        applicableItems: applicableItems.map(item => item.productId),
        discountAmount
    };
}
/**
 * Calculate discount amount based on coupon type
 */
function calculateDiscount(coupon, subtotal) {
    if (coupon.discountType === 'PERCENTAGE') {
        let discount = (subtotal * coupon.discountValue) / 100;
        // Apply max discount cap if specified
        if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
            discount = Math.min(discount, coupon.maxDiscountCap);
        }
        return Math.round(discount * 100) / 100; // Round to 2 decimal places
    }
    else if (coupon.discountType === 'FIXED') {
        return Math.min(coupon.discountValue, subtotal);
    }
    return 0;
}
/**
 * Mark coupon as used after successful order
 */
async function markCouponAsUsed(couponId, userId, orderId) {
    try {
        const { UserCoupon } = await Promise.resolve().then(() => __importStar(require('../models/UserCoupon')));
        const { Coupon } = await Promise.resolve().then(() => __importStar(require('../models/Coupon')));
        // Update user coupon status
        const userCoupon = await UserCoupon.findOneAndUpdate({
            user: userId,
            coupon: couponId,
            status: 'available'
        }, {
            status: 'used',
            usedAt: new Date(),
            orderId: orderId
        }, { new: true });
        if (!userCoupon) {
            console.error('❌ [COUPON_VALIDATION] User coupon not found or already used');
            return false;
        }
        // Increment coupon usage count
        await Coupon.findByIdAndUpdate(couponId, {
            $inc: { usageCount: 1, 'usageLimit.usedCount': 1 }
        });
        console.log(`✅ [COUPON_VALIDATION] Coupon ${couponId} marked as used by user ${userId}`);
        return true;
    }
    catch (error) {
        console.error('❌ [COUPON_VALIDATION] Error marking coupon as used:', error);
        return false;
    }
}
exports.default = {
    validateCouponForCart,
    markCouponAsUsed
};
