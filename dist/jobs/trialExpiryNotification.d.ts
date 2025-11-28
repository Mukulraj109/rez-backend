/**
 * Initialize trial expiry notification job
 * Runs daily at 9:00 AM
 */
export declare const initializeTrialExpiryJob: () => void;
/**
 * Manual trigger for testing
 */
export declare const triggerTrialExpiryCheck: () => Promise<void>;
declare const _default: {
    initializeTrialExpiryJob: () => void;
    triggerTrialExpiryCheck: () => Promise<void>;
    checkExpiringTrials: () => Promise<void>;
};
export default _default;
