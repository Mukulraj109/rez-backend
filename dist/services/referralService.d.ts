import { Types } from 'mongoose';
import { ReferralStatus, IReferral } from '../models/Referral';
interface CreateReferralParams {
    referrerId: Types.ObjectId;
    refereeId: Types.ObjectId;
    referralCode: string;
    shareMethod?: string;
    signupSource?: string;
}
interface ProcessFirstOrderParams {
    refereeId: Types.ObjectId;
    orderId: Types.ObjectId;
    orderAmount: number;
}
interface ReferralStats {
    totalReferrals: number;
    activeReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
    milestoneEarnings: number;
    referralBonus: number;
}
interface ReferralHistoryItem {
    _id: any;
    referee: {
        _id: any;
        name: string;
        phone: string;
    };
    status: ReferralStatus;
    rewards: {
        referrerAmount: number;
        milestoneBonus?: number;
    };
    referrerRewarded: boolean;
    milestoneRewarded: boolean;
    createdAt: Date;
    completedAt?: Date;
    metadata: any;
}
declare class ReferralService {
    /**
     * Create a new referral relationship when user signs up with referral code
     */
    createReferral(params: CreateReferralParams): Promise<IReferral>;
    /**
     * Process referee's first order completion
     * - Activate referral
     * - Credit referee's discount (already applied during order)
     * - Credit referrer's reward to wallet
     */
    processFirstOrder(params: ProcessFirstOrderParams): Promise<void>;
    /**
     * Process milestone bonus (after referee's 3rd order)
     */
    processMilestoneBonus(refereeId: Types.ObjectId, orderCount: number): Promise<void>;
    /**
     * Get user's referral statistics
     */
    getReferralStats(userId: Types.ObjectId): Promise<ReferralStats>;
    /**
     * Get user's referral history with referee details
     */
    getReferralHistory(userId: Types.ObjectId): Promise<ReferralHistoryItem[]>;
    /**
     * Track referral share event
     */
    trackShare(userId: Types.ObjectId, shareMethod: string): Promise<void>;
    /**
     * Validate referral code and get referrer info
     */
    validateReferralCode(code: string): Promise<{
        valid: boolean;
        referrer?: any;
    }>;
    /**
     * Update user's referral statistics in User model
     */
    private updateUserReferralStats;
    /**
     * Mark expired referrals (can be called by a cron job)
     */
    markExpiredReferrals(): Promise<number>;
}
declare const _default: ReferralService;
export default _default;
