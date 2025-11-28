export interface SMSOptions {
    to: string;
    message: string;
}
export declare class SMSService {
    /**
     * Send SMS
     */
    static send(options: SMSOptions): Promise<void>;
    /**
     * Send OTP for merchant 2FA
     */
    static sendMerchantOTP(phoneNumber: string, otp: string, merchantName: string): Promise<void>;
    /**
     * Send order confirmation to customer
     */
    static sendOrderConfirmation(phoneNumber: string, orderNumber: string, storeName: string): Promise<void>;
    /**
     * Send order status update to customer
     */
    static sendOrderStatusUpdate(phoneNumber: string, orderNumber: string, status: string, storeName: string): Promise<void>;
    /**
     * Send new order alert to merchant
     */
    static sendNewOrderAlertToMerchant(phoneNumber: string, orderNumber: string, customerName: string, total: number): Promise<void>;
    /**
     * Send low stock alert to merchant
     */
    static sendLowStockAlert(phoneNumber: string, productName: string, stock: number): Promise<void>;
    /**
     * Send high-value order alert to merchant
     */
    static sendHighValueOrderAlert(phoneNumber: string, orderNumber: string, total: number): Promise<void>;
    /**
     * Send payment received confirmation
     */
    static sendPaymentReceived(phoneNumber: string, orderNumber: string, amount: number): Promise<void>;
    /**
     * Send refund notification
     */
    static sendRefundNotification(phoneNumber: string, orderNumber: string, amount: number): Promise<void>;
    /**
     * Send refund request notification to merchant
     */
    static sendRefundRequestNotification(phoneNumber: string, orderNumber: string, refundAmount: number, refundType: string): Promise<void>;
    /**
     * Send account locked alert to merchant
     */
    static sendAccountLockedAlert(phoneNumber: string, merchantName: string, unlockTime: Date): Promise<void>;
    /**
     * Check if SMS service is configured
     */
    static isConfigured(): boolean;
    /**
     * Format phone number to E.164 format
     */
    static formatPhoneNumber(phoneNumber: string, countryCode?: string): string;
}
export default SMSService;
