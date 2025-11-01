"use strict";
// UserCoupon Model
// Tracks user-claimed coupons
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
exports.UserCoupon = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserCouponSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    coupon: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true,
        index: true,
    },
    claimedDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true,
        index: true,
    },
    usedDate: {
        type: Date,
        default: null,
    },
    usedInOrder: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
    status: {
        type: String,
        enum: ['available', 'used', 'expired'],
        default: 'available',
        index: true,
    },
    notifications: {
        expiryReminder: {
            type: Boolean,
            default: true,
        },
        expiryReminderSent: {
            type: Date,
            default: null,
        },
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
UserCouponSchema.index({ user: 1, status: 1 });
UserCouponSchema.index({ user: 1, coupon: 1 });
UserCouponSchema.index({ status: 1, expiryDate: 1 });
// Virtual for days until expiry
UserCouponSchema.virtual('daysUntilExpiry').get(function () {
    const now = new Date();
    const diff = this.expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});
// Virtual for is expiring soon (within 3 days)
UserCouponSchema.virtual('isExpiringSoon').get(function () {
    const daysLeft = this.daysUntilExpiry;
    return daysLeft >= 0 && daysLeft <= 3;
});
// Instance method to mark as used
UserCouponSchema.methods.markAsUsed = async function (orderId) {
    this.status = 'used';
    this.usedDate = new Date();
    this.usedInOrder = orderId;
    await this.save();
    console.log(`✅ [USER_COUPON] Coupon ${this._id} marked as used`);
};
// Instance method to check expiry
UserCouponSchema.methods.checkExpiry = function () {
    const now = new Date();
    if (this.expiryDate < now && this.status === 'available') {
        this.status = 'expired';
        this.save();
        return true;
    }
    return false;
};
// Static method to mark expired user coupons
UserCouponSchema.statics.markExpiredCoupons = async function () {
    const now = new Date();
    const result = await this.updateMany({
        status: 'available',
        expiryDate: { $lt: now },
    }, {
        $set: { status: 'expired' },
    });
    console.log(`⏰ [USER_COUPON] Marked ${result.modifiedCount} user coupons as expired`);
    return result.modifiedCount || 0;
};
// Static method to get user's available coupons
UserCouponSchema.statics.getUserAvailableCoupons = async function (userId) {
    const now = new Date();
    return this.find({
        user: userId,
        status: 'available',
        expiryDate: { $gte: now },
    })
        .populate('coupon')
        .sort({ expiryDate: 1 })
        .lean();
};
// Static method to get coupons expiring soon (for notifications)
UserCouponSchema.statics.getExpiringSoonCoupons = async function (days = 3) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.find({
        status: 'available',
        expiryDate: { $gte: now, $lte: futureDate },
        'notifications.expiryReminder': true,
        'notifications.expiryReminderSent': null,
    })
        .populate('user', 'phoneNumber profile.firstName')
        .populate('coupon', 'couponCode title')
        .lean();
};
// Static method to check if user has already claimed a coupon
UserCouponSchema.statics.hasUserClaimedCoupon = async function (userId, couponId) {
    const count = await this.countDocuments({
        user: userId,
        coupon: couponId,
    });
    return count > 0;
};
// Static method to count user's coupon usage for a specific coupon
UserCouponSchema.statics.getUserCouponUsageCount = async function (userId, couponId) {
    return this.countDocuments({
        user: userId,
        coupon: couponId,
        status: 'used',
    });
};
exports.UserCoupon = mongoose_1.default.model('UserCoupon', UserCouponSchema);
