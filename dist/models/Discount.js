"use strict";
// Discount Model
// Manages instant discounts, bill payment discounts, and promotional offers
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
const DiscountSchema = new mongoose_1.Schema({
    code: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Discount name is required'],
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: [true, 'Discount type is required'],
        default: 'percentage'
    },
    value: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative']
    },
    minOrderValue: {
        type: Number,
        required: [true, 'Minimum order value is required'],
        min: [0, 'Minimum order value cannot be negative'],
        default: 0
    },
    maxDiscountAmount: {
        type: Number,
        min: [0, 'Maximum discount amount cannot be negative']
    },
    applicableOn: {
        type: String,
        enum: ['bill_payment', 'card_payment', 'all', 'specific_products', 'specific_categories'],
        required: [true, 'Applicable scope is required'],
        default: 'all'
    },
    applicableProducts: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    applicableCategories: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category'
        }],
    validFrom: {
        type: Date,
        required: [true, 'Valid from date is required'],
        index: true
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required'],
        index: true
    },
    usageLimit: {
        type: Number,
        min: [0, 'Usage limit cannot be negative']
    },
    usageLimitPerUser: {
        type: Number,
        min: [0, 'Usage limit per user cannot be negative'],
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: [0, 'Used count cannot be negative']
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    priority: {
        type: Number,
        default: 0,
        index: true
    },
    restrictions: {
        minItemCount: {
            type: Number,
            min: [0, 'Minimum item count cannot be negative']
        },
        maxItemCount: {
            type: Number,
            min: [0, 'Maximum item count cannot be negative']
        },
        newUsersOnly: {
            type: Boolean,
            default: false
        },
        excludedProducts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        excludedCategories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category'
            }],
        isOfflineOnly: {
            type: Boolean,
            default: false
        },
        notValidAboveStoreDiscount: {
            type: Boolean,
            default: false
        },
        singleVoucherPerBill: {
            type: Boolean,
            default: true
        }
    },
    metadata: {
        displayText: {
            type: String,
            trim: true
        },
        icon: {
            type: String,
            trim: true
        },
        backgroundColor: {
            type: String,
            trim: true
        },
        cardImageUrl: {
            type: String,
            trim: true
        },
        bankLogoUrl: {
            type: String,
            trim: true
        },
        offerBadge: {
            type: String,
            trim: true
        }
    },
    // Card Offer Specific Fields
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'all'],
        default: 'all',
        index: true
    },
    cardType: {
        type: String,
        enum: ['credit', 'debit', 'all'],
        default: 'all'
    },
    bankNames: [{
            type: String,
            trim: true
        }],
    cardBins: [{
            type: String,
            trim: true,
            match: [/^\d{6}$/, 'Card BIN must be 6 digits']
        }],
    // Merchant-Store Linking (Phase 1)
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        index: true,
        sparse: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        index: true,
        sparse: true
    },
    scope: {
        type: String,
        enum: ['global', 'merchant', 'store'],
        default: 'global',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: [true, 'Created by is required']
        // Note: Can reference either 'User' or 'Merchant' based on createdByType
        // Index is defined separately below to avoid duplicate
    },
    createdByType: {
        type: String,
        enum: ['user', 'merchant'],
        default: 'user',
        required: true
    }
}, {
    timestamps: true
});
// Indexes for performance
DiscountSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
DiscountSchema.index({ applicableOn: 1, isActive: 1 });
DiscountSchema.index({ createdBy: 1 });
// Merchant-Store Linking Indexes (Phase 1)
// Compound indexes for efficient queries
DiscountSchema.index({ scope: 1, storeId: 1, isActive: 1 });
DiscountSchema.index({ scope: 1, merchantId: 1, isActive: 1 });
DiscountSchema.index({ applicableOn: 1, scope: 1, storeId: 1 });
DiscountSchema.index({ merchantId: 1, isActive: 1 });
DiscountSchema.index({ storeId: 1, isActive: 1 });
// Virtual for checking if discount is currently valid
DiscountSchema.virtual('isCurrentlyValid').get(function () {
    const now = new Date();
    return this.isActive &&
        this.validFrom <= now &&
        this.validUntil >= now &&
        (this.usageLimit === undefined || this.usedCount < this.usageLimit);
});
// Method to calculate discount amount
DiscountSchema.methods.calculateDiscount = function (orderValue) {
    if (orderValue < this.minOrderValue) {
        return 0;
    }
    let discountAmount;
    if (this.type === 'percentage') {
        discountAmount = (orderValue * this.value) / 100;
    }
    else {
        discountAmount = this.value;
    }
    // Apply max discount limit if set
    if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
        discountAmount = this.maxDiscountAmount;
    }
    return Math.round(discountAmount);
};
// Method to check if user can use discount
DiscountSchema.methods.canUserUse = async function (userId) {
    // Check if usage limit per user is reached
    if (this.usageLimitPerUser) {
        const DiscountUsage = mongoose_1.default.model('DiscountUsage');
        const userUsageCount = await DiscountUsage.countDocuments({
            discount: this._id,
            user: userId
        });
        if (userUsageCount >= this.usageLimitPerUser) {
            return {
                can: false,
                reason: `This discount can only be used ${this.usageLimitPerUser} time(s) per user`
            };
        }
    }
    // Check if new users only
    if (this.restrictions.newUsersOnly) {
        const Order = mongoose_1.default.model('Order');
        const userOrderCount = await Order.countDocuments({ user: userId });
        if (userOrderCount > 0) {
            return {
                can: false,
                reason: 'This discount is only for new users'
            };
        }
    }
    return { can: true };
};
// Static method to find available discounts for a user
DiscountSchema.statics.findAvailableForUser = async function (userId, orderValue, productIds, categoryIds) {
    const now = new Date();
    // Base query
    const query = {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        minOrderValue: { $lte: orderValue },
        $or: [
            { usageLimit: { $exists: false } },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
    };
    // Filter by applicable scope
    if (productIds && productIds.length > 0) {
        query.$or = [
            { applicableOn: 'all' },
            { applicableOn: 'specific_products', applicableProducts: { $in: productIds } }
        ];
    }
    if (categoryIds && categoryIds.length > 0) {
        if (!query.$or)
            query.$or = [];
        query.$or.push({ applicableOn: 'specific_categories', applicableCategories: { $in: categoryIds } });
    }
    const discounts = await this.find(query).sort({ priority: -1, value: -1 });
    // Filter by user-specific rules
    const availableDiscounts = [];
    for (const discount of discounts) {
        const canUse = await discount.canUserUse(userId);
        if (canUse.can) {
            availableDiscounts.push(discount);
        }
    }
    return availableDiscounts;
};
const Discount = mongoose_1.default.model('Discount', DiscountSchema);
exports.default = Discount;
