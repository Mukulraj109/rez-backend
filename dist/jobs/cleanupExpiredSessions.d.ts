interface CleanupStats {
    expiredCount: number;
    deletedCount: number;
    totalProcessed: number;
    errors: Array<{
        sessionId: string;
        error: string;
    }>;
}
/**
 * Initialize and start the cleanup job
 */
export declare function startSessionCleanup(): void;
/**
 * Stop the cleanup job
 */
export declare function stopSessionCleanup(): void;
/**
 * Get cleanup job status
 */
export declare function getSessionCleanupStatus(): {
    running: boolean;
    executing: boolean;
    schedule: string;
    config: {
        expiryHours: number;
        deleteDays: number;
    };
};
/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
export declare function triggerManualSessionCleanup(): Promise<CleanupStats>;
/**
 * Initialize the job (called from server startup)
 */
export declare function initializeSessionCleanupJob(): void;
declare const _default: {
    start: typeof startSessionCleanup;
    stop: typeof stopSessionCleanup;
    getStatus: typeof getSessionCleanupStatus;
    triggerManual: typeof triggerManualSessionCleanup;
    initialize: typeof initializeSessionCleanupJob;
};
export default _default;
