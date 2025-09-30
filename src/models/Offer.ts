import mongoose, { Document, Schema, Model } from 'mongoose';

// Instance methods interface
export interface IOfferMethods {
  isValid(): boolean;
  canUserRedeem(userRedemptionCount: number): boolean;
}

// Static methods interface
interface IOfferModel extends Model<IOffer, {}, IOfferMethods> {
  getActive(): any;
  getFeatured(limit: number): any;
  getTrending(limit: number): any;
}

// Offer interface matching frontend expectations
export interface IOffer extends Document, IOfferMethods {
  // Basic info
  title: string;
  description: string;
  image: string;
  images?: string[]; // Additional images

  // Pricing & Discount
  originalPrice?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  cashBackPercentage: number; // Frontend expects this field
  discount?: string; // Display text like "50% OFF"

  // Categorization
  category: mongoose.Types.ObjectId | string;
  tags: string[];

  // Related entities (flexible - can be store-specific or general)
  store?: mongoose.Types.ObjectId; // Optional: specific store
  product?: mongoose.Types.ObjectId; // Optional: specific product
  applicableStores: mongoose.Types.ObjectId[]; // Can apply to multiple stores
  applicableProducts: mongoose.Types.ObjectId[]; // Can apply to multiple products

  // Location (frontend shows distance)
  location?: {
    type: string;
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
  };
  distance?: string; // Calculated field for frontend

  // Validity
  startDate: Date;
  endDate: Date;
  validUntil?: string; // Display format for frontend
  isActive: boolean;

  // Redemption settings
  redemptionType: 'online' | 'instore' | 'both' | 'voucher';
  redemptionCode?: string;
  maxRedemptions?: number; // Total limit
  currentRedemptions: number;
  userRedemptionLimit: number; // Per user limit

  // Terms & Conditions
  termsAndConditions: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;

  // Flags (frontend uses these for filtering/display)
  isNew: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isSpecial: boolean;
  isFeatured: boolean;

  // Store info (embedded for frontend convenience)
  storeInfo?: {
    name: string;
    rating: number;
    verified: boolean;
    logo?: string;
  };

  // Analytics
  viewCount: number;
  clickCount: number;
  redemptionCount: number;
  favoriteCount: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId; // Admin or Merchant
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema(
  {
    // Basic info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
      required: true,
    },
    images: [{
      type: String,
    }],

    // Pricing & Discount
    originalPrice: {
      type: Number,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    cashBackPercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    discount: {
      type: String,
      trim: true,
    },

    // Categorization
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],

    // Related entities
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    applicableStores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
    }],
    applicableProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
    }],

    // Location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      address: String,
      city: String,
      state: String,
    },
    distance: String,

    // Validity
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    validUntil: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Redemption settings
    redemptionType: {
      type: String,
      enum: ['online', 'instore', 'both', 'voucher'],
      default: 'online',
    },
    redemptionCode: {
      type: String,
      uppercase: true,
      sparse: true,
      unique: true,
    },
    maxRedemptions: {
      type: Number,
      min: 0,
    },
    currentRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    userRedemptionLimit: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Terms & Conditions
    termsAndConditions: [{
      type: String,
      trim: true,
    }],
    minimumPurchase: {
      type: Number,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      min: 0,
    },

    // Flags
    isNew: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSpecial: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Store info (embedded)
    storeInfo: {
      name: String,
      rating: {
        type: Number,
        min: 0,
        max: 5,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      logo: String,
    },

    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
OfferSchema.index({ category: 1, isActive: 1 });
OfferSchema.index({ isFeatured: 1, isActive: 1 });
OfferSchema.index({ isTrending: 1, isActive: 1 });
OfferSchema.index({ endDate: 1 });
OfferSchema.index({ startDate: 1, endDate: 1 });
OfferSchema.index({ 'location.coordinates': '2dsphere' });

// Text index for search
OfferSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
});

// Pre-save middleware to format validUntil date
// @ts-ignore - TypeScript has issues with 'this' context in middleware
OfferSchema.pre('save', function (next) {
  // @ts-ignore
  if (this.endDate) {
    // @ts-ignore
    const date = new Date(this.endDate);
    // @ts-ignore
    this.validUntil = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  next();
});

// Method to check if offer is currently valid
OfferSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (!this.maxRedemptions || this.currentRedemptions < this.maxRedemptions)
  );
};

// Method to check if user can redeem (pass user redemption count)
OfferSchema.methods.canUserRedeem = function (userRedemptionCount: number): boolean {
  return this.isValid() && userRedemptionCount < this.userRedemptionLimit;
};

// Static method to get active offers
// @ts-ignore
OfferSchema.statics.getActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

// Static method to get featured offers
// @ts-ignore
OfferSchema.statics.getFeatured = function (limit: number = 10) {
  // @ts-ignore
  return this.getActive()
    .where('isFeatured', true)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .populate('store', 'name logo location');
};

// Static method to get trending offers
// @ts-ignore
OfferSchema.statics.getTrending = function (limit: number = 10) {
  // @ts-ignore
  return this.getActive()
    .where('isTrending', true)
    .sort({ viewCount: -1, redemptionCount: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .populate('store', 'name logo location');
};

const Offer = mongoose.model<IOffer, IOfferModel>('Offer', OfferSchema);

export default Offer;