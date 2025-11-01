"use strict";
// UserCashback Model
// Manages user cashback earnings and redemptions
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
exports.UserCashback = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CashbackMetadataSchema = new mongoose_1.Schema({
    orderAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    productCategories: [{
            type: String,
        }],
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
    },
    storeName: {
        type: String,
    },
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Campaign',
    },
    campaignName: {
        type: String,
    },
    bonusMultiplier: {
        type: Number,
        default: 1,
        min: 1,
    },
}, { _id: false });
const UserCashbackSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    cashbackRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100, // percentage
    },
    source: {
        type: String,
        enum: ['order', 'referral', 'promotion', 'special_offer', 'bonus', 'signup'],
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'credited', 'expired', 'cancelled'],
        default: 'pending',
        index: true,
    },
    earnedDate: {
        type: Date,
        default: Date.now,
        index: true,
    },
    creditedDate: {
        type: Date,
    },
    expiryDate: {
        type: Date,
        required: true,
        index: true,
    },
    description: {
        type: String,
        required: true,
        maxlength: 500,
    },
    transaction: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
    metadata: {
        type: CashbackMetadataSchema,
        required: true,
    },
    pendingDays: {
        type: Number,
        default: 7,
        min: 0,
    },
    isRedeemed: {
        type: Boolean,
        default: false,
    },
    redeemedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Compound indexes
UserCashbackSchema.index({ user: 1, status: 1 });
UserCashbackSchema.index({ user: 1, expiryDate: 1 });
UserCashbackSchema.index({ status: 1, expiryDate: 1 });
UserCashbackSchema.index({ earnedDate: -1 });
// Virtual for days until expiry
UserCashbackSchema.virtual('daysUntilExpiry').get(function () {
    const now = new Date();
    const expiry = new Date(this.expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});
// Virtual for days until credit
UserCashbackSchema.virtual('daysUntilCredit').get(function () {
    if (this.status !== 'pending')
        return 0;
    const now = new Date();
    const creditDate = new Date(this.earnedDate);
    creditDate.setDate(creditDate.getDate() + this.pendingDays);
    const diff = creditDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});
// Virtual for is expiring soon (within 7 days)
UserCashbackSchema.virtual('isExpiringSoon').get(function () {
    const daysLeft = this.daysUntilExpiry;
    return daysLeft > 0 && daysLeft <= 7;
});
// Virtual for is expired
UserCashbackSchema.virtual('isExpired').get(function () {
    return new Date() > new Date(this.expiryDate);
});
// Instance method to credit cashback to wallet
UserCashbackSchema.methods.creditToWallet = async function () {
    if (this.status !== 'pending') {
        throw new Error('Cashback is not in pending status');
    }
    // Check if enough days have passed
    const now = new Date();
    const earnedDate = new Date(this.earnedDate);
    const daysSinceEarned = Math.floor((now.getTime() - earnedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceEarned < this.pendingDays) {
        throw new Error(`Cashback can only be credited after ${this.pendingDays} days`);
    }
    // Check if expired
    if (this.isExpired) {
        this.status = 'expired';
        await this.save();
        throw new Error('Cashback has expired');
    }
    // Update status
    this.status = 'credited';
    this.creditedDate = new Date();
    this.isRedeemed = true;
    this.redeemedAt = new Date();
    await this.save();
    console.log(`✅ [CASHBACK] Credited ₹${this.amount} to user wallet`);
};
// Instance method to mark as expired
UserCashbackSchema.methods.markAsExpired = async function () {
    this.status = 'expired';
    await this.save();
    console.log(`⏰ [CASHBACK] Cashback ₹${this.amount} marked as expired`);
};
// Instance method to cancel cashback
UserCashbackSchema.methods.cancelCashback = async function (reason) {
    if (this.status === 'credited') {
        throw new Error('Cannot cancel credited cashback');
    }
    this.status = 'cancelled';
    await this.save();
    console.log(`❌ [CASHBACK] Cashback ₹${this.amount} cancelled: ${reason || 'No reason provided'}`);
};
// Static method to get user's cashback summary
UserCashbackSchema.statics.getUserSummary = async function (userId) {
    const summary = await this.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: '$status',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);
    const result = {
        totalEarned: 0,
        pending: 0,
        credited: 0,
        expired: 0,
        cancelled: 0,
        pendingCount: 0,
        creditedCount: 0,
        expiredCount: 0,
        cancelledCount: 0,
    };
    summary.forEach((item) => {
        if (item._id === 'pending') {
            result.pending = item.totalAmount;
            result.pendingCount = item.count;
        }
        else if (item._id === 'credited') {
            result.credited = item.totalAmount;
            result.creditedCount = item.count;
        }
        else if (item._id === 'expired') {
            result.expired = item.totalAmount;
            result.expiredCount = item.count;
        }
        else if (item._id === 'cancelled') {
            result.cancelled = item.totalAmount;
            result.cancelledCount = item.count;
        }
    });
    result.totalEarned = result.pending + result.credited + result.expired + result.cancelled;
    return result;
};
// Static method to get pending cashback ready for credit
UserCashbackSchema.statics.getPendingReadyForCredit = async function (userId) {
    const now = new Date();
    return this.find({
        user: userId,
        status: 'pending',
        expiryDate: { $gt: now },
    }).then((cashbacks) => {
        return cashbacks.filter(cb => {
            const earnedDate = new Date(cb.earnedDate);
            const daysSinceEarned = Math.floor((now.getTime() - earnedDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceEarned >= cb.pendingDays;
        });
    });
};
// Static method to get expiring soon cashback
UserCashbackSchema.statics.getExpiringSoon = async function (userId, days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        user: userId,
        status: { $in: ['pending', 'credited'] },
        expiryDate: { $gt: now, $lte: futureDate },
    })
        .sort({ expiryDate: 1 })
        .lean();
};
// Static method to mark expired cashback
UserCashbackSchema.statics.markExpiredCashback = async function () {
    const now = new Date();
    const result = await this.updateMany({
        status: { $in: ['pending'] },
        expiryDate: { $lt: now },
    }, {
        $set: { status: 'expired' },
    });
    console.log(`⏰ [CASHBACK] Marked ${result.modifiedCount} cashback entries as expired`);
    return result.modifiedCount;
};
// Static method to get cashback by source
UserCashbackSchema.statics.getCashbackBySource = async function (userId, source) {
    return this.find({
        user: userId,
        source,
    })
        .sort({ earnedDate: -1 })
        .lean();
};
// Static method to calculate total cashback for period
UserCashbackSchema.statics.getTotalForPeriod = async function (userId, startDate, endDate) {
    const result = await this.aggregate([
        {
            $match: {
                user: userId,
                earnedDate: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);
    return result.length > 0
        ? { totalAmount: result[0].totalAmount, count: result[0].count }
        : { totalAmount: 0, count: 0 };
};
// Pre-save hook to set expiry date if not provided
UserCashbackSchema.pre('save', function (next) {
    if (!this.expiryDate && this.isNew) {
        // Default: 90 days from earned date
        const expiry = new Date(this.earnedDate);
        expiry.setDate(expiry.getDate() + 90);
        this.expiryDate = expiry;
    }
    next();
});
exports.UserCashback = mongoose_1.default.model('UserCashback', UserCashbackSchema);
