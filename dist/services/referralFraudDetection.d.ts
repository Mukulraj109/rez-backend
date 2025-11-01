import { Types } from 'mongoose';
interface FraudCheckResult {
    isFraud: boolean;
    reasons: string[];
    riskScore: number;
    action: 'allow' | 'review' | 'block';
}
export declare class ReferralFraudDetection {
    private readonly RISK_THRESHOLDS;
    /**
     * Check if referral is potentially fraudulent
     */
    checkReferral(referrerId: string | Types.ObjectId, refereeId: string | Types.ObjectId, metadata: any): Promise<FraudCheckResult>;
    /**
     * Check if referee has qualified (met qualification criteria)
     */
    checkQualification(referralId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if same device or IP
     */
    private checkSameDevice;
    /**
     * Check for suspicious account patterns
     */
    private checkAccountPattern;
    /**
     * Check for rapid referrals (too many in short time)
     */
    private checkRapidReferrals;
    /**
     * Check referee account age
     */
    private checkAccountAge;
    /**
     * Check for circular referral rings (A refers B, B refers C, C refers A)
     */
    private checkCircularReferrals;
    /**
     * Check email patterns
     */
    private checkEmailPattern;
    /**
     * Mark referral as fraudulent
     */
    markAsFraud(referralId: string | Types.ObjectId, reason: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Referral").IReferral, {}, {}> & import("../models/Referral").IReferral & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    /**
     * Get fraud statistics
     */
    getFraudStats(): Promise<{
        total: number;
        blocked: number;
        underReview: number;
        fraudRate: number;
    }>;
    /**
     * Run fraud detection on existing referrals
     */
    scanExistingReferrals(): Promise<({
        referralId: unknown;
        action: string;
        reasons: string[];
        riskScore?: undefined;
    } | {
        referralId: unknown;
        action: string;
        riskScore: number;
        reasons: string[];
    })[]>;
}
declare const _default: ReferralFraudDetection;
export default _default;
