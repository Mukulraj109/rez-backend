/**
 * Fraud Detection Service
 * Implements anti-fraud rules for bill uploads
 */
import { Types } from 'mongoose';
interface FraudCheckResult {
    isFraudulent: boolean;
    fraudScore: number;
    flags: string[];
    warnings: string[];
}
interface BillData {
    userId: Types.ObjectId;
    merchantId: Types.ObjectId;
    amount: number;
    billDate: Date;
    billNumber?: string;
    imageUrl: string;
    imageHash?: string;
}
declare class FraudDetectionService {
    /**
     * Run all fraud checks on a bill
     */
    checkBillFraud(billData: BillData): Promise<FraudCheckResult>;
    /**
     * Check for duplicate bills (same bill submitted multiple times)
     */
    private checkDuplicateBill;
    /**
     * Check for duplicate image (same image uploaded multiple times)
     */
    private checkDuplicateImage;
    /**
     * Check upload frequency (too many bills in short time)
     */
    private checkUploadFrequency;
    /**
     * Check for suspicious amounts
     */
    private checkAmountSuspicion;
    /**
     * Check bill age (too old or future dated)
     */
    private checkBillAge;
    /**
     * Check for multiple merchants in short time (velocity fraud)
     */
    private checkMultipleMerchants;
    /**
     * Generate image hash for duplicate detection
     */
    generateImageHash(imageBuffer: Buffer): string;
    /**
     * Check if bill number exists for different user (cross-user fraud)
     */
    checkCrossUserDuplicate(billNumber: string, merchantId: Types.ObjectId, excludeUserId: Types.ObjectId): Promise<boolean>;
    /**
     * Get user's fraud history
     */
    getUserFraudHistory(userId: Types.ObjectId): Promise<{
        totalFlagged: number;
        totalRejected: number;
        avgFraudScore: number;
        recentFlags: string[];
    }>;
}
export declare const fraudDetectionService: FraudDetectionService;
export default fraudDetectionService;
