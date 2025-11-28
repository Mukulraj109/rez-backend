import { IPartner } from '../models/Partner';
/**
 * Partner Service
 * Handles business logic for partner program
 */
declare class PartnerService {
    /**
     * Get or create partner profile for user
     */
    getOrCreatePartner(userId: string): Promise<any>;
    /**
     * Update partner progress when order is completed
     */
    updatePartnerProgress(userId: string, orderId: string): Promise<void>;
    /**
     * Claim milestone reward (with MongoDB transactions for data integrity)
     */
    claimMilestoneReward(userId: string, orderCount: number): Promise<IPartner>;
    /**
     * Claim task reward (with MongoDB transactions for data integrity)
     */
    claimTaskReward(userId: string, taskTitle: string): Promise<IPartner>;
    /**
     * Claim jackpot milestone reward (with MongoDB transactions for data integrity)
     */
    claimJackpotReward(userId: string, spendAmount: number): Promise<IPartner>;
    /**
     * Claim offer (with wallet integration)
     */
    claimOffer(userId: string, offerTitle: string): Promise<{
        partner: IPartner;
        voucherCode: string;
    }>;
    /**
     * Apply voucher to order (FIXED: Issue #4 - Order integration)
     */
    applyVoucher(userId: string, voucherCode: string, orderAmount: number): Promise<{
        valid: boolean;
        discount: number;
        offerTitle: string;
        error?: string;
    }>;
    /**
     * Mark voucher as used after order completion
     */
    markVoucherUsed(userId: string, voucherCode: string): Promise<void>;
    /**
     * Get partner statistics
     */
    getPartnerStats(userId: string): Promise<{
        totalPartners: number;
        userRank: number;
        averageOrders: number;
        topPerformers: any[];
    }>;
    /**
     * Calculate profile completion percentage from USER profile
     */
    calculateProfileCompletion(userId: string): Promise<number>;
    /**
     * Update task progress
     */
    updateTaskProgress(userId: string, taskType: string, progressValue?: number): Promise<any>;
    /**
     * Update partner when user profile is updated
     */
    syncProfileCompletion(userId: string): Promise<void>;
    /**
     * Get partner dashboard data
     */
    getPartnerDashboard(userId: string): Promise<any>;
    /**
     * Get default FAQs
     */
    private getDefaultFAQs;
    /**
     * Request payout
     */
    requestPayout(userId: string, amount: number, method: string): Promise<{
        success: boolean;
        message: string;
        payoutId: string;
    }>;
}
declare const _default: PartnerService;
export default _default;
