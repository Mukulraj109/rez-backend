// Social Media Post Model
// Tracks user social media posts for cashback rewards

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISocialMediaPost extends Document {
  user: Types.ObjectId;
  order?: Types.ObjectId;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  cashbackAmount: number;
  cashbackPercentage: number;
  submittedAt: Date;
  reviewedAt?: Date;
  creditedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  metadata: {
    postId?: string;
    thumbnailUrl?: string;
    orderNumber?: string;
    extractedData?: any;
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  approve(reviewerId: Types.ObjectId): Promise<ISocialMediaPost>;
  reject(reviewerId: Types.ObjectId, reason: string): Promise<ISocialMediaPost>;
  creditCashback(): Promise<ISocialMediaPost>;
}

// Model interface with static methods
export interface ISocialMediaPostModel extends mongoose.Model<ISocialMediaPost> {
  getUserEarnings(userId: Types.ObjectId): Promise<{
    totalEarned: number;
    pendingAmount: number;
    creditedAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    postsSubmitted: number;
    postsApproved: number;
    postsRejected: number;
    postsCredited: number;
    approvalRate: number;
  }>;
}

const SocialMediaPostSchema = new Schema<ISocialMediaPost>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  platform: {
    type: String,
    required: [true, 'Platform is required'],
    enum: {
      values: ['instagram', 'facebook', 'twitter', 'tiktok'],
      message: '{VALUE} is not a valid platform'
    },
    index: true
  },
  postUrl: {
    type: String,
    required: [true, 'Post URL is required'],
    trim: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['pending', 'approved', 'rejected', 'credited'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },
  cashbackAmount: {
    type: Number,
    required: true,
    min: [0, 'Cashback amount cannot be negative'],
    default: 0
  },
  cashbackPercentage: {
    type: Number,
    required: true,
    min: [0, 'Cashback percentage cannot be negative'],
    max: [100, 'Cashback percentage cannot exceed 100'],
    default: 5
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date
  },
  creditedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  metadata: {
    postId: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    orderNumber: {
      type: String,
      trim: true
    },
    extractedData: {
      type: Schema.Types.Mixed
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SocialMediaPostSchema.index({ user: 1, createdAt: -1 });
SocialMediaPostSchema.index({ user: 1, status: 1 });
SocialMediaPostSchema.index({ status: 1, submittedAt: 1 });
SocialMediaPostSchema.index({ platform: 1, status: 1 });

// Pre-save middleware
SocialMediaPostSchema.pre('save', function(next) {
  // Extract post ID from URL based on platform
  if (this.isModified('postUrl')) {
    const url = this.postUrl;
    let postId = null;

    switch (this.platform) {
      case 'instagram':
        const instaMatch = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
        postId = instaMatch ? instaMatch[1] : null;
        break;
      case 'facebook':
        const fbMatch = url.match(/facebook\.com\/.*\/posts\/([0-9]+)/);
        postId = fbMatch ? fbMatch[1] : null;
        break;
      case 'twitter':
        const twitterMatch = url.match(/twitter\.com\/.*\/status\/([0-9]+)/);
        postId = twitterMatch ? twitterMatch[1] : null;
        break;
      case 'tiktok':
        const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/([0-9]+)/);
        postId = tiktokMatch ? tiktokMatch[1] : null;
        break;
    }

    if (postId) {
      this.metadata.postId = postId;
    }
  }

  // Set reviewedAt when status changes to approved or rejected
  if (this.isModified('status')) {
    if (this.status === 'approved' || this.status === 'rejected') {
      this.reviewedAt = new Date();
    }
    if (this.status === 'credited') {
      this.creditedAt = new Date();
    }
  }

  next();
});

// Instance methods
SocialMediaPostSchema.methods.approve = async function(reviewerId: Types.ObjectId) {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  return this.save();
};

SocialMediaPostSchema.methods.reject = async function(reviewerId: Types.ObjectId, reason: string) {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

SocialMediaPostSchema.methods.creditCashback = async function() {
  this.status = 'credited';
  this.creditedAt = new Date();
  return this.save();
};

// Static methods
SocialMediaPostSchema.statics.getUserEarnings = async function(userId: Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$cashbackAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const earnings = {
    totalEarned: 0,
    pendingAmount: 0,
    creditedAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    postsSubmitted: 0,
    postsApproved: 0,
    postsRejected: 0,
    postsCredited: 0,
    approvalRate: 0
  };

  result.forEach(item => {
    earnings.totalEarned += item.total;
    earnings.postsSubmitted += item.count;

    switch (item._id) {
      case 'pending':
        earnings.pendingAmount = item.total;
        break;
      case 'approved':
        earnings.approvedAmount = item.total;
        earnings.postsApproved = item.count;
        break;
      case 'credited':
        earnings.creditedAmount = item.total;
        earnings.postsCredited = item.count;
        break;
      case 'rejected':
        earnings.rejectedAmount = item.total;
        earnings.postsRejected = item.count;
        break;
    }
  });

  // Calculate approval rate
  const totalReviewed = earnings.postsApproved + earnings.postsRejected;
  if (totalReviewed > 0) {
    earnings.approvalRate = Math.round((earnings.postsApproved / totalReviewed) * 100);
  }

  return earnings;
};

const SocialMediaPost = mongoose.model<ISocialMediaPost, ISocialMediaPostModel>('SocialMediaPost', SocialMediaPostSchema);

export default SocialMediaPost;
