import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAchievement extends Document {
  user: mongoose.Types.ObjectId;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: 'shopping' | 'social' | 'engagement' | 'special';
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: Date;
  showcased: boolean; // Display on profile
  rewardsClaimed: boolean;
  rewards: {
    coins: number;
    badge?: string;
    title?: string;
    multiplier?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    achievementId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true
    },
    category: {
      type: String,
      enum: ['shopping', 'social', 'engagement', 'special'],
      required: true,
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    unlocked: {
      type: Boolean,
      default: false,
      index: true
    },
    unlockedAt: {
      type: Date
    },
    showcased: {
      type: Boolean,
      default: false
    },
    rewardsClaimed: {
      type: Boolean,
      default: false
    },
    rewards: {
      coins: {
        type: Number,
        default: 0
      },
      badge: String,
      title: String,
      multiplier: Number
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
UserAchievementSchema.index({ user: 1, achievementId: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, unlocked: 1, tier: 1 });
UserAchievementSchema.index({ user: 1, category: 1 });

// Virtual for progress percentage
UserAchievementSchema.virtual('progressPercentage').get(function(this: IUserAchievement) {
  return Math.min((this.progress / this.target) * 100, 100);
});

// Method to update progress
UserAchievementSchema.methods.updateProgress = async function(amount: number) {
  this.progress = Math.min(this.progress + amount, this.target);

  // Check if unlocked
  if (this.progress >= this.target && !this.unlocked) {
    this.unlocked = true;
    this.unlockedAt = new Date();
  }

  return this.save();
};

// Method to claim rewards
UserAchievementSchema.methods.claimRewards = async function() {
  if (!this.unlocked) {
    throw new Error('Achievement not unlocked yet');
  }

  if (this.rewardsClaimed) {
    throw new Error('Rewards already claimed');
  }

  this.rewardsClaimed = true;

  return this.save();
};

export default mongoose.model<IUserAchievement>('UserAchievement', UserAchievementSchema);
