interface SpinResult {
    prize: string;
    type: 'coins' | 'cashback' | 'discount' | 'voucher';
    value: number;
}
/**
 * Check if user is eligible to spin the wheel
 */
export declare function checkEligibility(userId: string): Promise<{
    eligible: boolean;
    nextAvailableAt?: Date;
    reason?: string;
}>;
/**
 * Create a new spin wheel session
 *
 * ✅ FIX: Removed cooldown check - daily limit is now checked in spinWheel endpoint
 * This function just creates a session record. Eligibility is checked by the caller.
 */
export declare function createSpinSession(userId: string): Promise<any>;
/**
 * Select a prize based on weighted probability
 */
export declare function selectPrize(): Promise<SpinResult>;
/**
 * Spin the wheel and award prize
 */
export declare function spin(sessionId: string): Promise<any>;
/**
 * Award the spin prize to user
 * Returns coupon metadata for frontend display (or null for coins)
 */
export declare function awardSpinPrize(userId: string, prize: SpinResult): Promise<any | null>;
/**
 * Get user's spin wheel history
 */
export declare function getSpinHistory(userId: string, limit?: number): Promise<any[]>;
/**
 * Get spin wheel statistics for user
 */
export declare function getSpinStats(userId: string): Promise<any>;
declare const _default: {
    checkEligibility: typeof checkEligibility;
    createSpinSession: typeof createSpinSession;
    selectPrize: typeof selectPrize;
    spin: typeof spin;
    awardSpinPrize: typeof awardSpinPrize;
    getSpinHistory: typeof getSpinHistory;
    getSpinStats: typeof getSpinStats;
};
export default _default;
