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
exports.Transaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Transaction Schema
const TransactionSchema = new mongoose_1.Schema({
    transactionId: {
        type: String,
        required: false,
        unique: true,
        uppercase: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['credit', 'debit'],
        index: true
    },
    category: {
        type: String,
        required: true,
        enum: ['earning', 'spending', 'refund', 'withdrawal', 'topup', 'bonus', 'penalty', 'cashback'],
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'RC']
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    source: {
        type: {
            type: String,
            required: true,
            enum: ['project', 'order', 'referral', 'cashback', 'refund', 'bonus', 'withdrawal', 'topup', 'penalty']
        },
        reference: {
            type: mongoose_1.Schema.Types.ObjectId,
            required: true,
            refPath: 'source.type' // Dynamic reference based on source type
        },
        description: String,
        metadata: {
            projectTitle: String,
            orderNumber: String,
            storeInfo: {
                name: String,
                id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Store' }
            },
            referralInfo: {
                referredUser: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
                level: { type: Number, min: 1, max: 5 }
            },
            withdrawalInfo: {
                method: { type: String, enum: ['bank', 'upi', 'paypal'] },
                accountDetails: String,
                withdrawalId: String
            },
            bonusInfo: {
                reason: String,
                campaign: String
            }
        }
    },
    status: {
        current: {
            type: String,
            required: true,
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
            default: 'pending',
            index: true
        },
        history: [{
                status: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Date,
                    required: true,
                    default: Date.now
                },
                reason: String,
                updatedBy: {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: 'User'
                }
            }]
    },
    balanceBefore: {
        type: Number,
        required: true,
        min: 0
    },
    balanceAfter: {
        type: Number,
        required: true,
        min: 0
    },
    fees: {
        type: Number,
        default: 0,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    netAmount: {
        type: Number,
        min: 0
    },
    processingTime: {
        type: Number,
        min: 0
    },
    receiptUrl: String,
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    isReversible: {
        type: Boolean,
        default: true
    },
    reversedAt: Date,
    reversalReason: String,
    reversalTransactionId: String,
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    },
    scheduledAt: Date,
    processedAt: Date,
    failureReason: String,
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxRetries: {
        type: Number,
        default: 3,
        min: 0,
        max: 10
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
TransactionSchema.index({ transactionId: 1 });
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ user: 1, category: 1, createdAt: -1 });
TransactionSchema.index({ 'status.current': 1, createdAt: -1 });
TransactionSchema.index({ 'source.type': 1, 'source.reference': 1 });
TransactionSchema.index({ expiresAt: 1 });
TransactionSchema.index({ scheduledAt: 1 });
TransactionSchema.index({ processedAt: -1 });
// Compound indexes
TransactionSchema.index({ user: 1, 'status.current': 1, createdAt: -1 });
TransactionSchema.index({ type: 1, category: 1, createdAt: -1 });
// Virtual for transaction age in hours
TransactionSchema.virtual('ageInHours').get(function () {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});
// Virtual for formatted amount with currency
TransactionSchema.virtual('formattedAmount').get(function () {
    return this.getFormattedAmount();
});
// Virtual for status display
TransactionSchema.virtual('statusDisplay').get(function () {
    const statusMap = {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        reversed: 'Reversed'
    };
    return statusMap[this.status.current] || this.status.current;
});
// Pre-save hook to generate transaction ID and calculate net amount
TransactionSchema.pre('save', async function (next) {
    // Generate transaction ID for new transactions
    if (this.isNew && !this.transactionId) {
        const count = await this.constructor.countDocuments();
        const prefix = this.type === 'credit' ? 'CR' : 'DR';
        this.transactionId = `${prefix}${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }
    // Calculate net amount
    this.netAmount = this.amount - (this.fees || 0) - (this.tax || 0);
    // Set expiry for pending transactions (24 hours)
    if (this.status.current === 'pending' && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    // Add status history entry for status changes
    if (this.isModified('status.current') && !this.isNew) {
        this.status.history.push({
            status: this.status.current,
            timestamp: new Date()
        });
    }
    // Set processing time when completed
    if (this.isModified('status.current') && this.status.current === 'completed') {
        this.processedAt = new Date();
        this.processingTime = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
    }
    next();
});
// Method to update transaction status
TransactionSchema.methods.updateStatus = async function (newStatus, reason, updatedBy) {
    const oldStatus = this.status.current;
    this.status.current = newStatus;
    // Add to status history
    this.status.history.push({
        status: newStatus,
        timestamp: new Date(),
        reason,
        updatedBy: updatedBy ? new mongoose_1.default.Types.ObjectId(updatedBy) : undefined
    });
    // Handle specific status transitions
    if (newStatus === 'failed' && reason) {
        this.failureReason = reason;
    }
    if (newStatus === 'completed') {
        this.processedAt = new Date();
        this.processingTime = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
        // Clear expiry date
        this.expiresAt = undefined;
    }
    if (newStatus === 'cancelled') {
        this.expiresAt = undefined;
    }
    await this.save();
    // Update user wallet balance if transaction is completed
    if (newStatus === 'completed' && oldStatus !== 'completed') {
        const User = this.model('User');
        const user = await User.findById(this.user);
        if (user) {
            if (this.type === 'credit') {
                user.wallet.balance += this.netAmount;
                user.wallet.totalEarned += this.netAmount;
            }
            else {
                user.wallet.balance -= this.amount;
                user.wallet.totalSpent += this.amount;
            }
            await user.save();
        }
    }
};
// Method to reverse transaction
TransactionSchema.methods.reverse = async function (reason) {
    if (!this.canBeReversed()) {
        throw new Error('Transaction cannot be reversed');
    }
    // Create reversal transaction
    const TransactionModel = this.constructor;
    const reversalTransaction = new TransactionModel({
        user: this.user,
        type: this.type === 'credit' ? 'debit' : 'credit',
        category: 'refund',
        amount: this.netAmount,
        currency: this.currency,
        description: `Reversal of transaction ${this.transactionId}`,
        source: {
            type: 'refund',
            reference: this._id,
            description: reason
        },
        balanceBefore: this.balanceAfter,
        balanceAfter: this.type === 'credit' ? this.balanceAfter - this.netAmount : this.balanceAfter + this.netAmount,
        isReversible: false,
        status: {
            current: 'completed',
            history: [{
                    status: 'completed',
                    timestamp: new Date()
                }]
        }
    });
    await reversalTransaction.save();
    // Update original transaction
    this.reversedAt = new Date();
    this.reversalReason = reason;
    this.reversalTransactionId = reversalTransaction.transactionId;
    await this.updateStatus('reversed', reason);
    return reversalTransaction;
};
// Method to retry failed transaction
TransactionSchema.methods.retry = async function () {
    if (this.status.current !== 'failed') {
        throw new Error('Only failed transactions can be retried');
    }
    if (this.retryCount >= this.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
    }
    this.retryCount += 1;
    this.failureReason = undefined;
    await this.updateStatus('pending', 'Transaction retry attempt');
};
// Method to generate receipt (placeholder)
TransactionSchema.methods.generateReceipt = async function () {
    // This would typically generate a PDF receipt
    const receiptId = `RCP${this.transactionId}${Date.now()}`;
    this.receiptUrl = `/receipts/${receiptId}.pdf`;
    await this.save();
    return this.receiptUrl;
};
// Method to check if transaction can be reversed
TransactionSchema.methods.canBeReversed = function () {
    if (!this.isReversible)
        return false;
    if (this.reversedAt)
        return false;
    if (this.status.current !== 'completed')
        return false;
    // Check time limit (e.g., 30 days)
    const timeLimitHours = 30 * 24; // 30 days
    const ageInHours = (Date.now() - this.processedAt?.getTime()) / (1000 * 60 * 60);
    return ageInHours <= timeLimitHours;
};
// Method to get formatted amount
TransactionSchema.methods.getFormattedAmount = function () {
    const symbol = this.currency === 'INR' ? '₹' : '$';
    const sign = this.type === 'credit' ? '+' : '-';
    return `${sign}${symbol}${this.amount.toFixed(2)}`;
};
// Static method to get user transactions
TransactionSchema.statics.getUserTransactions = function (userId, filters = {}, limit = 50, skip = 0) {
    const query = { user: userId };
    if (filters.type) {
        query.type = filters.type;
    }
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.status) {
        query['status.current'] = filters.status;
    }
    if (filters.dateRange) {
        query.createdAt = {
            $gte: filters.dateRange.start,
            $lte: filters.dateRange.end
        };
    }
    if (filters.amountRange) {
        query.amount = {
            $gte: filters.amountRange.min,
            $lte: filters.amountRange.max
        };
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};
// Static method to get transaction summary
TransactionSchema.statics.getUserTransactionSummary = function (userId, period = 'month') {
    const now = new Date();
    let startDate;
    switch (period) {
        case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }
    return this.aggregate([
        {
            $match: {
                user: new mongoose_1.default.Types.ObjectId(userId),
                'status.current': 'completed',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$type',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
            }
        },
        {
            $group: {
                _id: null,
                summary: {
                    $push: {
                        type: '$_id',
                        totalAmount: '$totalAmount',
                        count: '$count',
                        avgAmount: '$avgAmount'
                    }
                },
                totalTransactions: { $sum: '$count' }
            }
        }
    ]);
};
// Static method to cleanup expired transactions
TransactionSchema.statics.cleanupExpired = function () {
    return this.updateMany({
        'status.current': 'pending',
        expiresAt: { $lt: new Date() }
    }, {
        $set: { 'status.current': 'cancelled' },
        $push: {
            'status.history': {
                status: 'cancelled',
                timestamp: new Date(),
                reason: 'Transaction expired'
            }
        }
    });
};
exports.Transaction = mongoose_1.default.model('Transaction', TransactionSchema);
