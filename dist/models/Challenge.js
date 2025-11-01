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
const ChallengeSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'special'],
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    requirements: {
        action: {
            type: String,
            enum: [
                'visit_stores',
                'upload_bills',
                'refer_friends',
                'spend_amount',
                'order_count',
                'review_count',
                'login_streak',
                'share_deals',
                'explore_categories',
                'add_favorites'
            ],
            required: true
        },
        target: {
            type: Number,
            required: true,
            min: 1
        },
        stores: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store'
            }],
        categories: [String],
        minAmount: Number
    },
    rewards: {
        coins: {
            type: Number,
            required: true,
            min: 0
        },
        badges: [String],
        exclusiveDeals: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Deal'
            }],
        multiplier: {
            type: Number,
            min: 1.1,
            max: 5
        }
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy',
        index: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    participantCount: {
        type: Number,
        default: 0,
        min: 0
    },
    completionCount: {
        type: Number,
        default: 0,
        min: 0
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    featured: {
        type: Boolean,
        default: false,
        index: true
    },
    maxParticipants: Number
}, {
    timestamps: true
});
// Indexes for efficient querying
ChallengeSchema.index({ type: 1, active: 1, startDate: 1, endDate: 1 });
ChallengeSchema.index({ active: 1, featured: 1, endDate: -1 });
// Virtual for completion rate
ChallengeSchema.virtual('completionRate').get(function () {
    if (this.participantCount === 0)
        return 0;
    return (this.completionCount / this.participantCount) * 100;
});
// Method to check if challenge is currently active
ChallengeSchema.methods.isActive = function () {
    const now = new Date();
    return this.active && now >= this.startDate && now <= this.endDate;
};
// Method to check if challenge has space for more participants
ChallengeSchema.methods.canJoin = function () {
    if (!this.maxParticipants)
        return true;
    return this.participantCount < this.maxParticipants;
};
exports.default = mongoose_1.default.model('Challenge', ChallengeSchema);
