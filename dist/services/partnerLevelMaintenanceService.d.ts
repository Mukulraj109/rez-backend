declare class PartnerLevelMaintenanceService {
    private dailyCheckJob;
    private warningJob;
    /**
     * Check all partners for expired levels (daily at midnight)
     * FIXED: Issue #2 - Handles level expiry and progress reset
     */
    startDailyLevelCheck(): void;
    /**
     * Check partners nearing level expiry and send warnings
     * FIXED: Issue #5 - Sends notifications for expiring levels
     */
    startExpiryWarnings(): void;
    /**
     * Check for inactive partners and handle level maintenance
     * FIXED: Issue #4 - Basic level maintenance for inactive users
     */
    startInactivityCheck(): void;
    /**
     * Start all maintenance cron jobs
     */
    startAll(): void;
    /**
     * Stop all cron jobs (for testing or shutdown)
     */
    stopAll(): void;
    /**
     * Manual trigger for testing (runs expiry check immediately)
     */
    triggerExpiryCheckNow(): Promise<void>;
}
declare const partnerLevelMaintenanceService: PartnerLevelMaintenanceService;
export default partnerLevelMaintenanceService;
