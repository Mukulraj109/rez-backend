"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserAchievementSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true
});
// Compound indexes
UserAchievementSchema.index({ user: 1, achievementId: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, unlocked: 1, tier: 1 });
UserAchievementSchema.index({ user: 1, category: 1 });
// Virtual for progress percentage
UserAchievementSchema.virtual('progressPercentage').get(function () {
    return Math.min((this.progress / this.target) * 100, 100);
});
// Method to update progress
UserAchievementSchema.methods.updateProgress = async function (amount) {
    this.progress = Math.min(this.progress + amount, this.target);
    // Check if unlocked
    if (this.progress >= this.target && !this.unlocked) {
        this.unlocked = true;
        this.unlockedAt = new Date();
    }
    return this.save();
};
// Method to claim rewards
UserAchievementSchema.methods.claimRewards = async function () {
    if (!this.unlocked) {
        throw new Error('Achievement not unlocked yet');
    }
    if (this.rewardsClaimed) {
        throw new Error('Rewards already claimed');
    }
    this.rewardsClaimed = true;
    return this.save();
};
exports.default = mongoose_1.default.model('UserAchievement', UserAchievementSchema);
