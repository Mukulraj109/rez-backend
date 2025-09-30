import mongoose, { Document, Schema } from 'mongoose';

// Interface extending Document for TypeScript
export interface IMerchant extends Document {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  businessLicense?: string;
  taxId?: string;
  website?: string;
  description?: string;
  logo?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional properties for profile/sync features
  displayName?: string;
  tagline?: string;
  coverImage?: string;
  galleryImages?: string[];
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  address?: any;
  contact?: any;
  socialMedia?: any;
  businessHours?: any;
  deliveryOptions?: any;
  paymentMethods?: any;
  policies?: any;
  ratings?: any;
  status?: string;
  isFeatured?: boolean;
  categories?: string[];
  tags?: string[];
  
  // Additional properties needed by merchant-profile route
  timezone?: string;
  serviceArea?: any;
  features?: string[];
  reviewSummary?: any;
  verification?: {
    isVerified?: boolean;
  };
  metrics?: {
    totalOrders?: number;
    totalCustomers?: number;
    averageResponseTime?: string;
    fulfillmentRate?: number;
  };
  activePromotions?: any[];
  announcements?: any[];
  searchKeywords?: string[];
  sortOrder?: number;
  lastActiveAt?: Date;
  isPubliclyVisible?: boolean;
  searchable?: boolean;
  acceptingOrders?: boolean;
  showInDirectory?: boolean;
  showContact?: boolean;
  showRatings?: boolean;
  showBusinessHours?: boolean;
  allowCustomerMessages?: boolean;
  showPromotions?: boolean;
}

// Merchant Schema
const MerchantSchema = new Schema<IMerchant>({
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessAddress: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessLicense: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  logo: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  
  // Additional optional fields
  displayName: String,
  tagline: String,
  coverImage: String,
  galleryImages: [String],
  brandColors: {
    primary: String,
    secondary: String,
    accent: String
  },
  address: Schema.Types.Mixed,
  contact: Schema.Types.Mixed,
  socialMedia: Schema.Types.Mixed,
  businessHours: Schema.Types.Mixed,
  deliveryOptions: Schema.Types.Mixed,
  paymentMethods: Schema.Types.Mixed,
  policies: Schema.Types.Mixed,
  ratings: Schema.Types.Mixed,
  status: String,
  isFeatured: { type: Boolean, default: false },
  categories: [String],
  tags: [String],
  
  // Additional fields needed by merchant-profile route
  timezone: String,
  serviceArea: Schema.Types.Mixed,
  features: [String],
  reviewSummary: Schema.Types.Mixed,
  verification: {
    isVerified: { type: Boolean, default: false }
  },
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    averageResponseTime: { type: String, default: '< 1 hour' },
    fulfillmentRate: { type: Number, default: 95 }
  },
  activePromotions: [Schema.Types.Mixed],
  announcements: [Schema.Types.Mixed],
  searchKeywords: [String],
  sortOrder: { type: Number, default: 0 },
  lastActiveAt: Date,
  isPubliclyVisible: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  acceptingOrders: { type: Boolean, default: true },
  showInDirectory: { type: Boolean, default: true },
  showContact: { type: Boolean, default: true },
  showRatings: { type: Boolean, default: true },
  showBusinessHours: { type: Boolean, default: true },
  allowCustomerMessages: { type: Boolean, default: true },
  showPromotions: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: Partial<Record<string, any>>) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Indexes
// Note: email index is automatically created due to unique: true in schema
MerchantSchema.index({ verificationStatus: 1 });
MerchantSchema.index({ isActive: 1 });
MerchantSchema.index({ 'businessAddress.city': 1 });
MerchantSchema.index({ 'businessAddress.state': 1 });

// Add static methods before creating the model
MerchantSchema.statics.update = async function(id: string, updates: any) {
  return await this.findByIdAndUpdate(id, updates, { new: true });
};

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);

// Export MerchantModel for backward compatibility
export { Merchant as MerchantModel };
