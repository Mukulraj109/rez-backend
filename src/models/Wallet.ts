import mongoose, { Schema, Document, Types, Model } from 'mongoose';

// Wallet Model interface with static methods
export interface IWalletModel extends Model<IWallet> {
  createForUser(userId: Types.ObjectId): Promise<IWallet>;
  getWithSummary(userId: Types.ObjectId, period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
}

// Coin Balance interface
export interface ICoinBalance {
  type: 'wasil' | 'promotion' | 'cashback' | 'reward';
  amount: number;
  isActive: boolean;
  earnedDate?: Date;
  lastUsed?: Date;
  expiryDate?: Date;
}

// Wallet interface - complements User.wallet with additional details
export interface IWallet extends Document {
  user: Types.ObjectId;
  balance: {
    total: number;          // Total wallet balance
    available: number;      // Available for spending
    pending: number;        // Pending/locked amount
  };
  coins: ICoinBalance[];    // Individual coin balances
  currency: string;         // 'REZ_COIN' or 'RC'
  statistics: {
    totalEarned: number;    // Lifetime earnings
    totalSpent: number;     // Lifetime spending
    totalCashback: number;  // Total cashback received
    totalRefunds: number;   // Total refunds received
    totalTopups: number;    // Total topup amount
    totalWithdrawals: number; // Total withdrawn
  };
  limits: {
    maxBalance: number;     // Maximum wallet balance allowed
    minWithdrawal: number;  // Minimum withdrawal amount
    dailySpendLimit: number; // Daily spending limit
    dailySpent: number;     // Amount spent today
    lastResetDate: Date;    // Last daily limit reset
  };
  settings: {
    autoTopup: boolean;     // Auto-topup when balance is low
    autoTopupThreshold: number;
    autoTopupAmount: number;
    lowBalanceAlert: boolean;
    lowBalanceThreshold: number;
  };
  isActive: boolean;
  isFrozen: boolean;        // Wallet temporarily frozen
  frozenReason?: string;
  frozenAt?: Date;
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  canSpend(amount: number): boolean;
  addFunds(amount: number, type: string): Promise<void>;
  deductFunds(amount: number): Promise<void>;
  freeze(reason: string): Promise<void>;
  unfreeze(): Promise<void>;
  resetDailyLimit(): Promise<void>;
  getFormattedBalance(): string;
}

const WalletSchema = new Schema<IWallet>({
  user: {
    type: Schema.Types.ObjectId,
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
WalletSchema.virtual('formattedBalance').get(function() {
  return this.getFormattedBalance();
});

// Pre-save hook to validate balances
WalletSchema.pre('save', function(next) {
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
WalletSchema.methods.canSpend = function(amount: number): boolean {
  if (!this.isActive) return false;
  if (this.isFrozen) return false;
  if (this.balance.available < amount) return false;

  // Check daily limit
  if (this.limits.dailySpent + amount > this.limits.dailySpendLimit) {
    return false;
  }

  return true;
};

// Method to add funds
WalletSchema.methods.addFunds = async function(
  amount: number,
  type: string
): Promise<void> {
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
WalletSchema.methods.deductFunds = async function(amount: number): Promise<void> {
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
WalletSchema.methods.freeze = async function(reason: string): Promise<void> {
  this.isFrozen = true;
  this.frozenReason = reason;
  this.frozenAt = new Date();
  await this.save();
};

// Method to unfreeze wallet
WalletSchema.methods.unfreeze = async function(): Promise<void> {
  this.isFrozen = false;
  this.frozenReason = undefined;
  this.frozenAt = undefined;
  await this.save();
};

// Method to reset daily limit
WalletSchema.methods.resetDailyLimit = async function(): Promise<void> {
  this.limits.dailySpent = 0;
  this.limits.lastResetDate = new Date();
  await this.save();
};

// Method to get formatted balance
WalletSchema.methods.getFormattedBalance = function(): string {
  return `${this.balance.available} ${this.currency}`;
};

// Method to sync with User model
WalletSchema.methods.syncWithUser = async function(): Promise<void> {
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.user, {
    'wallet.balance': this.balance.total,
    'wallet.totalEarned': this.statistics.totalEarned,
    'wallet.totalSpent': this.statistics.totalSpent,
    'wallet.pendingAmount': this.balance.pending
  });
};

// Static method to create wallet for new user
WalletSchema.statics.createForUser = async function(userId: Types.ObjectId) {
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
WalletSchema.statics.getWithSummary = async function(
  userId: Types.ObjectId,
  period: 'day' | 'week' | 'month' = 'month'
) {
  const wallet = await this.findOne({ user: userId });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const Transaction = mongoose.model('Transaction') as any;
  const summary = await Transaction.getUserTransactionSummary(userId.toString(), period);

  return {
    wallet,
    summary: summary[0] || { summary: [], totalTransactions: 0 }
  };
};

export const Wallet = mongoose.model<IWallet, IWalletModel>('Wallet', WalletSchema);