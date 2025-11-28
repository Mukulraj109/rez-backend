// Store Promo Coin Model
// Tracks store-specific promotional coins earned by users

import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IStorePromoCoin extends Document {
  user: Types.ObjectId;
  store: Types.ObjectId;
  amount: number;              // Total promo coins from this store
  earned: number;              // Lifetime earned from this store
  used: number;                // Lifetime used at this store
  pending: number;             // Coins pending (from orders not completed)
  transactions: Array<{
    type: 'earned' | 'used' | 'expired' | 'refunded';
    amount: number;
    orderId?: Types.ObjectId;
    description: string;
    date: Date;
  }>;
  lastEarnedAt?: Date;
  lastUsedAt?: Date;
  expiryDate?: Date;           // Optional expiry for promo coins
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorePromoCoinModel extends Model<IStorePromoCoin> {
  getUserStoreCoins(userId: Types.ObjectId, storeId?: Types.ObjectId): Promise<IStorePromoCoin[]>;
  earnCoins(userId: Types.ObjectId, storeId: Types.ObjectId, amount: number, orderId: Types.ObjectId): Promise<IStorePromoCoin>;
  useCoins(userId: Types.ObjectId, storeId: Types.ObjectId, amount: number, orderId: Types.ObjectId): Promise<IStorePromoCoin>;
  getAvailableCoins(userId: Types.ObjectId, storeId: Types.ObjectId): Promise<number>;
}

const StorePromoCoinSchema = new Schema<IStorePromoCoin>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  earned: {
    type: Number,
    default: 0,
    min: 0
  },
  used: {
    type: Number,
    default: 0,
    min: 0
  },
  pending: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [{
    type: {
      type: String,
      enum: ['earned', 'used', 'expired', 'refunded'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  lastEarnedAt: Date,
  lastUsedAt: Date,
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
StorePromoCoinSchema.index({ user: 1, store: 1 }, { unique: true });
StorePromoCoinSchema.index({ user: 1, isActive: 1 });
StorePromoCoinSchema.index({ user: 1, amount: -1 });

// Static method: Get user's promo coins (all stores or specific store)
StorePromoCoinSchema.statics.getUserStoreCoins = async function(
  userId: Types.ObjectId,
  storeId?: Types.ObjectId
): Promise<IStorePromoCoin[]> {
  const query: any = { user: userId, isActive: true };
  
  if (storeId) {
    query.store = storeId;
  }
  
  return this.find(query)
    .populate('store', 'name logo')
    .sort({ amount: -1, lastEarnedAt: -1 });
};

// Static method: Earn promo coins from an order
StorePromoCoinSchema.statics.earnCoins = async function(
  userId: Types.ObjectId,
  storeId: Types.ObjectId,
  amount: number,
  orderId: Types.ObjectId
): Promise<IStorePromoCoin> {
  console.log(`💰 [STORE PROMO COIN] User ${userId} earning ${amount} coins from store ${storeId}`);
  
  // Find or create store promo coin record
  let storePromoCoin = await this.findOne({ user: userId, store: storeId });
  
  if (!storePromoCoin) {
    storePromoCoin = await this.create({
      user: userId,
      store: storeId,
      amount: amount,
      earned: amount,
      used: 0,
      pending: 0,
      transactions: [{
        type: 'earned',
        amount,
        orderId,
        description: `Earned ${amount} promo coins from order`,
        date: new Date()
      }],
      lastEarnedAt: new Date(),
      isActive: true
    });
  } else {
    storePromoCoin.amount += amount;
    storePromoCoin.earned += amount;
    storePromoCoin.lastEarnedAt = new Date();
    storePromoCoin.transactions.push({
      type: 'earned',
      amount,
      orderId,
      description: `Earned ${amount} promo coins from order`,
      date: new Date()
    });
    await storePromoCoin.save();
  }
  
  console.log(`✅ [STORE PROMO COIN] New balance for store ${storeId}: ${storePromoCoin.amount}`);
  
  return storePromoCoin;
};

// Static method: Use promo coins in an order
StorePromoCoinSchema.statics.useCoins = async function(
  userId: Types.ObjectId,
  storeId: Types.ObjectId,
  amount: number,
  orderId: Types.ObjectId
): Promise<IStorePromoCoin> {
  console.log(`💸 [STORE PROMO COIN] User ${userId} using ${amount} coins at store ${storeId}`);
  
  const storePromoCoin = await this.findOne({ user: userId, store: storeId });
  
  if (!storePromoCoin) {
    throw new Error('No promo coins available for this store');
  }
  
  if (storePromoCoin.amount < amount) {
    throw new Error(`Insufficient promo coins. Available: ${storePromoCoin.amount}, Required: ${amount}`);
  }
  
  storePromoCoin.amount -= amount;
  storePromoCoin.used += amount;
  storePromoCoin.lastUsedAt = new Date();
  storePromoCoin.transactions.push({
    type: 'used',
    amount,
    orderId,
    description: `Used ${amount} promo coins in order`,
    date: new Date()
  });
  
  await storePromoCoin.save();
  
  console.log(`✅ [STORE PROMO COIN] Remaining balance for store ${storeId}: ${storePromoCoin.amount}`);
  
  return storePromoCoin;
};

// Static method: Get available coins for a specific store
StorePromoCoinSchema.statics.getAvailableCoins = async function(
  userId: Types.ObjectId,
  storeId: Types.ObjectId
): Promise<number> {
  const storePromoCoin = await this.findOne({ user: userId, store: storeId, isActive: true });
  return storePromoCoin?.amount || 0;
};

// Instance method: Check if coins are expired
StorePromoCoinSchema.methods.isExpired = function(): boolean {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

export const StorePromoCoin = mongoose.model<IStorePromoCoin, IStorePromoCoinModel>('StorePromoCoin', StorePromoCoinSchema);

