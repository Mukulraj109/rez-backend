export interface EmailOptions {
    to: string | string[];
    from?: string;
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: any;
}
export declare class EmailService {
    private static readonly FROM_EMAIL;
    private static readonly FROM_NAME;
    /**
     * Send an email
     */
    static send(options: EmailOptions): Promise<void>;
    /**
     * Send password change confirmation email
     */
    static sendPasswordChangeConfirmation(merchantEmail: string, merchantName: string): Promise<void>;
    /**
     * Send welcome email to new merchant
     */
    static sendWelcomeEmail(merchantEmail: string, merchantName: string, businessName?: string): Promise<void>;
    /**
     * Send email verification (for merchants)
     */
    static sendEmailVerification(merchantEmail: string, merchantName: string, verificationToken: string): Promise<void>;
    /**
     * Send password reset email (for merchants)
     */
    static sendPasswordResetEmail(merchantEmail: string, merchantName: string, resetToken: string): Promise<void>;
    /**
     * Send low stock alert
     */
    static sendLowStockAlert(merchantEmail: string, merchantName: string, products: Array<{
        name: string;
        stock: number;
        sku: string;
    }>): Promise<void>;
    /**
     * Send order notification
     */
    static sendNewOrderNotification(merchantEmail: string, merchantName: string, orderDetails: {
        orderId: string;
        orderNumber: string;
        customerName: string;
        total: number;
        items: number;
    }): Promise<void>;
    /**
     * Send onboarding step completed email
     */
    static sendOnboardingStepCompleted(merchantEmail: string, merchantName: string, stepNumber: number, stepName: string): Promise<void>;
    /**
     * Send onboarding submitted email
     */
    static sendOnboardingSubmitted(merchantEmail: string, merchantName: string): Promise<void>;
    /**
     * Send onboarding approved email
     */
    static sendOnboardingApproved(merchantEmail: string, merchantName: string, storeId: string): Promise<void>;
    /**
     * Send onboarding rejected email
     */
    static sendOnboardingRejected(merchantEmail: string, merchantName: string, reason: string): Promise<void>;
    /**
     * Send document verification complete email
     */
    static sendDocumentVerificationComplete(merchantEmail: string, merchantName: string, approved: boolean, reason?: string): Promise<void>;
    /**
     * Send document approved email
     */
    static sendDocumentApproved(merchantEmail: string, merchantName: string, documentName: string): Promise<void>;
    /**
     * Send document rejected email
     */
    static sendDocumentRejected(merchantEmail: string, merchantName: string, documentName: string, reason: string): Promise<void>;
    /**
     * Send additional documents request email
     */
    static sendAdditionalDocumentsRequest(merchantEmail: string, merchantName: string, documentTypes: string[], message: string): Promise<void>;
    /**
     * Send admin notification about new onboarding submission
     */
    static sendAdminOnboardingNotification(adminEmail: string, businessName: string, merchantId: string): Promise<void>;
    /**
     * Send OTP to user for authentication
     */
    static sendUserOTP(userEmail: string, userName: string, otp: string, phoneNumber: string): Promise<void>;
    /**
     * Send order confirmation email to user
     */
    static sendOrderConfirmation(userEmail: string, userName: string, orderDetails: {
        orderId: string;
        orderNumber: string;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
        subtotal: number;
        deliveryFee: number;
        total: number;
        estimatedDelivery?: string;
        storeName: string;
        deliveryAddress: string;
    }): Promise<void>;
    /**
     * Send order status update email to user
     */
    static sendOrderStatusUpdate(userEmail: string, userName: string, orderDetails: {
        orderId: string;
        orderNumber: string;
        status: string;
        statusMessage: string;
        storeName: string;
        estimatedDelivery?: string;
    }): Promise<void>;
    /**
     * Send welcome email to new user
     */
    static sendUserWelcomeEmail(userEmail: string, userName: string, referralCode?: string): Promise<void>;
    /**
     * Send password reset email to user
     */
    static sendUserPasswordReset(userEmail: string, userName: string, resetToken: string): Promise<void>;
    /**
     * Send cashback earned notification
     */
    static sendCashbackNotification(userEmail: string, userName: string, cashbackDetails: {
        amount: number;
        orderNumber: string;
        storeName: string;
        totalBalance: number;
    }): Promise<void>;
    /**
     * Send referral reward notification
     */
    static sendReferralReward(userEmail: string, userName: string, rewardDetails: {
        amount: number;
        friendName: string;
        totalReferrals: number;
    }): Promise<void>;
    /**
     * Send refund confirmation email
     */
    static sendRefundConfirmation(email: string, userName: string, refundDetails: {
        orderNumber: string;
        refundAmount: number;
        refundType: 'full' | 'partial';
        refundMethod: string;
        estimatedArrival: string;
        refundId: string;
        reason?: string;
    }): Promise<void>;
    /**
     * Send refund request notification to merchant
     */
    static sendRefundRequestNotification(merchantEmail: string, storeName: string, refundDetails: {
        orderNumber: string;
        refundAmount: number;
        refundType: string;
        refundReason: string;
        customerName: string;
        refundId: string;
    }): Promise<void>;
    /**
     * Send refund request notification to admin
     */
    static sendAdminRefundRequestNotification(adminEmail: string, refundDetails: {
        orderNumber: string;
        refundAmount: number;
        refundType: string;
        refundReason: string;
        customerName: string;
        refundId: string;
    }): Promise<void>;
    /**
     * Check if email service is configured
     */
    static isConfigured(): boolean;
}
export default EmailService;
