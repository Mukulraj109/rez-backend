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
exports.CoinTransaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CoinTransactionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['earned', 'spent', 'expired', 'refunded', 'bonus'],
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    balance: {
        type: Number,
        required: true,
        min: 0
    },
    source: {
        type: String,
        enum: [
            'spin_wheel',
            'scratch_card',
            'quiz_game',
            'challenge',
            'achievement',
            'referral',
            'order',
            'review',
            'bill_upload',
            'daily_login',
            'admin',
            'purchase',
            'redemption',
            'expiry'
        ],
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    expiresAt: Date
}, {
    timestamps: true
});
// Indexes for efficient querying
CoinTransactionSchema.index({ user: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, source: 1, createdAt: -1 });
CoinTransactionSchema.index({ expiresAt: 1 });
// Virtual for display amount (positive/negative)
CoinTransactionSchema.virtual('displayAmount').get(function () {
    if (this.type === 'spent' || this.type === 'expired') {
        return -this.amount;
    }
    return this.amount;
});
// Static method to get user's coin balance
CoinTransactionSchema.statics.getUserBalance = async function (userId) {
    const latestTransaction = await this.findOne({ user: userId })
        .sort({ createdAt: -1 })
        .select('balance');
    return latestTransaction?.balance || 0;
};
// Static method to create transaction and update balance
CoinTransactionSchema.statics.createTransaction = async function (userId, type, amount, source, description, metadata) {
    // Get current balance
    const currentBalance = await this.getUserBalance(userId);
    // Calculate new balance
    let newBalance = currentBalance;
    if (type === 'earned' || type === 'refunded' || type === 'bonus') {
        newBalance += amount;
    }
    else if (type === 'spent' || type === 'expired') {
        if (currentBalance < amount) {
            throw new Error('Insufficient coin balance');
        }
        newBalance -= amount;
    }
    // Create transaction
    const transaction = await this.create({
        user: userId,
        type,
        amount,
        balance: newBalance,
        source,
        description,
        metadata
    });
    return transaction;
};
// Static method to expire old coins (FIFO)
CoinTransactionSchema.statics.expireOldCoins = async function (userId, daysToExpire = 365) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - daysToExpire);
    const expiredTransactions = await this.find({
        user: userId,
        type: 'earned',
        createdAt: { $lt: expiryDate },
        expiresAt: null
    });
    let totalExpired = 0;
    for (const transaction of expiredTransactions) {
        // Mark as expired
        transaction.expiresAt = new Date();
        await transaction.save();
        // Create expiry transaction
        await this.createTransaction(userId, 'expired', transaction.amount, 'expiry', `Coins expired from ${transaction.source}`, { originalTransactionId: transaction._id });
        totalExpired += transaction.amount;
    }
    return totalExpired;
};
exports.CoinTransaction = mongoose_1.default.model('CoinTransaction', CoinTransactionSchema);
