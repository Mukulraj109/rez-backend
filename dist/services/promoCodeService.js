"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivatePromoCode = exports.createPromoCode = exports.getPromoCodeStats = exports.hasUserUsedPromoCode = exports.getActivePromoCodes = exports.applyPromoCode = exports.validatePromoCode = exports.getSubscriptionPrice = void 0;
const PromoCode_1 = require("../models/PromoCode");
/**
 * Get subscription price based on tier and billing cycle
 */
const getSubscriptionPrice = (tier, billingCycle) => {
    const pricing = {
        free: { monthly: 0, yearly: 0 },
        premium: { monthly: 99, yearly: 999 },
        vip: { monthly: 299, yearly: 2999 }
    };
    return billingCycle === 'monthly' ? pricing[tier].monthly : pricing[tier].yearly;
};
exports.getSubscriptionPrice = getSubscriptionPrice;
/**
 * Validate a promo code for a subscription
 */
const validatePromoCode = async (code, tier, billingCycle, userId) => {
    try {
        // Get original price
        const originalPrice = (0, exports.getSubscriptionPrice)(tier, billingCycle);
        // Use the static method from PromoCode model
        const result = await PromoCode_1.PromoCode.validateCode(code, tier, billingCycle, userId, originalPrice);
        if (!result.valid) {
            return {
                valid: false,
                message: result.message
            };
        }
        // Return success with discount details
        return {
            valid: true,
            discount: result.discount,
            finalPrice: result.discountedPrice,
            promoCode: result.promoCode,
            message: result.message
        };
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error validating promo code:', error);
        return {
            valid: false,
            message: 'Error validating promo code'
        };
    }
};
exports.validatePromoCode = validatePromoCode;
/**
 * Apply promo code to a subscription
 * This increments the usage count and records the usage
 */
const applyPromoCode = async (code, tier, billingCycle, userId, subscriptionId) => {
    try {
        // First validate the code
        const originalPrice = (0, exports.getSubscriptionPrice)(tier, billingCycle);
        const validation = await PromoCode_1.PromoCode.validateCode(code, tier, billingCycle, userId, originalPrice);
        if (!validation.valid || !validation.promoCode) {
            return {
                success: false,
                message: validation.message
            };
        }
        // Increment usage
        await validation.promoCode.incrementUsage(userId, subscriptionId, originalPrice, validation.discountedPrice || originalPrice);
        return {
            success: true,
            discount: validation.discount,
            finalPrice: validation.discountedPrice,
            message: `Promo code applied! You saved ₹${validation.discount}`
        };
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error applying promo code:', error);
        return {
            success: false,
            message: 'Error applying promo code'
        };
    }
};
exports.applyPromoCode = applyPromoCode;
/**
 * Get all active promo codes (admin only)
 */
const getActivePromoCodes = async (tier, billingCycle) => {
    try {
        return await PromoCode_1.PromoCode.getActivePromoCodes(tier, billingCycle);
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error fetching active promo codes:', error);
        return [];
    }
};
exports.getActivePromoCodes = getActivePromoCodes;
/**
 * Check if a user has used a promo code
 */
const hasUserUsedPromoCode = async (code, userId) => {
    try {
        const sanitizedCode = PromoCode_1.PromoCode.sanitizeCode(code);
        const promoCode = await PromoCode_1.PromoCode.findOne({ code: sanitizedCode });
        if (!promoCode) {
            return false;
        }
        const canUse = await promoCode.canBeUsedBy(userId);
        return !canUse; // If can't use, means already used
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error checking user promo usage:', error);
        return false;
    }
};
exports.hasUserUsedPromoCode = hasUserUsedPromoCode;
/**
 * Get promo code usage statistics
 */
const getPromoCodeStats = async (code) => {
    try {
        const sanitizedCode = PromoCode_1.PromoCode.sanitizeCode(code);
        const promoCode = await PromoCode_1.PromoCode.findOne({ code: sanitizedCode });
        if (!promoCode) {
            return null;
        }
        return {
            code: promoCode.code,
            description: promoCode.description,
            usedCount: promoCode.usedCount,
            maxUses: promoCode.maxUses,
            remainingUses: promoCode.maxUses > 0 ? promoCode.maxUses - promoCode.usedCount : 'Unlimited',
            isActive: promoCode.isActive,
            validFrom: promoCode.validFrom,
            validUntil: promoCode.validUntil,
            totalDiscount: promoCode.usedBy.reduce((sum, usage) => sum + usage.discountApplied, 0),
            uniqueUsers: new Set(promoCode.usedBy.map(u => u.user.toString())).size
        };
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error fetching promo code stats:', error);
        return null;
    }
};
exports.getPromoCodeStats = getPromoCodeStats;
/**
 * Create a new promo code (admin only)
 */
const createPromoCode = async (promoData) => {
    try {
        const promoCode = new PromoCode_1.PromoCode(promoData);
        await promoCode.save();
        return promoCode;
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error creating promo code:', error);
        throw error;
    }
};
exports.createPromoCode = createPromoCode;
/**
 * Deactivate a promo code (admin only)
 */
const deactivatePromoCode = async (code) => {
    try {
        const sanitizedCode = PromoCode_1.PromoCode.sanitizeCode(code);
        const result = await PromoCode_1.PromoCode.updateOne({ code: sanitizedCode }, { isActive: false });
        return result.modifiedCount > 0;
    }
    catch (error) {
        console.error('[PROMO_CODE_SERVICE] Error deactivating promo code:', error);
        return false;
    }
};
exports.deactivatePromoCode = deactivatePromoCode;
exports.default = {
    validatePromoCode: exports.validatePromoCode,
    applyPromoCode: exports.applyPromoCode,
    getActivePromoCodes: exports.getActivePromoCodes,
    hasUserUsedPromoCode: exports.hasUserUsedPromoCode,
    getPromoCodeStats: exports.getPromoCodeStats,
    createPromoCode: exports.createPromoCode,
    deactivatePromoCode: exports.deactivatePromoCode,
    getSubscriptionPrice: exports.getSubscriptionPrice
};
