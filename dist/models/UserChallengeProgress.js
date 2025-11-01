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
const UserChallengeProgressSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    challenge: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Challenge',
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
    completed: {
        type: Boolean,
        default: false,
        index: true
    },
    completedAt: {
        type: Date
    },
    rewardsClaimed: {
        type: Boolean,
        default: false,
        index: true
    },
    claimedAt: {
        type: Date
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    },
    progressHistory: [{
            amount: {
                type: Number,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            source: String
        }]
}, {
    timestamps: true
});
// Compound indexes for efficient querying
UserChallengeProgressSchema.index({ user: 1, challenge: 1 }, { unique: true });
UserChallengeProgressSchema.index({ user: 1, completed: 1, rewardsClaimed: 1 });
UserChallengeProgressSchema.index({ challenge: 1, completed: 1 });
// Virtual for progress percentage
UserChallengeProgressSchema.virtual('progressPercentage').get(function () {
    return Math.min((this.progress / this.target) * 100, 100);
});
// Virtual for remaining progress
UserChallengeProgressSchema.virtual('remaining').get(function () {
    return Math.max(this.target - this.progress, 0);
});
// Method to update progress
UserChallengeProgressSchema.methods.addProgress = async function (amount, source) {
    this.progress += amount;
    this.lastUpdatedAt = new Date();
    if (source) {
        this.progressHistory.push({
            amount,
            timestamp: new Date(),
            source
        });
    }
    // Check if completed
    if (this.progress >= this.target && !this.completed) {
        this.completed = true;
        this.completedAt = new Date();
        // Update challenge completion count
        await mongoose_1.default.model('Challenge').findByIdAndUpdate(this.challenge, { $inc: { completionCount: 1 } });
    }
    return this.save();
};
// Method to claim rewards
UserChallengeProgressSchema.methods.claimRewards = async function () {
    if (!this.completed) {
        throw new Error('Challenge not completed yet');
    }
    if (this.rewardsClaimed) {
        throw new Error('Rewards already claimed');
    }
    this.rewardsClaimed = true;
    this.claimedAt = new Date();
    return this.save();
};
exports.default = mongoose_1.default.model('UserChallengeProgress', UserChallengeProgressSchema);
