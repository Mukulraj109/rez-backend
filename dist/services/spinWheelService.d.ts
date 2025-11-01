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
 */
export declare function awardSpinPrize(userId: string, prize: SpinResult): Promise<void>;
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
