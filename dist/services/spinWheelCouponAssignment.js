"use strict";
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
exports.shouldBeProductSpecific = shouldBeProductSpecific;
exports.getRandomStore = getRandomStore;
exports.getRandomProduct = getRandomProduct;
exports.getCouponApplicability = getCouponApplicability;
exports.generateCouponDescription = generateCouponDescription;
exports.generateCouponTitle = generateCouponTitle;
exports.generateApplicabilityText = generateApplicabilityText;
const mongoose_1 = require("mongoose");
// ==================== HELPER FUNCTIONS ====================
/**
 * Decide if coupon should be product-specific or store-wide
 * 30% chance for product-specific, 70% for store-wide
 */
function shouldBeProductSpecific() {
    return Math.random() < 0.3; // 30% product-specific
}
/**
 * Get random popular store from database
 * Criteria: Active stores with products
 */
async function getRandomStore() {
    try {
        const { Store } = await Promise.resolve().then(() => __importStar(require('../models/Store')));
        // Find active stores with products
        const stores = await Store.aggregate([
            {
                $match: {
                    isActive: true
                }
            },
            {
                $lookup: {
                    from: 'products', // Collection name
                    localField: '_id',
                    foreignField: 'store',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.0': { $exists: true } // Has at least one product
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    'logo.url': 1,
                    productsCount: { $size: '$products' }
                }
            },
            { $sample: { size: 1 } } // Random sample
        ]);
        if (stores.length === 0) {
            // Fallback: Create a generic store assignment
            console.warn('⚠️ [COUPON_ASSIGNMENT] No active stores found, using fallback');
            return {
                storeId: 'generic',
                storeName: 'All Stores',
                storeImage: undefined
            };
        }
        const store = stores[0]; // Aggregation result type
        return {
            storeId: store._id.toString(),
            storeName: store.name,
            storeImage: store.logo?.url
        };
    }
    catch (error) {
        console.error('❌ [COUPON_ASSIGNMENT] Error getting random store:', error);
        // Fallback
        return {
            storeId: 'generic',
            storeName: 'All Stores',
            storeImage: undefined
        };
    }
}
/**
 * Get random product from database
 * Optionally from a specific store
 */
async function getRandomProduct(storeId) {
    try {
        const { Product } = await Promise.resolve().then(() => __importStar(require('../models/Product')));
        // Build match criteria
        const matchCriteria = {
            isActive: true,
            stock: { $gt: 0 } // Has stock
        };
        if (storeId && storeId !== 'generic') {
            matchCriteria.store = new mongoose_1.Types.ObjectId(storeId);
        }
        // Find random product
        const products = await Product.aggregate([
            { $match: matchCriteria },
            {
                $lookup: {
                    from: 'stores',
                    localField: 'store',
                    foreignField: '_id',
                    as: 'storeInfo'
                }
            },
            { $unwind: '$storeInfo' },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    'images.0.url': 1,
                    price: 1,
                    store: 1,
                    'storeInfo.name': 1
                }
            },
            { $sample: { size: 1 } }
        ]);
        if (products.length === 0) {
            // Fallback: Use the store's generic product
            console.warn('⚠️ [COUPON_ASSIGNMENT] No products found, using fallback');
            const store = storeId ? await getStoreById(storeId) : await getRandomStore();
            return {
                productId: 'generic',
                productName: 'Any Product',
                productImage: undefined,
                storeId: store.storeId,
                storeName: store.storeName,
                originalPrice: 0
            };
        }
        const product = products[0]; // Aggregation result type
        return {
            productId: product._id.toString(),
            productName: product.name,
            productImage: product.images?.[0]?.url,
            storeId: product.store.toString(),
            storeName: product.storeInfo.name,
            originalPrice: product.price || 0
        };
    }
    catch (error) {
        console.error('❌ [COUPON_ASSIGNMENT] Error getting random product:', error);
        // Fallback
        const store = storeId ? await getStoreById(storeId) : await getRandomStore();
        return {
            productId: 'generic',
            productName: 'Any Product',
            productImage: undefined,
            storeId: store.storeId,
            storeName: store.storeName,
            originalPrice: 0
        };
    }
}
/**
 * Helper: Get store by ID
 */
async function getStoreById(storeId) {
    try {
        const { Store } = await Promise.resolve().then(() => __importStar(require('../models/Store')));
        const store = await Store.findById(storeId);
        if (!store) {
            return {
                storeId: 'generic',
                storeName: 'All Stores',
                storeImage: undefined
            };
        }
        return {
            storeId: store._id.toString(),
            storeName: store.name,
            storeImage: store.logo?.url
        };
    }
    catch (error) {
        return {
            storeId: 'generic',
            storeName: 'All Stores',
            storeImage: undefined
        };
    }
}
/**
 * Get coupon applicability (store-wide or product-specific)
 */
async function getCouponApplicability(forceStoreWide = false) {
    const isProductSpecific = forceStoreWide ? false : shouldBeProductSpecific();
    if (isProductSpecific) {
        // Product-specific coupon
        const product = await getRandomProduct();
        return {
            isProductSpecific: true,
            storeId: product.storeId,
            storeName: product.storeName,
            productId: product.productId,
            productName: product.productName,
            productImage: product.productImage,
            originalPrice: product.originalPrice
        };
    }
    else {
        // Store-wide coupon
        const store = await getRandomStore();
        return {
            isProductSpecific: false,
            storeId: store.storeId,
            storeName: store.storeName
        };
    }
}
/**
 * Generate user-friendly coupon description with store/product details
 */
function generateCouponDescription(params) {
    const { type, value, applicability } = params;
    if (type === 'cashback') {
        // Cashback description
        return applicability.isProductSpecific
            ? `You won ${value}% cashback on ${applicability.productName} from ${applicability.storeName}! ` +
                `Purchase this product and get ${value}% of the price back as wallet credit.`
            : `You won ${value}% cashback at ${applicability.storeName}! ` +
                `Shop any product from this store and get ${value}% back as wallet credit.`;
    }
    else if (type === 'discount') {
        // Discount description
        return applicability.isProductSpecific
            ? `You won ${value}% discount on ${applicability.productName} from ${applicability.storeName}! ` +
                `Add this product to cart and apply the code to save ${value}%.`
            : `You won ${value}% discount at ${applicability.storeName}! ` +
                `Shop any product from this store and save ${value}% on your order.`;
    }
    else if (type === 'voucher') {
        // Voucher description
        return applicability.isProductSpecific
            ? `You won ₹${value} voucher for ${applicability.productName} from ${applicability.storeName}! ` +
                `Purchase this product and get instant ₹${value} off.`
            : `You won ₹${value} voucher at ${applicability.storeName}! ` +
                `Shop any product from this store and get instant ₹${value} off.`;
    }
    return `You won ${type} worth ${value}!`;
}
/**
 * Generate user-friendly coupon title
 */
function generateCouponTitle(params) {
    const { type, value, applicability } = params;
    if (type === 'cashback') {
        return applicability.isProductSpecific
            ? `${value}% Cashback on ${applicability.productName}`
            : `${value}% Cashback at ${applicability.storeName}`;
    }
    else if (type === 'discount') {
        return applicability.isProductSpecific
            ? `${value}% OFF on ${applicability.productName}`
            : `${value}% OFF at ${applicability.storeName}`;
    }
    else if (type === 'voucher') {
        return applicability.isProductSpecific
            ? `₹${value} Voucher for ${applicability.productName}`
            : `₹${value} Voucher at ${applicability.storeName}`;
    }
    return `${value}% ${type}`;
}
/**
 * Generate applicability text for UI display
 */
function generateApplicabilityText(applicability) {
    if (applicability.isProductSpecific) {
        return `Valid on ${applicability.productName} from ${applicability.storeName}`;
    }
    else {
        return `Valid on any product from ${applicability.storeName}`;
    }
}
// ==================== EXPORTS ====================
exports.default = {
    shouldBeProductSpecific,
    getRandomStore,
    getRandomProduct,
    getCouponApplicability,
    generateCouponDescription,
    generateCouponTitle,
    generateApplicabilityText
};
