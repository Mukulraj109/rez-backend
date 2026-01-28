import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Order, IOrder } from '../../models/Order';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { sendSuccess, sendNotFound, sendBadRequest, sendInternalError, sendConflict, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';
import { createRazorpayRefund } from '../../services/razorpayService';
import { SMSService } from '../../services/SMSService';
import EmailService from '../../services/EmailService';
import stripeService from '../../services/stripeService';
import { Wallet } from '../../models/Wallet';
import { Refund } from '../../models/Refund';
import { Store } from '../../models/Store';

/**
 * Helper function to send order status notifications to customers
 */
async function sendOrderStatusNotification(order: any, action: string): Promise<void> {
  try {
    // Populate user if needed
    let user = order.user;
    if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
      user = await User.findById(user);
    }
    
    if (!user) {
      console.warn('⚠️ [ORDER NOTIFICATION] User not found for order:', order._id);
      return;
    }

    const userPhone = user.profile?.phoneNumber || user.phoneNumber || user.phone;
    const userEmail = user.email;
    const userName = user.profile?.firstName || user.fullName || 'Customer';
    const orderNumber = order.orderNumber || order._id.toString();
    const orderTotal = order.totals?.total || 0;

    // Status messages
    const statusMessages: Record<string, { sms: string; emailSubject: string }> = {
      'confirmed': {
        sms: `Your order #${orderNumber} has been confirmed. We're preparing it for you!`,
        emailSubject: `Order Confirmed - ${orderNumber}`
      },
      'preparing': {
        sms: `Your order #${orderNumber} is being prepared. We'll notify you when it's ready!`,
        emailSubject: `Order Being Prepared - ${orderNumber}`
      },
      'ready': {
        sms: `Your order #${orderNumber} is ready for pickup/delivery!`,
        emailSubject: `Order Ready - ${orderNumber}`
      },
      'dispatched': {
        sms: `Your order #${orderNumber} has been dispatched and is on its way!`,
        emailSubject: `Order Dispatched - ${orderNumber}`
      },
      'delivered': {
        sms: `Your order #${orderNumber} has been delivered. Thank you for your order!`,
        emailSubject: `Order Delivered - ${orderNumber}`
      },
      'cancelled': {
        sms: `Your order #${orderNumber} has been cancelled. Refund will be processed if payment was made.`,
        emailSubject: `Order Cancelled - ${orderNumber}`
      }
    };

    const message = statusMessages[action] || statusMessages[order.status] || {
      sms: `Your order #${orderNumber} status has been updated to ${action}.`,
      emailSubject: `Order Status Update - ${orderNumber}`
    };

    // Send SMS
    if (userPhone && message.sms) {
      try {
        await SMSService.send({
          to: userPhone,
          message: message.sms
        });
        console.log(`✅ [ORDER NOTIFICATION] SMS sent to customer: ${userPhone}`);
      } catch (smsError) {
        console.error(`❌ [ORDER NOTIFICATION] Failed to send SMS:`, smsError);
      }
    }

    // Send Email
    if (userEmail && userName) {
      try {
        // Get store name from order items
        const storeName = order.items?.[0]?.store?.name || 'Store';
        const orderId = (order._id as any)?.toString() || orderNumber;
        
        await EmailService.sendOrderStatusUpdate(
          userEmail,
          userName,
          {
            orderId,
            orderNumber,
            status: action || order.status,
            statusMessage: message.sms || `Your order status has been updated to ${action || order.status}`,
            storeName
          }
        );
        console.log(`✅ [ORDER NOTIFICATION] Email sent to customer: ${userEmail}`);
      } catch (emailError) {
        console.error(`❌ [ORDER NOTIFICATION] Failed to send email:`, emailError);
      }
    }
  } catch (error) {
    console.error('❌ [ORDER NOTIFICATION] Error sending notifications:', error);
    throw error;
  }
}

/**
 * GET /api/merchant/orders/:id
 * Get single order by ID
 */
export const getMerchantOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchantId;

  console.log('🔍 [ORDER DETAIL] getMerchantOrderById called:', { id, merchantId });

  try {
    // Verify the order belongs to one of this merchant's stores
    const merchantStores = await Store.find({ merchantId: new Types.ObjectId(merchantId) }).select('_id').lean();
    const merchantStoreIds = merchantStores.map(s => s._id);

    const order = await Order.findOne({
      _id: new Types.ObjectId(id),
      'items.store': { $in: merchantStoreIds }
    })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName profile.email phoneNumber'
      })
      .populate({
        path: 'items.product',
        select: 'name image images'
      })
      .populate({
        path: 'items.store',
        select: 'name logo location'
      })
      .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Get store information from the first product in the order if available
    let storeInfo = null;
    if (order.items && order.items.length > 0) {
      try {
        const firstItem = order.items[0] as any;
        if (firstItem.store) {
          storeInfo = {
            _id: (firstItem.store as any)._id?.toString() || firstItem.store,
            name: (firstItem.store as any).name,
            location: (firstItem.store as any).location
          };
        } else if (firstItem.product) {
          // Try to get store from product
          const product = await Product.findById(firstItem.product).select('storeId').lean();
          if (product && (product as any).storeId) {
            const store = await (await import('../../models/Store')).Store.findById((product as any).storeId).select('name location').lean();
            if (store) {
              storeInfo = {
                _id: (store._id as any).toString(),
                name: store.name,
                location: store.location
              };
            }
          }
        }
      } catch (storeError) {
        console.warn('⚠️ [ORDER DETAIL] Failed to fetch store info:', storeError);
        // Continue without store info
      }
    }

    const orderWithStore = {
      ...order,
      store: storeInfo
    };

    console.log('✅ [ORDER DETAIL] Order retrieved:', {
      orderId: id,
      orderNumber: order.orderNumber,
      status: order.status
    });

    sendSuccess(res, orderWithStore, 'Order retrieved successfully');

  } catch (error: any) {
    console.error('❌ [ORDER DETAIL] Error:', error);
    throw new AppError(`Failed to fetch order: ${error.message}`, 500);
  }
});

/**
 * GET /api/merchant/orders
 * Enhanced endpoint with advanced filters, search, and pagination
 */
export const getMerchantOrders = asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [ORDERS] getMerchantOrders called');
  console.log('🔍 [ORDERS] req.merchantId:', (req as any).merchantId);
  console.log('🔍 [ORDERS] req.merchant:', (req as any).merchant);

  const {
    status,
    paymentStatus,
    startDate,
    endDate,
    search,
    storeId,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  try {
    console.log('📊 [MERCHANT ORDERS] Fetching orders with filters:', {
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
      storeId,
      sortBy,
      order,
      page,
      limit
    });

    // Build query - always filter by merchant's stores
    const merchantId = (req as any).merchantId;
    const merchantStores = await Store.find({ merchantId: new Types.ObjectId(merchantId) }).select('_id').lean();
    const merchantStoreIds = merchantStores.map(s => s._id);

    const query: any = {
      'items.store': { $in: merchantStoreIds }
    };

    // Further filter by specific store (if merchant manages multiple stores)
    if (storeId) {
      // Ensure the requested store belongs to this merchant
      const storeObjId = new Types.ObjectId(storeId as string);
      if (!merchantStoreIds.some(id => id.toString() === storeObjId.toString())) {
        return sendBadRequest(res, 'Store not found or does not belong to this merchant');
      }
      query['items.store'] = storeObjId;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      query['payment.status'] = paymentStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Search filter (orderNumber, customer name, email)
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');

      // First, find users matching the search
      const matchingUsers = await User.find({
        $or: [
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex },
          { 'profile.email': searchRegex },
          { phoneNumber: searchRegex }
        ]
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      query.$or = [
        { orderNumber: searchRegex },
        { user: { $in: userIds } }
      ];
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = order === 'desc' ? -1 : 1;

    // Execute query with population
    const orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName profile.email phoneNumber'
      })
      .populate({
        path: 'items.product',
        select: 'name image images'
      })
      .populate({
        path: 'items.store',
        select: 'name logo'
      })
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get total count
    const total = await Order.countDocuments(query);

    console.log('✅ [MERCHANT ORDERS] Orders retrieved:', {
      count: orders.length,
      total,
      page,
      limit
    });

    sendSuccess(res, {
      orders,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + orders.length < total
    }, 'Orders retrieved successfully');

  } catch (error: any) {
    console.error('❌ [MERCHANT ORDERS] Error:', error);
    throw new AppError(`Failed to fetch merchant orders: ${error.message}`, 500);
  }
});

/**
 * GET /api/merchant/orders/analytics
 * Proper analytics endpoint (no more fallback)
 */
export const getMerchantOrderAnalytics = asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [ORDERS] getMerchantOrderAnalytics called');
  console.log('🔍 [ORDERS] req.merchantId:', (req as any).merchantId);
  console.log('🔍 [ORDERS] req.merchant:', (req as any).merchant);

  const { startDate, endDate, storeId, interval = 'day' } = req.query;

  try {
    console.log('📈 [MERCHANT ANALYTICS] Generating analytics:', {
      startDate,
      endDate,
      storeId,
      interval
    });

    // Build base query - always filter by merchant's stores
    const merchantId = (req as any).merchantId;
    const merchantStores = await Store.find({ merchantId: new Types.ObjectId(merchantId) }).select('_id').lean();
    const merchantStoreIds = merchantStores.map(s => s._id);

    const baseQuery: any = {
      'items.store': { $in: merchantStoreIds }
    };

    if (storeId) {
      const storeObjId = new Types.ObjectId(storeId as string);
      if (!merchantStoreIds.some(id => id.toString() === storeObjId.toString())) {
        return sendBadRequest(res, 'Store not found or does not belong to this merchant');
      }
      baseQuery['items.store'] = storeObjId;
    }

    // Default to last 30 days if no date range provided
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dateStart = startDate ? new Date(startDate as string) : thirtyDaysAgo;
    const dateEnd = endDate ? new Date(endDate as string) : now;

    baseQuery.createdAt = {
      $gte: dateStart,
      $lte: dateEnd
    };

    console.log('📊 [MERCHANT ANALYTICS] Query range:', {
      start: dateStart.toISOString(),
      end: dateEnd.toISOString()
    });

    // Execute analytics aggregation
    const [overallStats, statusBreakdown, revenueByDay, topProducts] = await Promise.all([
      // Overall statistics
      Order.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totals.total' },
            totalPaidAmount: { $sum: '$totals.paidAmount' },
            averageOrderValue: { $avg: '$totals.total' },
            totalItemsSold: { $sum: { $size: '$items' } }
          }
        }
      ]),

      // Orders by status
      Order.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totals.total' }
          }
        }
      ]),

      // Revenue by day/week/month
      Order.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: {
              $dateToString: {
                format: interval === 'month' ? '%Y-%m' : interval === 'week' ? '%Y-W%U' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totals.total' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top products
      Order.aggregate([
        { $match: baseQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calculate conversion rate (delivered / total)
    const totalOrders = overallStats[0]?.totalOrders || 0;
    const deliveredOrders = statusBreakdown.find((s: any) => s._id === 'delivered')?.count || 0;
    const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    // Transform data
    const ordersByStatus: any = {};
    statusBreakdown.forEach((item: any) => {
      ordersByStatus[item._id] = {
        count: item.count,
        revenue: item.revenue
      };
    });

    const analytics = {
      totalOrders: overallStats[0]?.totalOrders || 0,
      totalRevenue: overallStats[0]?.totalRevenue || 0,
      totalPaidAmount: overallStats[0]?.totalPaidAmount || 0,
      averageOrderValue: overallStats[0]?.averageOrderValue || 0,
      totalItemsSold: overallStats[0]?.totalItemsSold || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      ordersByStatus,
      revenueByDay: revenueByDay.map((item: any) => ({
        date: item._id,
        orders: item.orders,
        revenue: item.revenue
      })),
      topProducts: topProducts.map((item: any) => ({
        productId: item._id,
        productName: item.productName,
        quantity: item.totalQuantity,
        revenue: item.totalRevenue,
        orders: item.orderCount
      })),
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      }
    };

    console.log('✅ [MERCHANT ANALYTICS] Analytics generated:', {
      totalOrders: analytics.totalOrders,
      totalRevenue: analytics.totalRevenue,
      conversionRate: analytics.conversionRate
    });

    // Cache for 10 minutes
    res.setHeader('Cache-Control', 'public, max-age=600');

    sendSuccess(res, analytics, 'Analytics retrieved successfully');

  } catch (error: any) {
    console.error('❌ [MERCHANT ANALYTICS] Error:', error);
    throw new AppError(`Failed to generate analytics: ${error.message}`, 500);
  }
});

/**
 * POST /api/merchant/orders/bulk-action
 * Bulk order operations with transaction support
 */
export const bulkOrderAction = asyncHandler(async (req: Request, res: Response) => {
  const { action, orderIds, reason, trackingInfo } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🔄 [BULK ACTION] Processing bulk action:', {
      action,
      orderCount: orderIds.length,
      reason,
      trackingInfo
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; error: string }>
    };

    // Define valid status transitions
    const validTransitions: Record<string, { from: string[]; to: string }> = {
      confirm: { from: ['placed'], to: 'confirmed' },
      cancel: { from: ['placed', 'confirmed', 'preparing'], to: 'cancelled' },
      'mark-shipped': { from: ['confirmed', 'preparing', 'ready'], to: 'dispatched' }
    };

    const transition = validTransitions[action];

    if (!transition) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, `Invalid action: ${action}`);
    }

    // Process each order
    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId).session(session);

        if (!order) {
          results.failed++;
          results.errors.push({
            orderId,
            error: 'Order not found'
          });
          continue;
        }

        // Validate status transition
        if (!transition.from.includes(order.status)) {
          results.failed++;
          results.errors.push({
            orderId,
            error: `Cannot ${action} order with status: ${order.status}. Expected: ${transition.from.join(', ')}`
          });
          continue;
        }

        // Perform action
        switch (action) {
          case 'confirm':
            order.status = 'confirmed';
            order.timeline.push({
              status: 'confirmed',
              message: 'Order confirmed by merchant',
              timestamp: new Date()
            });
            break;

          case 'cancel':
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.cancelReason = reason || 'Cancelled by merchant';
            order.timeline.push({
              status: 'cancelled',
              message: `Order cancelled: ${reason || 'Merchant decision'}`,
              timestamp: new Date()
            });

            // Restore inventory for cancelled items
            for (const item of order.items) {
              if (item.variant) {
                await Product.findOneAndUpdate(
                  {
                    _id: item.product,
                    'inventory.variants': {
                      $elemMatch: {
                        type: item.variant.type,
                        value: item.variant.value
                      }
                    }
                  },
                  {
                    $inc: {
                      'inventory.variants.$[variant].stock': item.quantity
                    }
                  },
                  {
                    session,
                    arrayFilters: [{
                      'variant.type': item.variant.type,
                      'variant.value': item.variant.value
                    }]
                  }
                );
              } else {
                await Product.findByIdAndUpdate(
                  item.product,
                  {
                    $inc: { 'inventory.stock': item.quantity },
                    $set: { 'inventory.isAvailable': true }
                  },
                  { session }
                );
              }
            }
            break;

          case 'mark-shipped':
            order.status = 'dispatched';
            order.delivery.status = 'dispatched';
            order.delivery.dispatchedAt = new Date();

            if (trackingInfo) {
              if (trackingInfo.trackingId) {
                order.delivery.trackingId = trackingInfo.trackingId;
              }
              if (trackingInfo.deliveryPartner) {
                order.delivery.deliveryPartner = trackingInfo.deliveryPartner;
              }
              if (trackingInfo.estimatedTime) {
                order.delivery.estimatedTime = new Date(trackingInfo.estimatedTime);
              }
            }

            order.timeline.push({
              status: 'dispatched',
              message: 'Order dispatched for delivery',
              timestamp: new Date(),
              metadata: trackingInfo
            });
            break;
        }

        await order.save({ session });

        // Send notifications to customers
        try {
          await sendOrderStatusNotification(order, action);
          console.log(`✅ [BULK ACTION] Notification sent for order ${orderId}`);
        } catch (notificationError) {
          console.error(`❌ [BULK ACTION] Failed to send notification for order ${orderId}:`, notificationError);
          // Don't fail the bulk action if notification fails
        }

        results.success++;

        console.log(`✅ [BULK ACTION] Processed order ${orderId}: ${action}`);

      } catch (error: any) {
        console.error(`❌ [BULK ACTION] Error processing order ${orderId}:`, error);
        results.failed++;
        results.errors.push({
          orderId,
          error: error.message
        });
      }
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [BULK ACTION] Bulk action completed:', results);

    sendSuccess(res, results, `Bulk action completed: ${results.success} succeeded, ${results.failed} failed`);

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ [BULK ACTION] Transaction error:', error);
    throw new AppError(`Bulk action failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/merchant/orders/:id/refund
 * Process order refund with Razorpay integration
 */
export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id: orderId } = req.params;
  const { amount, reason, refundItems, notifyCustomer = true } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('💰 [REFUND] Processing refund:', {
      orderId,
      amount,
      reason,
      refundItems: refundItems?.length || 'all',
      notifyCustomer
    });

    // Find order
    const order = await Order.findById(orderId)
      .populate('user', 'profile.firstName profile.lastName profile.email phoneNumber')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Order not found');
    }

    // Validate refund eligibility
    if (order.payment.status === 'refunded') {
      await session.abortTransaction();
      session.endSession();
      return sendConflict(res, 'Order is already fully refunded');
    }

    if (order.payment.status === 'pending' || order.payment.status === 'failed') {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Cannot refund unpaid order');
    }

    // Validate refund amount
    const maxRefundAmount = order.totals.paidAmount - (order.totals.refundAmount || 0);

    if (amount > maxRefundAmount) {
      await session.abortTransaction();
      session.endSession();
      return sendError(res, `Refund amount (₹${amount}) exceeds eligible amount (₹${maxRefundAmount})`, 422);
    }

    if (amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Refund amount must be greater than 0');
    }

    // Determine if partial or full refund
    const isPartialRefund = amount < order.totals.paidAmount;

    console.log('💰 [REFUND] Refund type:', isPartialRefund ? 'PARTIAL' : 'FULL');

    // Process refund based on payment method
    let gatewayRefundId = '';
    let gatewayRefundStatus = 'processed';
    const paymentMethod = order.payment.method || 'razorpay';

    try {
      switch (paymentMethod) {
        case 'razorpay': {
          if (!order.payment.transactionId) {
            throw new AppError('Payment transaction ID not found', 400);
          }

          console.log('💳 [REFUND] Processing Razorpay refund...');

          const razorpayRefund = await createRazorpayRefund(
            order.payment.transactionId,
            amount,
            {
              notes: {
                orderId: order.orderNumber,
                reason,
                processedAt: new Date().toISOString()
              }
            }
          );

          gatewayRefundId = razorpayRefund.id;
          gatewayRefundStatus = razorpayRefund.status;

          console.log('✅ [REFUND] Razorpay refund created:', {
            refundId: gatewayRefundId,
            status: gatewayRefundStatus,
            amount: razorpayRefund.amount ? razorpayRefund.amount / 100 : amount
          });
          break;
        }

        case 'stripe': {
          if (!order.payment.transactionId) {
            throw new AppError('Payment transaction ID not found', 400);
          }

          if (!stripeService.isStripeConfigured()) {
            throw new AppError('Stripe is not configured', 500);
          }

          console.log('💳 [REFUND] Processing Stripe refund...');

          const amountInPaise = Math.round(amount * 100);
          const stripeRefund = await stripeService.createRefund({
            paymentIntentId: order.payment.transactionId,
            amount: amountInPaise,
            reason: 'requested_by_customer',
            metadata: {
              orderId: (order._id as Types.ObjectId).toString(),
              orderNumber: order.orderNumber,
              reason,
              processedAt: new Date().toISOString()
            }
          });

          gatewayRefundId = stripeRefund.id;
          gatewayRefundStatus = stripeRefund.status || 'pending';

          console.log('✅ [REFUND] Stripe refund created:', {
            refundId: gatewayRefundId,
            status: gatewayRefundStatus,
            amount: stripeRefund.amount ? stripeRefund.amount / 100 : amount
          });
          break;
        }

        case 'wallet': {
          console.log('💳 [REFUND] Processing wallet refund...');

          // Get user wallet
          const user = order.user as any;
          const userId = typeof user === 'string' ? user : user._id?.toString() || user;

          if (!userId) {
            throw new AppError('User ID not found', 400);
          }

          let wallet = await Wallet.findOne({ user: userId }).session(session);

          if (!wallet) {
            // Create wallet if it doesn't exist
            wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
            if (!wallet) {
              throw new AppError('Failed to create wallet for refund', 500);
            }
          }

          // Check if wallet is frozen
          if (wallet.isFrozen) {
            throw new AppError(`Wallet is frozen: ${wallet.frozenReason}`, 403);
          }

          // Add refund to wallet
          await wallet.addFunds(amount, 'refund');
          await wallet.save({ session });

          gatewayRefundId = `wallet_refund_${Date.now()}`;
          gatewayRefundStatus = 'completed';

          console.log('✅ [REFUND] Wallet refund completed:', {
            refundId: gatewayRefundId,
            walletId: wallet._id,
            amount
          });
          break;
        }

        case 'cod': {
          // COD refund - mark for manual processing
          gatewayRefundId = `cod_refund_${Date.now()}`;
          gatewayRefundStatus = 'pending_manual_processing';

          console.log('⚠️ [REFUND] COD refund requires manual processing:', gatewayRefundId);
          break;
        }

        default:
          throw new AppError(`Unsupported payment method for refund: ${paymentMethod}`, 400);
      }
    } catch (refundError: any) {
      console.error(`❌ [REFUND] ${paymentMethod} refund failed:`, refundError);

      await session.abortTransaction();
      session.endSession();

      throw new AppError(`${paymentMethod} refund failed: ${refundError.message}`, 500);
    }

    // Update order with refund information
    order.totals.refundAmount = (order.totals.refundAmount || 0) + amount;
    order.payment.status = isPartialRefund ? 'partially_refunded' : 'refunded';
    order.payment.refundId = gatewayRefundId;
    order.payment.refundedAt = new Date();

    if (!isPartialRefund) {
      order.status = 'refunded';
    }

    // Add timeline entry
    order.timeline.push({
      status: 'refunded',
      message: `${isPartialRefund ? 'Partial' : 'Full'} refund processed: ₹${amount}. Reason: ${reason}`,
      timestamp: new Date(),
      metadata: {
        refundAmount: amount,
        gatewayRefundId,
        paymentMethod,
        reason
      }
    });

    // Restore inventory for refunded items
    if (refundItems && refundItems.length > 0) {
      console.log('📦 [REFUND] Restoring inventory for refunded items...');

      for (const refundItem of refundItems) {
        const orderItem = order.items.find(
          (item: any) => item._id.toString() === refundItem.itemId
        );

        if (!orderItem) {
          console.warn('⚠️ [REFUND] Order item not found:', refundItem.itemId);
          continue;
        }

        const quantityToRestore = Math.min(refundItem.quantity, orderItem.quantity);

        if (orderItem.variant) {
          await Product.findOneAndUpdate(
            {
              _id: orderItem.product,
              'inventory.variants': {
                $elemMatch: {
                  type: orderItem.variant.type,
                  value: orderItem.variant.value
                }
              }
            },
            {
              $inc: {
                'inventory.variants.$[variant].stock': quantityToRestore
              }
            },
            {
              session,
              arrayFilters: [{
                'variant.type': orderItem.variant.type,
                'variant.value': orderItem.variant.value
              }]
            }
          );
        } else {
          await Product.findByIdAndUpdate(
            orderItem.product,
            {
              $inc: { 'inventory.stock': quantityToRestore },
              $set: { 'inventory.isAvailable': true }
            },
            { session }
          );
        }

        console.log(`✅ [REFUND] Restored ${quantityToRestore} units for product ${orderItem.product}`);
      }
    } else if (!isPartialRefund) {
      // Full refund - restore all items
      console.log('📦 [REFUND] Full refund - restoring all inventory...');

      for (const orderItem of order.items) {
        if (orderItem.variant) {
          await Product.findOneAndUpdate(
            {
              _id: orderItem.product,
              'inventory.variants': {
                $elemMatch: {
                  type: orderItem.variant.type,
                  value: orderItem.variant.value
                }
              }
            },
            {
              $inc: {
                'inventory.variants.$[variant].stock': orderItem.quantity
              }
            },
            {
              session,
              arrayFilters: [{
                'variant.type': orderItem.variant.type,
                'variant.value': orderItem.variant.value
              }]
            }
          );
        } else {
          await Product.findByIdAndUpdate(
            orderItem.product,
            {
              $inc: { 'inventory.stock': orderItem.quantity },
              $set: { 'inventory.isAvailable': true }
            },
            { session }
          );
        }
      }
    }

    // Create refund audit record
    const user = order.user as any;
    const userId = typeof user === 'string' ? user : user._id?.toString() || user;

    const refundRecord = new Refund({
      order: order._id,
      user: userId,
      orderNumber: order.orderNumber,
      paymentMethod: paymentMethod as 'razorpay' | 'stripe' | 'wallet' | 'cod',
      refundAmount: amount,
      refundType: isPartialRefund ? 'partial' : 'full',
      refundReason: reason,
      gatewayRefundId,
      gatewayStatus: gatewayRefundStatus,
      status: gatewayRefundStatus === 'completed' || gatewayRefundStatus === 'processed' 
        ? 'completed' 
        : gatewayRefundStatus === 'pending_manual_processing' 
        ? 'pending' 
        : 'processing',
      refundedItems: refundItems?.map((item: any) => ({
        itemId: item.itemId,
        productId: order.items.find((oi: any) => oi._id.toString() === item.itemId)?.product,
        quantity: item.quantity,
        refundAmount: (order.items.find((oi: any) => oi._id.toString() === item.itemId)?.price || 0) * item.quantity
      })),
      requestedAt: new Date(),
      processedAt: new Date(),
      completedAt: gatewayRefundStatus === 'completed' || gatewayRefundStatus === 'processed' ? new Date() : undefined,
      processedBy: (req as any).merchantId || (req as any).userId,
      metadata: {
        refundItems: refundItems,
        originalPaymentId: order.payment.transactionId
      }
    });

    await refundRecord.save({ session });
    console.log('✅ [REFUND] Refund audit record created:', refundRecord._id);

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [REFUND] Refund processed successfully');

    // Calculate estimated refund arrival
    const estimatedArrival = new Date();
    if (paymentMethod === 'wallet') {
      estimatedArrival.setDate(estimatedArrival.getDate()); // Instant for wallet
    } else if (paymentMethod === 'cod') {
      estimatedArrival.setDate(estimatedArrival.getDate() + 3); // 3 days for COD
    } else {
      estimatedArrival.setDate(estimatedArrival.getDate() + 7); // 5-7 business days for Razorpay/Stripe
    }

    // Update refund record with estimated arrival
    refundRecord.estimatedArrival = estimatedArrival;
    await refundRecord.save();

    // Send admin notification for COD refunds (after refundRecord is created)
    if (paymentMethod === 'cod') {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await EmailService.sendAdminRefundRequestNotification(
            adminEmail,
            {
              orderNumber: order.orderNumber || (order._id as any)?.toString(),
              refundAmount: amount,
              refundType: 'full',
              refundReason: 'COD refund - requires manual processing',
              customerName: 'Customer',
              refundId: (refundRecord._id as any)?.toString() || ''
            }
          );
          console.log('✅ [REFUND] Admin notified for manual COD refund processing');
        }
      } catch (adminError) {
        console.error('❌ [REFUND] Failed to notify admin for COD refund:', adminError);
      }
    }

    // Send refund confirmation email/SMS
    if (notifyCustomer) {
      try {
        console.log('📧 [REFUND] Sending refund notification to customer...');

        // Populate user data if not already populated
        let user = order.user as any;
        if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
          user = await User.findById(user);
        }

        const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
        const userName = user?.profile?.firstName || user?.fullName || 'Customer';
        const userEmail = user?.email;
        const orderNumber = order.orderNumber || (order._id as any).toString();

        // Send SMS notification
        if (userPhone) {
          console.log('📱 [REFUND] Sending SMS to customer:', userPhone);
          await SMSService.sendRefundNotification(userPhone, orderNumber, amount);
          
          // Update refund record with SMS notification
          refundRecord.notificationsSent.sms = true;
          if (!refundRecord.notificationsSent.sentAt) {
            refundRecord.notificationsSent.sentAt = new Date();
          }
          await refundRecord.save();
        }

        // Send email notification
        if (userEmail && userName) {
          console.log('📧 [REFUND] Sending email to customer:', userEmail);

          await EmailService.sendRefundConfirmation(
            userEmail,
            userName,
            {
              orderNumber: order.orderNumber,
              refundAmount: amount,
              refundType: isPartialRefund ? 'partial' : 'full',
              refundMethod: paymentMethod,
              estimatedArrival: estimatedArrival.toISOString(),
              refundId: gatewayRefundId,
              reason
            }
          );

          // Update refund record with email notification
          refundRecord.notificationsSent.email = true;
          if (!refundRecord.notificationsSent.sentAt) {
            refundRecord.notificationsSent.sentAt = new Date();
          }
          await refundRecord.save();
        }

        console.log('✅ [REFUND] Refund notifications sent successfully');
      } catch (notificationError) {
        console.error('❌ [REFUND] Error sending notifications:', notificationError);
        // Don't fail the refund if notifications fail
      }
    }

    sendSuccess(res, {
      refundId: gatewayRefundId,
      status: gatewayRefundStatus,
      amount,
      orderNumber: order.orderNumber,
      refundType: isPartialRefund ? 'partial' : 'full',
      paymentMethod,
      estimatedArrival,
      remainingRefundableAmount: maxRefundAmount - amount
    }, 'Refund processed successfully');

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ [REFUND] Error:', error);
    throw new AppError(`Refund processing failed: ${error.message}`, 500);
  }
});
