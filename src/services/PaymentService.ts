/// <reference path="../types/razorpay-extended.d.ts" />
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, IOrder } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { User } from '../models/User';
// Note: StorePromoCoin removed - using wallet.brandedCoins instead
import { Wallet } from '../models/Wallet';
import coinService from './coinService';
import merchantWalletService from './merchantWalletService';
import mongoose, { Types } from 'mongoose';
import stockSocketService from './stockSocketService';
import { SMSService } from './SMSService';
import EmailService from './EmailService';
import {
  IRazorpayOrderRequest,
  IRazorpayOrder,
  IRazorpayPaymentVerification,
  IPaymentGatewayDetails,
  IRefundRequest,
  IRefundResponse
} from '../types/payment';
import {
  validateRazorpayPaymentSignature,
  validateRazorpayWebhookSignature,
  verifyPaymentDataCompleteness,
  convertToPaise,
  convertToRupees,
  validateRazorpayConfiguration,
  logPaymentVerificationAttempt,
  sanitizePaymentData,
  RAZORPAY_CONSTANTS
} from '../utils/razorpayUtils';
import { PaymentLogger } from './logging/paymentLogger';
import stripeService from './stripeService';
import orderSocketService, { CoinsAwardedPayload, MerchantWalletUpdatedPayload } from './orderSocketService';
// Wallet already imported above

// Initialize Razorpay instance conditionally
let razorpayInstance: Razorpay | null = null;

// Validate Razorpay configuration on startup
const configValidation = validateRazorpayConfiguration();
if (configValidation.isValid) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
  });
  console.log('✅ [PAYMENT SERVICE] Razorpay initialized successfully');

  // Log warnings if any
  if (configValidation.warnings.length > 0) {
    configValidation.warnings.forEach(warning => {
      console.warn(`⚠️ [PAYMENT SERVICE] ${warning}`);
    });
  }
} else {
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
  async createPaymentOrder(
    orderId: string,
    amount: number,
    currency: string = 'INR'
  ): Promise<IRazorpayOrder> {
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
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Convert amount to paise (smallest currency unit)
      const amountInPaise = Math.round(amount * 100);

      const orderOptions: IRazorpayOrderRequest = {
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

      return razorpayOrder as IRazorpayOrder;
    } catch (error: any) {
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
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
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
        PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, new Error('Razorpay not configured'), 'Configuration error');
        return false;
      }

      // Use the utility function for signature validation
      const validationResult = validateRazorpayPaymentSignature(
        orderId,
        paymentId,
        signature,
        secret
      );

      if (validationResult.isValid) {
        console.log('✅ [PAYMENT SERVICE] Signature verified successfully');
        PaymentLogger.logPaymentProcessing(paymentId, 'system', 0);
      } else {
        console.error('❌ [PAYMENT SERVICE] Signature verification failed:', validationResult.error);
        PaymentLogger.logPaymentFailure(
          paymentId,
          'unknown',
          0,
          new Error(validationResult.error || 'Invalid signature'),
          'Signature verification failed'
        );
      }

      return validationResult.isValid;
    } catch (error: any) {
      console.error('❌ [PAYMENT SERVICE] Error verifying signature:', error);
      PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, error, 'Signature verification exception');
      return false;
    }
  }

  /**
   * Handle successful payment - Update order and deduct stock
   * @param orderId MongoDB Order ID
   * @param paymentDetails Payment details from Razorpay
   */
  async handlePaymentSuccess(
    orderId: string,
    paymentDetails: IRazorpayPaymentVerification
  ): Promise<IOrder> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('✅ [PAYMENT SERVICE] Processing successful payment for order:', orderId);

      // Log payment processing start
      PaymentLogger.logPaymentProcessing(
        paymentDetails.razorpay_payment_id,
        orderId,
        0,
        paymentDetails.razorpay_order_id
      );

      // Fetch order
      const order = await Order.findById(orderId).session(session);
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
      (order as any).paymentGateway = {
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
      const stockEmissions: Array<{
        productId: string;
        storeId: string;
        newStock: number;
        productName: string;
      }> = [];

      for (const orderItem of order.items) {
        const productId = orderItem.product;
        const quantity = orderItem.quantity;
        const variant = orderItem.variant;

        console.log('📦 [PAYMENT SERVICE] Deducting stock for:', {
          productId,
          quantity,
          variant
        });

        let updateQuery: any = {};
        let stockCheckQuery: any = { _id: productId };

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

          const updatedProduct = await Product.findOneAndUpdate(
            stockCheckQuery,
            updateQuery,
            {
              session,
              new: true,
              arrayFilters: [
                {
                  'variant.type': variant.type,
                  'variant.value': variant.value
                }
              ]
            }
          );

          if (!updatedProduct) {
            throw new Error(
              `Insufficient stock for product ${orderItem.name} (${variant.type}: ${variant.value})`
            );
          }

          const newStock = updatedProduct.inventory?.stock ?? 0;
          const storeId = (updatedProduct.store as any)?.toString() || '';
          stockEmissions.push({
            productId: updatedProduct._id.toString(),
            storeId,
            newStock,
            productName: updatedProduct.name || 'Unknown Product'
          });

          console.log('✅ [PAYMENT SERVICE] Variant stock deducted');
        } else {
          // Main product stock deduction
          stockCheckQuery['inventory.stock'] = { $gte: quantity };
          updateQuery = {
            $inc: {
              'inventory.stock': -quantity
            }
          };

          const updatedProduct = await Product.findOneAndUpdate(
            stockCheckQuery,
            updateQuery,
            {
              session,
              new: true
            }
          );

          if (!updatedProduct) {
            throw new Error(`Insufficient stock for product ${orderItem.name}`);
          }

          // Set isAvailable to false if stock becomes 0
          if (updatedProduct.inventory && updatedProduct.inventory.stock === 0) {
            updatedProduct.inventory.isAvailable = false;
            await updatedProduct.save({ session });
          }

          const newStock = updatedProduct.inventory?.stock ?? 0;
          const storeId = (updatedProduct.store as any)?.toString() || '';
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
        // Support both rezCoins (new) and wasilCoins (legacy) field names
        const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
        const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
        const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;
        const userId = order.user as Types.ObjectId;

        // Deduct REZ coins from both Wallet model and CoinTransaction
        if (rezCoins && rezCoins > 0) {
          try {
            console.log('💰 [PAYMENT SERVICE] Deducting REZ coins:', rezCoins);

            // Update Wallet model (coins array)
            const { Wallet } = require('../models/Wallet');
            const wallet = await Wallet.findOne({ user: userId });

            if (wallet) {
              const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
              if (rezCoin && rezCoin.amount >= rezCoins) {
                rezCoin.amount -= rezCoins;
                rezCoin.lastUsed = new Date();

                wallet.balance.available = Math.max(0, wallet.balance.available - rezCoins);
                wallet.balance.total = Math.max(0, wallet.balance.total - rezCoins);
                wallet.statistics.totalSpent += rezCoins;
                wallet.lastTransactionAt = new Date();

                await wallet.save();
                console.log('✅ [PAYMENT SERVICE] Wallet rez coins updated:', rezCoins);
              }
            }

            // Also create transaction record
            await coinService.deductCoins(
              userId.toString(),
              rezCoins,
              'purchase',
              `Order payment: ${order.orderNumber}`
            );
            console.log('✅ [PAYMENT SERVICE] REZ coins deducted successfully:', rezCoins);
          } catch (coinError) {
            console.error('❌ [PAYMENT SERVICE] Failed to deduct REZ coins:', coinError);
            // Don't fail payment if coin deduction fails - coins already validated
          }
        }

        // Deduct promo coins
        if (promoCoins && promoCoins > 0) {
          try {
            console.log('💰 [PAYMENT SERVICE] Deducting promo coins:', promoCoins);
            const { Wallet } = require('../models/Wallet');
            const wallet = await Wallet.findOne({ user: userId });

            if (wallet) {
              const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
              if (promoCoin && promoCoin.amount >= promoCoins) {
                promoCoin.amount -= promoCoins;
                promoCoin.lastUsed = new Date();
                wallet.lastTransactionAt = new Date();
                await wallet.save();
                console.log('✅ [PAYMENT SERVICE] Promo coins deducted:', promoCoins);
              }
            }
          } catch (coinError) {
            console.error('❌ [PAYMENT SERVICE] Failed to deduct promo coins:', coinError);
          }
        }

        // Deduct store promo coins
        if (storePromoCoins && storePromoCoins > 0) {
          try {
            // Get store ID from first order item
            const firstItem = order.items[0];
            const storeId = typeof firstItem.store === 'object'
              ? (firstItem.store as any)._id
              : firstItem.store;

            if (storeId) {
              console.log('💰 [PAYMENT SERVICE] Deducting branded coins:', storePromoCoins);
              // Use branded coins from wallet
              const wallet = await Wallet.findOne({ user: userId });
              if (wallet) {
                await wallet.useBrandedCoins(
                  new Types.ObjectId(storeId.toString()),
                  storePromoCoins
                );
                console.log('✅ [PAYMENT SERVICE] Branded coins deducted successfully:', storePromoCoins);
              }
            }
          } catch (coinError) {
            console.error('❌ [PAYMENT SERVICE] Failed to deduct branded coins:', coinError);
            // Don't fail payment if coin deduction fails - coins already validated
          }
        }
      }

      const cart = await Cart.findOne({ user: order.user }).session(session);
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
      const serviceBookings: any[] = [];
      for (const orderItem of order.items) {
        if ((orderItem as any).itemType === 'service' && (orderItem as any).serviceBookingDetails) {
          try {
            console.log('📅 [PAYMENT SERVICE] Creating ServiceBooking for service item:', orderItem.name);

            const { ServiceBooking } = require('../models/ServiceBooking');
            const serviceBookingDetails = (orderItem as any).serviceBookingDetails;

            // Generate booking number
            const bookingNumber = await ServiceBooking.generateBookingNumber();

            // Get user info for customer details
            let user = order.user as any;
            if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
              user = await User.findById(user);
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
            (orderItem as any).serviceBookingId = booking._id;

            serviceBookings.push(booking);
            console.log('✅ [PAYMENT SERVICE] ServiceBooking created:', booking.bookingNumber);
          } catch (bookingError) {
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
      PaymentLogger.logPaymentSuccess(
        paymentDetails.razorpay_payment_id,
        order.user.toString(),
        order.totals.total,
        'razorpay',
        paymentDetails.razorpay_order_id
      );

      // Emit socket events for stock updates
      for (const emission of stockEmissions) {
        try {
          console.log('🔌 [PAYMENT SERVICE] Emitting stock update via Socket.IO:', emission);
          stockSocketService.emitStockUpdate(emission.productId, emission.newStock, {
            storeId: emission.storeId,
            reason: 'purchase'
          });
        } catch (socketError) {
          console.error('❌ [PAYMENT SERVICE] Socket emission failed:', socketError);
        }
      }

      // Send payment received SMS notification
      try {
        console.log('📱 [PAYMENT SERVICE] Sending payment received notification...');

        // Get user details
        let user = order.user as any;
        if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
          user = await User.findById(user);
        }

        const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
        const orderNumber = order.orderNumber || (order._id as any).toString();
        const amount = order.totals.total || 0;

        if (userPhone) {
          await SMSService.sendPaymentReceived(userPhone, orderNumber, amount);
          console.log('✅ [PAYMENT SERVICE] Payment received SMS sent successfully');
        }
      } catch (notificationError) {
        console.error('❌ [PAYMENT SERVICE] Error sending payment notification:', notificationError);
        // Don't fail the payment if notification fails
      }

      // ========================================
      // POST-PAYMENT REWARDS & MERCHANT CREDIT
      // ========================================

      // NOTE: 5% purchase reward coins are now awarded on delivery (see orderController.ts)
      // This ensures users only get coins after actually receiving their order.

      // 1. Credit merchant wallet (immediate settlement)
      try {
        // Get merchant from the first order item's store
        const firstItem = order.items[0];
        if (firstItem && firstItem.store) {
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;

          // Get store to find merchant owner
          const { Store } = require('../models/Store');
          const store = await Store.findById(storeId);

          if (store && store.owner) {
            console.log('💰 [PAYMENT SERVICE] Crediting merchant wallet...');

            const grossAmount = order.totals.subtotal || 0;
            const platformFee = order.totals.platformFee || 0;

            const walletResult = await merchantWalletService.creditOrderPayment(
              store.owner.toString(),
              order._id as Types.ObjectId,
              order.orderNumber,
              grossAmount,
              platformFee,
              storeId
            );

            console.log('✅ [PAYMENT SERVICE] Merchant wallet credited:', {
              gross: grossAmount,
              fee: platformFee,
              net: grossAmount - platformFee
            });

            // Emit real-time notification to merchant
            if (walletResult) {
              orderSocketService.emitMerchantWalletUpdated({
                merchantId: store.owner.toString(),
                storeId: storeId.toString(),
                storeName: store.name,
                transactionType: 'credit',
                amount: grossAmount - platformFee,
                orderId: (order._id as Types.ObjectId).toString(),
                orderNumber: order.orderNumber,
                newBalance: {
                  total: walletResult.balance?.total || 0,
                  available: walletResult.balance?.available || 0,
                  pending: walletResult.balance?.pending || 0
                },
                timestamp: new Date()
              });
            }
          }
        }
      } catch (walletError) {
        console.error('❌ [PAYMENT SERVICE] Failed to credit merchant wallet:', walletError);
        // Don't fail payment if wallet credit fails
      }

      // 2. Credit 5% admin commission to platform wallet (5% of subtotal)
      try {
        const adminWalletService = require('./adminWalletService').default;
        const subtotal = order.totals.subtotal || 0;
        const adminCommission = Math.floor(subtotal * 0.05);
        if (adminCommission > 0) {
          await adminWalletService.creditOrderCommission(
            order._id as Types.ObjectId,
            order.orderNumber,
            subtotal
          );
          console.log('✅ [PAYMENT SERVICE] Admin wallet credited:', adminCommission);
        }
      } catch (adminError) {
        console.error('❌ [PAYMENT SERVICE] Failed to credit admin wallet:', adminError);
        // Don't fail payment if admin wallet credit fails
      }

      return order;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ [PAYMENT SERVICE] Error processing payment success:', error);

      // Log payment failure
      PaymentLogger.logPaymentFailure(
        paymentDetails.razorpay_payment_id,
        orderId,
        0,
        error,
        'Payment processing failed'
      );

      throw error;
    }
  }

  /**
   * Handle payment failure - Update order status
   * @param orderId MongoDB Order ID
   * @param reason Failure reason
   */
  async handlePaymentFailure(orderId: string, reason: string): Promise<IOrder> {
    try {
      console.log('❌ [PAYMENT SERVICE] Processing payment failure for order:', orderId);

      const order = await Order.findById(orderId);
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
    } catch (error: any) {
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
  async refundPayment(
    orderId: string,
    amount?: number
  ): Promise<IRefundResponse> {
    try {
      console.log('💸 [PAYMENT SERVICE] Processing refund for order:', orderId);

      const order = await Order.findById(orderId);
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

          if (!stripeService.isStripeConfigured()) {
            throw new Error('Stripe is not configured');
          }

          const amountInPaise = Math.round(refundAmount * 100);
          const refund = await stripeService.createRefund({
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
          const user = order.user as any;
          const userId = typeof user === 'string' ? user : user._id?.toString() || user;

          if (!userId) {
            throw new Error('User ID not found');
          }

          let wallet = await Wallet.findOne({ user: userId });

          if (!wallet) {
            // Create wallet if it doesn't exist
            wallet = await (Wallet as any).createForUser(new Types.ObjectId(userId));
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
    } catch (error: any) {
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
  verifyWebhookSignature(webhookBody: string, webhookSignature: string): boolean {
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
      const validationResult = validateRazorpayWebhookSignature(
        webhookBody,
        webhookSignature,
        secret
      );

      if (validationResult.isValid) {
        console.log('✅ [PAYMENT SERVICE] Webhook signature verified:', validationResult.eventType);
      } else {
        console.error('❌ [PAYMENT SERVICE] Webhook signature verification failed:', validationResult.error);
      }

      return validationResult.isValid;
    } catch (error: any) {
      console.error('❌ [PAYMENT SERVICE] Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Get Razorpay Key ID for frontend
   */
  getRazorpayKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || '';
  }

  // ==================== CASHBACK PAYOUT METHODS ====================

  /**
   * Create a payout (transfer money to beneficiary)
   */
  async createPayout(options: {
    amount: number; // in paise (100 paise = 1 INR)
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
  }> {
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
      const contact = await (razorpayInstance as any).contacts.create({
        name: options.beneficiaryName,
        type: 'customer',
        reference_id: options.reference,
      });

      // Create fund account
      const fundAccount = await (razorpayInstance as any).fundAccounts.create({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: options.beneficiaryName,
          account_number: options.accountNumber,
          ifsc: options.ifscCode,
        },
      });

      // Create payout
      const payout = await (razorpayInstance as any).payouts.create({
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
    } catch (error: any) {
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
  async processCashbackPayout(
    cashbackRequest: any,
    customerBankDetails: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
    }
  ): Promise<{
    success: boolean;
    payoutId?: string;
    status?: string;
    amount?: number;
    error?: string;
  }> {
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
  async getPayoutStatus(payoutId: string): Promise<any> {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return {
          success: true,
          status: 'processed',
          message: 'Razorpay not configured - simulated status',
        };
      }

      const payout = await (razorpayInstance as any).payouts.fetch(payoutId);

      return {
        success: true,
        status: payout.status,
        amount: payout.amount,
        createdAt: payout.created_at,
      };
    } catch (error: any) {
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
  async cancelPayout(payoutId: string): Promise<any> {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.log(`📝 [PAYMENT SERVICE] Payout ${payoutId} cancelled (simulated)`);
        return {
          success: true,
          message: 'Payout cancelled (simulated)',
        };
      }

      const payout = await (razorpayInstance as any).payouts.cancel(payoutId);

      console.log(`✅ [PAYMENT SERVICE] Payout cancelled: ${payout.id}`);

      return {
        success: true,
        status: payout.status,
      };
    } catch (error: any) {
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
  async getAccountBalance(): Promise<any> {
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
      const balance = await (razorpayInstance as any).balance.fetch(accountNumber);

      return {
        success: true,
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error: any) {
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
  isPayoutConfigured(): boolean {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }
}

export default new PaymentService();