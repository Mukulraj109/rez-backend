// Referral Model
// Tracks individual referral relationships and rewards

import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ReferralStatus {
  PENDING = 'pending',      // Referee signed up, no order yet
  ACTIVE = 'active',        // Referee placed first order
  COMPLETED = 'completed',  // All rewards distributed
  EXPIRED = 'expired',      // 90 days passed without completion
}

export interface IReferralReward {
  referrerAmount: number;      // Amount for referrer (₹50)
  refereeAmount: number;       // Discount for referee (₹30)
  milestoneBonus?: number;     // Bonus after milestone orders (₹20)
  totalPotential: number;      // Total possible earnings
}

export interface IReferralMetadata {
  shareMethod?: string;        // whatsapp, sms, email, copy, etc.
  sharedAt?: Date;
  signupSource?: string;       // web, mobile
  refereeFirstOrder?: {
    orderId: Types.ObjectId;
    amount: number;
    completedAt: Date;
  };
  milestoneOrders?: {
    count: number;
    totalAmount: number;
    lastOrderAt?: Date;
  };
}

export interface IReferral extends Document {
  referrer: Types.ObjectId;           // User who shared the code
  referee: Types.ObjectId;            // User who used the code
  referralCode: string;               // Code that was used
  status: ReferralStatus;
  rewards: IReferralReward;
  referrerRewarded: boolean;          // Has referrer received reward
  refereeRewarded: boolean;           // Has referee received discount
  milestoneRewarded: boolean;         // Has milestone bonus been given
  completedAt?: Date;                 // When status changed to completed
  expiresAt: Date;                    // 90 days from creation
  metadata: IReferralMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralRewardSchema = new Schema<IReferralReward>({
  referrerAmount: {
    type: Number,
    default: 50,                      // ₹50 for referrer
  },
  refereeAmount: {
    type: Number,
    default: 30,                      // ₹30 off for referee
  },
  milestoneBonus: {
    type: Number,
    default: 20,                      // ₹20 after 3rd order
  },
  totalPotential: {
    type: Number,
    default: 70,                      // ₹50 + ₹20 milestone
  },
}, { _id: false });

const ReferralMetadataSchema = new Schema<IReferralMetadata>({
  shareMethod: String,
  sharedAt: Date,
  signupSource: String,
  refereeFirstOrder: {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    amount: Number,
    completedAt: Date,
  },
  milestoneOrders: {
    count: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    lastOrderAt: Date,
  },
}, { _id: false });

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
      index: true,
    },
    rewards: {
      type: ReferralRewardSchema,
      default: () => ({
        referrerAmount: 50,
        refereeAmount: 30,
        milestoneBonus: 20,
        totalPotential: 70,
      }),
    },
    referrerRewarded: {
      type: Boolean,
      default: false,
    },
    refereeRewarded: {
      type: Boolean,
      default: false,
    },
    milestoneRewarded: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: ReferralMetadataSchema,
      default: () => ({
        milestoneOrders: {
          count: 0,
          totalAmount: 0,
        },
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referee: 1, status: 1 });
ReferralSchema.index({ status: 1, expiresAt: 1 });

// Pre-save hook to set expiration date (90 days from creation)
ReferralSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 90);
    this.expiresAt = expirationDate;
  }
  next();
});

// Instance method to check if referral is expired
ReferralSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date() && this.status !== ReferralStatus.COMPLETED;
};

// Static method to mark expired referrals
ReferralSchema.statics.markExpiredReferrals = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
      expiresAt: { $lt: now },
    },
    {
      $set: { status: ReferralStatus.EXPIRED },
    }
  );
};

const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
