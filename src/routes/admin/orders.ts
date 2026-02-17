import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { isSocketInitialized, getIO } from '../../config/socket';
import { Product } from '../../models/Product';
import { Wallet } from '../../models/Wallet';
import { Subscription } from '../../models/Subscription';
import activityService from '../../services/activityService';
import referralService from '../../services/referralService';
import cashbackService from '../../services/cashbackService';
import userProductService from '../../services/userProductService';
import achievementService from '../../services/achievementService';
import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus } from '../../config/promoCoins.config';
import merchantWalletService from '../../services/merchantWalletService';
import orderSocketService from '../../services/orderSocketService';
import { Store } from '../../models/Store';

const router = Router();

// Valid order statuses and allowed transitions
const ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'] as const;
const STATUS_TRANSITIONS: { [key: string]: string[] } = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['delivered', 'returned'],
  delivered: ['returned', 'refunded'],
  cancelled: ['refunded'],
  returned: ['refunded'],
  refunded: []
};

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all platform orders with filters
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Payment status filter
    if (req.query.paymentStatus) {
      filter['payment.status'] = req.query.paymentStatus;
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(req.query.dateTo as string);
      }
    }

    // Search by order number
    if (req.query.search) {
      filter.orderNumber = { $regex: req.query.search, $options: 'i' };
    }

    // Fulfillment type filter
    if (req.query.fulfillmentType) {
      filter.fulfillmentType = req.query.fulfillmentType;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'profile.firstName profile.lastName phoneNumber email')
        .populate('items.store', 'name slug logo')
        .select('orderNumber status totals payment.status payment.method payment.coinsUsed createdAt user items fulfillmentType fulfillmentDetails'),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
});

/**
 * @route   GET /api/admin/orders/stats
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $facet: {
          // Status breakdown
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          // Payment status breakdown
          byPaymentStatus: [
            { $group: { _id: '$payment.status', count: { $sum: 1 } } }
          ],
          // Today's stats
          today: [
            { $match: { createdAt: { $gte: today } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: '$totals.total' },
                platformFees: { $sum: '$totals.platformFee' }
              }
            }
          ],
          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalRevenue: { $sum: '$totals.total' },
                totalPlatformFees: { $sum: '$totals.platformFee' },
                avgOrderValue: { $avg: '$totals.total' }
              }
            }
          ]
        }
      }
    ]);

    // Transform results
    const result = {
      byStatus: stats[0].byStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPaymentStatus: stats[0].byPaymentStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      today: stats[0].today[0] || { count: 0, revenue: 0, platformFees: 0 },
      overall: stats[0].overall[0] || { total: 0, totalRevenue: 0, totalPlatformFees: 0, avgOrderValue: 0 }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order stats'
    });
  }
});

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Get single order details
 * @access  Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'profile phoneNumber email')
      .populate('items.product', 'name images')
      .populate('items.store', 'name logo');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order'
    });
  }
});

/**
 * @route   POST /api/admin/orders/:id/refund
 * @desc    Process refund for an order
 * @access  Admin
 */
router.post('/:id/refund', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    // Validate required fields
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be refunded
    if (order.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded'
      });
    }

    if (order.payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been refunded'
      });
    }

    // Calculate refund amount
    const refundAmount = order.calculateRefund ? order.calculateRefund() : order.totals.paidAmount;

    // If paid with wallet, credit back to user's wallet
    if (order.payment.method === 'wallet' && order.user) {
      const user = await User.findById(order.user);
      if (user) {
        user.wallet.balance += refundAmount;
        user.wallet.totalEarned += refundAmount;
        user.walletBalance = user.wallet.balance;
        await user.save();
        console.log(`💰 [ADMIN ORDERS] Refunded ${refundAmount} to user ${user._id} wallet`);
      }
    }

    // Update order status and payment status
    order.status = 'refunded';
    order.payment.status = 'refunded';
    order.payment.refundedAt = new Date();
    order.totals.refundAmount = refundAmount;

    // Add timeline entry
    order.timeline.push({
      status: 'refunded',
      message: `Order refunded. Reason: ${reason.trim()}`,
      timestamp: new Date(),
      updatedBy: 'admin',
      metadata: {
        refundAmount,
        reason: reason.trim(),
        paymentMethod: order.payment.method
      }
    });

    // Update cancellation info if exists
    if (order.cancellation) {
      order.cancellation.refundAmount = refundAmount;
      order.cancellation.refundStatus = 'completed';
    }

    await order.save();

    // Emit real-time notification to consumer app
    if (isSocketInitialized()) {
      getIO().emit('order_refunded', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.user,
        refundAmount,
        message: `Your order ${order.orderNumber} has been refunded (₹${refundAmount})`,
      });
    }

    console.log(`✅ [ADMIN ORDERS] Order ${order.orderNumber} refunded successfully`);

    res.json({
      success: true,
      message: 'Order refunded successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        refundAmount,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
});

/**
 * @route   POST /api/admin/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Admin
 */
router.post('/:id/cancel', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    // Validate required fields
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled (not delivered)
    const nonCancellableStatuses = ['delivered', 'cancelled', 'refunded'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status '${order.status}'. Orders that are delivered, already cancelled, or refunded cannot be cancelled.`
      });
    }

    // Restore inventory stock for each item
    const stockRestorePromises = order.items.map(async (item) => {
      try {
        const product = await Product.findById(item.product);
        if (product && !product.inventory.unlimited) {
          // Restore the stock
          product.inventory.stock += item.quantity;
          product.inventory.isAvailable = true;

          // If item has variant, restore variant stock too
          if (item.variant && product.inventory.variants) {
            const variant = product.inventory.variants.find(
              (v: { type: string; value: string }) => v.type === item.variant?.type && v.value === item.variant?.value
            );
            if (variant) {
              variant.stock += item.quantity;
              variant.isAvailable = true;
            }
          }

          await product.save();
          console.log(`📦 [ADMIN ORDERS] Restored ${item.quantity} units to product ${product._id}`);
        }
      } catch (err) {
        console.error(`⚠️ [ADMIN ORDERS] Failed to restore stock for product ${item.product}:`, err);
      }
    });

    await Promise.all(stockRestorePromises);

    // Update order status
    order.status = 'cancelled';
    order.cancelReason = reason.trim();
    order.cancelledAt = new Date();
    order.delivery.status = 'failed';

    // Update cancellation object
    order.cancellation = {
      reason: reason.trim(),
      cancelledAt: new Date(),
      refundStatus: order.payment.status === 'paid' ? 'pending' : 'not_applicable'
    };

    // Add timeline entry
    order.timeline.push({
      status: 'cancelled',
      message: `Order cancelled by admin. Reason: ${reason.trim()}`,
      timestamp: new Date(),
      updatedBy: 'admin',
      metadata: {
        reason: reason.trim(),
        itemsRestored: order.items.length
      }
    });

    await order.save();

    console.log(`✅ [ADMIN ORDERS] Order ${order.orderNumber} cancelled successfully`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelReason: order.cancelReason,
        cancelledAt: order.cancelledAt,
        itemsRestored: order.items.length
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/:id/status', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;

    // Validate required fields
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status value
    if (!ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number])) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status) && order.status !== status) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${order.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      });
    }

    // If status is same as current, no update needed
    if (order.status === status) {
      return res.json({
        success: true,
        message: 'Order status is already set to this value',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        }
      });
    }

    const previousStatus = order.status;

    // Update status using the model method if available, otherwise update directly
    if (order.updateStatus) {
      await order.updateStatus(status, notes ? `Admin update: ${notes}` : undefined, 'admin');
    } else {
      // Direct update
      order.status = status as typeof ORDER_STATUSES[number];

      // Update delivery status based on order status
      const deliveryStatusMap: { [key: string]: string } = {
        confirmed: 'confirmed',
        preparing: 'preparing',
        ready: 'ready',
        dispatched: 'dispatched',
        delivered: 'delivered',
        cancelled: 'failed',
        returned: 'returned'
      };

      if (deliveryStatusMap[status]) {
        order.delivery.status = deliveryStatusMap[status] as any;
      }

      // Set timestamps for specific statuses
      if (status === 'dispatched') {
        order.delivery.dispatchedAt = new Date();
      } else if (status === 'delivered') {
        order.delivery.deliveredAt = new Date();
        order.delivery.actualTime = new Date();
      } else if (status === 'cancelled') {
        order.cancelledAt = new Date();
      } else if (status === 'returned') {
        order.returnedAt = new Date();
      }

      // Add timeline entry
      order.timeline.push({
        status,
        message: notes ? `Status updated to ${status}. Notes: ${notes}` : `Status updated to ${status}`,
        timestamp: new Date(),
        updatedBy: 'admin',
        metadata: {
          previousStatus,
          notes: notes || undefined
        }
      });

      await order.save();
    }

    console.log(`✅ [ADMIN ORDERS] Order ${order.orderNumber} status updated from '${previousStatus}' to '${status}'`);

    // If status changed to 'delivered', trigger all delivery rewards
    if (status === 'delivered') {
      const populatedOrder = await Order.findById(order._id)
        .populate('items.product', 'name images')
        .populate('items.store', 'name logo')
        .populate('user', 'profile.firstName profile.lastName');

      if (populatedOrder) {
        const storeData = populatedOrder.items[0]?.store as any;
        const storeName = storeData?.name || 'Store';
        const userIdObj = typeof populatedOrder.user === 'object' ? (populatedOrder.user as any)._id : populatedOrder.user;

        // 1. Activity logging
        try {
          await activityService.order.onOrderDelivered(
            userIdObj as Types.ObjectId,
            populatedOrder._id as Types.ObjectId,
            storeName
          );
        } catch (err) {
          console.error('[ADMIN ORDERS] Activity logging failed:', err);
        }

        // 2. Referral rewards
        try {
          await referralService.processFirstOrder({
            refereeId: userIdObj as Types.ObjectId,
            orderId: populatedOrder._id as Types.ObjectId,
            orderAmount: populatedOrder.totals.total,
          });
          const deliveredOrdersCount = await Order.countDocuments({ user: userIdObj, status: 'delivered' });
          if (deliveredOrdersCount >= 3) {
            await referralService.processMilestoneBonus(userIdObj as Types.ObjectId, deliveredOrdersCount);
          }
        } catch (err) {
          console.error('[ADMIN ORDERS] Referral rewards failed:', err);
        }

        // 3. Award 5% purchase reward coins (5% of subtotal)
        try {
          const coinService = require('../../services/coinService');
          const coinsToAward = Math.floor(populatedOrder.totals.subtotal * 0.05);
          if (coinsToAward > 0) {
            await coinService.awardCoins(
              userIdObj.toString(),
              coinsToAward,
              'purchase_reward',
              `5% purchase reward for order ${populatedOrder.orderNumber}`,
              { orderId: populatedOrder._id }
            );
            console.log(`[ADMIN ORDERS] Awarded ${coinsToAward} purchase reward coins`);
          }
        } catch (err) {
          console.error('[ADMIN ORDERS] Purchase reward coins failed:', err);
        }

        // 4. Create cashback
        try {
          await cashbackService.createCashbackFromOrder(populatedOrder._id as Types.ObjectId);
        } catch (err) {
          console.error('[ADMIN ORDERS] Cashback creation failed:', err);
        }

        // 5. Create user products
        try {
          await userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId);
        } catch (err) {
          console.error('[ADMIN ORDERS] User products creation failed:', err);
        }

        // 6. Award store branded coins
        try {
          let userTier = 'free';
          try {
            const subscription = await Subscription.findOne({ user: userIdObj, status: 'active' }).select('tier');
            if (subscription?.tier) userTier = subscription.tier;
          } catch (tierErr) { /* use free */ }

          const orderValue = populatedOrder.totals.total;
          const coinsToEarn = calculatePromoCoinsWithTierBonus(orderValue, userTier);
          if (coinsToEarn > 0) {
            const storeId = typeof storeData === 'object' ? storeData._id : storeData;
            const storeLogo = typeof storeData === 'object' ? storeData.logo : undefined;
            if (storeId) {
              const wallet = await Wallet.findOne({ user: userIdObj });
              if (wallet) {
                await wallet.addBrandedCoins(
                  new Types.ObjectId(storeId.toString()),
                  storeName,
                  coinsToEarn,
                  storeLogo
                );
              }
            }
          }
        } catch (err) {
          console.error('[ADMIN ORDERS] Branded coins failed:', err);
        }

        // 7. Achievement update
        try {
          await achievementService.triggerAchievementUpdate(populatedOrder.user, 'order_delivered');
        } catch (err) {
          console.error('[ADMIN ORDERS] Achievement update failed:', err);
        }

        // 8. Partner progress
        try {
          const partnerService = require('../../services/partnerService').default;
          await partnerService.updatePartnerProgress(
            userIdObj.toString(),
            (populatedOrder._id as Types.ObjectId).toString()
          );
        } catch (err) {
          console.error('[ADMIN ORDERS] Partner progress failed:', err);
        }

        // 9. Credit merchant wallet (subtotal minus 15% platform fee)
        try {
          const firstItem = populatedOrder.items[0];
          if (firstItem && firstItem.store) {
            const storeId = typeof firstItem.store === 'object'
              ? (firstItem.store as any)._id
              : firstItem.store;

            const store = await Store.findById(storeId);
            if (store && store.merchantId) {
              const grossAmount = populatedOrder.totals.subtotal || 0;
              const platformFee = populatedOrder.totals.platformFee || 0;

              const walletResult = await merchantWalletService.creditOrderPayment(
                store.merchantId.toString(),
                populatedOrder._id as Types.ObjectId,
                populatedOrder.orderNumber,
                grossAmount,
                platformFee,
                storeId
              );

              console.log(`[ADMIN ORDERS] Merchant wallet credited: gross=${grossAmount}, fee=${platformFee}, net=${grossAmount - platformFee}`);

              if (walletResult) {
                orderSocketService.emitMerchantWalletUpdated({
                  merchantId: store.merchantId.toString(),
                  storeId: storeId.toString(),
                  storeName: store.name,
                  transactionType: 'credit',
                  amount: grossAmount - platformFee,
                  orderId: (populatedOrder._id as Types.ObjectId).toString(),
                  orderNumber: populatedOrder.orderNumber,
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
        } catch (err) {
          console.error('[ADMIN ORDERS] Merchant wallet credit failed:', err);
        }

        // 10. Credit 5% admin commission (5% of subtotal)
        try {
          const adminWalletService = require('../../services/adminWalletService').default;
          const subtotal = populatedOrder.totals.subtotal || 0;
          const adminCommission = Math.floor(subtotal * 0.05);
          if (adminCommission > 0) {
            await adminWalletService.creditOrderCommission(
              populatedOrder._id as Types.ObjectId,
              populatedOrder.orderNumber,
              subtotal
            );
            console.log(`[ADMIN ORDERS] Admin wallet credited: ${adminCommission}`);
          }
        } catch (err) {
          console.error('[ADMIN ORDERS] Admin commission credit failed:', err);
        }

        console.log(`✅ [ADMIN ORDERS] All delivery rewards processed for order ${order.orderNumber}`);
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        previousStatus,
        status: order.status,
        deliveryStatus: order.delivery.status,
        notes: notes || null
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN ORDERS] Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
});

export default router;
