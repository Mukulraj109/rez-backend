"use strict";
// DiscountUsage Model
// Tracks discount usage by users for analytics and limit enforcement
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
const DiscountUsageSchema = new mongoose_1.Schema({
    discount: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Discount',
        required: [true, 'Discount reference is required'],
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Order reference is required'],
        index: true
    },
    discountAmount: {
        type: Number,
        required: [true, 'Discount amount is required'],
        min: [0, 'Discount amount cannot be negative']
    },
    orderValue: {
        type: Number,
        required: [true, 'Order value is required'],
        min: [0, 'Order value cannot be negative']
    },
    usedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    metadata: {
        discountCode: {
            type: String,
            trim: true
        },
        discountType: {
            type: String,
            trim: true
        },
        originalDiscountValue: {
            type: Number
        }
    }
}, {
    timestamps: false
});
// Compound indexes
DiscountUsageSchema.index({ discount: 1, user: 1 });
DiscountUsageSchema.index({ user: 1, usedAt: -1 });
DiscountUsageSchema.index({ discount: 1, usedAt: -1 });
// Static method to get user's usage history
DiscountUsageSchema.statics.getUserHistory = async function (userId, limit = 10) {
    return this.find({ user: userId })
        .populate('discount', 'name code type value')
        .populate('order', 'orderNumber')
        .sort({ usedAt: -1 })
        .limit(limit);
};
// Static method to get discount analytics
DiscountUsageSchema.statics.getDiscountAnalytics = async function (discountId) {
    const analytics = await this.aggregate([
        { $match: { discount: discountId } },
        {
            $group: {
                _id: '$discount',
                totalUsed: { $sum: 1 },
                totalDiscountAmount: { $sum: '$discountAmount' },
                totalOrderValue: { $sum: '$orderValue' },
                uniqueUsers: { $addToSet: '$user' },
                avgDiscountAmount: { $avg: '$discountAmount' },
                avgOrderValue: { $avg: '$orderValue' }
            }
        },
        {
            $project: {
                totalUsed: 1,
                totalDiscountAmount: 1,
                totalOrderValue: 1,
                uniqueUsersCount: { $size: '$uniqueUsers' },
                avgDiscountAmount: { $round: ['$avgDiscountAmount', 2] },
                avgOrderValue: { $round: ['$avgOrderValue', 2] }
            }
        }
    ]);
    return analytics[0] || {
        totalUsed: 0,
        totalDiscountAmount: 0,
        totalOrderValue: 0,
        uniqueUsersCount: 0,
        avgDiscountAmount: 0,
        avgOrderValue: 0
    };
};
const DiscountUsage = mongoose_1.default.model('DiscountUsage', DiscountUsageSchema);
exports.default = DiscountUsage;
