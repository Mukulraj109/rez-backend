import { Types } from 'mongoose';
interface VoucherGenerationResult {
    success: boolean;
    voucherCode: string;
    voucherType: string;
    amount: number;
    expiresAt: Date;
    redemptionUrl?: string;
    message?: string;
}
export declare class VoucherRedemptionService {
    private providers;
    /**
     * Generate a voucher code
     */
    generateVoucher(type: string, amount: number, userId: string | Types.ObjectId): Promise<VoucherGenerationResult>;
    /**
     * Generate fallback voucher code when API is unavailable
     */
    private generateFallbackVoucher;
    /**
     * Call external voucher provider API
     */
    private callVoucherAPI;
    /**
     * Claim a voucher reward
     */
    claimVoucher(userId: string | Types.ObjectId, referralId: string | Types.ObjectId): Promise<{
        success: boolean;
        voucherCode: any;
        voucherType: any;
        description: any;
        message: string;
    }>;
    /**
     * Send voucher details via email
     */
    private sendVoucherEmail;
    /**
     * Check voucher validity
     */
    checkVoucherValidity(voucherCode: string): Promise<boolean>;
    /**
     * Get default expiry date (1 year from now)
     */
    private getDefaultExpiry;
    /**
     * Get all claimable vouchers for user
     */
    getClaimableVouchers(userId: string | Types.ObjectId): Promise<{
        referralId: any;
        voucherCode: any;
        voucherType: any;
        expiresAt: any;
        description: any;
    }[]>;
    /**
     * Get claimed vouchers history
     */
    getClaimedVouchers(userId: string | Types.ObjectId): Promise<{
        voucherCode: any;
        voucherType: any;
        expiresAt: any;
        description: any;
        referralId: any;
        createdAt: any;
    }[]>;
}
declare const _default: VoucherRedemptionService;
export default _default;
