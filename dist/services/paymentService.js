"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../types/razorpay-extended.d.ts" />
const razorpay_1 = __importDefault(require("razorpay"));
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const Cart_1 = require("../models/Cart");
const User_1 = require("../models/User");
const StorePromoCoin_1 = require("../models/StorePromoCoin");
const coinService_1 = __importDefault(require("./coinService"));
const mongoose_1 = __importStar(require("mongoose"));
const stockSocketService_1 = __importDefault(require("./stockSocketService"));
const SMSService_1 = require("./SMSService");
const razorpayUtils_1 = require("../utils/razorpayUtils");
const paymentLogger_1 = require("./logging/paymentLogger");
const stripeService_1 = __importDefault(require("./stripeService"));
const Wallet_1 = require("../models/Wallet");
// Initialize Razorpay instance conditionally
let razorpayInstance = null;
// Validate Razorpay configuration on startup
const configValidation = (0, razorpayUtils_1.validateRazorpayConfiguration)();
if (configValidation.isValid) {
    razorpayInstance = new razorpay_1.default({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ [PAYMENT SERVICE] Razorpay initialized successfully');
    // Log warnings if any
    if (configValidation.warnings.length > 0) {
        configValidation.warnings.forEach(warning => {
            console.warn(`⚠️ [PAYMENT SERVICE] ${warning}`);
        });
    }
}
else {
    console.error('❌ [PAYMENT SERVICE] Razorpay configuration invalid. Missing:', configValidation.missingVars.join(', '));
    console.warn('⚠️ [PAYMENT SERVICE] Payment features will be disabled');
}
class PaymentService {
    /**
     * Create a Razorpay order for payment
     * @param orderId MongoDB Order ID
     * @param amount Amount in rupees
     * @param currency Currency (default: INR)
     * @returns Razorpay order details
     */
    async createPaymentOrder(orderId, amount, currency = 'INR') {
        try {
            console.log('💳 [PAYMENT SERVICE] Creating Razorpay order:', {
                orderId,
                amount,
                currency
            });
            // Check if Razorpay is configured
            if (!razorpayInstance) {
                throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
            }
            // Fetch order to get order number
            const order = await Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }
            // Convert amount to paise (smallest currency unit)
            const amountInPaise = Math.round(amount * 100);
            const orderOptions = {
                amount: amountInPaise,
                currency: currency,
                receipt: order.orderNumber,
                notes: {
                    orderId: orderId,
                    orderNumber: order.orderNumber,
                    userId: order.user.toString()
                },
                payment_capture: 1 // Auto capture payment
            };
            // Create Razorpay order
            const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
            console.log('✅ [PAYMENT SERVICE] Razorpay order created:', razorpayOrder.id);
            // Update order with gateway details
            order.payment.paymentGateway = 'razorpay';
            await order.save();
            return razorpayOrder;
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error creating Razorpay order:', error);
            throw new Error(`Failed to create payment order: ${error.message}`);
        }
    }
    /**
     * Verify Razorpay payment signature
     * @param orderId Razorpay order ID
     * @param paymentId Razorpay payment ID
     * @param signature Razorpay signature
     * @returns true if signature is valid
     */
    verifyPaymentSignature(orderId, paymentId, signature) {
        try {
            console.log('🔐 [PAYMENT SERVICE] Verifying payment signature:', {
                orderId,
                paymentId,
                timestamp: new Date().toISOString()
            });
            // Validate that Razorpay is configured
            const secret = process.env.RAZORPAY_KEY_SECRET || '';
            if (!secret || secret === 'your_razorpay_key_secret_here') {
                console.error('❌ [PAYMENT SERVICE] Razorpay secret not configured');
                paymentLogger_1.PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, new Error('Razorpay not configured'), 'Configuration error');
                return false;
            }
            // Use the utility function for signature validation
            const validationResult = (0, razorpayUtils_1.validateRazorpayPaymentSignature)(orderId, paymentId, signature, secret);
            if (validationResult.isValid) {
                console.log('✅ [PAYMENT SERVICE] Signature verified successfully');
                paymentLogger_1.PaymentLogger.logPaymentProcessing(paymentId, 'system', 0);
            }
            else {
                console.error('❌ [PAYMENT SERVICE] Signature verification failed:', validationResult.error);
                paymentLogger_1.PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, new Error(validationResult.error || 'Invalid signature'), 'Signature verification failed');
            }
            return validationResult.isValid;
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error verifying signature:', error);
            paymentLogger_1.PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, error, 'Signature verification exception');
            return false;
        }
    }
    /**
     * Handle successful payment - Update order and deduct stock
     * @param orderId MongoDB Order ID
     * @param paymentDetails Payment details from Razorpay
     */
    async handlePaymentSuccess(orderId, paymentDetails) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            console.log('✅ [PAYMENT SERVICE] Processing successful payment for order:', orderId);
            // Log payment processing start
            paymentLogger_1.PaymentLogger.logPaymentProcessing(paymentDetails.razorpay_payment_id, orderId, 0, paymentDetails.razorpay_order_id);
            // Fetch order
            const order = await Order_1.Order.findById(orderId).session(session);
            if (!order) {
                throw new Error('Order not found');
            }
            // Check if payment already processed
            if (order.payment.status === 'paid') {
                console.log('⚠️ [PAYMENT SERVICE] Payment already processed for order:', orderId);
                await session.abortTransaction();
                session.endSession();
                return order;
            }
            // Update payment status
            order.payment.status = 'paid';
            order.payment.transactionId = paymentDetails.razorpay_payment_id;
            order.payment.paidAt = new Date();
            order.totals.paidAmount = order.totals.total;
            // Store gateway details (using custom field if needed)
            order.paymentGateway = {
                gatewayOrderId: paymentDetails.razorpay_order_id,
                gatewayPaymentId: paymentDetails.razorpay_payment_id,
                gatewaySignature: paymentDetails.razorpay_signature,
                gateway: 'razorpay',
                currency: 'INR',
                amountPaid: order.totals.total,
                paidAt: new Date()
            };
            // Add timeline entry
            order.timeline.push({
                status: 'payment_success',
                message: 'Payment completed successfully',
                timestamp: new Date()
            });
            console.log('📦 [PAYMENT SERVICE] Deducting stock for order items...');
            // Deduct stock for each item (this is where stock deduction happens)
            const stockEmissions = [];
            for (const orderItem of order.items) {
                const productId = orderItem.product;
                const quantity = orderItem.quantity;
                const variant = orderItem.variant;
                console.log('📦 [PAYMENT SERVICE] Deducting stock for:', {
                    productId,
                    quantity,
                    variant
                });
                let updateQuery = {};
                let stockCheckQuery = { _id: productId };
                if (variant) {
                    // Variant stock deduction
                    updateQuery = {
                        $inc: {
                            'inventory.variants.$[variant].stock': -quantity
                        }
                    };
                    stockCheckQuery['inventory.variants'] = {
                        $elemMatch: {
                            type: variant.type,
                            value: variant.value,
                            stock: { $gte: quantity }
                        }
                    };
                    const updatedProduct = await Product_1.Product.findOneAndUpdate(stockCheckQuery, updateQuery, {
                        session,
                        new: true,
                        arrayFilters: [
                            {
                                'variant.type': variant.type,
                                'variant.value': variant.value
                            }
                        ]
                    });
                    if (!updatedProduct) {
                        throw new Error(`Insufficient stock for product ${orderItem.name} (${variant.type}: ${variant.value})`);
                    }
                    const newStock = updatedProduct.inventory?.stock ?? 0;
                    const storeId = updatedProduct.store?.toString() || '';
                    stockEmissions.push({
                        productId: updatedProduct._id.toString(),
                        storeId,
                        newStock,
                        productName: updatedProduct.name || 'Unknown Product'
                    });
                    console.log('✅ [PAYMENT SERVICE] Variant stock deducted');
                }
                else {
                    // Main product stock deduction
                    stockCheckQuery['inventory.stock'] = { $gte: quantity };
                    updateQuery = {
                        $inc: {
                            'inventory.stock': -quantity
                        }
                    };
                    const updatedProduct = await Product_1.Product.findOneAndUpdate(stockCheckQuery, updateQuery, {
                        session,
                        new: true
                    });
                    if (!updatedProduct) {
                        throw new Error(`Insufficient stock for product ${orderItem.name}`);
                    }
                    // Set isAvailable to false if stock becomes 0
                    if (updatedProduct.inventory && updatedProduct.inventory.stock === 0) {
                        updatedProduct.inventory.isAvailable = false;
                        await updatedProduct.save({ session });
                    }
                    const newStock = updatedProduct.inventory?.stock ?? 0;
                    const storeId = updatedProduct.store?.toString() || '';
                    stockEmissions.push({
                        productId: updatedProduct._id.toString(),
                        storeId,
                        newStock,
                        productName: updatedProduct.name || 'Unknown Product'
                    });
                    console.log('✅ [PAYMENT SERVICE] Product stock deducted');
                }
            }
            // Update order status to confirmed
            order.status = 'confirmed';
            order.timeline.push({
                status: 'confirmed',
                message: 'Order confirmed after payment',
                timestamp: new Date()
            });
            await order.save({ session });
            // Clear user's cart after successful payment
            // Deduct coins if they were used in this order
            if (order.payment.coinsUsed) {
                const { wasilCoins, storePromoCoins } = order.payment.coinsUsed;
                const userId = order.user;
                // Deduct REZ coins (wasilCoins) from both Wallet model and CoinTransaction
                if (wasilCoins && wasilCoins > 0) {
                    try {
                        console.log('💰 [PAYMENT SERVICE] Deducting REZ coins:', wasilCoins);
                        // Update Wallet model (coins array)
                        const { Wallet } = require('../models/Wallet');
                        const wallet = await Wallet.findOne({ user: userId });
                        if (wallet) {
                            const wasilCoin = wallet.coins.find((c) => c.type === 'wasil');
                            if (wasilCoin && wasilCoin.amount >= wasilCoins) {
                                wasilCoin.amount -= wasilCoins;
                                wasilCoin.lastUsed = new Date();
                                wallet.balance.available = Math.max(0, wallet.balance.available - wasilCoins);
                                wallet.balance.total = Math.max(0, wallet.balance.total - wasilCoins);
                                wallet.statistics.totalSpent += wasilCoins;
                                wallet.lastTransactionAt = new Date();
                                await wallet.save();
                                console.log('✅ [PAYMENT SERVICE] Wallet wasil coins updated:', wasilCoins);
                            }
                        }
                        // Also create transaction record
                        await coinService_1.default.deductCoins(userId.toString(), wasilCoins, 'purchase', `Order payment: ${order.orderNumber}`);
                        console.log('✅ [PAYMENT SERVICE] REZ coins deducted successfully:', wasilCoins);
                    }
                    catch (coinError) {
                        console.error('❌ [PAYMENT SERVICE] Failed to deduct REZ coins:', coinError);
                        // Don't fail payment if coin deduction fails - coins already validated
                    }
                }
                // Deduct store promo coins
                if (storePromoCoins && storePromoCoins > 0) {
                    try {
                        // Get store ID from first order item
                        const firstItem = order.items[0];
                        const storeId = typeof firstItem.store === 'object'
                            ? firstItem.store._id
                            : firstItem.store;
                        if (storeId) {
                            console.log('💰 [PAYMENT SERVICE] Deducting store promo coins:', storePromoCoins);
                            await StorePromoCoin_1.StorePromoCoin.useCoins(userId, storeId, storePromoCoins, order._id);
                            console.log('✅ [PAYMENT SERVICE] Store promo coins deducted successfully:', storePromoCoins);
                        }
                    }
                    catch (coinError) {
                        console.error('❌ [PAYMENT SERVICE] Failed to deduct store promo coins:', coinError);
                        // Don't fail payment if coin deduction fails - coins already validated
                    }
                }
            }
            const cart = await Cart_1.Cart.findOne({ user: order.user }).session(session);
            if (cart) {
                cart.items = [];
                cart.totals = {
                    subtotal: 0,
                    tax: 0,
                    delivery: 0,
                    discount: 0,
                    cashback: 0,
                    total: 0,
                    savings: 0
                };
                await cart.save({ session });
                console.log('🛒 [PAYMENT SERVICE] Cart cleared after successful payment');
            }
            // Create ServiceBooking records for service items in the order
            const serviceBookings = [];
            for (const orderItem of order.items) {
                if (orderItem.itemType === 'service' && orderItem.serviceBookingDetails) {
                    try {
                        console.log('📅 [PAYMENT SERVICE] Creating ServiceBooking for service item:', orderItem.name);
                        const { ServiceBooking } = require('../models/ServiceBooking');
                        const serviceBookingDetails = orderItem.serviceBookingDetails;
                        // Generate booking number
                        const bookingNumber = await ServiceBooking.generateBookingNumber();
                        // Get user info for customer details
                        let user = order.user;
                        if (typeof user === 'string' || user instanceof mongoose_1.default.Types.ObjectId) {
                            user = await User_1.User.findById(user);
                        }
                        const customerName = serviceBookingDetails.customerName ||
                            (user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'Customer');
                        const customerPhone = serviceBookingDetails.customerPhone || user?.phoneNumber || '';
                        const customerEmail = serviceBookingDetails.customerEmail || user?.email;
                        // Create service booking
                        const booking = new ServiceBooking({
                            bookingNumber,
                            user: order.user,
                            service: orderItem.product,
                            store: orderItem.store,
                            customerName,
                            customerPhone,
                            customerEmail,
                            bookingDate: serviceBookingDetails.bookingDate,
                            timeSlot: serviceBookingDetails.timeSlot,
                            duration: serviceBookingDetails.duration || 60,
                            serviceType: serviceBookingDetails.serviceType || 'store',
                            pricing: {
                                basePrice: orderItem.price,
                                total: orderItem.subtotal,
                                currency: 'INR'
                            },
                            paymentStatus: 'paid',
                            paymentMethod: order.payment.method,
                            customerNotes: serviceBookingDetails.customerNotes,
                            status: 'confirmed',
                            orderId: order._id
                        });
                        await booking.save({ session });
                        // Update order item with service booking ID
                        orderItem.serviceBookingId = booking._id;
                        serviceBookings.push(booking);
                        console.log('✅ [PAYMENT SERVICE] ServiceBooking created:', booking.bookingNumber);
                    }
                    catch (bookingError) {
                        console.error('❌ [PAYMENT SERVICE] Error creating ServiceBooking:', bookingError);
                        // Don't fail payment if booking creation fails - log and continue
                    }
                }
            }
            // Save order with updated serviceBookingIds
            if (serviceBookings.length > 0) {
                await order.save({ session });
                console.log('📅 [PAYMENT SERVICE] Created', serviceBookings.length, 'service booking(s)');
            }
            // Commit transaction
            await session.commitTransaction();
            session.endSession();
            console.log('✅ [PAYMENT SERVICE] Payment processed and stock deducted successfully');
            // Log successful payment completion
            paymentLogger_1.PaymentLogger.logPaymentSuccess(paymentDetails.razorpay_payment_id, order.user.toString(), order.totals.total, 'razorpay', paymentDetails.razorpay_order_id);
            // Emit socket events for stock updates
            for (const emission of stockEmissions) {
                try {
                    console.log('🔌 [PAYMENT SERVICE] Emitting stock update via Socket.IO:', emission);
                    stockSocketService_1.default.emitStockUpdate(emission.productId, emission.newStock, {
                        storeId: emission.storeId,
                        reason: 'purchase'
                    });
                }
                catch (socketError) {
                    console.error('❌ [PAYMENT SERVICE] Socket emission failed:', socketError);
                }
            }
            // Send payment received SMS notification
            try {
                console.log('📱 [PAYMENT SERVICE] Sending payment received notification...');
                // Get user details
                let user = order.user;
                if (typeof user === 'string' || user instanceof mongoose_1.default.Types.ObjectId) {
                    user = await User_1.User.findById(user);
                }
                const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
                const orderNumber = order.orderNumber || order._id.toString();
                const amount = order.totals.total || 0;
                if (userPhone) {
                    await SMSService_1.SMSService.sendPaymentReceived(userPhone, orderNumber, amount);
                    console.log('✅ [PAYMENT SERVICE] Payment received SMS sent successfully');
                }
            }
            catch (notificationError) {
                console.error('❌ [PAYMENT SERVICE] Error sending payment notification:', notificationError);
                // Don't fail the payment if notification fails
            }
            return order;
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('❌ [PAYMENT SERVICE] Error processing payment success:', error);
            // Log payment failure
            paymentLogger_1.PaymentLogger.logPaymentFailure(paymentDetails.razorpay_payment_id, orderId, 0, error, 'Payment processing failed');
            throw error;
        }
    }
    /**
     * Handle payment failure - Update order status
     * @param orderId MongoDB Order ID
     * @param reason Failure reason
     */
    async handlePaymentFailure(orderId, reason) {
        try {
            console.log('❌ [PAYMENT SERVICE] Processing payment failure for order:', orderId);
            const order = await Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }
            // Update payment status
            order.payment.status = 'failed';
            order.payment.failureReason = reason;
            // Add timeline entry
            order.timeline.push({
                status: 'payment_failed',
                message: `Payment failed: ${reason}`,
                timestamp: new Date()
            });
            // Update order status to cancelled if payment failed
            order.status = 'cancelled';
            order.cancelReason = `Payment failed: ${reason}`;
            order.cancelledAt = new Date();
            await order.save();
            console.log('✅ [PAYMENT SERVICE] Payment failure processed');
            return order;
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error processing payment failure:', error);
            throw error;
        }
    }
    /**
     * Refund payment
     * @param orderId MongoDB Order ID
     * @param amount Amount to refund (optional - full refund if not specified)
     * @returns Refund details
     */
    async refundPayment(orderId, amount) {
        try {
            console.log('💸 [PAYMENT SERVICE] Processing refund for order:', orderId);
            const order = await Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }
            // Check if order is paid
            if (order.payment.status !== 'paid') {
                throw new Error('Cannot refund unpaid order');
            }
            // Calculate refund amount
            const refundAmount = amount || order.totals.paidAmount;
            const paymentMethod = order.payment.method || 'razorpay';
            let refundId = '';
            let refundStatus = '';
            // Handle different payment methods
            switch (paymentMethod) {
                case 'razorpay': {
                    const paymentId = order.payment.transactionId;
                    if (!paymentId) {
                        throw new Error('Payment transaction ID not found');
                    }
                    if (!razorpayInstance) {
                        throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
                    }
                    const refundAmountInPaise = Math.round(refundAmount * 100);
                    // Create refund via Razorpay
                    const refund = await razorpayInstance.payments.refund(paymentId, {
                        amount: refundAmountInPaise,
                        notes: {
                            orderId: orderId,
                            orderNumber: order.orderNumber,
                            reason: 'Order cancellation'
                        }
                    });
                    refundId = refund.id;
                    refundStatus = refund.status;
                    console.log('✅ [PAYMENT SERVICE] Razorpay refund created:', refundId);
                    break;
                }
                case 'stripe': {
                    const paymentIntentId = order.payment.transactionId;
                    if (!paymentIntentId) {
                        throw new Error('Payment transaction ID not found');
                    }
                    if (!stripeService_1.default.isStripeConfigured()) {
                        throw new Error('Stripe is not configured');
                    }
                    const amountInPaise = Math.round(refundAmount * 100);
                    const refund = await stripeService_1.default.createRefund({
                        paymentIntentId,
                        amount: amountInPaise,
                        reason: 'requested_by_customer',
                        metadata: {
                            orderId: orderId,
                            orderNumber: order.orderNumber,
                            reason: 'Order cancellation'
                        }
                    });
                    refundId = refund.id;
                    refundStatus = refund.status || 'pending';
                    console.log('✅ [PAYMENT SERVICE] Stripe refund created:', refundId);
                    break;
                }
                case 'wallet': {
                    // Get user wallet
                    const user = order.user;
                    const userId = typeof user === 'string' ? user : user._id?.toString() || user;
                    if (!userId) {
                        throw new Error('User ID not found');
                    }
                    let wallet = await Wallet_1.Wallet.findOne({ user: userId });
                    if (!wallet) {
                        // Create wallet if it doesn't exist
                        wallet = await Wallet_1.Wallet.createForUser(new mongoose_1.Types.ObjectId(userId));
                        if (!wallet) {
                            throw new Error('Failed to create wallet for refund');
                        }
                    }
                    // Check if wallet is frozen
                    if (wallet.isFrozen) {
                        throw new Error(`Wallet is frozen: ${wallet.frozenReason}`);
                    }
                    // Add refund to wallet
                    await wallet.addFunds(refundAmount, 'refund');
                    await wallet.save();
                    refundId = `wallet_refund_${Date.now()}`;
                    refundStatus = 'completed';
                    console.log('✅ [PAYMENT SERVICE] Wallet refund completed:', refundId);
                    break;
                }
                case 'cod': {
                    // COD refund - mark for manual processing
                    refundId = `cod_refund_${Date.now()}`;
                    refundStatus = 'pending_manual_processing';
                    console.log('⚠️ [PAYMENT SERVICE] COD refund requires manual processing:', refundId);
                    break;
                }
                default:
                    throw new Error(`Unsupported payment method for refund: ${paymentMethod}`);
            }
            // Update order with refund details
            order.payment.status = amount === order.totals.paidAmount ? 'refunded' : 'partially_refunded';
            order.payment.refundId = refundId;
            order.payment.refundedAt = new Date();
            order.totals.refundAmount = (order.totals.refundAmount || 0) + refundAmount;
            // Add timeline entry
            order.timeline.push({
                status: 'refund_processed',
                message: `Refund of ₹${refundAmount} processed successfully via ${paymentMethod}`,
                timestamp: new Date()
            });
            await order.save();
            return {
                success: true,
                message: 'Refund processed successfully',
                refundId: refundId,
                refundAmount: refundAmount,
                refundStatus: refundStatus
            };
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error processing refund:', error);
            return {
                success: false,
                message: `Failed to process refund: ${error.message}`
            };
        }
    }
    /**
     * Verify webhook signature from Razorpay
     * @param webhookBody Webhook request body
     * @param webhookSignature Webhook signature from header
     * @returns true if signature is valid
     */
    verifyWebhookSignature(webhookBody, webhookSignature) {
        try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
            // Check if webhook secret is configured
            if (!secret || secret === 'your_webhook_secret_here') {
                console.warn('⚠️ [PAYMENT SERVICE] Webhook secret not configured. Webhook verification disabled.');
                // In development, you might want to allow webhooks without verification
                // In production, this should return false for security
                return process.env.NODE_ENV === 'development';
            }
            // Use utility function for webhook validation
            const validationResult = (0, razorpayUtils_1.validateRazorpayWebhookSignature)(webhookBody, webhookSignature, secret);
            if (validationResult.isValid) {
                console.log('✅ [PAYMENT SERVICE] Webhook signature verified:', validationResult.eventType);
            }
            else {
                console.error('❌ [PAYMENT SERVICE] Webhook signature verification failed:', validationResult.error);
            }
            return validationResult.isValid;
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error verifying webhook signature:', error);
            return false;
        }
    }
    /**
     * Get Razorpay Key ID for frontend
     */
    getRazorpayKeyId() {
        return process.env.RAZORPAY_KEY_ID || '';
    }
    // ==================== CASHBACK PAYOUT METHODS ====================
    /**
     * Create a payout (transfer money to beneficiary)
     */
    async createPayout(options) {
        try {
            // Check if Razorpay is configured
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                console.log('\n💰 PAYOUT (Razorpay not configured - simulating):');
                console.log('═══════════════════════════════════════════════════════');
                console.log(`Amount: ₹${options.amount / 100}`);
                console.log(`Beneficiary: ${options.beneficiaryName}`);
                console.log(`Account: ${options.accountNumber}`);
                console.log(`IFSC: ${options.ifscCode}`);
                console.log(`Purpose: ${options.purpose}`);
                console.log(`Reference: ${options.reference}`);
                console.log(`Status: SIMULATED SUCCESS`);
                console.log('═══════════════════════════════════════════════════════\n');
                return {
                    success: true,
                    payoutId: `simulated_${Date.now()}`,
                    status: 'processed',
                    amount: options.amount,
                };
            }
            // Create contact
            const contact = await razorpayInstance.contacts.create({
                name: options.beneficiaryName,
                type: 'customer',
                reference_id: options.reference,
            });
            // Create fund account
            const fundAccount = await razorpayInstance.fundAccounts.create({
                contact_id: contact.id,
                account_type: 'bank_account',
                bank_account: {
                    name: options.beneficiaryName,
                    account_number: options.accountNumber,
                    ifsc: options.ifscCode,
                },
            });
            // Create payout
            const payout = await razorpayInstance.payouts.create({
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your Razorpay account number
                fund_account_id: fundAccount.id,
                amount: options.amount,
                currency: options.currency || 'INR',
                mode: 'IMPS', // IMPS, NEFT, RTGS
                purpose: options.purpose,
                queue_if_low_balance: true,
                reference_id: options.reference,
            });
            console.log(`✅ [PAYMENT SERVICE] Payout created successfully: ${payout.id}`);
            return {
                success: true,
                payoutId: payout.id,
                status: payout.status,
                amount: payout.amount,
            };
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Payout creation error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Process cashback payout
     */
    async processCashbackPayout(cashbackRequest, customerBankDetails) {
        const amountInPaise = Math.round((cashbackRequest.approvedAmount || cashbackRequest.requestedAmount) * 100);
        return this.createPayout({
            amount: amountInPaise,
            accountNumber: customerBankDetails.accountNumber,
            ifscCode: customerBankDetails.ifscCode,
            beneficiaryName: customerBankDetails.accountHolderName,
            purpose: 'cashback',
            reference: `cashback_${cashbackRequest.id}`,
        });
    }
    /**
     * Get payout status
     */
    async getPayoutStatus(payoutId) {
        try {
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                return {
                    success: true,
                    status: 'processed',
                    message: 'Razorpay not configured - simulated status',
                };
            }
            const payout = await razorpayInstance.payouts.fetch(payoutId);
            return {
                success: true,
                status: payout.status,
                amount: payout.amount,
                createdAt: payout.created_at,
            };
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error fetching payout status:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Cancel payout (if not yet processed)
     */
    async cancelPayout(payoutId) {
        try {
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                console.log(`📝 [PAYMENT SERVICE] Payout ${payoutId} cancelled (simulated)`);
                return {
                    success: true,
                    message: 'Payout cancelled (simulated)',
                };
            }
            const payout = await razorpayInstance.payouts.cancel(payoutId);
            console.log(`✅ [PAYMENT SERVICE] Payout cancelled: ${payout.id}`);
            return {
                success: true,
                status: payout.status,
            };
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error cancelling payout:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Get account balance
     */
    async getAccountBalance() {
        try {
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                return {
                    success: true,
                    balance: 1000000, // Simulated 10,000 INR in paise
                    currency: 'INR',
                    message: 'Razorpay not configured - simulated balance',
                };
            }
            // Note: Account number should be configured in environment
            const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
            const balance = await razorpayInstance.balance.fetch(accountNumber);
            return {
                success: true,
                balance: balance.balance,
                currency: balance.currency,
            };
        }
        catch (error) {
            console.error('❌ [PAYMENT SERVICE] Error fetching balance:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Check if payment service is configured
     */
    isPayoutConfigured() {
        return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    }
}
exports.default = new PaymentService();
