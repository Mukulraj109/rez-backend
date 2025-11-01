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
const UserStreakSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['login', 'order', 'review'],
        required: true,
        index: true
    },
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    longestStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    lastActivityDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    streakStartDate: {
        type: Date,
        default: Date.now
    },
    totalDays: {
        type: Number,
        default: 0,
        min: 0
    },
    milestones: [{
            day: {
                type: Number,
                required: true
            },
            rewardsClaimed: {
                type: Boolean,
                default: false
            },
            claimedAt: Date
        }],
    frozen: {
        type: Boolean,
        default: false
    },
    freezeExpiresAt: Date
}, {
    timestamps: true
});
// Compound index
UserStreakSchema.index({ user: 1, type: 1 }, { unique: true });
// Method to update streak
UserStreakSchema.methods.updateStreak = async function () {
    const now = new Date();
    const lastActivity = new Date(this.lastActivityDate);
    // Reset time to midnight for date comparison
    now.setHours(0, 0, 0, 0);
    lastActivity.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) {
        // Same day, no update needed
        return this;
    }
    else if (daysDiff === 1) {
        // Consecutive day
        this.currentStreak += 1;
        this.totalDays += 1;
        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }
    }
    else if (daysDiff > 1) {
        // Streak broken
        if (!this.frozen || now > this.freezeExpiresAt) {
            this.currentStreak = 1;
            this.streakStartDate = now;
            this.frozen = false;
            this.freezeExpiresAt = undefined;
        }
        else {
            // Freeze saved the streak
            this.currentStreak += 1;
            this.frozen = false;
            this.freezeExpiresAt = undefined;
        }
        this.totalDays += 1;
    }
    this.lastActivityDate = new Date();
    return this.save();
};
// Method to freeze streak
UserStreakSchema.methods.freezeStreak = async function (days = 1) {
    this.frozen = true;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    this.freezeExpiresAt = expiresAt;
    return this.save();
};
// Method to claim milestone reward
UserStreakSchema.methods.claimMilestone = async function (day) {
    const milestone = this.milestones.find((m) => m.day === day);
    if (!milestone) {
        throw new Error('Milestone not found');
    }
    if (milestone.rewardsClaimed) {
        throw new Error('Milestone reward already claimed');
    }
    if (this.currentStreak < day) {
        throw new Error('Milestone not reached yet');
    }
    milestone.rewardsClaimed = true;
    milestone.claimedAt = new Date();
    return this.save();
};
exports.default = mongoose_1.default.model('UserStreak', UserStreakSchema);
