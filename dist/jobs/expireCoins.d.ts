interface ExpiryStats {
    usersAffected: number;
    totalCoinsExpired: number;
    transactionsCreated: number;
    notificationsSent: number;
    notificationsFailed: number;
    errors: Array<{
        userId: string;
        error: string;
    }>;
}
/**
 * Initialize and start the expiry job
 */
export declare function startCoinExpiryJob(): void;
/**
 * Stop the expiry job
 */
export declare function stopCoinExpiryJob(): void;
/**
 * Get expiry job status
 */
export declare function getCoinExpiryJobStatus(): {
    running: boolean;
    executing: boolean;
    schedule: string;
    config: {
        notificationBatchSize: number;
    };
};
/**
 * Manually trigger coin expiry (for testing or maintenance)
 */
export declare function triggerManualCoinExpiry(): Promise<ExpiryStats>;
/**
 * Preview upcoming expirations (without processing)
 */
export declare function previewUpcomingExpirations(daysAhead?: number): Promise<{
    totalCoins: number;
    usersAffected: number;
    expirationsByDate: Array<{
        date: Date;
        coins: number;
        users: number;
    }>;
}>;
/**
 * Initialize the job (called from server startup)
 */
export declare function initializeCoinExpiryJob(): void;
declare const _default: {
    start: typeof startCoinExpiryJob;
    stop: typeof stopCoinExpiryJob;
    getStatus: typeof getCoinExpiryJobStatus;
    triggerManual: typeof triggerManualCoinExpiry;
    previewUpcoming: typeof previewUpcomingExpirations;
    initialize: typeof initializeCoinExpiryJob;
};
export default _default;
