import mongoose, { Schema, Document } from 'mongoose';

export interface IEarningConfig extends Document {
  streaks: {
    login: { milestones: { day: number; coins: number }[] };
    order: { milestones: { day: number; coins: number }[] };
    review: { milestones: { day: number; coins: number }[] };
  };
  referral: {
    referrerAmount: number;
    refereeDiscount: number;
    milestoneBonus: number;
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
    expiryDays: number;
  };
  dailyCheckin: {
    baseCoins: number;
    bonuses: { streak: number; coins: number }[];
  };
  billUpload: {
    minAmount: number;
    maxCashbackPercent: number;
    maxCashbackAmount: number;
  };
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EarningConfigSchema = new Schema({
  streaks: {
    login: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    },
    order: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    },
    review: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    }
  },
  referral: {
    referrerAmount: { type: Number, default: 50 },
    refereeDiscount: { type: Number, default: 50 },
    milestoneBonus: { type: Number, default: 20 },
    minOrders: { type: Number, default: 1 },
    minSpend: { type: Number, default: 500 },
    timeframeDays: { type: Number, default: 30 },
    expiryDays: { type: Number, default: 90 }
  },
  dailyCheckin: {
    baseCoins: { type: Number, default: 10 },
    bonuses: [{
      streak: { type: Number, required: true },
      coins: { type: Number, required: true }
    }]
  },
  billUpload: {
    minAmount: { type: Number, default: 100 },
    maxCashbackPercent: { type: Number, default: 10 },
    maxCashbackAmount: { type: Number, default: 500 }
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<IEarningConfig>('EarningConfig', EarningConfigSchema);
