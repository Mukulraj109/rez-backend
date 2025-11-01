import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoinTransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus';
  amount: number;
  balance: number; // Balance after transaction
  source: 'spin_wheel' | 'scratch_card' | 'quiz_game' | 'challenge' | 'achievement' | 'referral' | 'order' | 'review' | 'bill_upload' | 'daily_login' | 'admin' | 'purchase' | 'redemption' | 'expiry';
  description: string;
  metadata?: {
    gameId?: mongoose.Types.ObjectId;
    achievementId?: mongoose.Types.ObjectId;
    challengeId?: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    referralId?: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    voucherId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface ICoinTransactionModel extends Model<ICoinTransaction> {
  getUserBalance(userId: string): Promise<number>;
  createTransaction(
    userId: string,
    type: string,
    amount: number,
    source: string,
    description: string,
    metadata?: any
  ): Promise<ICoinTransaction>;
  expireOldCoins(userId: string, daysToExpire?: number): Promise<number>;
}

const CoinTransactionSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
      default: {}
    },
    expiresAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
CoinTransactionSchema.index({ user: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, source: 1, createdAt: -1 });
CoinTransactionSchema.index({ expiresAt: 1 });

// Virtual for display amount (positive/negative)
CoinTransactionSchema.virtual('displayAmount').get(function(this: ICoinTransaction) {
  if (this.type === 'spent' || this.type === 'expired') {
    return -this.amount;
  }
  return this.amount;
});

// Static method to get user's coin balance
CoinTransactionSchema.statics.getUserBalance = async function(userId: string) {
  const latestTransaction = await this.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select('balance');

  return latestTransaction?.balance || 0;
};

// Static method to create transaction and update balance
CoinTransactionSchema.statics.createTransaction = async function(
  userId: string,
  type: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any
) {
  // Get current balance
  const currentBalance = await (this as ICoinTransactionModel).getUserBalance(userId);

  // Calculate new balance
  let newBalance = currentBalance;
  if (type === 'earned' || type === 'refunded' || type === 'bonus') {
    newBalance += amount;
  } else if (type === 'spent' || type === 'expired') {
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
CoinTransactionSchema.statics.expireOldCoins = async function(userId: string, daysToExpire: number = 365) {
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
    await (this as ICoinTransactionModel).createTransaction(
      userId,
      'expired',
      transaction.amount,
      'expiry',
      `Coins expired from ${transaction.source}`,
      { originalTransactionId: transaction._id }
    );

    totalExpired += transaction.amount;
  }

  return totalExpired;
};

export const CoinTransaction = mongoose.model<ICoinTransaction, ICoinTransactionModel>('CoinTransaction', CoinTransactionSchema);
