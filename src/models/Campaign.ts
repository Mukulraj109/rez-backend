import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Campaign Deal interface - Individual deals within a campaign
 */
export interface ICampaignDeal {
  store?: string;
  storeId?: Types.ObjectId;
  image: string;
  cashback?: string;
  coins?: string;
  bonus?: string;
  drop?: string;
  discount?: string;
  endsIn?: string;
}

/**
 * Campaign interface - For homepage Exciting Deals section
 */
export interface ICampaign extends Document {
  _id: Types.ObjectId;
  campaignId: string; // e.g., 'super-cashback', 'triple-coin-day'
  title: string;
  subtitle: string;
  description?: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  gradientColors: string[];
  type: 'cashback' | 'coins' | 'bank' | 'bill' | 'drop' | 'new-user' | 'flash' | 'general';
  deals: ICampaignDeal[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  priority: number;
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxBenefit?: number;
  icon?: string;
  bannerImage?: string;
  region?: 'bangalore' | 'dubai' | 'china' | 'all'; // Region restriction - 'all' means available everywhere
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isRunning: boolean;
}

/**
 * Campaign Deal Schema
 */
const CampaignDealSchema = new Schema<ICampaignDeal>({
  store: { type: String, trim: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
  image: { type: String, required: true },
  cashback: { type: String },
  coins: { type: String },
  bonus: { type: String },
  drop: { type: String },
  discount: { type: String },
  endsIn: { type: String },
}, { _id: false });

/**
 * Campaign Schema
 */
const CampaignSchema = new Schema<ICampaign>({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  subtitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  badge: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },
  badgeBg: {
    type: String,
    default: '#FFFFFF',
  },
  badgeColor: {
    type: String,
    default: '#0B2240',
  },
  gradientColors: [{
    type: String,
  }],
  type: {
    type: String,
    enum: ['cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general'],
    default: 'general',
    index: true,
  },
  deals: [CampaignDealSchema],
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  eligibleCategories: [{
    type: String,
    trim: true,
  }],
  terms: [{
    type: String,
    trim: true,
  }],
  minOrderValue: {
    type: Number,
    min: 0,
  },
  maxBenefit: {
    type: Number,
    min: 0,
  },
  icon: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  region: {
    type: String,
    enum: ['bangalore', 'dubai', 'china', 'all'],
    default: 'all', // Available in all regions by default
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CampaignSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
CampaignSchema.index({ type: 1, isActive: 1 });
CampaignSchema.index({ priority: -1 });
CampaignSchema.index({ region: 1, isActive: 1 }); // Region-based filtering

// Virtual to check if campaign is currently running
CampaignSchema.virtual('isRunning').get(function() {
  const now = new Date();
  return this.isActive && this.startTime <= now && this.endTime >= now;
});

// Static methods
CampaignSchema.statics.getActiveCampaigns = function(region?: string) {
  const now = new Date();
  const query: any = {
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  // Filter by region: show campaigns for specific region OR 'all' regions
  if (region && region !== 'all') {
    query.$or = [
      { region: region },
      { region: 'all' },
      { region: { $exists: false } }, // Legacy campaigns without region field
    ];
  }

  return this.find(query).sort({ priority: -1 });
};

CampaignSchema.statics.getCampaignsByType = function(type: string, region?: string) {
  const now = new Date();
  const query: any = {
    type,
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  // Filter by region: show campaigns for specific region OR 'all' regions
  if (region && region !== 'all') {
    query.$or = [
      { region: region },
      { region: 'all' },
      { region: { $exists: false } }, // Legacy campaigns without region field
    ];
  }

  return this.find(query).sort({ priority: -1 });
};

const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
