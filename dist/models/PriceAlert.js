"use strict";
/**
 * Price Alert Model
 *
 * Manages user price alert subscriptions.
 * Users get notified when product prices drop below their target price.
 *
 * Features:
 * - Target price alerts
 * - Percentage drop alerts
 * - Multiple notification methods
 * - Automatic triggering on price changes
 * - Alert expiration
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
const priceAlertSchema = new mongoose_1.Schema({
    // User who created the alert
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // Product to monitor
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    // Optional variant
    variantId: {
        type: String,
        required: false,
        index: true,
    },
    // Alert conditions
    alertType: {
        type: String,
        enum: ['target_price', 'percentage_drop', 'any_drop'],
        required: true,
    },
    targetPrice: {
        type: Number,
        required: false, // Required for target_price type
    },
    percentageDrop: {
        type: Number,
        required: false, // Required for percentage_drop type
        min: 1,
        max: 100,
    },
    // Current price when alert was created
    currentPriceAtCreation: {
        type: Number,
        required: true,
    },
    // Notification preferences
    notificationMethod: {
        type: [String],
        enum: ['email', 'push', 'sms'],
        default: ['push'],
    },
    contact: {
        email: {
            type: String,
            required: false,
        },
        phone: {
            type: String,
            required: false,
        },
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'triggered', 'expired', 'cancelled'],
        default: 'active',
        index: true,
    },
    // When alert was triggered
    triggeredAt: {
        type: Date,
        required: false,
    },
    triggeredPrice: {
        type: Number,
        required: false,
    },
    // Alert expiration (default: 90 days)
    expiresAt: {
        type: Date,
        required: true,
        index: true,
        default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    // Metadata
    metadata: {
        productName: String,
        productImage: String,
        variantAttributes: mongoose_1.Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
priceAlertSchema.index({ productId: 1, variantId: 1, status: 1 });
priceAlertSchema.index({ userId: 1, status: 1 });
priceAlertSchema.index({ status: 1, expiresAt: 1 });
/**
 * Find active alerts for a product
 */
priceAlertSchema.statics.findActiveForProduct = function (productId, variantId = null) {
    const query = {
        productId,
        status: 'active',
        expiresAt: { $gt: new Date() },
    };
    if (variantId) {
        query.variantId = variantId;
    }
    return this.find(query).populate('userId', 'name email phone');
};
/**
 * Check if user has active alert for product
 */
priceAlertSchema.statics.hasActiveAlert = async function (userId, productId, variantId = null) {
    const query = {
        userId,
        productId,
        status: 'active',
        expiresAt: { $gt: new Date() },
    };
    if (variantId) {
        query.variantId = variantId;
    }
    const count = await this.countDocuments(query);
    return count > 0;
};
/**
 * Get user's alerts
 */
priceAlertSchema.statics.getUserAlerts = function (userId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const query = { userId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate('productId', 'name images pricing')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
};
/**
 * Check if alert should trigger based on new price
 */
priceAlertSchema.methods.shouldTrigger = function (newPrice) {
    if (this.status !== 'active') {
        return false;
    }
    if (new Date() > this.expiresAt) {
        return false;
    }
    switch (this.alertType) {
        case 'target_price':
            return newPrice <= (this.targetPrice || 0);
        case 'percentage_drop':
            const dropPercentage = ((this.currentPriceAtCreation - newPrice) / this.currentPriceAtCreation) * 100;
            return dropPercentage >= (this.percentageDrop || 0);
        case 'any_drop':
            return newPrice < this.currentPriceAtCreation;
        default:
            return false;
    }
};
/**
 * Trigger the alert
 */
priceAlertSchema.methods.trigger = function (triggeredPrice) {
    this.status = 'triggered';
    this.triggeredAt = new Date();
    this.triggeredPrice = triggeredPrice;
    return this.save();
};
/**
 * Cancel the alert
 */
priceAlertSchema.methods.cancel = function () {
    this.status = 'cancelled';
    return this.save();
};
/**
 * Check and trigger alerts for a price change
 */
priceAlertSchema.statics.checkAndTriggerAlerts = async function (productId, variantId, newPrice) {
    console.log(`🔍 [PriceAlert] Checking alerts for product ${productId}, new price: ${newPrice}`);
    const activeAlerts = await this.findActiveForProduct(productId, variantId);
    const triggeredAlerts = [];
    for (const alert of activeAlerts) {
        if (alert.shouldTrigger(newPrice)) {
            console.log(`🔔 [PriceAlert] Triggering alert ${alert._id} for user ${alert.userId}`);
            await alert.trigger(newPrice);
            triggeredAlerts.push(alert);
            // TODO: Send notification via selected methods
            // - Push notification
            // - Email
            // - SMS
        }
    }
    return triggeredAlerts;
};
/**
 * Expire old alerts
 */
priceAlertSchema.statics.expireOldAlerts = async function () {
    const result = await this.updateMany({
        status: 'active',
        expiresAt: { $lt: new Date() },
    }, {
        $set: { status: 'expired' },
    });
    console.log(`🧹 [PriceAlert] Expired ${result.modifiedCount} old alerts`);
    return result.modifiedCount;
};
/**
 * Get alert statistics for a product
 */
priceAlertSchema.statics.getProductStats = async function (productId) {
    const stats = await this.aggregate([
        { $match: { productId: new mongoose_1.default.Types.ObjectId(productId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);
    const result = {
        total: 0,
        active: 0,
        triggered: 0,
        expired: 0,
        cancelled: 0,
    };
    stats.forEach((stat) => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });
    // Get average target price for active target_price alerts
    const avgTargetPrice = await this.aggregate([
        {
            $match: {
                productId: new mongoose_1.default.Types.ObjectId(productId),
                alertType: 'target_price',
                status: 'active',
            },
        },
        {
            $group: {
                _id: null,
                avgTargetPrice: { $avg: '$targetPrice' },
            },
        },
    ]);
    if (avgTargetPrice.length > 0) {
        result.averageTargetPrice = avgTargetPrice[0].avgTargetPrice;
    }
    return result;
};
// Pre-save validation
priceAlertSchema.pre('save', function (next) {
    // Validate target price for target_price type
    if (this.alertType === 'target_price' && !this.targetPrice) {
        return next(new Error('Target price is required for target_price alerts'));
    }
    // Validate percentage drop for percentage_drop type
    if (this.alertType === 'percentage_drop' && !this.percentageDrop) {
        return next(new Error('Percentage drop is required for percentage_drop alerts'));
    }
    // Ensure at least one contact method if email/sms is selected
    if (this.notificationMethod.includes('email') && !this.contact.email) {
        return next(new Error('Email is required when email notification is selected'));
    }
    if (this.notificationMethod.includes('sms') && !this.contact.phone) {
        return next(new Error('Phone number is required when SMS notification is selected'));
    }
    next();
});
// Virtual for days until expiration
priceAlertSchema.virtual('daysUntilExpiration').get(function () {
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});
// Ensure virtuals are included in JSON
priceAlertSchema.set('toJSON', { virtuals: true });
priceAlertSchema.set('toObject', { virtuals: true });
const PriceAlert = mongoose_1.default.model('PriceAlert', priceAlertSchema);
exports.default = PriceAlert;
