"use strict";
// Referral Service
// Business logic for referral program
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const Wallet_1 = require("../models/Wallet");
const activityService_1 = __importDefault(require("./activityService"));
class ReferralService {
    /**
     * Create a new referral relationship when user signs up with referral code
     */
    async createReferral(params) {
        const { referrerId, refereeId, referralCode, shareMethod, signupSource } = params;
        // Check if referral already exists
        const existingReferral = await Referral_1.default.findOne({
            referee: refereeId,
        });
        if (existingReferral) {
            throw new Error('User already has a referral relationship');
        }
        // Create referral document
        const referral = await Referral_1.default.create({
            referrer: referrerId,
            referee: refereeId,
            referralCode,
            status: Referral_1.ReferralStatus.PENDING,
            metadata: {
                shareMethod,
                signupSource,
                sharedAt: new Date(),
            },
        });
        // Create activity for referrer
        await activityService_1.default.referral.onReferralSignup(referrerId, referral._id, 'New user signed up with your code!');
        console.log(`✅ [REFERRAL] Created referral relationship: ${referrerId} -> ${refereeId}`);
        return referral;
    }
    /**
     * Process referee's first order completion
     * - Activate referral
     * - Credit referee's discount (already applied during order)
     * - Credit referrer's reward to wallet
     */
    async processFirstOrder(params) {
        const { refereeId, orderId, orderAmount } = params;
        // Find pending referral for this referee
        const referral = await Referral_1.default.findOne({
            referee: refereeId,
            status: Referral_1.ReferralStatus.PENDING,
        }).populate('referrer', 'phoneNumber profile.firstName');
        if (!referral) {
            console.log(`ℹ️ [REFERRAL] No pending referral found for referee ${refereeId}`);
            return;
        }
        // Update referral status to ACTIVE
        referral.status = Referral_1.ReferralStatus.ACTIVE;
        referral.metadata.refereeFirstOrder = {
            orderId,
            amount: orderAmount,
            completedAt: new Date(),
        };
        // Mark referee as rewarded (discount was applied during order)
        referral.refereeRewarded = true;
        // Credit referrer's reward if not already done
        if (!referral.referrerRewarded) {
            const referrerWallet = await Wallet_1.Wallet.findOne({ user: referral.referrer });
            const rewards = referral.rewards;
            if (referrerWallet) {
                // Add reward amount to wallet
                referrerWallet.balance.total += rewards.referrerAmount || 0;
                referrerWallet.balance.available += rewards.referrerAmount || 0;
                referrerWallet.statistics.totalEarned += rewards.referrerAmount || 0;
                await referrerWallet.save();
                // Create transaction record
                await Transaction_1.Transaction.create({
                    user: referral.referrer,
                    type: 'credit',
                    amount: rewards.referrerAmount || 0,
                    description: 'Referral reward - Friend completed first order',
                    status: 'success',
                    source: {
                        type: 'referral',
                        referralInfo: {
                            referredUser: refereeId,
                            level: 'first_order',
                        },
                    },
                });
                // Create activity for referrer
                await activityService_1.default.referral.onReferralCompleted(referral.referrer, referral._id, `Friend completed first order! ₹${rewards.referrerAmount || 0} earned`);
                referral.referrerRewarded = true;
            }
        }
        // Check if this completes the referral (both rewarded)
        if (referral.referrerRewarded && referral.refereeRewarded) {
            referral.status = Referral_1.ReferralStatus.COMPLETED;
            referral.completedAt = new Date();
        }
        await referral.save();
        // Update user referral stats
        await this.updateUserReferralStats(referral.referrer);
        console.log(`✅ [REFERRAL] Processed first order for referral ${referral._id}`);
    }
    /**
     * Process milestone bonus (after referee's 3rd order)
     */
    async processMilestoneBonus(refereeId, orderCount) {
        // Only trigger on 3rd order
        if (orderCount !== 3) {
            return;
        }
        const referral = await Referral_1.default.findOne({
            referee: refereeId,
            status: { $in: [Referral_1.ReferralStatus.ACTIVE, Referral_1.ReferralStatus.COMPLETED] },
            milestoneRewarded: false,
        });
        if (!referral) {
            console.log(`ℹ️ [REFERRAL] No active referral found for milestone bonus`);
            return;
        }
        const rewards = referral.rewards;
        const bonusAmount = rewards.milestoneBonus || 20;
        // Credit bonus to referrer's wallet
        const referrerWallet = await Wallet_1.Wallet.findOne({ user: referral.referrer });
        if (referrerWallet) {
            referrerWallet.balance.total += bonusAmount;
            referrerWallet.balance.available += bonusAmount;
            referrerWallet.statistics.totalEarned += bonusAmount;
            await referrerWallet.save();
            // Create transaction record
            await Transaction_1.Transaction.create({
                user: referral.referrer,
                type: 'credit',
                amount: bonusAmount,
                description: 'Referral milestone bonus - Friend completed 3 orders',
                status: 'success',
                source: {
                    type: 'referral',
                    referralInfo: {
                        referredUser: refereeId,
                        level: 'milestone_3',
                    },
                },
            });
            // Create activity for milestone
            await activityService_1.default.referral.onReferralCompleted(referral.referrer, referral._id, `Milestone achieved! ₹${bonusAmount} bonus earned`);
            referral.milestoneRewarded = true;
            referral.metadata.milestoneOrders = {
                count: orderCount,
                totalAmount: referral.metadata.milestoneOrders?.totalAmount || 0,
                lastOrderAt: new Date(),
            };
            await referral.save();
            // Update user referral stats
            await this.updateUserReferralStats(referral.referrer);
            console.log(`✅ [REFERRAL] Processed milestone bonus for referral ${referral._id}`);
        }
    }
    /**
     * Get user's referral statistics
     */
    async getReferralStats(userId) {
        const referrals = await Referral_1.default.find({ referrer: userId });
        const stats = referrals.reduce((acc, ref) => {
            acc.totalReferrals++;
            const rewards = ref.rewards;
            if (ref.status === Referral_1.ReferralStatus.PENDING)
                acc.pendingReferrals++;
            if (ref.status === Referral_1.ReferralStatus.ACTIVE)
                acc.activeReferrals++;
            if (ref.status === Referral_1.ReferralStatus.COMPLETED)
                acc.completedReferrals++;
            if (ref.referrerRewarded) {
                acc.totalEarnings += rewards.referrerAmount || 0;
            }
            else if (ref.status !== Referral_1.ReferralStatus.EXPIRED) {
                acc.pendingEarnings += rewards.referrerAmount || 0;
            }
            if (ref.milestoneRewarded) {
                acc.milestoneEarnings += rewards.milestoneBonus || 0;
                acc.totalEarnings += rewards.milestoneBonus || 0;
            }
            return acc;
        }, {
            totalReferrals: 0,
            activeReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            totalEarnings: 0,
            pendingEarnings: 0,
            milestoneEarnings: 0,
            referralBonus: 50, // Current referral bonus amount
        });
        return stats;
    }
    /**
     * Get user's referral history with referee details
     */
    async getReferralHistory(userId) {
        const referrals = await Referral_1.default.find({ referrer: userId })
            .populate('referee', 'phoneNumber profile.firstName')
            .sort({ createdAt: -1 })
            .lean();
        return referrals.map(ref => {
            const referee = ref.referee;
            const rewards = ref.rewards;
            return {
                _id: ref._id,
                referee: {
                    _id: referee._id,
                    name: referee.profile?.firstName || referee.phoneNumber || 'User',
                    phone: referee.phoneNumber || '',
                },
                status: ref.status,
                rewards: {
                    referrerAmount: rewards.referrerAmount || 0,
                    milestoneBonus: rewards.milestoneBonus || 0,
                },
                referrerRewarded: ref.referrerRewarded,
                milestoneRewarded: ref.milestoneRewarded,
                createdAt: ref.createdAt,
                completedAt: ref.completedAt,
                metadata: ref.metadata,
            };
        });
    }
    /**
     * Track referral share event
     */
    async trackShare(userId, shareMethod) {
        // Log share event (could be stored in a separate collection if needed)
        console.log(`📤 [REFERRAL] User ${userId} shared via ${shareMethod}`);
        // Optional: Create activity for sharing
        // await activityService.referral.onReferralShared(userId, shareMethod);
    }
    /**
     * Validate referral code and get referrer info
     */
    async validateReferralCode(code) {
        const user = await User_1.User.findOne({
            'referral.referralCode': code
        }).select('_id phoneNumber profile.firstName referral.referralCode');
        if (!user) {
            return { valid: false };
        }
        return {
            valid: true,
            referrer: {
                _id: user._id,
                name: user.profile?.firstName || user.phoneNumber,
                referralCode: user.referral?.referralCode,
            },
        };
    }
    /**
     * Update user's referral statistics in User model
     */
    async updateUserReferralStats(userId) {
        const stats = await this.getReferralStats(userId);
        await User_1.User.findByIdAndUpdate(userId, {
            $set: {
                'referral.totalReferrals': stats.totalReferrals,
                'referral.referralEarnings': stats.totalEarnings,
            },
        });
    }
    /**
     * Mark expired referrals (can be called by a cron job)
     */
    async markExpiredReferrals() {
        const result = await Referral_1.default.updateMany({
            status: { $in: [Referral_1.ReferralStatus.PENDING, Referral_1.ReferralStatus.ACTIVE] },
            expiresAt: { $lt: new Date() },
        }, {
            $set: { status: Referral_1.ReferralStatus.EXPIRED },
        });
        console.log(`⏰ [REFERRAL] Marked ${result.modifiedCount} referrals as expired`);
        return result.modifiedCount || 0;
    }
}
exports.default = new ReferralService();
