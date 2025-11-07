import { Types } from 'mongoose';
interface ReferralMetrics {
    totalReferrals: number;
    qualifiedReferrals: number;
    conversionRate: number;
    averageTimeToQualification: number;
    topReferrers: any[];
    sourceBreakdown: Record<string, number>;
    viralCoefficient: number;
    customerAcquisitionCost: number;
    lifetimeValuePerReferral: number;
}
export declare class ReferralAnalyticsService {
    /**
     * Get comprehensive referral metrics
     */
    getMetrics(startDate?: Date, endDate?: Date): Promise<ReferralMetrics>;
    /**
     * Get leaderboard of top referrers
     */
    getLeaderboard(limit?: number): Promise<any[]>;
    /**
     * Get user's rank in leaderboard
     */
    getUserRank(userId: string | Types.ObjectId): Promise<{
        rank: any;
        totalReferrals: number;
    }>;
    /**
     * Track referral attribution
     */
    trackAttribution(referralId: string | Types.ObjectId, event: string, metadata?: any): Promise<import("mongoose").Document<unknown, {}, import("../models/Referral").IReferral, {}, {}> & import("../models/Referral").IReferral & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    /**
     * Get referral conversion funnel
     */
    getConversionFunnel(dateFilter?: any): Promise<{
        stages: {
            name: string;
            count: number;
            percentage: number;
        }[];
        overallConversion: number;
    }>;
    /**
     * Get referral source performance
     */
    getSourcePerformance(dateFilter?: any): Promise<any[]>;
    /**
     * Calculate viral coefficient (K-factor)
     */
    private calculateViralCoefficient;
    /**
     * Calculate Customer Acquisition Cost
     */
    private calculateCAC;
    /**
     * Calculate Lifetime Value per referred customer
     */
    private calculateLTV;
    /**
     * Helper: Get total referrals
     */
    private getTotalReferrals;
    /**
     * Helper: Get qualified referrals
     */
    private getQualifiedReferrals;
    /**
     * Helper: Get top referrers
     */
    private getTopReferrers;
    /**
     * Helper: Get source breakdown
     */
    private getSourceBreakdown;
    /**
     * Helper: Get average time to qualification
     */
    private getAverageTimeToQualification;
    /**
     * Helper: Get date filter
     */
    private getDateFilter;
}
declare const _default: ReferralAnalyticsService;
export default _default;
