"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayConfig = void 0;
exports.validateRazorpayConfig = validateRazorpayConfig;
exports.razorpayConfig = {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    // Currency
    currency: 'INR',
    // Receipt prefix for order tracking
    receiptPrefix: 'order_rcpt_',
    // Payment methods to enable
    enabledPaymentMethods: {
        card: true,
        netbanking: true,
        upi: true,
        wallet: true,
        emi: false, // Disable EMI for now
    },
    // Checkout options
    checkout: {
        name: 'REZ App',
        description: 'Order Payment',
        image: 'https://your-app-logo-url.com/logo.png', // Replace with actual logo
        theme: {
            color: '#8B5CF6', // Purple theme
        },
    },
    // Test mode flag
    isTestMode: process.env.NODE_ENV !== 'production',
};
// Helper to validate Razorpay configuration
function validateRazorpayConfig() {
    const { keyId, keySecret } = exports.razorpayConfig;
    if (!keyId || keyId === 'rzp_test_dummy_key') {
        console.warn('⚠️  [RAZORPAY] Key ID not configured. Add RAZORPAY_KEY_ID to .env');
        return false;
    }
    if (!keySecret || keySecret === 'dummy_secret') {
        console.warn('⚠️  [RAZORPAY] Key Secret not configured. Add RAZORPAY_KEY_SECRET to .env');
        return false;
    }
    console.log('✅ [RAZORPAY] Configuration validated');
    console.log(`🔧 [RAZORPAY] Mode: ${exports.razorpayConfig.isTestMode ? 'TEST' : 'PRODUCTION'}`);
    return true;
}
