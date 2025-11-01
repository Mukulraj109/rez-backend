"use strict";
// Coupon Model
// Manages store-wide coupon codes and promotions
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
exports.Coupon = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CouponSchema = new mongoose_1.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED'],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxDiscountCap: {
        type: Number,
        default: 0,
        min: 0,
    },
    validFrom: {
        type: Date,
        required: true,
    },
    validTo: {
        type: Date,
        required: true,
        index: true,
    },
    usageLimit: {
        totalUsage: {
            type: Number,
            default: 0, // 0 means unlimited
        },
        perUser: {
            type: Number,
            default: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
        },
    },
    applicableTo: {
        categories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category',
            }],
        products: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
            }],
        stores: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store',
            }],
        userTiers: [{
                type: String,
                enum: ['all', 'gold', 'silver', 'bronze'],
            }],
    },
    autoApply: {
        type: Boolean,
        default: false,
    },
    autoApplyPriority: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active',
        index: true,
    },
    termsAndConditions: [{
            type: String,
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tags: [{
            type: String,
            lowercase: true,
        }],
    imageUrl: {
        type: String,
    },
    isNewlyAdded: {
        type: Boolean,
        default: true,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    viewCount: {
        type: Number,
        default: 0,
    },
    claimCount: {
        type: Number,
        default: 0,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
CouponSchema.index({ status: 1, validTo: 1 });
CouponSchema.index({ couponCode: 1, status: 1 });
CouponSchema.index({ isFeatured: 1, status: 1 });
CouponSchema.index({ tags: 1, status: 1 });
// Virtual for checking if coupon is currently valid
CouponSchema.virtual('isValid').get(function () {
    const now = new Date();
    return (this.status === 'active' &&
        this.validFrom <= now &&
        this.validTo >= now &&
        (this.usageLimit.totalUsage === 0 || this.usageLimit.usedCount < this.usageLimit.totalUsage));
});
// Virtual for days until expiry
CouponSchema.virtual('daysUntilExpiry').get(function () {
    const now = new Date();
    const diff = this.validTo.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});
// Instance method to check if coupon has expired
CouponSchema.methods.checkExpiry = function () {
    const now = new Date();
    if (this.validTo < now && this.status !== 'expired') {
        this.status = 'expired';
        this.save();
        return true;
    }
    return false;
};
// Instance method to increment view count
CouponSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    await this.save();
};
// Instance method to increment claim count
CouponSchema.methods.incrementClaimCount = async function () {
    this.claimCount += 1;
    await this.save();
};
// Instance method to increment usage count
CouponSchema.methods.incrementUsageCount = async function () {
    this.usageCount += 1;
    this.usageLimit.usedCount += 1;
    // Check if usage limit reached
    if (this.usageLimit.totalUsage > 0 && this.usageLimit.usedCount >= this.usageLimit.totalUsage) {
        this.status = 'inactive';
    }
    await this.save();
};
// Static method to mark expired coupons
CouponSchema.statics.markExpiredCoupons = async function () {
    const now = new Date();
    const result = await this.updateMany({
        status: 'active',
        validTo: { $lt: now },
    }, {
        $set: { status: 'expired' },
    });
    console.log(`⏰ [COUPON] Marked ${result.modifiedCount} coupons as expired`);
    return result.modifiedCount || 0;
};
// Static method to get active coupons
CouponSchema.statics.getActiveCoupons = async function (filters = {}) {
    const now = new Date();
    return this.find({
        status: 'active',
        validFrom: { $lte: now },
        validTo: { $gte: now },
        ...filters,
    }).sort({ isFeatured: -1, autoApplyPriority: -1, createdAt: -1 });
};
// Pre-save hook to validate dates
CouponSchema.pre('save', function (next) {
    if (this.validFrom >= this.validTo) {
        next(new Error('Valid from date must be before valid to date'));
    }
    if (this.discountType === 'PERCENTAGE' && this.discountValue > 100) {
        next(new Error('Percentage discount cannot exceed 100%'));
    }
    next();
});
exports.Coupon = mongoose_1.default.model('Coupon', CouponSchema);
