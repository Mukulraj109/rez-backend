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
const OfferRedemptionSchema = new mongoose_1.Schema({
    // User & Offer
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    offer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Offer',
        required: true,
        index: true,
    },
    // Redemption details
    redemptionCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
    },
    redemptionType: {
        type: String,
        enum: ['online', 'instore'],
        required: true,
    },
    // Dates
    redemptionDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    expiryDate: {
        type: Date,
        required: true,
        index: true,
    },
    validityDays: {
        type: Number,
        default: 30, // 30 days default validity after redemption
    },
    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'used', 'expired', 'cancelled'],
        default: 'active',
        index: true,
    },
    usedDate: {
        type: Date,
        index: true,
    },
    // Usage details
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        index: true,
    },
    usedAtStore: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
    },
    usedAmount: {
        type: Number,
        min: 0,
    },
    // QR Code
    qrCode: {
        type: String,
    },
    qrCodeUrl: {
        type: String,
    },
    // Verification
    verificationCode: {
        type: String,
        length: 6,
    },
    verifiedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // Store staff
    },
    verifiedAt: {
        type: Date,
    },
    // Metadata
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: {
            type: [Number],
        },
    },
    // Cancellation
    cancelledAt: {
        type: Date,
    },
    cancellationReason: {
        type: String,
        maxlength: 500,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Compound indexes
OfferRedemptionSchema.index({ user: 1, offer: 1 });
OfferRedemptionSchema.index({ user: 1, status: 1 });
OfferRedemptionSchema.index({ offer: 1, status: 1 });
OfferRedemptionSchema.index({ redemptionDate: 1, status: 1 });
OfferRedemptionSchema.index({ expiryDate: 1, status: 1 });
// Pre-save middleware to generate codes
OfferRedemptionSchema.pre('save', function (next) {
    // Generate redemption code if not provided
    if (!this.redemptionCode) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.redemptionCode = `RED-${timestamp}-${random}`;
    }
    // Generate verification code (6 digits)
    if (!this.verificationCode && this.redemptionType === 'instore') {
        this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    // Set expiry date if not set
    if (!this.expiryDate && this.validityDays) {
        const expiry = new Date(this.redemptionDate);
        expiry.setDate(expiry.getDate() + this.validityDays);
        this.expiryDate = expiry;
    }
    next();
});
// Method to check if redemption is valid
OfferRedemptionSchema.methods.isValid = function () {
    const now = new Date();
    return ((this.status === 'pending' || this.status === 'active') &&
        now <= this.expiryDate);
};
// Method to mark as used
OfferRedemptionSchema.methods.markAsUsed = async function (orderId, amount, storeId) {
    this.status = 'used';
    this.usedDate = new Date();
    if (orderId) {
        this.order = orderId;
    }
    if (amount) {
        this.usedAmount = amount;
    }
    if (storeId) {
        this.usedAtStore = storeId;
    }
    return this.save();
};
// Method to cancel redemption
OfferRedemptionSchema.methods.cancel = async function (reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) {
        this.cancellationReason = reason;
    }
    return this.save();
};
// Method to verify (for in-store)
OfferRedemptionSchema.methods.verify = async function (verifiedByUserId) {
    this.status = 'active';
    this.verifiedBy = verifiedByUserId;
    this.verifiedAt = new Date();
    return this.save();
};
// Static method to update expired redemptions
OfferRedemptionSchema.statics.updateExpired = async function () {
    const now = new Date();
    return this.updateMany({
        status: { $in: ['pending', 'active'] },
        expiryDate: { $lt: now },
    }, {
        $set: { status: 'expired' },
    });
};
// Static method to get user's redemptions
OfferRedemptionSchema.statics.getUserRedemptions = function (userId, status, limit = 20) {
    const query = { user: userId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate('offer', 'title image cashBackPercentage category')
        .populate('order', 'orderNumber totalAmount')
        .sort({ redemptionDate: -1 })
        .limit(limit);
};
// Static method to count user redemptions for an offer
OfferRedemptionSchema.statics.countUserOfferRedemptions = function (userId, offerId) {
    return this.countDocuments({
        user: userId,
        offer: offerId,
        status: { $in: ['pending', 'active', 'used'] },
    });
};
// Static method to check if user can redeem offer
// @ts-ignore
OfferRedemptionSchema.statics.canUserRedeem = async function (userId, offerId, userLimit) {
    // @ts-ignore
    const count = await this.countUserOfferRedemptions(userId, offerId);
    return count < userLimit;
};
const OfferRedemption = mongoose_1.default.model('OfferRedemption', OfferRedemptionSchema);
exports.default = OfferRedemption;
