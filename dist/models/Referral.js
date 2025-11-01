"use strict";
// Referral Model
// Tracks individual referral relationships and rewards with enhanced tier system
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
exports.ReferralStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "pending";
    ReferralStatus["REGISTERED"] = "registered";
    ReferralStatus["ACTIVE"] = "active";
    ReferralStatus["QUALIFIED"] = "qualified";
    ReferralStatus["COMPLETED"] = "completed";
    ReferralStatus["EXPIRED"] = "expired";
})(ReferralStatus || (exports.ReferralStatus = ReferralStatus = {}));
const ReferralRewardSchema = new mongoose_1.Schema({
    referrerAmount: {
        type: Number,
        required: true,
        default: 50 // Default ₹50 for referrer
    },
    refereeDiscount: {
        type: Number,
        required: true,
        default: 50 // Default ₹50 discount for referee
    },
    milestoneBonus: {
        type: Number,
        default: 20 // Default ₹20 after 3rd order
    },
    voucherCode: String,
    voucherType: String,
    description: String
}, { _id: false });
const ReferralMetadataSchema = new mongoose_1.Schema({
    shareMethod: String,
    sharedAt: Date,
    signupSource: String,
    deviceId: String,
    ipAddress: String,
    userAgent: String,
    refereeFirstOrder: {
        orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
        amount: Number,
        completedAt: Date,
    },
    milestoneOrders: {
        count: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        lastOrderAt: Date,
    },
}, { _id: false });
const QualificationCriteriaSchema = new mongoose_1.Schema({
    minOrders: {
        type: Number,
        default: 1
    },
    minSpend: {
        type: Number,
        default: 500
    },
    timeframeDays: {
        type: Number,
        default: 30
    }
}, { _id: false });
const ReferralSchema = new mongoose_1.Schema({
    referrer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    referee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    referralCode: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(ReferralStatus),
        default: ReferralStatus.PENDING,
        index: true,
    },
    tier: {
        type: String,
        default: 'STARTER'
    },
    rewards: {
        type: ReferralRewardSchema,
        required: true,
        default: () => ({
            referrerAmount: 50,
            refereeDiscount: 50,
            milestoneBonus: 20
        })
    },
    referrerRewarded: {
        type: Boolean,
        default: false,
    },
    refereeRewarded: {
        type: Boolean,
        default: false,
    },
    milestoneRewarded: {
        type: Boolean,
        default: false,
    },
    qualificationCriteria: {
        type: QualificationCriteriaSchema,
        default: () => ({
            minOrders: 1,
            minSpend: 500,
            timeframeDays: 30
        })
    },
    completedAt: {
        type: Date,
    },
    registeredAt: {
        type: Date
    },
    qualifiedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    metadata: {
        type: ReferralMetadataSchema,
        default: () => ({
            milestoneOrders: {
                count: 0,
                totalAmount: 0,
            },
        }),
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referee: 1, status: 1 });
ReferralSchema.index({ status: 1, expiresAt: 1 });
// Pre-save hook to set expiration date (90 days from creation)
ReferralSchema.pre('save', function (next) {
    if (this.isNew && !this.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 90);
        this.expiresAt = expirationDate;
    }
    next();
});
// Instance method to check if referral is expired
ReferralSchema.methods.isExpired = function () {
    return this.expiresAt < new Date() && this.status !== ReferralStatus.COMPLETED;
};
// Static method to mark expired referrals
ReferralSchema.statics.markExpiredReferrals = async function () {
    const now = new Date();
    return this.updateMany({
        status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
        expiresAt: { $lt: now },
    }, {
        $set: { status: ReferralStatus.EXPIRED },
    });
};
const Referral = mongoose_1.default.model('Referral', ReferralSchema);
exports.default = Referral;
