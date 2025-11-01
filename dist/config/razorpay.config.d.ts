/**
 * Razorpay Payment Gateway Configuration
 *
 * To get your keys:
 * 1. Sign up at https://razorpay.com
 * 2. Go to Dashboard → Settings → API Keys
 * 3. Generate Test Keys (for development)
 * 4. Generate Live Keys (for production)
 *
 * Add to your .env file:
 * RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
 * RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
 */
export declare const razorpayConfig: {
    keyId: any;
    keySecret: any;
    currency: string;
    receiptPrefix: string;
    enabledPaymentMethods: {
        card: boolean;
        netbanking: boolean;
        upi: boolean;
        wallet: boolean;
        emi: boolean;
    };
    checkout: {
        name: string;
        description: string;
        image: string;
        theme: {
            color: string;
        };
    };
    isTestMode: boolean;
};
export declare function validateRazorpayConfig(): boolean;
