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
exports.Wallet = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WalletSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    balance: {
        total: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        available: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        pending: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        }
    },
    coins: [{
            type: {
                type: String,
                enum: ['wasil', 'promotion', 'cashback', 'reward'],
                required: true
            },
            amount: {
                type: Number,
                default: 0,
                min: 0
            },
            isActive: {
                type: Boolean,
                default: true
            },
            earnedDate: Date,
            lastUsed: Date,
            expiryDate: Date
        }],
    currency: {
        type: String,
        required: true,
        default: 'RC',
        enum: ['RC', 'REZ_COIN', 'INR']
    },
    statistics: {
        totalEarned: {
            type: Number,
            default: 0,
            min: 0
        },
        totalSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        totalCashback: {
            type: Number,
            default: 0,
            min: 0
        },
        totalRefunds: {
            type: Number,
            default: 0,
            min: 0
        },
        totalTopups: {
            type: Number,
            default: 0,
            min: 0
        },
        totalWithdrawals: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    limits: {
        maxBalance: {
            type: Number,
            default: 100000,
            min: 0
        },
        minWithdrawal: {
            type: Number,
            default: 100,
            min: 0
        },
        dailySpendLimit: {
            type: Number,
            default: 10000,
            min: 0
        },
        dailySpent: {
            type: Number,
            default: 0,
            min: 0
        },
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    settings: {
        autoTopup: {
            type: Boolean,
            default: false
        },
        autoTopupThreshold: {
            type: Number,
            default: 100,
            min: 0
        },
        autoTopupAmount: {
            type: Number,
            default: 500,
            min: 0
        },
        lowBalanceAlert: {
            type: Boolean,
            default: true
        },
        lowBalanceThreshold: {
            type: Number,
            default: 50,
            min: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFrozen: {
        type: Boolean,
        default: false,
        index: true
    },
    frozenReason: {
        type: String,
        trim: true
    },
    frozenAt: {
        type: Date
    },
    lastTransactionAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
WalletSchema.index({ user: 1 });
WalletSchema.index({ isActive: 1, isFrozen: 1 });
WalletSchema.index({ 'balance.available': 1 });
WalletSchema.index({ lastTransactionAt: -1 });
// Virtual for formatted balance
WalletSchema.virtual('formattedBalance').get(function () {
    return this.getFormattedBalance();
});
// Pre-save hook to validate balances
WalletSchema.pre('save', function (next) {
    // Ensure total = available + pending
    const calculatedTotal = this.balance.available + this.balance.pending;
    // Allow small rounding differences
    if (Math.abs(this.balance.total - calculatedTotal) > 0.01) {
        this.balance.total = calculatedTotal;
    }
    // Reset daily limit if needed
    const now = new Date();
    const lastReset = new Date(this.limits.lastResetDate);
    if (now.getDate() !== lastReset.getDate() ||
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
        this.limits.dailySpent = 0;
        this.limits.lastResetDate = now;
    }
    next();
});
// Method to check if user can spend amount
WalletSchema.methods.canSpend = function (amount) {
    if (!this.isActive)
        return false;
    if (this.isFrozen)
        return false;
    if (this.balance.available < amount)
        return false;
    // Check daily limit
    if (this.limits.dailySpent + amount > this.limits.dailySpendLimit) {
        return false;
    }
    return true;
};
// Method to add funds
WalletSchema.methods.addFunds = async function (amount, type) {
    if (!this.isActive) {
        throw new Error('Wallet is not active');
    }
    if (this.isFrozen) {
        throw new Error('Wallet is frozen');
    }
    // Check max balance limit
    if (this.balance.total + amount > this.limits.maxBalance) {
        throw new Error(`Maximum wallet balance (${this.limits.maxBalance}) would be exceeded`);
    }
    // Update balances
    this.balance.available += amount;
    this.balance.total += amount;
    // Update statistics based on type
    switch (type) {
        case 'cashback':
            this.statistics.totalCashback += amount;
            this.statistics.totalEarned += amount;
            break;
        case 'refund':
            this.statistics.totalRefunds += amount;
            break;
        case 'topup':
            this.statistics.totalTopups += amount;
            break;
        default:
            this.statistics.totalEarned += amount;
    }
    this.lastTransactionAt = new Date();
    await this.save();
    // Sync with User model
    await this.syncWithUser();
};
// Method to deduct funds
WalletSchema.methods.deductFunds = async function (amount) {
    if (!this.isActive) {
        throw new Error('Wallet is not active');
    }
    if (this.isFrozen) {
        throw new Error('Wallet is frozen');
    }
    if (!this.canSpend(amount)) {
        throw new Error('Insufficient balance or daily limit exceeded');
    }
    // Update balances
    this.balance.available -= amount;
    this.balance.total -= amount;
    // Update statistics
    this.statistics.totalSpent += amount;
    this.limits.dailySpent += amount;
    this.lastTransactionAt = new Date();
    await this.save();
    // Sync with User model
    await this.syncWithUser();
    // Check low balance alert
    if (this.settings.lowBalanceAlert &&
        this.balance.available <= this.settings.lowBalanceThreshold) {
        // Trigger low balance notification (implement notification service)
        console.log(`Low balance alert for user ${this.user}: ${this.balance.available} RC`);
    }
    // Auto-topup if enabled
    if (this.settings.autoTopup &&
        this.balance.available <= this.settings.autoTopupThreshold) {
        console.log(`Auto-topup triggered for user ${this.user}`);
        // Implement auto-topup logic here
    }
};
// Method to freeze wallet
WalletSchema.methods.freeze = async function (reason) {
    this.isFrozen = true;
    this.frozenReason = reason;
    this.frozenAt = new Date();
    await this.save();
};
// Method to unfreeze wallet
WalletSchema.methods.unfreeze = async function () {
    this.isFrozen = false;
    this.frozenReason = undefined;
    this.frozenAt = undefined;
    await this.save();
};
// Method to reset daily limit
WalletSchema.methods.resetDailyLimit = async function () {
    this.limits.dailySpent = 0;
    this.limits.lastResetDate = new Date();
    await this.save();
};
// Method to get formatted balance
WalletSchema.methods.getFormattedBalance = function () {
    return `${this.balance.available} ${this.currency}`;
};
// Method to sync with User model
WalletSchema.methods.syncWithUser = async function () {
    const User = mongoose_1.default.model('User');
    await User.findByIdAndUpdate(this.user, {
        'wallet.balance': this.balance.total,
        'wallet.totalEarned': this.statistics.totalEarned,
        'wallet.totalSpent': this.statistics.totalSpent,
        'wallet.pendingAmount': this.balance.pending
    });
};
// Static method to create wallet for new user
WalletSchema.statics.createForUser = async function (userId) {
    const existingWallet = await this.findOne({ user: userId });
    if (existingWallet) {
        return existingWallet;
    }
    const wallet = new this({
        user: userId,
        balance: {
            total: 0,
            available: 0,
            pending: 0
        },
        coins: [
            {
                type: 'wasil',
                amount: 0,
                isActive: true,
                earnedDate: new Date()
            },
            {
                type: 'promotion',
                amount: 0,
                isActive: true,
                earnedDate: new Date()
            }
        ],
        currency: 'RC'
    });
    await wallet.save();
    return wallet;
};
// Static method to get wallet with transaction summary
WalletSchema.statics.getWithSummary = async function (userId, period = 'month') {
    const wallet = await this.findOne({ user: userId });
    if (!wallet) {
        throw new Error('Wallet not found');
    }
    const Transaction = mongoose_1.default.model('Transaction');
    const summary = await Transaction.getUserTransactionSummary(userId.toString(), period);
    return {
        wallet,
        summary: summary[0] || { summary: [], totalTransactions: 0 }
    };
};
exports.Wallet = mongoose_1.default.model('Wallet', WalletSchema);
