/**
 * OnboardingService
 * Handles merchant onboarding wizard workflow
 */
export declare class OnboardingService {
    /**
     * Get onboarding status and progress for a merchant
     */
    static getOnboardingStatus(merchantId: string): Promise<any>;
    /**
     * Calculate progress percentage
     */
    private static calculateProgress;
    /**
     * Save step data (auto-save)
     */
    static saveStepData(merchantId: string, stepNumber: number, data: any): Promise<any>;
    /**
     * Complete a step and move to next
     */
    static completeStep(merchantId: string, stepNumber: number): Promise<any>;
    /**
     * Go back to previous step
     */
    static previousStep(merchantId: string, stepNumber: number): Promise<any>;
    /**
     * Submit onboarding for verification
     */
    static submitForVerification(merchantId: string): Promise<any>;
    /**
     * Approve onboarding (Admin only)
     */
    static approveOnboarding(merchantId: string, adminId: string): Promise<any>;
    /**
     * Reject onboarding (Admin only)
     */
    static rejectOnboarding(merchantId: string, reason: string, adminId: string): Promise<any>;
    /**
     * Create store from onboarding data
     */
    private static createStoreFromOnboarding;
    /**
     * Generate slug from store name
     */
    private static generateSlug;
    /**
     * Validation methods
     */
    private static validateBusinessInfo;
    private static validateStoreDetails;
    private static validateBankDetails;
    private static validateVerificationDocuments;
    /**
     * Validate step completion
     */
    private static validateStepCompletion;
    /**
     * Validate all steps
     */
    private static validateAllSteps;
    /**
     * Format validation helpers
     */
    private static isValidGST;
    private static isValidPAN;
    private static isValidIFSC;
    /**
     * Send step completion email
     */
    private static sendStepCompletionEmail;
    /**
     * Notify admin about new submission
     */
    private static notifyAdminNewSubmission;
    /**
     * Get onboarding analytics (Admin)
     */
    static getOnboardingAnalytics(): Promise<any>;
    /**
     * Get step distribution
     */
    private static getStepDistribution;
    /**
     * Calculate average completion time
     */
    private static calculateAverageCompletionTime;
    /**
     * Calculate drop-off rate by step
     */
    private static calculateDropOffRate;
}
export default OnboardingService;
