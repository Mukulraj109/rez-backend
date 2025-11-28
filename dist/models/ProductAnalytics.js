"use strict";
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
exports.ProductAnalytics = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Product Analytics Schema
const ProductAnalyticsSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    views: {
        total: {
            type: Number,
            default: 0,
            min: 0
        },
        unique: {
            type: Number,
            default: 0,
            min: 0
        },
        lastViewed: {
            type: Date,
            default: Date.now
        }
    },
    purchases: {
        total: {
            type: Number,
            default: 0,
            min: 0
        },
        revenue: {
            type: Number,
            default: 0,
            min: 0
        },
        avgOrderValue: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    cartAdditions: {
        type: Number,
        default: 0,
        min: 0
    },
    cartRemovals: {
        type: Number,
        default: 0,
        min: 0
    },
    wishlistAdds: {
        type: Number,
        default: 0,
        min: 0
    },
    shares: {
        type: Number,
        default: 0,
        min: 0
    },
    reviews: {
        type: Number,
        default: 0,
        min: 0
    },
    conversionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    bounceRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    avgTimeOnPage: {
        type: Number,
        default: 0,
        min: 0
    },
    relatedProductClicks: {
        type: Number,
        default: 0,
        min: 0
    },
    searchAppearances: {
        type: Number,
        default: 0,
        min: 0
    },
    searchClicks: {
        type: Number,
        default: 0,
        min: 0
    },
    searchPosition: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
ProductAnalyticsSchema.index({ product: 1, user: 1 });
ProductAnalyticsSchema.index({ 'views.total': -1 });
ProductAnalyticsSchema.index({ 'purchases.total': -1 });
ProductAnalyticsSchema.index({ conversionRate: -1 });
ProductAnalyticsSchema.index({ createdAt: -1 });
// Compound indexes
ProductAnalyticsSchema.index({ product: 1, 'views.lastViewed': -1 });
ProductAnalyticsSchema.index({ product: 1, 'purchases.total': -1 });
// Pre-save hook to calculate conversion rate
ProductAnalyticsSchema.pre('save', function (next) {
    // Calculate conversion rate
    if (this.views.unique > 0) {
        this.conversionRate = (this.purchases.total / this.views.unique) * 100;
    }
    // Calculate average order value
    if (this.purchases.total > 0) {
        this.purchases.avgOrderValue = this.purchases.revenue / this.purchases.total;
    }
    next();
});
// Static method to track product view
ProductAnalyticsSchema.statics.trackView = async function (productId, userId) {
    const analytics = await this.findOneAndUpdate({ product: productId, user: userId }, {
        $inc: {
            'views.total': 1,
            'views.unique': userId ? 1 : 0
        },
        $set: { 'views.lastViewed': new Date() }
    }, { upsert: true, new: true });
    return analytics;
};
// Static method to track purchase
ProductAnalyticsSchema.statics.trackPurchase = async function (productId, userId, amount) {
    const analytics = await this.findOneAndUpdate({ product: productId, user: userId }, {
        $inc: {
            'purchases.total': 1,
            'purchases.revenue': amount
        }
    }, { upsert: true, new: true });
    return analytics;
};
// Static method to get popular products
ProductAnalyticsSchema.statics.getPopularProducts = async function (options) {
    const { limit = 10, timeRange } = options;
    const query = {};
    if (timeRange) {
        query.createdAt = { $gte: timeRange };
    }
    return this.find(query)
        .sort({ 'views.total': -1, 'purchases.total': -1 })
        .limit(limit)
        .populate('product');
};
// Static method to get trending products
ProductAnalyticsSchema.statics.getTrendingProducts = async function (options) {
    const { limit = 10, days = 7 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.find({
        'views.lastViewed': { $gte: startDate }
    })
        .sort({ 'views.total': -1, conversionRate: -1 })
        .limit(limit)
        .populate('product');
};
exports.ProductAnalytics = mongoose_1.default.models.ProductAnalytics ||
    mongoose_1.default.model('ProductAnalytics', ProductAnalyticsSchema);
