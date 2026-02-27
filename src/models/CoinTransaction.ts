import mongoose, { Schema, Document, Model } from 'mongoose';
import redisService from '../services/redisService';

export type MainCategorySlug = 'food-dining' | 'beauty-wellness' | 'grocery-essentials' | 'fitness-sports' | 'healthcare' | 'fashion' | 'education-learning' | 'home-services' | 'travel-experiences' | 'entertainment' | 'financial-lifestyle' | 'electronics';

export interface ICoinTransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus';
  amount: number;
  balance: number; // Balance after transaction
  source: 'spin_wheel' | 'scratch_card' | 'quiz_game' | 'challenge' | 'achievement' | 'referral' | 'order' | 'review' | 'bill_upload' | 'daily_login' | 'admin' | 'purchase' | 'redemption' | 'expiry' | 'survey' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'purchase_reward' | 'social_share_reward' | 'merchant_award' | 'cashback' | 'creator_pick_reward' | 'poll_vote' | 'photo_upload' | 'offer_comment' | 'event_rating' | 'ugc_reel' | 'social_impact_reward' | 'program_task_reward' | 'program_multiplier_bonus' | 'event_booking' | 'event_checkin' | 'event_participation' | 'event_sharing' | 'event_entry' | 'bonus_campaign' | 'tournament_prize' | 'tournament_entry' | 'tournament_refund' | 'challenge_reward' | 'learning_reward' | 'leaderboard_prize' | 'smart_spend_reward';
  description: string;
  category?: MainCategorySlug | null; // MainCategory this transaction belongs to
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
  getUserBalance(userId: string, category?: MainCategorySlug | null): Promise<number>;
  getUserCategoryBalance(userId: string, category: MainCategorySlug): Promise<number>;
  createTransaction(
    userId: string,
    type: string,
    amount: number,
    source: string,
    description: string,
    metadata?: any,
    category?: MainCategorySlug | null
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
      enum: ['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award'],
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
        'expiry',
        'survey',
        'memory_match',
        'coin_hunt',
        'guess_price',
        'purchase_reward',      // 5% auto coin after purchase
        'social_share_reward',  // 5% coin on social sharing
        'merchant_award',       // merchant gives coins to customer
        'cashback',             // cashback from orders or affiliate purchases
        'creator_pick_reward',  // merchant rewards creator for pick approval
        'poll_vote',            // voting in polls
        'photo_upload',         // uploading store/product photos
        'offer_comment',        // commenting on offers
        'event_rating',         // rating events after attendance
        'ugc_reel',             // creating UGC reel content
        'social_impact_reward', // earned from social impact event participation
        'program_task_reward',      // coins from special program task completion
        'program_multiplier_bonus', // bonus coins from program multiplier
        'event_booking',        // coins earned on successful event booking
        'event_checkin',        // coins earned for verified event check-in
        'event_participation',  // coins earned for completing event activities
        'event_sharing',        // coins earned for sharing an event
        'event_entry',          // coins earned on event entry/registration
        'event_review',         // coins earned for reviewing an event (distinct from rating)
        'bonus_campaign',       // coins from bonus zone campaign rewards
        'tournament_prize',     // coins awarded as tournament prize winnings
        'tournament_entry',     // coins spent on tournament entry fee
        'tournament_refund',    // coins refunded from tournament entry fee
        'challenge_reward',     // coins from completing challenges
        'learning_reward',      // coins from completing learning content
        'leaderboard_prize',    // coins awarded as leaderboard prize at cycle end
        'smart_spend_reward',   // enhanced coin reward from Smart Spend purchases
        'recharge',             // wallet recharge via payment gateway
        'transfer',             // P2P coin transfer between users
        'withdrawal'            // wallet withdrawal to bank/UPI/PayPal
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
    category: {
      type: String,
      enum: ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics', null],
      default: null,
      index: true
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
CoinTransactionSchema.index({ user: 1, category: 1, createdAt: -1 });

// Partner earnings aggregation index: enables fast per-user partner earnings breakdown
CoinTransactionSchema.index(
  { user: 1, 'metadata.partnerEarning': 1, 'metadata.partnerEarningType': 1, createdAt: -1 },
  {
    partialFilterExpression: { 'metadata.partnerEarning': true },
    name: 'partner_earnings_idx'
  }
);

// Idempotency index: prevents duplicate achievement rewards for the same user+achievement
CoinTransactionSchema.index(
  { user: 1, source: 1, 'metadata.achievementId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      source: 'achievement',
      'metadata.achievementId': { $exists: true, $ne: null }
    },
    name: 'achievement_idempotency_idx'
  }
);

// General idempotency index: prevents duplicate rewards using idempotencyKey
CoinTransactionSchema.index(
  { user: 1, 'metadata.idempotencyKey': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      'metadata.idempotencyKey': { $exists: true, $ne: null }
    },
    name: 'general_idempotency_idx'
  }
);

// Virtual for display amount (positive/negative)
CoinTransactionSchema.virtual('displayAmount').get(function(this: ICoinTransaction) {
  if (this.type === 'spent' || this.type === 'expired') {
    return -this.amount;
  }
  return this.amount;
});

// Static method to get user's coin balance (optionally filtered by category)
CoinTransactionSchema.statics.getUserBalance = async function(userId: string, category?: string | null) {
  const filter: any = { user: userId };
  if (category) {
    filter.category = category;
  }

  const latestTransaction = await this.findOne(filter)
    .sort({ createdAt: -1 })
    .select('balance');

  return latestTransaction?.balance || 0;
};

// Static method to get user's category-specific coin balance
CoinTransactionSchema.statics.getUserCategoryBalance = async function(userId: string, category: string) {
  // Sum all earned/bonus/refunded minus spent/expired for this category
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), category } },
    {
      $group: {
        _id: null,
        earned: {
          $sum: {
            $cond: [{ $in: ['$type', ['earned', 'refunded', 'bonus']] }, '$amount', 0]
          }
        },
        spent: {
          $sum: {
            $cond: [{ $in: ['$type', ['spent', 'expired']] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  if (!result.length) return 0;
  return Math.max(0, result[0].earned - result[0].spent);
};

// Static method to create transaction and update balance
// Uses Redis distributed lock to prevent race conditions on balance read-then-write
CoinTransactionSchema.statics.createTransaction = async function(
  userId: string,
  type: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: string | null
) {
  const lockKey = `coin-tx:${userId}`;
  let lockToken: string | null = null;

  try {
    // Acquire per-user lock (5s TTL) to prevent concurrent balance modifications
    lockToken = await redisService.acquireLock(lockKey, 5);
    if (!lockToken) {
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 200));
      lockToken = await redisService.acquireLock(lockKey, 5);
      if (!lockToken) {
        throw new Error('Transaction temporarily unavailable. Please try again.');
      }
    }

    // Get current balance (global, not category-specific for the balance field)
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
      metadata,
      category: category || null
    });

    // Invalidate consolidated earnings cache for this user
    try {
      await redisService.delPattern(`earnings:consolidated:${userId}:*`);
    } catch (e) {
      // Cache invalidation is best-effort; don't fail the transaction
    }

    return transaction;
  } finally {
    // Always release lock
    if (lockToken) {
      try {
        await redisService.releaseLock(lockKey, lockToken);
      } catch (e) {
        // Lock will auto-expire after TTL
      }
    }
  }
};

// Static method to expire old coins (FIFO) — category-aware
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
  const categoryExpired: Record<string, number> = {};

  for (const transaction of expiredTransactions) {
    // Mark as expired
    transaction.expiresAt = new Date();
    await transaction.save();

    // Create expiry transaction (preserve category from original)
    await (this as ICoinTransactionModel).createTransaction(
      userId,
      'expired',
      transaction.amount,
      'expiry',
      `Coins expired from ${transaction.source}`,
      { originalTransactionId: transaction._id },
      transaction.category || null
    );

    totalExpired += transaction.amount;

    // Track per-category expired amounts
    if (transaction.category) {
      categoryExpired[transaction.category] = (categoryExpired[transaction.category] || 0) + transaction.amount;
    }
  }

  // Update Wallet category balances for expired category coins
  if (Object.keys(categoryExpired).length > 0) {
    try {
      const Wallet = mongoose.model('Wallet');
      const wallet = await Wallet.findOne({ user: userId });
      if (wallet) {
        for (const [cat, amount] of Object.entries(categoryExpired)) {
          try {
            (wallet as any).deductCategoryCoins(cat, amount);
          } catch {
            // Category balance might already be 0
          }
        }
        await wallet.save();
      }
    } catch (err) {
      console.error('[CoinTransaction] Failed to update wallet category balances on expiry:', err);
    }
  }

  return totalExpired;
};

export const CoinTransaction = mongoose.model<ICoinTransaction, ICoinTransactionModel>('CoinTransaction', CoinTransactionSchema);
