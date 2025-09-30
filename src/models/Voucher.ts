import mongoose, { Document, Schema, Model } from 'mongoose';

// UserVoucher instance methods interface
interface IUserVoucherMethods {
  isValid(): boolean;
  markAsUsed(usageLocation?: string): Promise<any>;
}

// UserVoucher static methods interface
interface IUserVoucherModel extends Model<IUserVoucher, {}, IUserVoucherMethods> {
  updateExpiredVouchers(): Promise<any>;
  getUserActiveVouchers(userId: string): any;
}

// Voucher Brand interface (for frontend voucher page)
export interface IVoucherBrand extends Document {
  // Brand info
  name: string;
  logo: string; // Can be emoji or image URL
  backgroundColor?: string;
  logoColor?: string;
  description?: string;

  // Cashback
  cashbackRate: number; // Percentage

  // Rating
  rating?: number;
  ratingCount?: number;

  // Category
  category: string; // E.g., 'shopping', 'food', 'travel', etc.

  // Flags
  isNewlyAdded: boolean;
  isFeatured: boolean;
  isActive: boolean;

  // Available denominations
  denominations: number[]; // E.g., [100, 500, 1000, 2000]

  // Terms
  termsAndConditions: string[];

  // Analytics
  purchaseCount: number;
  viewCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// User Voucher Purchase (actual voucher instance owned by user)
export interface IUserVoucher extends Document, IUserVoucherMethods {
  // User & Brand
  user: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId; // Reference to VoucherBrand

  // Voucher details
  voucherCode: string; // Unique code for this voucher
  denomination: number; // Amount (e.g., 500)
  purchasePrice: number; // What user paid (may include discount)

  // Validity
  purchaseDate: Date;
  expiryDate: Date;
  validityDays: number; // Days from purchase

  // Status
  status: 'active' | 'used' | 'expired' | 'cancelled';
  usedDate?: Date;
  usedAt?: string; // Where it was used

  // Delivery
  deliveryMethod: 'email' | 'sms' | 'app' | 'physical';
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveredAt?: Date;

  // Payment
  paymentMethod: 'wallet' | 'card' | 'upi' | 'netbanking';
  transactionId?: string;

  // QR Code for in-store use
  qrCode?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// VoucherBrand Schema
const VoucherBrandSchema = new Schema<IVoucherBrand>(
  {
    // Brand info
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    logo: {
      type: String,
      required: true,
    },
    backgroundColor: {
      type: String,
      default: '#F3F4F6',
    },
    logoColor: {
      type: String,
      default: '#000000',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Cashback
    cashbackRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    // Rating
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Category
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Flags
    isNewlyAdded: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Denominations
    denominations: [{
      type: Number,
      min: 1,
    }],

    // Terms
    termsAndConditions: [{
      type: String,
      trim: true,
    }],

    // Analytics
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
VoucherBrandSchema.index({ category: 1, isActive: 1 });
VoucherBrandSchema.index({ isFeatured: 1, isActive: 1 });
VoucherBrandSchema.index({ isNewlyAdded: 1, isActive: 1 });
VoucherBrandSchema.index({ name: 'text', description: 'text' });

// UserVoucher Schema
const UserVoucherSchema = new Schema<IUserVoucher>(
  {
    // User & Brand
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'VoucherBrand',
      required: true,
      index: true,
    },

    // Voucher details
    voucherCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    denomination: {
      type: Number,
      required: true,
      min: 1,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Validity
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    validityDays: {
      type: Number,
      required: true,
      default: 365, // 1 year default
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    usedDate: {
      type: Date,
    },
    usedAt: {
      type: String,
    },

    // Delivery
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'app', 'physical'],
      default: 'app',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },
    deliveredAt: {
      type: Date,
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ['wallet', 'card', 'upi', 'netbanking'],
      required: true,
    },
    transactionId: {
      type: String,
      index: true,
    },

    // QR Code
    qrCode: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
UserVoucherSchema.index({ user: 1, status: 1 });
UserVoucherSchema.index({ voucherCode: 1 }, { unique: true });
UserVoucherSchema.index({ expiryDate: 1 });
UserVoucherSchema.index({ purchaseDate: 1 });

// Pre-save middleware to generate voucher code if not provided
UserVoucherSchema.pre('save', function (next) {
  if (!this.voucherCode) {
    // Generate unique voucher code: BRAND-DENOMINATION-RANDOM
    const brandPrefix = this.brand.toString().substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.voucherCode = `${brandPrefix}-${this.denomination}-${random}`;
  }

  // Set expiry date if not set
  if (!this.expiryDate && this.validityDays) {
    const expiry = new Date(this.purchaseDate);
    expiry.setDate(expiry.getDate() + this.validityDays);
    this.expiryDate = expiry;
  }

  next();
});

// Method to check if voucher is valid
UserVoucherSchema.methods.isValid = function (): boolean {
  return (
    this.status === 'active' &&
    new Date() <= this.expiryDate
  );
};

// Method to mark voucher as used
UserVoucherSchema.methods.markAsUsed = async function (usageLocation?: string) {
  this.status = 'used';
  this.usedDate = new Date();
  if (usageLocation) {
    this.usedAt = usageLocation;
  }
  return this.save();
};

// Static method to check expiry and update status
UserVoucherSchema.statics.updateExpiredVouchers = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: 'active',
      expiryDate: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
};

// Static method to get user's active vouchers
UserVoucherSchema.statics.getUserActiveVouchers = function (userId: string) {
  return this.find({
    user: userId,
    status: 'active',
    expiryDate: { $gte: new Date() },
  })
    .populate('brand', 'name logo backgroundColor cashbackRate')
    .sort({ purchaseDate: -1 });
};

const VoucherBrand = mongoose.model<IVoucherBrand>('VoucherBrand', VoucherBrandSchema);
const UserVoucher = mongoose.model<IUserVoucher, IUserVoucherModel>('UserVoucher', UserVoucherSchema);

export { VoucherBrand, UserVoucher };
export default VoucherBrand;