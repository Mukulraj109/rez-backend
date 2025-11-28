"use strict";
// ScratchCard Model
// Model for managing scratch card rewards and user participation
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
exports.ScratchCard = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ScratchCardPrizeSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['discount', 'cashback', 'coin', 'voucher'],
        required: true
    },
    value: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { _id: false });
const ScratchCardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    prize: { type: ScratchCardPrizeSchema, required: true },
    isScratched: { type: Boolean, default: false },
    isClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '0s' } // TTL index for automatic cleanup
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Static method to create a new scratch card
ScratchCardSchema.statics.createScratchCard = async function (userId) {
    // Check if user is eligible
    const isEligible = await this.isEligibleForScratchCard(userId);
    if (!isEligible) {
        throw new Error('User is not eligible for scratch card');
    }
    // Available prizes
    const prizes = [
        {
            id: '1',
            type: 'discount',
            value: 10,
            title: '10% Discount',
            description: 'Get 10% off your next purchase',
            icon: 'pricetag',
            color: '#10B981',
            isActive: true
        },
        {
            id: '2',
            type: 'cashback',
            value: 50,
            title: '₹50 Cashback',
            description: 'Earn ₹50 cashback on your next order',
            icon: 'cash',
            color: '#F59E0B',
            isActive: true
        },
        {
            id: '3',
            type: 'coin',
            value: 100,
            title: '100 REZ Coins',
            description: 'Earn 100 REZ coins to your wallet',
            icon: 'diamond',
            color: '#8B5CF6',
            isActive: true
        },
        {
            id: '4',
            type: 'voucher',
            value: 200,
            title: '₹200 Voucher',
            description: 'Free ₹200 voucher for your next purchase',
            icon: 'gift',
            color: '#EF4444',
            isActive: true
        }
    ];
    // Select random prize
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
    // Create scratch card with 24-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const scratchCard = new this({
        userId,
        prize: randomPrize,
        expiresAt
    });
    return await scratchCard.save();
};
// Static method to get user's scratch cards
ScratchCardSchema.statics.getUserScratchCards = async function (userId) {
    return await this.find({
        userId,
        expiresAt: { $gt: new Date() } // Only active cards
    }).sort({ createdAt: -1 });
};
// Static method to claim prize
ScratchCardSchema.statics.claimPrize = async function (scratchCardId, userId) {
    const scratchCard = await this.findOne({
        _id: scratchCardId,
        userId,
        isScratched: true,
        isClaimed: false,
        expiresAt: { $gt: new Date() }
    });
    if (!scratchCard) {
        throw new Error('Scratch card not found or already claimed');
    }
    scratchCard.isClaimed = true;
    scratchCard.claimedAt = new Date();
    await scratchCard.save();
    return scratchCard;
};
// Static method to check eligibility
ScratchCardSchema.statics.isEligibleForScratchCard = async function (userId) {
    // Check if user has completed at least 80% of their profile
    const User = mongoose_1.default.model('User');
    const user = await User.findById(userId);
    if (!user) {
        return false;
    }
    const profile = user.profile || {};
    const totalFields = 9; // Updated to include website field
    let completedFields = 0;
    if (profile.firstName)
        completedFields++;
    if (user.email)
        completedFields++;
    if (user.phoneNumber)
        completedFields++;
    if (profile.avatar)
        completedFields++;
    if (profile.dateOfBirth)
        completedFields++;
    if (profile.gender)
        completedFields++;
    if (profile.location?.address)
        completedFields++;
    if (profile.bio)
        completedFields++;
    if (profile.website)
        completedFields++;
    const completionPercentage = (completedFields / totalFields) * 100;
    // Check if user already has an unclaimed scratch card
    const existingCard = await this.findOne({
        userId,
        isClaimed: false,
        expiresAt: { $gt: new Date() }
    });
    return completionPercentage >= 80 && !existingCard;
};
// Pre-save middleware
ScratchCardSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.ScratchCard = mongoose_1.default.model('ScratchCard', ScratchCardSchema);
exports.default = exports.ScratchCard;
