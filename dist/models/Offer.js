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
const OfferSchema = new mongoose_1.Schema({
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
        maxlength: 2000,
    },
    image: {
        type: String,
        required: true,
    },
    images: [{
            type: String,
        }],
    // Pricing & Discount
    originalPrice: {
        type: Number,
        min: 0,
    },
    discountedPrice: {
        type: Number,
        min: 0,
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
    },
    cashBackPercentage: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100,
    },
    discount: {
        type: String,
        trim: true,
    },
    // Categorization
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true,
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    // Related entities
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        index: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        index: true,
    },
    applicableStores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store',
        }],
    applicableProducts: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product',
        }],
    // Location
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            index: '2dsphere',
        },
        address: String,
        city: String,
        state: String,
    },
    distance: String,
    // Validity
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: true,
    },
    validUntil: String,
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    // Redemption settings
    redemptionType: {
        type: String,
        enum: ['online', 'instore', 'both', 'voucher'],
        default: 'online',
    },
    redemptionCode: {
        type: String,
        uppercase: true,
        sparse: true,
        unique: true,
    },
    maxRedemptions: {
        type: Number,
        min: 0,
    },
    currentRedemptions: {
        type: Number,
        default: 0,
        min: 0,
    },
    userRedemptionLimit: {
        type: Number,
        default: 1,
        min: 1,
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
    // Flags
    isNew: {
        type: Boolean,
        default: false,
        index: true,
    },
    isTrending: {
        type: Boolean,
        default: false,
        index: true,
    },
    isBestSeller: {
        type: Boolean,
        default: false,
        index: true,
    },
    isSpecial: {
        type: Boolean,
        default: false,
        index: true,
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true,
    },
    // Store info (embedded)
    storeInfo: {
        name: String,
        rating: {
            type: Number,
            min: 0,
            max: 5,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        logo: String,
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
    redemptionCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    favoriteCount: {
        type: Number,
        default: 0,
        min: 0,
    },
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
OfferSchema.index({ category: 1, isActive: 1 });
OfferSchema.index({ isFeatured: 1, isActive: 1 });
OfferSchema.index({ isTrending: 1, isActive: 1 });
OfferSchema.index({ endDate: 1 });
OfferSchema.index({ startDate: 1, endDate: 1 });
OfferSchema.index({ 'location.coordinates': '2dsphere' });
// Text index for search
OfferSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text',
});
// Pre-save middleware to format validUntil date
// @ts-ignore - TypeScript has issues with 'this' context in middleware
OfferSchema.pre('save', function (next) {
    // @ts-ignore
    if (this.endDate) {
        // @ts-ignore
        const date = new Date(this.endDate);
        // @ts-ignore
        this.validUntil = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
    next();
});
// Method to check if offer is currently valid
OfferSchema.methods.isValid = function () {
    const now = new Date();
    return (this.isActive &&
        now >= this.startDate &&
        now <= this.endDate &&
        (!this.maxRedemptions || this.currentRedemptions < this.maxRedemptions));
};
// Method to check if user can redeem (pass user redemption count)
OfferSchema.methods.canUserRedeem = function (userRedemptionCount) {
    return this.isValid() && userRedemptionCount < this.userRedemptionLimit;
};
// Static method to get active offers
// @ts-ignore
OfferSchema.statics.getActive = function () {
    const now = new Date();
    return this.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
    });
};
// Static method to get featured offers
// @ts-ignore
OfferSchema.statics.getFeatured = function (limit = 10) {
    // @ts-ignore
    return this.getActive()
        .where('isFeatured', true)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('category', 'name slug')
        .populate('store', 'name logo location');
};
// Static method to get trending offers
// @ts-ignore
OfferSchema.statics.getTrending = function (limit = 10) {
    // @ts-ignore
    return this.getActive()
        .where('isTrending', true)
        .sort({ viewCount: -1, redemptionCount: -1 })
        .limit(limit)
        .populate('category', 'name slug')
        .populate('store', 'name logo location');
};
const Offer = mongoose_1.default.model('Offer', OfferSchema);
exports.default = Offer;
