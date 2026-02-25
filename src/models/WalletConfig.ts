import mongoose, { Schema, Document } from 'mongoose';

export interface ITransferLimits {
  dailyMax: number;
  perTransactionMax: number;
  minAmount: number;
  requireOtpAbove: number;
  maxRecipientsPerDay: number;
}

export interface IGiftTheme {
  id: string;
  label: string;
  emoji: string;
  colors: string[];
  isActive: boolean;
  tags: string[];
  sortOrder: number;
}

export interface IGiftLimits {
  dailyMax: number;
  perGiftMax: number;
  minAmount: number;
  requireOtpAbove: number;
  maxGiftsPerDay: number;
  denominations: number[];
  themes: IGiftTheme[];
  messageMaxLength: number;
  scheduledDeliveryEnabled: boolean;
}

export interface IRechargeTier {
  minAmount: number;
  cashbackPercentage: number;
}

export interface IRechargeConfig {
  isEnabled: boolean;
  tiers: IRechargeTier[];
  maxCashback: number;
  minRecharge: number;
}

export interface IExpiryConfig {
  promoExpiryDays: number;
  alertDaysBefore: number;
  gracePeriodDays: number;
}

export interface ICoinConversion {
  nuqtaToInr: number;
  promoToInr: number;
  brandedToInr: number;
}

export interface IFraudThresholds {
  maxTransfersPerHour: number;
  maxGiftsPerDay: number;
  suspiciousAmountThreshold: number;
  autoFreezeMultiplier: number;
}

export interface ICoinRules {
  usageRules: string[];
  earningMethods: string[];
}

export interface IWalletConfig extends Document {
  singleton: boolean;
  transferLimits: ITransferLimits;
  giftLimits: IGiftLimits;
  rechargeConfig: IRechargeConfig;
  expiryConfig: IExpiryConfig;
  commissionRate: number;
  coinConversion: ICoinConversion;
  fraudThresholds: IFraudThresholds;
  coinRules: Record<string, ICoinRules>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletConfigModel extends mongoose.Model<IWalletConfig> {
  getOrCreate(): Promise<IWalletConfig>;
}

const WalletConfigSchema = new Schema<IWalletConfig>({
  singleton: {
    type: Boolean,
    default: true,
    unique: true
  },
  transferLimits: {
    dailyMax: { type: Number, default: 10000 },
    perTransactionMax: { type: Number, default: 5000 },
    minAmount: { type: Number, default: 10 },
    requireOtpAbove: { type: Number, default: 1000 },
    maxRecipientsPerDay: { type: Number, default: 10 }
  },
  giftLimits: {
    dailyMax: { type: Number, default: 10000 },
    perGiftMax: { type: Number, default: 5000 },
    minAmount: { type: Number, default: 10 },
    requireOtpAbove: { type: Number, default: 1000 },
    maxGiftsPerDay: { type: Number, default: 20 },
    denominations: {
      type: [Number],
      default: [50, 100, 250, 500, 1000, 2000]
    },
    themes: {
      type: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        emoji: { type: String, required: true },
        colors: { type: [String], required: true },
        isActive: { type: Boolean, default: true },
        tags: { type: [String], default: [] },
        sortOrder: { type: Number, default: 0 },
      }],
      default: [
        { id: 'birthday', label: 'Birthday', emoji: '🎂', colors: ['#FF6B6B', '#FF8E8E'], isActive: true, tags: ['birthday'], sortOrder: 0 },
        { id: 'christmas', label: 'Christmas', emoji: '🎄', colors: ['#2ECC71', '#27AE60'], isActive: true, tags: ['festival'], sortOrder: 1 },
        { id: 'gift', label: 'Gift', emoji: '🎁', colors: ['#9B59B6', '#8E44AD'], isActive: true, tags: ['general'], sortOrder: 2 },
        { id: 'love', label: 'Love', emoji: '💝', colors: ['#E91E63', '#C2185B'], isActive: true, tags: ['love'], sortOrder: 3 },
        { id: 'thanks', label: 'Thanks', emoji: '🙏', colors: ['#00BCD4', '#0097A7'], isActive: true, tags: ['general'], sortOrder: 4 },
        { id: 'congrats', label: 'Congrats', emoji: '🎉', colors: ['#FFC107', '#FFA000'], isActive: true, tags: ['celebration'], sortOrder: 5 },
      ]
    },
    messageMaxLength: { type: Number, default: 150 },
    scheduledDeliveryEnabled: { type: Boolean, default: false },
  },
  rechargeConfig: {
    isEnabled: { type: Boolean, default: true },
    tiers: {
      type: [{
        minAmount: { type: Number, required: true },
        cashbackPercentage: { type: Number, required: true, min: 0, max: 100 }
      }],
      default: [
        { minAmount: 120, cashbackPercentage: 5 },
        { minAmount: 500, cashbackPercentage: 7 },
        { minAmount: 1000, cashbackPercentage: 10 },
        { minAmount: 5000, cashbackPercentage: 10 },
        { minAmount: 10000, cashbackPercentage: 10 }
      ]
    },
    maxCashback: { type: Number, default: 1000 },
    minRecharge: { type: Number, default: 100 }
  },
  expiryConfig: {
    promoExpiryDays: { type: Number, default: 30 },
    alertDaysBefore: { type: Number, default: 7 },
    gracePeriodDays: { type: Number, default: 3 }
  },
  commissionRate: {
    type: Number,
    default: 0.05,
    min: 0,
    max: 1
  },
  coinConversion: {
    nuqtaToInr: { type: Number, default: 1 },
    promoToInr: { type: Number, default: 1 },
    brandedToInr: { type: Number, default: 1 }
  },
  fraudThresholds: {
    maxTransfersPerHour: { type: Number, default: 5 },
    maxGiftsPerDay: { type: Number, default: 20 },
    suspiciousAmountThreshold: { type: Number, default: 50000 },
    autoFreezeMultiplier: { type: Number, default: 5 }
  },
  coinRules: {
    type: Schema.Types.Mixed,
    default: {
      rez: {
        usageRules: ['Use anywhere on Nuqta', 'No usage cap per transaction', 'Never expires'],
        earningMethods: ['Purchases & Orders', 'Referrals', 'Daily Check-in', 'Games & Challenges', 'Reviews & Social'],
      },
      promo: {
        usageRules: ['Max 20% of bill value per transaction', 'Valid only during campaign period', 'Check expiry date'],
        earningMethods: ['Bonus Campaigns', 'Festival Offers', 'Flash Sales', 'Category Multipliers'],
      },
      branded: {
        usageRules: ['Use only at the issuing merchant', 'No expiry (merchant-specific)', 'Cannot transfer to others'],
        earningMethods: ['Store Purchases', 'Merchant Promotions', 'Loyalty Programs'],
      },
    }
  }
}, {
  timestamps: true
});

// Static: Get or create singleton
WalletConfigSchema.statics.getOrCreate = async function(): Promise<IWalletConfig> {
  let config = await this.findOne({ singleton: true });
  if (!config) {
    config = await this.create({ singleton: true });
  }
  return config;
};

export const WalletConfig = mongoose.model<IWalletConfig, IWalletConfigModel>('WalletConfig', WalletConfigSchema);
