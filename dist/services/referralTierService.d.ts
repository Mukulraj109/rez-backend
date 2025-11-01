import { Types } from 'mongoose';
export declare class ReferralTierService {
    /**
     * Get user's current referral tier
     */
    getUserTier(userId: string | Types.ObjectId): Promise<{
        current: string;
        data: import("../types/referral.types").ReferralTier;
        qualifiedReferrals: any;
    }>;
    /**
     * Calculate progress to next tier
     */
    calculateProgress(userId: string | Types.ObjectId): Promise<{
        currentTier: string;
        nextTier: null;
        progress: number;
        referralsNeeded: number;
        qualifiedReferrals: any;
        nextTierData?: undefined;
    } | {
        currentTier: string;
        nextTier: string;
        nextTierData: import("../types/referral.types").ReferralTier;
        progress: number;
        referralsNeeded: number;
        qualifiedReferrals: any;
    }>;
    /**
     * Check if user qualified for tier upgrade
     */
    checkTierUpgrade(userId: string | Types.ObjectId): Promise<{
        upgraded: boolean;
        oldTier: any;
        newTier: string;
        qualifiedReferrals: any;
        currentTier?: undefined;
    } | {
        upgraded: boolean;
        currentTier: string;
        qualifiedReferrals: any;
        oldTier?: undefined;
        newTier?: undefined;
    }>;
    /**
     * Award tier upgrade rewards
     */
    awardTierRewards(userId: string | Types.ObjectId, newTier: string): Promise<{
        rewards: ({
            type: "coins";
            amount: number;
            claimed: boolean;
            claimedAt: Date;
            description: string;
            voucherCode?: undefined;
            voucherType?: undefined;
        } | {
            type: "voucher";
            amount: number;
            voucherCode: string;
            voucherType: string;
            claimed: boolean;
            description: string;
            claimedAt?: undefined;
        } | {
            type: "premium";
            claimed: boolean;
            claimedAt: Date;
            description: string;
            amount?: undefined;
            voucherCode?: undefined;
            voucherType?: undefined;
        })[];
        newTier: string;
        tierData: import("../types/referral.types").ReferralTier;
    }>;
    /**
     * Get upcoming milestones for user
     */
    getUpcomingMilestones(userId: string | Types.ObjectId): Promise<{
        tier: string;
        name: string;
        referralsRequired: number;
        referralsRemaining: number;
        rewards: {
            tierBonus?: number;
            perReferral?: number;
            voucher?: {
                type: string;
                amount: number;
            };
            lifetimePremium?: boolean;
        };
    }[]>;
    /**
     * Get count of qualified referrals
     */
    private getQualifiedReferralsCount;
    /**
     * Generate voucher code (integrate with voucher provider)
     */
    private generateVoucherCode;
    /**
     * Get referral statistics for user
     */
    getReferralStats(userId: string | Types.ObjectId): Promise<{
        totalReferrals: any;
        qualifiedReferrals: any;
        pendingReferrals: any;
        lifetimeEarnings: any;
        currentTier: string;
        currentTierData: import("../types/referral.types").ReferralTier;
        nextTier: string | null;
        progressToNextTier: number;
        successRate: number;
    }>;
}
declare const _default: ReferralTierService;
export default _default;
