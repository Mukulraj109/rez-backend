"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Offer_1 = __importDefault(require("../models/Offer"));
const FlashSale_1 = __importDefault(require("../models/FlashSale"));
const User_1 = require("../models/User");
const mongoose_1 = __importDefault(require("mongoose"));
class OfferService {
    constructor() {
        /**
         * Priority order for offer types (higher number = higher priority)
         */
        this.OFFER_PRIORITY = {
            flash_sale: 100,
            exclusive: 80,
            category: 60,
            store: 40,
            general: 20,
        };
    }
    /**
     * Find the best offer for a cart
     */
    async findBestOffer(cartTotal, items, userId) {
        try {
            console.log('🔍 [OfferService] Finding best offer for cart:', {
                cartTotal,
                itemCount: items.length,
                userId,
            });
            // Get all applicable offers
            const allOffers = await this.getAllApplicableOffers(cartTotal, items, userId);
            if (allOffers.length === 0) {
                return {
                    bestOffer: null,
                    allApplicableOffers: [],
                    originalTotal: cartTotal,
                    finalTotal: cartTotal,
                    totalSavings: 0,
                };
            }
            // Sort by priority and savings
            const sortedOffers = allOffers.sort((a, b) => {
                // First by priority
                if (b.priority !== a.priority) {
                    return b.priority - a.priority;
                }
                // Then by savings amount
                return b.savings - a.savings;
            });
            const bestOffer = sortedOffers[0];
            return {
                bestOffer,
                allApplicableOffers: sortedOffers,
                originalTotal: cartTotal,
                finalTotal: bestOffer.finalPrice,
                totalSavings: bestOffer.savings,
            };
        }
        catch (error) {
            console.error('❌ [OfferService] Error finding best offer:', error);
            throw error;
        }
    }
    /**
     * Get all applicable offers for cart
     */
    async getAllApplicableOffers(cartTotal, items, userId) {
        const offers = [];
        // 1. Check flash sales (highest priority)
        const flashSaleOffers = await this.getFlashSaleOffers(items, cartTotal);
        offers.push(...flashSaleOffers);
        // 2. Check exclusive user offers (based on tier/loyalty)
        const exclusiveOffers = await this.getExclusiveOffers(userId, cartTotal, items);
        offers.push(...exclusiveOffers);
        // 3. Check category offers
        const categoryOffers = await this.getCategoryOffers(items, cartTotal);
        offers.push(...categoryOffers);
        // 4. Check store-wide offers
        const storeOffers = await this.getStoreOffers(items, cartTotal);
        offers.push(...storeOffers);
        // 5. Check general offers
        const generalOffers = await this.getGeneralOffers(cartTotal);
        offers.push(...generalOffers);
        // Filter out non-applicable offers
        return offers.filter(offer => offer.applicable);
    }
    /**
     * Get flash sale offers
     */
    async getFlashSaleOffers(items, cartTotal) {
        try {
            const productIds = items.map(item => new mongoose_1.default.Types.ObjectId(item.productId));
            const now = new Date();
            const flashSales = await FlashSale_1.default.find({
                products: { $in: productIds },
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now },
                status: { $nin: ['ended', 'sold_out'] },
            }).sort({ priority: -1, discountPercentage: -1 });
            return flashSales.map(sale => {
                const savings = (cartTotal * sale.discountPercentage) / 100;
                const cappedSavings = sale.maximumDiscount
                    ? Math.min(savings, sale.maximumDiscount)
                    : savings;
                const applicable = !sale.minimumPurchase || cartTotal >= sale.minimumPurchase;
                return {
                    offerId: sale._id.toString(),
                    offerType: 'flash_sale',
                    title: sale.title,
                    description: sale.description,
                    priority: this.OFFER_PRIORITY.flash_sale + (sale.priority || 0),
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                    discountPercentage: sale.discountPercentage,
                    applicable,
                    reason: applicable ? undefined : `Minimum purchase of ₹${sale.minimumPurchase} required`,
                };
            });
        }
        catch (error) {
            console.error('❌ [OfferService] Error getting flash sale offers:', error);
            return [];
        }
    }
    /**
     * Get exclusive user offers (based on loyalty tier)
     */
    async getExclusiveOffers(userId, cartTotal, items) {
        try {
            // Get user's tier/loyalty level
            const user = await User_1.User.findById(userId).select('tier loyaltyPoints');
            if (!user)
                return [];
            const productIds = items.map(item => new mongoose_1.default.Types.ObjectId(item.productId));
            const now = new Date();
            // Find offers that are exclusive to user's tier
            const exclusiveOffers = await Offer_1.default.find({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
                $or: [
                    { applicableProducts: { $in: productIds } },
                    { tags: { $in: ['exclusive', 'vip', 'premium'] } },
                ],
            });
            return exclusiveOffers.map(offer => {
                const discountPercentage = offer.cashbackPercentage || 0;
                const savings = (cartTotal * discountPercentage) / 100;
                const cappedSavings = offer.restrictions.maxDiscountAmount
                    ? Math.min(savings, offer.restrictions.maxDiscountAmount)
                    : savings;
                const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;
                return {
                    offerId: offer._id.toString(),
                    offerType: 'exclusive',
                    title: offer.title,
                    description: offer.description || '',
                    priority: this.OFFER_PRIORITY.exclusive,
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                    discountPercentage,
                    applicable,
                    reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
                };
            });
        }
        catch (error) {
            console.error('❌ [OfferService] Error getting exclusive offers:', error);
            return [];
        }
    }
    /**
     * Get category-specific offers
     */
    async getCategoryOffers(items, cartTotal) {
        try {
            const categoryIds = items
                .filter(item => item.categoryId)
                .map(item => new mongoose_1.default.Types.ObjectId(item.categoryId));
            if (categoryIds.length === 0)
                return [];
            const now = new Date();
            const categoryOffers = await Offer_1.default.find({
                category: { $in: categoryIds },
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
            });
            return categoryOffers.map(offer => {
                const discountPercentage = offer.cashbackPercentage || 0;
                const savings = (cartTotal * discountPercentage) / 100;
                const cappedSavings = offer.restrictions.maxDiscountAmount
                    ? Math.min(savings, offer.restrictions.maxDiscountAmount)
                    : savings;
                const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;
                return {
                    offerId: offer._id.toString(),
                    offerType: 'category',
                    title: offer.title,
                    description: offer.description || '',
                    priority: this.OFFER_PRIORITY.category,
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                    discountPercentage,
                    applicable,
                    reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
                };
            });
        }
        catch (error) {
            console.error('❌ [OfferService] Error getting category offers:', error);
            return [];
        }
    }
    /**
     * Get store-wide offers
     */
    async getStoreOffers(items, cartTotal) {
        try {
            const storeIds = items
                .filter(item => item.storeId)
                .map(item => new mongoose_1.default.Types.ObjectId(item.storeId));
            if (storeIds.length === 0)
                return [];
            const now = new Date();
            const storeOffers = await Offer_1.default.find({
                $or: [
                    { store: { $in: storeIds } },
                    { applicableStores: { $in: storeIds } },
                ],
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
            });
            return storeOffers.map(offer => {
                const discountPercentage = offer.cashbackPercentage || 0;
                const savings = (cartTotal * discountPercentage) / 100;
                const cappedSavings = offer.restrictions.maxDiscountAmount
                    ? Math.min(savings, offer.restrictions.maxDiscountAmount)
                    : savings;
                const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;
                return {
                    offerId: offer._id.toString(),
                    offerType: 'store',
                    title: offer.title,
                    description: offer.description || '',
                    priority: this.OFFER_PRIORITY.store,
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                    discountPercentage,
                    applicable,
                    reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
                };
            });
        }
        catch (error) {
            console.error('❌ [OfferService] Error getting store offers:', error);
            return [];
        }
    }
    /**
     * Get general/global offers
     */
    async getGeneralOffers(cartTotal) {
        try {
            const now = new Date();
            const generalOffers = await Offer_1.default.find({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
                // No specific product, category, or store restrictions
                $and: [
                    { $or: [{ applicableProducts: { $exists: false } }, { applicableProducts: { $size: 0 } }] },
                    { $or: [{ applicableStores: { $exists: false } }, { applicableStores: { $size: 0 } }] },
                    { $or: [{ product: { $exists: false } }, { product: null }] },
                    { $or: [{ store: { $exists: false } }, { store: null }] },
                ],
            });
            return generalOffers.map(offer => {
                const discountPercentage = offer.cashbackPercentage || 0;
                const savings = (cartTotal * discountPercentage) / 100;
                const cappedSavings = offer.restrictions.maxDiscountAmount
                    ? Math.min(savings, offer.restrictions.maxDiscountAmount)
                    : savings;
                const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;
                return {
                    offerId: offer._id.toString(),
                    offerType: 'general',
                    title: offer.title,
                    description: offer.description || '',
                    priority: this.OFFER_PRIORITY.general,
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                    discountPercentage,
                    applicable,
                    reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
                };
            });
        }
        catch (error) {
            console.error('❌ [OfferService] Error getting general offers:', error);
            return [];
        }
    }
    /**
     * Apply offer to cart
     */
    async applyOffer(offerId, cartTotal, items, userId) {
        try {
            // Get all applicable offers
            const result = await this.findBestOffer(cartTotal, items, userId);
            // Find the specific offer
            const selectedOffer = result.allApplicableOffers.find(offer => offer.offerId === offerId);
            if (!selectedOffer) {
                return {
                    success: false,
                    finalPrice: cartTotal,
                    savings: 0,
                    message: 'Offer not found or not applicable',
                };
            }
            if (!selectedOffer.applicable) {
                return {
                    success: false,
                    finalPrice: cartTotal,
                    savings: 0,
                    message: selectedOffer.reason || 'Offer is not applicable',
                };
            }
            return {
                success: true,
                finalPrice: selectedOffer.finalPrice,
                savings: selectedOffer.savings,
                offer: selectedOffer,
            };
        }
        catch (error) {
            console.error('❌ [OfferService] Error applying offer:', error);
            throw error;
        }
    }
    /**
     * Validate promo code
     */
    async validatePromoCode(promoCode, cartTotal, userId) {
        try {
            const now = new Date();
            // Check if it's a flash sale promo code
            const flashSale = await FlashSale_1.default.findOne({
                redemptionCode: promoCode.toUpperCase(),
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now },
                status: { $nin: ['ended', 'sold_out'] },
            });
            if (flashSale) {
                const applicable = !flashSale.minimumPurchase || cartTotal >= flashSale.minimumPurchase;
                if (!applicable) {
                    return {
                        valid: false,
                        message: `Minimum purchase of ₹${flashSale.minimumPurchase} required`,
                    };
                }
                const savings = (cartTotal * flashSale.discountPercentage) / 100;
                const cappedSavings = flashSale.maximumDiscount
                    ? Math.min(savings, flashSale.maximumDiscount)
                    : savings;
                return {
                    valid: true,
                    offer: flashSale,
                    savings: cappedSavings,
                    finalPrice: cartTotal - cappedSavings,
                };
            }
            // Check regular offers
            const offer = await Offer_1.default.findOne({
                redemptionCode: promoCode.toUpperCase(),
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
            });
            if (!offer) {
                return {
                    valid: false,
                    message: 'Invalid promo code',
                };
            }
            const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;
            if (!applicable) {
                return {
                    valid: false,
                    message: `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
                };
            }
            const discountPercentage = offer.cashbackPercentage || 0;
            const savings = (cartTotal * discountPercentage) / 100;
            const cappedSavings = offer.restrictions.maxDiscountAmount
                ? Math.min(savings, offer.restrictions.maxDiscountAmount)
                : savings;
            return {
                valid: true,
                offer,
                savings: cappedSavings,
                finalPrice: cartTotal - cappedSavings,
            };
        }
        catch (error) {
            console.error('❌ [OfferService] Error validating promo code:', error);
            throw error;
        }
    }
}
exports.default = new OfferService();
