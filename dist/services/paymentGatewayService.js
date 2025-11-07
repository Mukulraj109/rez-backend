"use strict";
// Payment Gateway Service
// Unified service for handling multiple payment gateways
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("stripe"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const Payment_1 = require("../models/Payment");
const models_1 = require("../models");
class PaymentGatewayService {
    constructor() {
        this.config = {
            stripe: {
                secretKey: process.env.STRIPE_SECRET_KEY || '',
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
            },
            razorpay: {
                keyId: process.env.RAZORPAY_KEY_ID || '',
                keySecret: process.env.RAZORPAY_KEY_SECRET || '',
                webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
            },
            paypal: {
                clientId: process.env.PAYPAL_CLIENT_ID || '',
                clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
                mode: process.env.PAYPAL_MODE || 'sandbox',
                webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
            }
        };
        // Initialize Stripe
        if (this.config.stripe.secretKey) {
            this.stripe = new stripe_1.default(this.config.stripe.secretKey);
            console.log('✅ [PAYMENT GATEWAY] Stripe initialized');
        }
        else {
            console.warn('⚠️ [PAYMENT GATEWAY] Stripe secret key not found. Stripe payments will not work.');
        }
        // Initialize Razorpay
        if (this.config.razorpay.keyId && this.config.razorpay.keySecret) {
            this.razorpay = new razorpay_1.default({
                key_id: this.config.razorpay.keyId,
                key_secret: this.config.razorpay.keySecret
            });
        }
    }
    /**
     * Initiate payment with the specified gateway
     */
    async initiatePayment(paymentData, userId) {
        console.log('💳 [PAYMENT GATEWAY] Initiating payment:', {
            gateway: paymentData.paymentMethod,
            amount: paymentData.amount,
            currency: paymentData.currency,
            userId
        });
        try {
            let response;
            switch (paymentData.paymentMethod) {
                case 'stripe':
                    response = await this.initiateStripePayment(paymentData, userId);
                    break;
                case 'razorpay':
                    response = await this.initiateRazorpayPayment(paymentData, userId);
                    break;
                case 'paypal':
                    throw new Error('PayPal integration not yet implemented');
                    break;
                default:
                    throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
            }
            // Save payment record to database
            await this.savePaymentRecord(response, userId, paymentData);
            console.log('✅ [PAYMENT GATEWAY] Payment initiated successfully:', response.paymentId);
            return response;
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Payment initiation failed:', error);
            throw error;
        }
    }
    /**
     * Initiate Stripe payment
     */
    async initiateStripePayment(paymentData, userId) {
        if (!this.stripe) {
            console.error('❌ [STRIPE] Stripe instance not initialized. Check STRIPE_SECRET_KEY environment variable.');
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
        }
        try {
            // Create Stripe payment intent
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(paymentData.amount * 100), // Convert to cents
                currency: paymentData.currency.toLowerCase(),
                metadata: {
                    userId,
                    paymentMethodType: paymentData.paymentMethodType,
                    ...paymentData.metadata
                },
                automatic_payment_methods: {
                    enabled: true
                }
            });
            return {
                paymentId: paymentIntent.id,
                orderId: `ORDER_${Date.now()}`,
                amount: paymentData.amount,
                currency: paymentData.currency,
                status: 'pending',
                paymentUrl: `https://checkout.stripe.com/pay/${paymentIntent.id}`,
                expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                gatewayResponse: {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                },
                gateway: 'stripe'
            };
        }
        catch (error) {
            console.error('❌ [STRIPE] Payment creation failed:', error);
            throw new Error(`Stripe payment failed: ${error.message}`);
        }
    }
    /**
     * Initiate Razorpay payment
     */
    async initiateRazorpayPayment(paymentData, userId) {
        if (!this.razorpay) {
            throw new Error('Razorpay is not configured');
        }
        try {
            const orderId = `ORDER_${Date.now()}`;
            const amount = Math.round(paymentData.amount * 100); // Convert to paise
            // Create Razorpay order
            const order = await this.razorpay.orders.create({
                amount,
                currency: paymentData.currency,
                receipt: orderId,
                notes: {
                    userId,
                    paymentMethodType: paymentData.paymentMethodType,
                    ...paymentData.metadata
                }
            });
            // Generate payment URL based on payment method type
            let paymentUrl;
            let qrCode;
            let upiId;
            if (paymentData.paymentMethodType === 'upi') {
                // For UPI, generate UPI payment URL
                upiId = 'merchant@razorpay';
                qrCode = `upi://pay?pa=${upiId}&pn=REZ&am=${paymentData.amount}&cu=${paymentData.currency}&tn=Wallet+Topup`;
                paymentUrl = `https://rzp.io/l/${order.id}`;
            }
            else {
                paymentUrl = `https://checkout.razorpay.com/v1/checkout.js?payment_id=${order.id}`;
            }
            return {
                paymentId: order.id,
                orderId,
                amount: paymentData.amount,
                currency: paymentData.currency,
                status: 'pending',
                paymentUrl,
                qrCode,
                upiId,
                expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                gatewayResponse: {
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency
                },
                gateway: 'razorpay'
            };
        }
        catch (error) {
            console.error('❌ [RAZORPAY] Payment creation failed:', error);
            throw new Error(`Razorpay payment failed: ${error.message}`);
        }
    }
    /**
     * Initiate PayPal payment (Not implemented yet)
     */
    async initiatePayPalPayment(paymentData, userId) {
        throw new Error('PayPal integration not yet implemented');
    }
    /**
     * Check payment status
     */
    async checkPaymentStatus(paymentId, gateway, userId) {
        console.log('💳 [PAYMENT GATEWAY] Checking payment status:', { paymentId, gateway, userId });
        try {
            let status;
            switch (gateway) {
                case 'stripe':
                    status = await this.checkStripePaymentStatus(paymentId);
                    break;
                case 'razorpay':
                    status = await this.checkRazorpayPaymentStatus(paymentId);
                    break;
                case 'paypal':
                    throw new Error('PayPal integration not yet implemented');
                    break;
                default:
                    throw new Error(`Unsupported payment gateway: ${gateway}`);
            }
            // Update payment record in database
            await this.updatePaymentRecord(paymentId, status, userId);
            return status;
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Status check failed:', error);
            throw error;
        }
    }
    /**
     * Check Stripe payment status
     */
    async checkStripePaymentStatus(paymentId) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
            return {
                paymentId: paymentIntent.id,
                orderId: `ORDER_${Date.now()}`,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                status: this.mapStripeStatus(paymentIntent.status),
                transactionId: paymentIntent.latest_charge,
                completedAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : undefined,
                gatewayResponse: {
                    status: paymentIntent.status,
                    id: paymentIntent.id
                },
                gateway: 'stripe'
            };
        }
        catch (error) {
            console.error('❌ [STRIPE] Status check failed:', error);
            throw error;
        }
    }
    /**
     * Check Razorpay payment status
     */
    async checkRazorpayPaymentStatus(paymentId) {
        if (!this.razorpay) {
            throw new Error('Razorpay is not configured');
        }
        try {
            const order = await this.razorpay.orders.fetch(paymentId);
            const payments = await this.razorpay.orders.fetchPayments(paymentId);
            const latestPayment = payments.items[0];
            return {
                paymentId: order.id,
                orderId: order.receipt || order.id,
                amount: Number(order.amount || 0) / 100,
                currency: order.currency.toUpperCase(),
                status: this.mapRazorpayStatus(order.status),
                transactionId: latestPayment?.id,
                completedAt: order.status === 'paid' ? new Date().toISOString() : undefined,
                gatewayResponse: {
                    status: order.status,
                    payments: payments.items
                },
                gateway: 'razorpay'
            };
        }
        catch (error) {
            console.error('❌ [RAZORPAY] Status check failed:', error);
            throw error;
        }
    }
    /**
     * Check PayPal payment status (Not implemented yet)
     */
    async checkPayPalPaymentStatus(paymentId) {
        throw new Error('PayPal integration not yet implemented');
    }
    /**
     * Handle webhook from payment gateway
     */
    async handleWebhook(gateway, payload, signature) {
        console.log('🔔 [PAYMENT GATEWAY] Webhook received:', { gateway, signature });
        try {
            let isValid = false;
            switch (gateway) {
                case 'stripe':
                    isValid = await this.verifyStripeWebhook(payload, signature);
                    break;
                case 'razorpay':
                    isValid = await this.verifyRazorpayWebhook(payload, signature);
                    break;
                case 'paypal':
                    isValid = await this.verifyPayPalWebhook(payload, signature);
                    break;
                default:
                    throw new Error(`Unsupported payment gateway: ${gateway}`);
            }
            if (!isValid) {
                throw new Error('Invalid webhook signature');
            }
            // Process webhook based on gateway
            await this.processWebhook(gateway, payload);
            return { success: true, message: 'Webhook processed successfully' };
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Webhook processing failed:', error);
            return { success: false, message: error.message };
        }
    }
    /**
     * Verify Stripe webhook signature
     */
    async verifyStripeWebhook(payload, signature) {
        if (!this.config.stripe.webhookSecret) {
            return false;
        }
        try {
            const event = this.stripe.webhooks.constructEvent(payload, signature, this.config.stripe.webhookSecret);
            return !!event;
        }
        catch (error) {
            console.error('❌ [STRIPE] Webhook verification failed:', error);
            return false;
        }
    }
    /**
     * Verify Razorpay webhook signature
     */
    async verifyRazorpayWebhook(payload, signature) {
        if (!this.config.razorpay.webhookSecret) {
            return false;
        }
        try {
            const expectedSignature = crypto_1.default
                .createHmac('sha256', this.config.razorpay.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');
            return signature === expectedSignature;
        }
        catch (error) {
            console.error('❌ [RAZORPAY] Webhook verification failed:', error);
            return false;
        }
    }
    /**
     * Verify PayPal webhook signature (Not implemented yet)
     */
    async verifyPayPalWebhook(payload, signature) {
        return false; // Not implemented yet
    }
    /**
     * Process webhook payload
     */
    async processWebhook(gateway, payload) {
        console.log('🔄 [PAYMENT GATEWAY] Processing webhook:', { gateway, eventType: payload.type });
        switch (gateway) {
            case 'stripe':
                await this.processStripeWebhook(payload);
                break;
            case 'razorpay':
                await this.processRazorpayWebhook(payload);
                break;
            case 'paypal':
                await this.processPayPalWebhook(payload);
                break;
        }
    }
    /**
     * Process Stripe webhook
     */
    async processStripeWebhook(payload) {
        const event = payload;
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.updatePaymentFromWebhook(event.data.object.id, 'completed', 'stripe');
                // Update associated booking status
                await this.updateBookingStatusFromPayment(event.data.object.id, 'confirmed');
                break;
            case 'payment_intent.payment_failed':
                await this.updatePaymentFromWebhook(event.data.object.id, 'failed', 'stripe');
                break;
        }
    }
    /**
     * Process Razorpay webhook
     */
    async processRazorpayWebhook(payload) {
        const event = payload.event;
        switch (event) {
            case 'payment.captured':
                await this.updatePaymentFromWebhook(payload.payload.payment.entity.order_id, 'completed', 'razorpay');
                break;
            case 'payment.failed':
                await this.updatePaymentFromWebhook(payload.payload.payment.entity.order_id, 'failed', 'razorpay');
                break;
        }
    }
    /**
     * Process PayPal webhook
     */
    async processPayPalWebhook(payload) {
        const eventType = payload.event_type;
        switch (eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await this.updatePaymentFromWebhook(payload.resource.id, 'completed', 'paypal');
                break;
            case 'PAYMENT.CAPTURE.DENIED':
                await this.updatePaymentFromWebhook(payload.resource.id, 'failed', 'paypal');
                break;
        }
    }
    /**
     * Update payment record from webhook
     */
    async updatePaymentFromWebhook(paymentId, status, gateway) {
        try {
            const payment = await Payment_1.Payment.findOne({ paymentId });
            if (payment) {
                payment.status = status;
                if (status === 'completed') {
                    payment.completedAt = new Date();
                }
                await payment.save();
                console.log('✅ [PAYMENT GATEWAY] Payment updated from webhook:', paymentId);
            }
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Failed to update payment from webhook:', error);
        }
    }
    /**
     * Update booking status from payment intent
     */
    async updateBookingStatusFromPayment(paymentIntentId, bookingStatus) {
        try {
            // Find payment by payment intent ID
            // The paymentId is set to paymentIntent.id when creating the payment
            const payment = await Payment_1.Payment.findOne({
                $or: [
                    { paymentId: paymentIntentId },
                    { 'gatewayResponse.paymentIntentId': paymentIntentId },
                    { 'gatewayResponse.transactionId': paymentIntentId }
                ]
            });
            if (!payment) {
                console.warn('⚠️ [PAYMENT GATEWAY] Payment not found for payment intent:', paymentIntentId);
                return;
            }
            // Get booking ID from payment metadata
            const bookingId = payment.metadata?.bookingId;
            if (!bookingId) {
                console.warn('⚠️ [PAYMENT GATEWAY] Booking ID not found in payment metadata');
                return;
            }
            // Update booking status
            const booking = await models_1.EventBooking.findById(bookingId);
            if (booking) {
                booking.status = bookingStatus;
                await booking.save();
                console.log('✅ [PAYMENT GATEWAY] Booking status updated:', {
                    bookingId,
                    status: bookingStatus,
                    paymentIntentId
                });
            }
            else {
                console.warn('⚠️ [PAYMENT GATEWAY] Booking not found:', bookingId);
            }
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Failed to update booking status from payment:', error);
        }
    }
    /**
     * Save payment record to database
     */
    async savePaymentRecord(response, userId, paymentData) {
        try {
            const payment = new Payment_1.Payment({
                paymentId: response.paymentId,
                orderId: response.orderId,
                user: userId,
                amount: response.amount,
                currency: response.currency,
                paymentMethod: response.gateway,
                status: response.status,
                userDetails: paymentData.userDetails,
                metadata: paymentData.metadata || {},
                gatewayResponse: response.gatewayResponse,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });
            await payment.save();
            console.log('💾 [PAYMENT GATEWAY] Payment record saved:', payment._id);
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Failed to save payment record:', error);
            throw error;
        }
    }
    /**
     * Update payment record in database
     */
    async updatePaymentRecord(paymentId, response, userId) {
        try {
            const payment = await Payment_1.Payment.findOne({ paymentId, user: userId });
            if (payment) {
                payment.status = response.status;
                payment.gatewayResponse = response.gatewayResponse;
                if (response.completedAt) {
                    payment.completedAt = new Date(response.completedAt);
                }
                await payment.save();
                console.log('✅ [PAYMENT GATEWAY] Payment record updated:', paymentId);
            }
        }
        catch (error) {
            console.error('❌ [PAYMENT GATEWAY] Failed to update payment record:', error);
        }
    }
    /**
     * Map Stripe status to our status
     */
    mapStripeStatus(status) {
        switch (status) {
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
                return 'pending';
            case 'processing':
                return 'processing';
            case 'succeeded':
                return 'completed';
            case 'canceled':
                return 'cancelled';
            default:
                return 'failed';
        }
    }
    /**
     * Map Razorpay status to our status
     */
    mapRazorpayStatus(status) {
        switch (status) {
            case 'created':
                return 'pending';
            case 'attempted':
                return 'processing';
            case 'paid':
                return 'completed';
            case 'canceled':
                return 'cancelled';
            default:
                return 'failed';
        }
    }
    /**
     * Map PayPal status to our status
     */
    mapPayPalStatus(status) {
        switch (status) {
            case 'CREATED':
            case 'SAVED':
                return 'pending';
            case 'APPROVED':
                return 'processing';
            case 'COMPLETED':
                return 'completed';
            case 'CANCELLED':
                return 'cancelled';
            default:
                return 'failed';
        }
    }
    /**
     * Get available payment methods for a gateway
     */
    getAvailablePaymentMethods(gateway) {
        switch (gateway) {
            case 'stripe':
                return ['card', 'upi', 'wallet'];
            case 'razorpay':
                return ['card', 'upi', 'wallet', 'netbanking'];
            case 'paypal':
                return ['card', 'paypal'];
            default:
                return [];
        }
    }
    /**
     * Get supported currencies for a gateway
     */
    getSupportedCurrencies(gateway) {
        switch (gateway) {
            case 'stripe':
                return ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
            case 'razorpay':
                return ['INR'];
            case 'paypal':
                return ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
            default:
                return [];
        }
    }
}
// Export singleton instance
const paymentGatewayService = new PaymentGatewayService();
exports.default = paymentGatewayService;
