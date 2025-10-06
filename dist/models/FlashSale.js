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
const mongoose_1 = __importStar(require("mongoose"));
const FlashSaleSchema = new mongoose_1.Schema({
    // Basic info
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    image: {
        type: String,
        required: true,
    },
    banner: {
        type: String,
    },
    // Sale details
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    discountAmount: {
        type: Number,
        min: 0,
    },
    priority: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
    },
    // Time constraints
    startTime: {
        type: Date,
        required: true,
        index: true,
    },
    endTime: {
        type: Date,
        required: true,
        index: true,
    },
    duration: {
        type: Number, // milliseconds
    },
    // Stock management
    maxQuantity: {
        type: Number,
        required: true,
        min: 1,
    },
    soldQuantity: {
        type: Number,
        default: 0,
        min: 0,
    },
    limitPerUser: {
        type: Number,
        default: 1,
        min: 1,
    },
    lowStockThreshold: {
        type: Number,
        default: 20, // 20%
        min: 0,
        max: 100,
    },
    // Applicable products/stores
    products: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        }],
    stores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store',
        }],
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
    },
    // Pricing
    originalPrice: {
        type: Number,
        min: 0,
    },
    flashSalePrice: {
        type: Number,
        min: 0,
    },
    // Status
    enabled: {
        type: Boolean,
        default: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ending_soon', 'ended', 'sold_out'],
        default: 'scheduled',
        index: true,
    },
    // Terms & Conditions
    termsAndConditions: [{
            type: String,
            trim: true,
        }],
    minimumPurchase: {
        type: Number,
        min: 0,
    },
    maximumDiscount: {
        type: Number,
        min: 0,
    },
    // Analytics
    viewCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    clickCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    purchaseCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    uniqueCustomers: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Notifications
    notifyOnStart: {
        type: Boolean,
        default: true,
    },
    notifyOnEndingSoon: {
        type: Boolean,
        default: true,
    },
    notifyOnLowStock: {
        type: Boolean,
        default: true,
    },
    notifiedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        }],
    // Metadata
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for performance
FlashSaleSchema.index({ startTime: 1, endTime: 1 });
FlashSaleSchema.index({ status: 1, isActive: 1 });
FlashSaleSchema.index({ priority: -1 });
FlashSaleSchema.index({ products: 1 });
FlashSaleSchema.index({ category: 1 });
// Pre-save middleware to calculate duration and update status
FlashSaleSchema.pre('save', function (next) {
    // Calculate duration
    if (this.startTime && this.endTime) {
        this.duration = this.endTime.getTime() - this.startTime.getTime();
    }
    // Auto-update status based on time and stock
    const now = new Date();
    if (this.soldQuantity >= this.maxQuantity) {
        this.status = 'sold_out';
    }
    else if (now < this.startTime) {
        this.status = 'scheduled';
    }
    else if (now > this.endTime) {
        this.status = 'ended';
    }
    else if (this.endTime.getTime() - now.getTime() <= 5 * 60 * 1000) {
        // 5 minutes remaining
        this.status = 'ending_soon';
    }
    else {
        this.status = 'active';
    }
    next();
});
// Method to check if flash sale is currently active
FlashSaleSchema.methods.isActive = function () {
    const now = new Date();
    return (this.isActive &&
        now >= this.startTime &&
        now <= this.endTime &&
        this.soldQuantity < this.maxQuantity &&
        this.status !== 'ended' &&
        this.status !== 'sold_out');
};
// Method to check if flash sale is expiring soon
FlashSaleSchema.methods.isExpiring = function (minutes = 5) {
    if (!this.isActive())
        return false;
    const now = new Date();
    const remainingTime = this.endTime.getTime() - now.getTime();
    return remainingTime <= minutes * 60 * 1000;
};
// Method to get remaining time in milliseconds
FlashSaleSchema.methods.getRemainingTime = function () {
    const now = new Date();
    if (now < this.startTime) {
        return this.startTime.getTime() - now.getTime();
    }
    if (now > this.endTime) {
        return 0;
    }
    return this.endTime.getTime() - now.getTime();
};
// Method to check if flash sale has stock
FlashSaleSchema.methods.hasStock = function () {
    return this.soldQuantity < this.maxQuantity;
};
// Method to check if purchase is allowed
FlashSaleSchema.methods.canPurchase = function (quantity) {
    return (this.isActive() &&
        this.hasStock() &&
        this.soldQuantity + quantity <= this.maxQuantity &&
        quantity <= this.limitPerUser);
};
// Method to get available quantity
FlashSaleSchema.methods.getAvailableQuantity = function () {
    return Math.max(0, this.maxQuantity - this.soldQuantity);
};
// Method to get progress percentage (0-100)
FlashSaleSchema.methods.getProgress = function () {
    if (this.maxQuantity === 0)
        return 100;
    return Math.min(100, (this.soldQuantity / this.maxQuantity) * 100);
};
// Static method to get active flash sales
FlashSaleSchema.statics.getActive = function () {
    const now = new Date();
    return this.find({
        enabled: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        $expr: { $lt: ['$soldQuantity', '$maxQuantity'] },
        status: { $nin: ['ended', 'sold_out'] },
    }).sort({ priority: -1, startTime: 1 });
};
// Static method to get upcoming flash sales
FlashSaleSchema.statics.getUpcoming = function () {
    const now = new Date();
    return this.find({
        enabled: true,
        startTime: { $gt: now },
        status: 'scheduled',
    }).sort({ startTime: 1 });
};
// Static method to get flash sales expiring soon
FlashSaleSchema.statics.getExpiringSoon = function (minutes = 5) {
    const now = new Date();
    const expiryTime = new Date(now.getTime() + minutes * 60 * 1000);
    return this.find({
        enabled: true,
        startTime: { $lte: now },
        endTime: { $gte: now, $lte: expiryTime },
        $expr: { $lt: ['$soldQuantity', '$maxQuantity'] },
        status: { $nin: ['ended', 'sold_out'] },
    }).sort({ endTime: 1 });
};
// Static method to get flash sales with low stock
FlashSaleSchema.statics.getLowStock = function (threshold = 20) {
    const now = new Date();
    return this.find({
        enabled: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $nin: ['ended', 'sold_out'] },
        $expr: {
            $gte: [
                { $divide: ['$soldQuantity', '$maxQuantity'] },
                { $divide: [threshold, 100] },
            ],
        },
    }).sort({ priority: -1 });
};
const FlashSale = mongoose_1.default.model('FlashSale', FlashSaleSchema);
exports.default = FlashSale;
