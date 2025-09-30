import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, IOrder } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import mongoose from 'mongoose';
import stockSocketService from './stockSocketService';
import {
  IRazorpayOrderRequest,
  IRazorpayOrder,
  IRazorpayPaymentVerification,
  IPaymentGatewayDetails,
  IRefundRequest,
  IRefundResponse
} from '../types/payment';

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

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
        paymentId
      });

      const text = `${orderId}|${paymentId}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || '';

      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      const isValid = generatedSignature === signature;

      console.log(
        isValid
          ? '✅ [PAYMENT SERVICE] Signature verified successfully'
          : '❌ [PAYMENT SERVICE] Signature verification failed'
      );

      return isValid;
    } catch (error: any) {
      console.error('❌ [PAYMENT SERVICE] Error verifying signature:', error);
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

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      console.log('✅ [PAYMENT SERVICE] Payment processed and stock deducted successfully');

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

      return order;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ [PAYMENT SERVICE] Error processing payment success:', error);
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

      // Get payment ID
      const paymentId = order.payment.transactionId;
      if (!paymentId) {
        throw new Error('Payment ID not found');
      }

      // Calculate refund amount
      const refundAmount = amount || order.totals.paidAmount;
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

      console.log('✅ [PAYMENT SERVICE] Refund created:', refund.id);

      // Update order with refund details
      order.payment.status = amount === order.totals.paidAmount ? 'refunded' : 'partially_refunded';
      order.payment.refundId = refund.id;
      order.payment.refundedAt = new Date();
      order.totals.refundAmount = (order.totals.refundAmount || 0) + refundAmount;

      // Add timeline entry
      order.timeline.push({
        status: 'refund_processed',
        message: `Refund of ₹${refundAmount} processed successfully`,
        timestamp: new Date()
      });

      await order.save();

      return {
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id,
        refundAmount: refundAmount,
        refundStatus: refund.status
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

      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(webhookBody)
        .digest('hex');

      return generatedSignature === webhookSignature;
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
}

export default new PaymentService();