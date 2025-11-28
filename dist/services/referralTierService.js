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
exports.ReferralTierService = void 0;
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
const referral_types_1 = require("../types/referral.types");
class ReferralTierService {
    /**
     * Get user's current referral tier
     */
    async getUserTier(userId) {
        const qualifiedReferrals = await this.getQualifiedReferralsCount(userId);
        let currentTier = 'STARTER';
        const tiers = Object.keys(referral_types_1.REFERRAL_TIERS).reverse(); // Start from highest tier
        for (const tier of tiers) {
            if (qualifiedReferrals >= referral_types_1.REFERRAL_TIERS[tier].referralsRequired) {
                currentTier = tier;
                break;
            }
        }
        return {
            current: currentTier,
            data: referral_types_1.REFERRAL_TIERS[currentTier],
            qualifiedReferrals
        };
    }
    /**
     * Calculate progress to next tier
     */
    async calculateProgress(userId) {
        const { current, qualifiedReferrals } = await this.getUserTier(userId);
        const tiers = Object.keys(referral_types_1.REFERRAL_TIERS);
        const currentIndex = tiers.indexOf(current);
        if (currentIndex === tiers.length - 1) {
            return {
                currentTier: current,
                nextTier: null,
                progress: 100,
                referralsNeeded: 0,
                qualifiedReferrals
            };
        }
        const nextTier = tiers[currentIndex + 1];
        const nextTierData = referral_types_1.REFERRAL_TIERS[nextTier];
        const currentTierData = referral_types_1.REFERRAL_TIERS[current];
        const referralsNeeded = nextTierData.referralsRequired - qualifiedReferrals;
        const progress = ((qualifiedReferrals - currentTierData.referralsRequired) /
            (nextTierData.referralsRequired - currentTierData.referralsRequired)) * 100;
        return {
            currentTier: current,
            nextTier,
            nextTierData,
            progress: Math.min(100, Math.max(0, progress)),
            referralsNeeded,
            qualifiedReferrals
        };
    }
    /**
     * Check if user qualified for tier upgrade
     */
    async checkTierUpgrade(userId) {
        const user = await User_1.User.findById(userId);
        if (!user)
            throw new Error('User not found');
        const currentStoredTier = user.referralTier || 'STARTER';
        const { current: actualTier, qualifiedReferrals } = await this.getUserTier(userId);
        if (currentStoredTier !== actualTier) {
            // Tier upgrade detected!
            return {
                upgraded: true,
                oldTier: currentStoredTier,
                newTier: actualTier,
                qualifiedReferrals
            };
        }
        return {
            upgraded: false,
            currentTier: actualTier,
            qualifiedReferrals
        };
    }
    /**
     * Award tier upgrade rewards
     */
    async awardTierRewards(userId, newTier) {
        const user = await User_1.User.findById(userId);
        if (!user)
            throw new Error('User not found');
        const tierData = referral_types_1.REFERRAL_TIERS[newTier];
        const rewards = [];
        // Award tier bonus coins
        if (tierData.rewards.tierBonus) {
            user.walletBalance = (user.walletBalance || 0) + tierData.rewards.tierBonus;
            rewards.push({
                type: 'coins',
                amount: tierData.rewards.tierBonus,
                claimed: true,
                claimedAt: new Date(),
                description: `${tierData.name} tier bonus`
            });
        }
        // Award voucher
        if (tierData.rewards.voucher) {
            const voucherCode = await this.generateVoucherCode(tierData.rewards.voucher.type, tierData.rewards.voucher.amount);
            rewards.push({
                type: 'voucher',
                amount: tierData.rewards.voucher.amount,
                voucherCode,
                voucherType: tierData.rewards.voucher.type,
                claimed: false,
                description: `${tierData.rewards.voucher.type} ₹${tierData.rewards.voucher.amount} voucher`
            });
        }
        // Award lifetime premium
        if (tierData.rewards.lifetimePremium) {
            user.isPremium = true;
            user.premiumExpiresAt = new Date('2099-12-31'); // Lifetime
            rewards.push({
                type: 'premium',
                claimed: true,
                claimedAt: new Date(),
                description: 'Lifetime Premium Membership'
            });
        }
        // Update user tier
        user.referralTier = newTier;
        await user.save();
        return {
            rewards,
            newTier,
            tierData
        };
    }
    /**
     * Get upcoming milestones for user
     */
    async getUpcomingMilestones(userId) {
        const { current, qualifiedReferrals } = await this.getUserTier(userId);
        const tiers = Object.keys(referral_types_1.REFERRAL_TIERS);
        const currentIndex = tiers.indexOf(current);
        const milestones = [];
        for (let i = currentIndex + 1; i < tiers.length; i++) {
            const tier = tiers[i];
            const tierData = referral_types_1.REFERRAL_TIERS[tier];
            milestones.push({
                tier,
                name: tierData.name,
                referralsRequired: tierData.referralsRequired,
                referralsRemaining: tierData.referralsRequired - qualifiedReferrals,
                rewards: tierData.rewards
            });
        }
        return milestones;
    }
    /**
     * Get count of qualified referrals
     */
    async getQualifiedReferralsCount(userId) {
        return await Referral_1.default.countDocuments({
            referrer: userId,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        });
    }
    /**
     * Generate voucher code (integrate with voucher provider)
     */
    async generateVoucherCode(type, amount) {
        // TODO: Integrate with actual voucher provider API (Amazon, etc.)
        // For now, generate a placeholder code
        const prefix = type.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `${prefix}-${amount}-${random}`;
    }
    /**
     * Get referral statistics for user
     */
    async getReferralStats(userId) {
        const [totalReferrals, qualifiedReferrals, pendingReferrals, allReferrals] = await Promise.all([
            Referral_1.default.countDocuments({ referrer: userId }),
            Referral_1.default.countDocuments({
                referrer: userId,
                status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
            }),
            Referral_1.default.countDocuments({
                referrer: userId,
                status: Referral_1.ReferralStatus.PENDING
            }),
            Referral_1.default.find({ referrer: userId })
        ]);
        // Calculate lifetime earnings
        const lifetimeEarnings = allReferrals.reduce((sum, ref) => {
            // rewards is an object with referrerAmount, refereeDiscount, milestoneBonus
            // Only count referrerAmount as it's what the user earns
            const earned = ref.referrerRewarded ? (ref.rewards.referrerAmount || 0) : 0;
            return sum + earned;
        }, 0);
        const { current, data } = await this.getUserTier(userId);
        const progress = await this.calculateProgress(userId);
        return {
            totalReferrals,
            qualifiedReferrals,
            pendingReferrals,
            lifetimeEarnings,
            currentTier: current,
            currentTierData: data,
            nextTier: progress.nextTier,
            progressToNextTier: progress.progress,
            successRate: totalReferrals > 0 ? (qualifiedReferrals / totalReferrals) * 100 : 0
        };
    }
}
exports.ReferralTierService = ReferralTierService;
exports.default = new ReferralTierService();
