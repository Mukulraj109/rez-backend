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
exports.PromoCode = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// PromoCode Schema
const PromoCodeSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
        match: /^[A-Z0-9]+$/,
        minlength: 3,
        maxlength: 20
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (value) {
                if (this.discountType === 'percentage') {
                    return value > 0 && value <= 100;
                }
                return value > 0;
            },
            message: 'Discount value must be between 1-100 for percentage, or greater than 0 for fixed amount'
        }
    },
    applicableTiers: [{
            type: String,
            enum: ['free', 'premium', 'vip'],
            required: true
        }],
    applicableBillingCycles: [{
            type: String,
            enum: ['monthly', 'yearly']
        }],
    validFrom: {
        type: Date,
        required: true,
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.validFrom;
            },
            message: 'Valid until date must be after valid from date'
        }
    },
    maxUses: {
        type: Number,
        default: 0,
        min: 0
    },
    maxUsesPerUser: {
        type: Number,
        default: 1,
        min: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    usedBy: [{
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            usedAt: {
                type: Date,
                default: Date.now
            },
            subscriptionId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Subscription',
                required: true
            },
            discountApplied: {
                type: Number,
                required: true,
                min: 0
            },
            originalPrice: {
                type: Number,
                required: true,
                min: 0
            },
            finalPrice: {
                type: Number,
                required: true,
                min: 0
            }
        }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    metadata: {
        campaign: {
            type: String,
            trim: true
        },
        source: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
PromoCodeSchema.index({ code: 1, isActive: 1 });
PromoCodeSchema.index({ validFrom: 1, validUntil: 1 });
PromoCodeSchema.index({ 'metadata.campaign': 1 });
PromoCodeSchema.index({ createdAt: -1 });
// Virtual for remaining uses
PromoCodeSchema.virtual('remainingUses').get(function () {
    if (this.maxUses === 0)
        return Infinity;
    return Math.max(0, this.maxUses - this.usedCount);
});
// Virtual for usage percentage
PromoCodeSchema.virtual('usagePercentage').get(function () {
    if (this.maxUses === 0)
        return 0;
    return (this.usedCount / this.maxUses) * 100;
});
// Instance method to check if promo code is valid
PromoCodeSchema.methods.isValid = function () {
    const now = new Date();
    // Check if active
    if (!this.isActive) {
        return false;
    }
    // Check date range
    if (now < this.validFrom || now > this.validUntil) {
        return false;
    }
    // Check max uses
    if (this.maxUses > 0 && this.usedCount >= this.maxUses) {
        return false;
    }
    return true;
};
// Instance method to check if user can use this promo code
PromoCodeSchema.methods.canBeUsedBy = async function (userId) {
    // Convert userId to string for comparison
    const userIdStr = userId.toString();
    // Count how many times this user has used this code
    const userUsageCount = this.usedBy.filter(usage => usage.user.toString() === userIdStr).length;
    // Check if user has exceeded their limit
    return userUsageCount < this.maxUsesPerUser;
};
// Instance method to increment usage
PromoCodeSchema.methods.incrementUsage = async function (userId, subscriptionId, originalPrice, finalPrice) {
    const discount = originalPrice - finalPrice;
    this.usedCount += 1;
    this.usedBy.push({
        user: new mongoose_1.Types.ObjectId(userId.toString()),
        usedAt: new Date(),
        subscriptionId: new mongoose_1.Types.ObjectId(subscriptionId.toString()),
        discountApplied: discount,
        originalPrice,
        finalPrice
    });
    await this.save();
};
// Instance method to calculate discount
PromoCodeSchema.methods.calculateDiscount = function (originalPrice) {
    if (this.discountType === 'percentage') {
        return Math.round((originalPrice * this.discountValue) / 100);
    }
    else {
        // Fixed amount
        return Math.min(this.discountValue, originalPrice);
    }
};
// Static method to sanitize promo code
PromoCodeSchema.statics.sanitizeCode = function (code) {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};
// Static method to validate promo code
PromoCodeSchema.statics.validateCode = async function (code, tier, billingCycle, userId, originalPrice) {
    try {
        // Sanitize code
        const sanitizedCode = this.sanitizeCode(code);
        if (!sanitizedCode) {
            return {
                valid: false,
                message: 'Invalid promo code format'
            };
        }
        // Find promo code
        const promoCode = await this.findOne({
            code: sanitizedCode,
            isActive: true
        });
        if (!promoCode) {
            return {
                valid: false,
                message: 'Promo code not found or inactive'
            };
        }
        // Check if valid
        if (!promoCode.isValid()) {
            const now = new Date();
            if (now < promoCode.validFrom) {
                return {
                    valid: false,
                    message: 'Promo code is not yet active'
                };
            }
            if (now > promoCode.validUntil) {
                return {
                    valid: false,
                    message: 'Promo code has expired'
                };
            }
            if (promoCode.maxUses > 0 && promoCode.usedCount >= promoCode.maxUses) {
                return {
                    valid: false,
                    message: 'Promo code has reached maximum usage limit'
                };
            }
            return {
                valid: false,
                message: 'Promo code is not valid'
            };
        }
        // Check tier applicability
        if (!promoCode.applicableTiers.includes(tier)) {
            return {
                valid: false,
                message: `This promo code is not applicable to ${tier} tier`
            };
        }
        // Check billing cycle applicability (if specified)
        if (promoCode.applicableBillingCycles &&
            promoCode.applicableBillingCycles.length > 0 &&
            !promoCode.applicableBillingCycles.includes(billingCycle)) {
            return {
                valid: false,
                message: `This promo code is not applicable to ${billingCycle} billing`
            };
        }
        // Check user-specific usage
        const canUse = await promoCode.canBeUsedBy(userId);
        if (!canUse) {
            return {
                valid: false,
                message: 'You have already used this promo code the maximum number of times'
            };
        }
        // Calculate discount
        const discount = promoCode.calculateDiscount(originalPrice);
        const discountedPrice = Math.max(0, originalPrice - discount);
        return {
            valid: true,
            message: 'Promo code applied successfully',
            discount,
            discountedPrice,
            promoCode
        };
    }
    catch (error) {
        console.error('Error validating promo code:', error);
        return {
            valid: false,
            message: 'Error validating promo code'
        };
    }
};
// Static method to get active promo codes
PromoCodeSchema.statics.getActivePromoCodes = async function (tier, billingCycle) {
    const now = new Date();
    const query = {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
    };
    if (tier) {
        query.applicableTiers = tier;
    }
    if (billingCycle) {
        query.$or = [
            { applicableBillingCycles: { $exists: false } },
            { applicableBillingCycles: { $size: 0 } },
            { applicableBillingCycles: billingCycle }
        ];
    }
    const promoCodes = await this.find(query)
        .sort({ discountValue: -1 })
        .limit(20);
    // Filter out codes that have reached max usage
    return promoCodes.filter(code => {
        if (code.maxUses === 0)
            return true;
        return code.usedCount < code.maxUses;
    });
};
// Pre-save hook to validate data
PromoCodeSchema.pre('save', function (next) {
    // Ensure code is uppercase and sanitized
    if (this.isModified('code')) {
        this.code = this.code.trim().toUpperCase();
    }
    // Ensure usedCount matches usedBy array length
    if (this.isModified('usedBy')) {
        this.usedCount = this.usedBy.length;
    }
    next();
});
exports.PromoCode = mongoose_1.default.model('PromoCode', PromoCodeSchema);
