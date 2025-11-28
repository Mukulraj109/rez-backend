import { IOrder } from '../models/Order';
import { IRazorpayOrder, IRazorpayPaymentVerification, IRefundResponse } from '../types/payment';
declare class PaymentService {
    /**
     * Create a Razorpay order for payment
     * @param orderId MongoDB Order ID
     * @param amount Amount in rupees
     * @param currency Currency (default: INR)
     * @returns Razorpay order details
     */
    createPaymentOrder(orderId: string, amount: number, currency?: string): Promise<IRazorpayOrder>;
    /**
     * Verify Razorpay payment signature
     * @param orderId Razorpay order ID
     * @param paymentId Razorpay payment ID
     * @param signature Razorpay signature
     * @returns true if signature is valid
     */
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
    /**
     * Handle successful payment - Update order and deduct stock
     * @param orderId MongoDB Order ID
     * @param paymentDetails Payment details from Razorpay
     */
    handlePaymentSuccess(orderId: string, paymentDetails: IRazorpayPaymentVerification): Promise<IOrder>;
    /**
     * Handle payment failure - Update order status
     * @param orderId MongoDB Order ID
     * @param reason Failure reason
     */
    handlePaymentFailure(orderId: string, reason: string): Promise<IOrder>;
    /**
     * Refund payment
     * @param orderId MongoDB Order ID
     * @param amount Amount to refund (optional - full refund if not specified)
     * @returns Refund details
     */
    refundPayment(orderId: string, amount?: number): Promise<IRefundResponse>;
    /**
     * Verify webhook signature from Razorpay
     * @param webhookBody Webhook request body
     * @param webhookSignature Webhook signature from header
     * @returns true if signature is valid
     */
    verifyWebhookSignature(webhookBody: string, webhookSignature: string): boolean;
    /**
     * Get Razorpay Key ID for frontend
     */
    getRazorpayKeyId(): string;
    /**
     * Create a payout (transfer money to beneficiary)
     */
    createPayout(options: {
        amount: number;
        currency?: string;
        accountNumber: string;
        ifscCode: string;
        beneficiaryName: string;
        purpose: string;
        reference: string;
    }): Promise<{
        success: boolean;
        payoutId?: string;
        status?: string;
        amount?: number;
        error?: string;
    }>;
    /**
     * Process cashback payout
     */
    processCashbackPayout(cashbackRequest: any, customerBankDetails: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
    }): Promise<{
        success: boolean;
        payoutId?: string;
        status?: string;
        amount?: number;
        error?: string;
    }>;
    /**
     * Get payout status
     */
    getPayoutStatus(payoutId: string): Promise<any>;
    /**
     * Cancel payout (if not yet processed)
     */
    cancelPayout(payoutId: string): Promise<any>;
    /**
     * Get account balance
     */
    getAccountBalance(): Promise<any>;
    /**
     * Check if payment service is configured
     */
    isPayoutConfigured(): boolean;
}
declare const _default: PaymentService;
export default _default;
