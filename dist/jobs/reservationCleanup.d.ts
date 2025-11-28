/**
 * Initialize and start the cleanup job
 */
export declare function startReservationCleanup(): void;
/**
 * Stop the cleanup job
 */
export declare function stopReservationCleanup(): void;
/**
 * Get cleanup job status
 */
export declare function getCleanupJobStatus(): {
    running: boolean;
    executing: boolean;
    interval: number;
};
/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
export declare function triggerManualCleanup(): Promise<void>;
declare const _default: {
    start: typeof startReservationCleanup;
    stop: typeof stopReservationCleanup;
    getStatus: typeof getCleanupJobStatus;
    triggerManual: typeof triggerManualCleanup;
};
export default _default;
