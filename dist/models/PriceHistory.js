"use strict";
/**
 * Price History Model
 *
 * Tracks historical price changes for products and variants.
 * Used for price tracking, analytics, and price drop alerts.
 *
 * Features:
 * - Automatic price change detection
 * - Variant-specific price tracking
 * - Price trend analysis
 * - Historical price queries
 * - Price drop detection
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
const mongoose_1 = __importStar(require("mongoose"));
const priceHistorySchema = new mongoose_1.Schema({
    // Product reference
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    // Optional variant reference
    variantId: {
        type: String,
        required: false,
        index: true,
    },
    // Price information
    price: {
        basePrice: {
            type: Number,
            required: true,
        },
        salePrice: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        discountPercentage: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
    },
    // Price change tracking
    previousPrice: {
        basePrice: Number,
        salePrice: Number,
        discount: Number,
    },
    changeType: {
        type: String,
        enum: ['increase', 'decrease', 'no_change', 'initial'],
        default: 'initial',
    },
    changeAmount: {
        type: Number,
        default: 0,
    },
    changePercentage: {
        type: Number,
        default: 0,
    },
    // Metadata
    source: {
        type: String,
        enum: ['manual', 'system', 'import', 'api'],
        default: 'system',
    },
    recordedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
priceHistorySchema.index({ productId: 1, recordedAt: -1 });
priceHistorySchema.index({ productId: 1, variantId: 1, recordedAt: -1 });
priceHistorySchema.index({ changeType: 1, recordedAt: -1 });
/**
 * Get price history for a product
 */
priceHistorySchema.statics.getProductHistory = function (productId, variantId = null, options = {}) {
    const { limit = 30, startDate, endDate } = options;
    const query = { productId };
    if (variantId) {
        query.variantId = variantId;
    }
    if (startDate || endDate) {
        query.recordedAt = {};
        if (startDate)
            query.recordedAt.$gte = new Date(startDate);
        if (endDate)
            query.recordedAt.$lte = new Date(endDate);
    }
    return this.find(query)
        .sort({ recordedAt: -1 })
        .limit(limit)
        .lean();
};
/**
 * Get latest price for a product
 */
priceHistorySchema.statics.getLatestPrice = function (productId, variantId = null) {
    const query = { productId };
    if (variantId) {
        query.variantId = variantId;
    }
    return this.findOne(query).sort({ recordedAt: -1 }).lean();
};
/**
 * Get lowest price in time range
 */
priceHistorySchema.statics.getLowestPrice = async function (productId, variantId = null, days = 30) {
    const query = {
        productId,
        recordedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    };
    if (variantId) {
        query.variantId = variantId;
    }
    const result = await this.findOne(query).sort({ 'price.salePrice': 1 }).lean();
    return result;
};
/**
 * Get highest price in time range
 */
priceHistorySchema.statics.getHighestPrice = async function (productId, variantId = null, days = 30) {
    const query = {
        productId,
        recordedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    };
    if (variantId) {
        query.variantId = variantId;
    }
    const result = await this.findOne(query).sort({ 'price.salePrice': -1 }).lean();
    return result;
};
/**
 * Get average price in time range
 */
priceHistorySchema.statics.getAveragePrice = async function (productId, variantId = null, days = 30) {
    const query = {
        productId,
        recordedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    };
    if (variantId) {
        query.variantId = variantId;
    }
    const result = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                avgPrice: { $avg: '$price.salePrice' },
                avgBasePrice: { $avg: '$price.basePrice' },
                count: { $sum: 1 },
            },
        },
    ]);
    return result[0] || null;
};
/**
 * Record a price change
 */
priceHistorySchema.statics.recordPriceChange = async function (data) {
    const { productId, variantId, price } = data;
    // Get previous price
    const previous = await this.getLatestPrice(productId, variantId);
    let changeType = 'initial';
    let changeAmount = 0;
    let changePercentage = 0;
    let previousPrice = null;
    if (previous) {
        const oldPrice = previous.price.salePrice;
        const newPrice = price.salePrice;
        changeAmount = newPrice - oldPrice;
        changePercentage = oldPrice > 0 ? ((changeAmount / oldPrice) * 100).toFixed(2) : 0;
        if (changeAmount > 0) {
            changeType = 'increase';
        }
        else if (changeAmount < 0) {
            changeType = 'decrease';
        }
        else {
            changeType = 'no_change';
        }
        previousPrice = {
            basePrice: previous.price.basePrice,
            salePrice: previous.price.salePrice,
            discount: previous.price.discount,
        };
    }
    // Create new history record
    const history = new this({
        productId,
        variantId,
        price,
        previousPrice,
        changeType,
        changeAmount,
        changePercentage,
        source: data.source || 'system',
        recordedAt: new Date(),
    });
    await history.save();
    console.log(`📊 [PriceHistory] Recorded ${changeType} for product ${productId}:`, {
        oldPrice: previousPrice?.salePrice,
        newPrice: price.salePrice,
        change: changeAmount,
    });
    return history;
};
/**
 * Get price trend analysis
 */
priceHistorySchema.statics.getPriceTrend = async function (productId, variantId = null, days = 30) {
    const history = await this.getProductHistory(productId, variantId, {
        limit: 100,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    });
    if (history.length === 0) {
        return null;
    }
    const prices = history.map((h) => h.price.salePrice);
    const latest = prices[0];
    const oldest = prices[prices.length - 1];
    const increase = history.filter((h) => h.changeType === 'increase').length;
    const decrease = history.filter((h) => h.changeType === 'decrease').length;
    let trend = 'stable';
    if (increase > decrease * 1.5)
        trend = 'increasing';
    if (decrease > increase * 1.5)
        trend = 'decreasing';
    return {
        trend,
        latest,
        oldest,
        change: latest - oldest,
        changePercentage: oldest > 0 ? (((latest - oldest) / oldest) * 100).toFixed(2) : 0,
        dataPoints: history.length,
        increaseCount: increase,
        decreaseCount: decrease,
    };
};
/**
 * Cleanup old price history (keep only last 90 days)
 */
priceHistorySchema.statics.cleanupOldHistory = async function (daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
        recordedAt: { $lt: cutoffDate },
    });
    console.log(`🧹 [PriceHistory] Cleaned up ${result.deletedCount} old records`);
    return result.deletedCount;
};
const PriceHistory = mongoose_1.default.model('PriceHistory', priceHistorySchema);
exports.default = PriceHistory;
