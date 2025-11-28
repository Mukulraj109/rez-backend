/**
 * Bill Verification Service
 * Handles bill verification workflow with OCR and fraud detection
 */
import { Types } from 'mongoose';
import { IBill } from '../models/Bill';
interface VerificationResult {
    success: boolean;
    billId?: Types.ObjectId;
    status?: 'pending' | 'processing' | 'approved' | 'rejected';
    message?: string;
    error?: string;
    warnings?: string[];
}
declare class BillVerificationService {
    /**
     * Process and verify a newly uploaded bill
     */
    processBill(billId: Types.ObjectId, imageUrl: string, imageHash?: string): Promise<VerificationResult>;
    /**
     * Make automatic verification decision
     */
    private makeVerificationDecision;
    /**
     * Manually approve a bill (admin action)
     */
    manuallyApproveBill(billId: Types.ObjectId, adminId: Types.ObjectId, notes?: string): Promise<VerificationResult>;
    /**
     * Manually reject a bill (admin action)
     */
    manuallyRejectBill(billId: Types.ObjectId, adminId: Types.ObjectId, reason: string): Promise<VerificationResult>;
    /**
     * Get bills pending manual review
     */
    getPendingReviewBills(limit?: number, page?: number): Promise<IBill[]>;
    /**
     * Get verification statistics
     */
    getVerificationStatistics(): Promise<{
        totalBills: number;
        pendingReview: number;
        autoApproved: number;
        autoRejected: number;
        manuallyReviewed: number;
        avgProcessingTime: number;
        avgOcrConfidence: number;
    }>;
    /**
     * Reprocess a rejected bill with new image
     */
    reprocessBill(originalBillId: Types.ObjectId, newImageUrl: string, newImageHash?: string): Promise<VerificationResult>;
}
export declare const billVerificationService: BillVerificationService;
export default billVerificationService;
