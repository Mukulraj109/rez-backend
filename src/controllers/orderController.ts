import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import stockSocketService from '../services/stockSocketService';
import reorderService from '../services/reorderService';
import activityService from '../services/activityService';
import referralService from '../services/referralService';
import cashbackService from '../services/cashbackService';
import userProductService from '../services/userProductService';
import couponService from '../services/couponService';
import achievementService from '../services/achievementService';
import { StorePromoCoin } from '../models/StorePromoCoin';
import { calculatePromoCoinsEarned, getCoinsExpiryDate } from '../config/promoCoins.config';

// Create new order from cart
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deliveryAddress, paymentMethod, specialInstructions, couponCode, voucherCode } = req.body;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('📦 [CREATE ORDER] Starting order creation for user:', userId);

    // Get user's cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name image images isActive inventory'
      })
      .populate({
        path: 'items.store',
        select: 'name logo'
      })
      .session(session);

    console.log('📦 [CREATE ORDER] Cart found:', cart ? 'Yes' : 'No');
    console.log('📦 [CREATE ORDER] Cart items:', cart?.items.length || 0);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Cart is empty');
    }

    // Validate products availability and build order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for atomic operation

    for (const cartItem of cart.items) {
      const product = cartItem.product as any;
      const store = cartItem.store as any;

      console.log('📦 [CREATE ORDER] Processing cart item:', {
        productId: product?._id,
        productName: product?.name,
        storeId: store?._id,
        storeName: store?.name,
        quantity: cartItem.quantity,
        price: cartItem.price,
        variant: cartItem.variant
      });

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CREATE ORDER] Product is null/undefined for cart item');
        return sendBadRequest(res, 'Invalid product in cart');
      }

      if (!store) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CREATE ORDER] Store is null/undefined for product:', product.name);
        return sendBadRequest(res, `Product "${product.name}" has no associated store`);
      }

      if (!product.isActive) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Product "${product.name}" is not available`);
      }

      // Check stock availability and prepare atomic update
      const requestedQuantity = cartItem.quantity;
      let availableStock = 0;
      let updateQuery: any = {};
      let stockCheckQuery: any = { _id: product._id };

      // Handle variant stock
      if (cartItem.variant && product.inventory?.variants?.length > 0) {
        const variant = product.inventory.variants.find((v: any) =>
          v.type === cartItem.variant?.type && v.value === cartItem.variant?.value
        );

        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Variant not found for product "${product.name}"`);
        }

        availableStock = variant.stock;
        console.log('📦 [CREATE ORDER] Variant stock check:', {
          product: product.name,
          variant: `${variant.type}: ${variant.value}`,
          availableStock,
          requestedQuantity
        });

        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}" (${variant.type}: ${variant.value}). Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for variant stock
        updateQuery = {
          $inc: {
            'inventory.variants.$[variant].stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.variants'] = {
          $elemMatch: {
            type: cartItem.variant.type,
            value: cartItem.variant.value,
            stock: { $gte: requestedQuantity }
          }
        };

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: [{
            'variant.type': cartItem.variant.type,
            'variant.value': cartItem.variant.value
          }]
        });

      } else {
        // Handle main product stock
        availableStock = product.inventory?.stock || 0;
        console.log('📦 [CREATE ORDER] Product stock check:', {
          product: product.name,
          availableStock,
          requestedQuantity
        });

        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for main product stock
        updateQuery = {
          $inc: {
            'inventory.stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.stock'] = { $gte: requestedQuantity };

        // Set isAvailable to false if stock becomes 0
        const newStock = availableStock - requestedQuantity;
        if (newStock === 0) {
          updateQuery.$set = {
            'inventory.isAvailable': false
          };
        }

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: null
        });
      }

      // Get product image - provide default if missing
      const productImage = product.image || product.images?.[0] || 'https://via.placeholder.com/150';

      orderItems.push({
        product: product._id,
        store: store._id,
        name: product.name,
        image: productImage,
        quantity: cartItem.quantity,
        variant: cartItem.variant || undefined,
        price: cartItem.price || 0,
        originalPrice: cartItem.originalPrice || cartItem.price || 0,
        discount: cartItem.discount || 0,
        subtotal: (cartItem.price || 0) * cartItem.quantity
      });
    }

    console.log('📦 [CREATE ORDER] All stock checks passed. Stock will be deducted after payment confirmation.');

    // Note: Stock deduction is now deferred until payment is confirmed
    // This prevents stock being locked for failed payments
    // Stock deduction will happen in paymentService.handlePaymentSuccess()

    // Get base totals from cart
    const subtotal = cart.totals.subtotal || 0;
    const tax = cart.totals.tax || 0;
    const baseDiscount = cart.totals.discount || 0;
    
    // Apply partner benefits to order
    console.log('👥 [PARTNER BENEFITS] Applying partner benefits to order...');
    const partnerBenefitsService = require('../services/partnerBenefitsService').default;
    const partnerBenefits = await partnerBenefitsService.applyPartnerBenefits({
      subtotal,
      deliveryFee: cart.totals.delivery || 0,
      userId: userId.toString()
    });
    
    console.log('👥 [PARTNER BENEFITS] Benefits applied:', {
      cashbackRate: partnerBenefits.cashbackRate,
      cashbackAmount: partnerBenefits.cashbackAmount,
      deliveryFee: partnerBenefits.deliveryFee,
      deliverySavings: partnerBenefits.deliverySavings,
      birthdayDiscount: partnerBenefits.birthdayDiscount,
      totalSavings: partnerBenefits.totalSavings,
      appliedBenefits: partnerBenefits.appliedBenefits
    });
    
    // Use partner-adjusted values
    const deliveryFee = partnerBenefits.deliveryFee;
    let discount = baseDiscount + partnerBenefits.birthdayDiscount;
    const cashback = partnerBenefits.cashbackAmount;
    
    // Apply partner voucher if provided (FIXED: Issue #4 - Voucher redemption)
    let voucherDiscount = 0;
    let voucherApplied = '';
    if (voucherCode) {
      console.log('🎫 [VOUCHER] Attempting to apply voucher:', voucherCode);
      const partnerService = require('../services/partnerService').default;
      const voucherResult = await partnerService.applyVoucher(
        userId.toString(), 
        voucherCode, 
        subtotal
      );
      
      if (voucherResult.valid) {
        voucherDiscount = voucherResult.discount;
        voucherApplied = voucherCode;
        discount += voucherDiscount;
        console.log(`✅ [VOUCHER] Applied ${voucherResult.offerTitle}: ₹${voucherDiscount} discount`);
      } else {
        console.warn(`⚠️ [VOUCHER] Invalid voucher: ${voucherResult.error}`);
        // Don't fail order creation, just don't apply the voucher
      }
    }

    // Calculate total with partner benefits and voucher
    let total = subtotal + tax + deliveryFee - discount;
    if (total < 0) total = 0;
    
    console.log('📦 [CREATE ORDER] Order totals (with partner benefits & voucher):', { 
      subtotal, 
      tax, 
      deliveryFee, 
      discount, 
      voucherDiscount,
      cashback, 
      total,
      partnerBenefitsApplied: partnerBenefits.appliedBenefits,
      voucherApplied
    });

    // Generate order number
    const orderCount = await Order.countDocuments().session(session);
    const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;

    console.log('📦 [CREATE ORDER] Generated order number:', orderNumber);

    // Create order
    const order = new Order({
      orderNumber,
      user: userId,
      items: orderItems,
      totals: {
        subtotal,
        tax,
        delivery: deliveryFee,
        discount,
        cashback,
        total,
        paidAmount: paymentMethod === 'cod' ? 0 : total
      },
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'pending'
      },
      delivery: {
        method: 'standard',
        status: 'pending',
        address: deliveryAddress,
        deliveryFee
      },
      timeline: [{
        status: 'placed',
        message: 'Order placed - awaiting payment',
        timestamp: new Date()
      }],
      status: 'placed',
      couponCode: cart.coupon?.code,
      specialInstructions
    });

    await order.save({ session });

    console.log('📦 [CREATE ORDER] Order saved successfully:', order.orderNumber);
    
    // Mark voucher as used if one was applied
    if (voucherApplied) {
      try {
        console.log('🎫 [VOUCHER] Marking voucher as used:', voucherApplied);
        const partnerService = require('../services/partnerService').default;
        await partnerService.markVoucherUsed(userId.toString(), voucherApplied);
        console.log('✅ [VOUCHER] Voucher marked as used successfully');
      } catch (error) {
        console.error('❌ [VOUCHER] Error marking voucher as used:', error);
        // Don't fail order creation if voucher marking fails
      }
    }
    
    // Check for transaction bonus (every 11 orders)
    // Note: This is checked after order placement, but bonus is only awarded after delivery
    try {
      console.log('🎁 [PARTNER BENEFITS] Checking transaction bonus eligibility...');
      const bonusAmount = await partnerBenefitsService.checkTransactionBonus(userId.toString());
      if (bonusAmount > 0) {
        console.log(`✅ [PARTNER BENEFITS] Transaction bonus will be awarded: ₹${bonusAmount}`);
      }
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error checking transaction bonus:', error);
      // Don't fail order creation if bonus check fails
    }

    // Note: Cart is NOT cleared here - it will be cleared after successful payment
    // This allows users to retry payment if it fails

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [CREATE ORDER] Transaction committed successfully');
    console.log('💳 [CREATE ORDER] Order created with status "pending_payment"');
    console.log('📌 [CREATE ORDER] Stock will be deducted after payment confirmation');

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name image images')
      .populate('items.store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');

    console.log('📦 [CREATE ORDER] Order creation complete');

    // Mark coupon as used if one was applied
    if (cart.coupon?.code) {
      console.log('🎟️ [CREATE ORDER] Marking coupon as used:', cart.coupon.code);
      await couponService.markCouponAsUsed(
        new Types.ObjectId(userId),
        cart.coupon.code,
        order._id as Types.ObjectId
      );
    }

    // Create activity for order placement
    if (populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      await activityService.order.onOrderPlaced(
        new Types.ObjectId(userId),
        populatedOrder._id as Types.ObjectId,
        storeName,
        total
      );
    }

    // Trigger achievement update for order creation
    try {
      await achievementService.triggerAchievementUpdate(userId, 'order_created');
    } catch (error) {
      console.error('❌ [ORDER] Error triggering achievement update:', error);
    }

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('❌ [CREATE ORDER] Error:', error);
    console.error('❌ [CREATE ORDER] Error message:', error.message);
    console.error('❌ [CREATE ORDER] Error stack:', error.stack);
    console.error('❌ [CREATE ORDER] Error name:', error.name);

    // Log more details about the error
    if (error.name === 'TypeError') {
      console.error('❌ [CREATE ORDER] This is a TypeError - likely null/undefined access');
    }

    throw new AppError(`Failed to create order: ${error.message}`, 500);
  }
});

// Get user's orders
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('items.product', 'name images basePrice')
      .populate('items.store', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Orders retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch orders', 500);
  }
});

// Get single order by ID
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    })
    .populate('items.product', 'name images basePrice description')
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
    .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    sendSuccess(res, order, 'Order retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order', 500);
  }
});

// Cancel order
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason } = req.body;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🚫 [CANCEL ORDER] Starting cancellation for order:', orderId);

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).session(session);

    console.log('🚫 [CANCEL ORDER] Order found:', order ? 'Yes' : 'No');

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Order not found');
    }

    console.log('🚫 [CANCEL ORDER] Current status:', order.status);

    // Check if order can be cancelled
    if (!['placed', 'confirmed', 'preparing'].includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Order cannot be cancelled at this stage');
    }

    console.log('🚫 [CANCEL ORDER] Updating order status to cancelled');

    // Restore stock for cancelled order items
    console.log('🚫 [CANCEL ORDER] Restoring stock for order items...');
    const stockRestorations: Array<{ productId: string; storeId: string; newStock: number; productName: string }> = [];

    for (const orderItem of order.items) {
      const productId = orderItem.product;
      const quantity = orderItem.quantity;
      const variant = orderItem.variant;

      console.log('🚫 [CANCEL ORDER] Restoring stock for:', {
        productId,
        quantity,
        variant
      });

      if (variant) {
        // Restore variant stock
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            'inventory.variants': {
              $elemMatch: {
                type: variant.type,
                value: variant.value
              }
            }
          },
          {
            $inc: {
              'inventory.variants.$[variant].stock': quantity
            }
          },
          {
            session,
            new: true,
            arrayFilters: [{
              'variant.type': variant.type,
              'variant.value': variant.value
            }]
          }
        );

        if (updateResult) {
          console.log('✅ [CANCEL ORDER] Variant stock restored for product:', productId);
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
          console.warn('⚠️ [CANCEL ORDER] Could not restore variant stock for product:', productId);
        }
      } else {
        // Restore main product stock
        const updateResult = await Product.findByIdAndUpdate(
          productId,
          {
            $inc: {
              'inventory.stock': quantity
            },
            $set: {
              'inventory.isAvailable': true
            }
          },
          {
            session,
            new: true
          }
        );

        if (updateResult) {
          console.log('✅ [CANCEL ORDER] Product stock restored for product:', productId);
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
          console.warn('⚠️ [CANCEL ORDER] Could not restore stock for product:', productId);
        }
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Customer request';

    console.log('🚫 [CANCEL ORDER] Saving order...');

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [CANCEL ORDER] Order cancelled and stock restored successfully');

    // Emit Socket.IO events for stock restorations after transaction success
    for (const restoration of stockRestorations) {
      try {
        console.log('🔌 [CANCEL ORDER] Emitting stock update via Socket.IO:', restoration);
        stockSocketService.emitStockUpdate(
          restoration.productId,
          restoration.newStock,
          {
            storeId: restoration.storeId,
            reason: 'return'
          }
        );
      } catch (socketError) {
        // Log but don't fail the cancellation if socket emission fails
        console.error('❌ [CANCEL ORDER] Socket emission failed:', socketError);
      }
    }

    // Create activity for order cancellation
    const storeData = order.items[0]?.store as any;
    const storeName = storeData?.name || storeData?.toString() || 'Store';
    await activityService.order.onOrderCancelled(
      new Types.ObjectId(userId),
      order._id as Types.ObjectId,
      storeName
    );

    sendSuccess(res, order, 'Order cancelled successfully');

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('❌ [CANCEL ORDER] Error:', error);
    console.error('❌ [CANCEL ORDER] Error message:', error.message);
    console.error('❌ [CANCEL ORDER] Error stack:', error.stack);
    throw new AppError(`Failed to cancel order: ${error.message}`, 500);
  }
});

// Update order status (admin/store owner)
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, estimatedDeliveryTime, trackingInfo } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Update status
    order.status = status;

    // Update tracking info if provided
    if (trackingInfo) {
      order.tracking = {
        ...order.tracking,
        ...trackingInfo,
        lastUpdated: new Date()
      };
    }

    // Update estimated delivery time
    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }

    // Set delivery time if status is delivered
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('items.store', 'name')
      .populate('user', 'profile.firstName profile.lastName');

    // Create activity for order delivery
    if (status === 'delivered' && populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const userIdObj = typeof populatedOrder.user === 'object' ? (populatedOrder.user as any)._id : populatedOrder.user;
      await activityService.order.onOrderDelivered(
        userIdObj as Types.ObjectId,
        populatedOrder._id as Types.ObjectId,
        storeName
      );

      // Process referral rewards when order is delivered
      try {
        // Check if this is referee's first order (process referral completion)
        await referralService.processFirstOrder({
          refereeId: userIdObj as Types.ObjectId,
          orderId: populatedOrder._id as Types.ObjectId,
          orderAmount: populatedOrder.totals.total,
        });

        // Check for milestone bonus (3rd order)
        const deliveredOrdersCount = await Order.countDocuments({
          user: userIdObj,
          status: 'delivered',
        });

        if (deliveredOrdersCount >= 3) {
          await referralService.processMilestoneBonus(
            userIdObj as Types.ObjectId,
            deliveredOrdersCount
          );
        }
      } catch (error) {
        console.error('❌ [ORDER] Error processing referral rewards:', error);
        // Don't fail the order update if referral processing fails
      }

      // Create cashback for delivered order
      try {
        console.log('💰 [ORDER] Creating cashback for delivered order:', populatedOrder._id);
        await cashbackService.createCashbackFromOrder(populatedOrder._id as Types.ObjectId);
        console.log('✅ [ORDER] Cashback created successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error creating cashback:', error);
        // Don't fail the order update if cashback creation fails
      }

      // Create user products for delivered order
      try {
        console.log('📦 [ORDER] Creating user products for delivered order:', populatedOrder._id);
        await userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId);
        console.log('✅ [ORDER] User products created successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error creating user products:', error);
        // Don't fail the order update if user product creation fails
      }

      // Award store promo coins for delivered order
      try {
        console.log('💎 [ORDER] Awarding store promo coins for delivered order:', populatedOrder._id);
        
        // Calculate promo coins to be earned
        const orderValue = populatedOrder.totals.total;
        const coinsToEarn = calculatePromoCoinsEarned(orderValue);
        
        if (coinsToEarn > 0) {
          // Get store ID from first item (assuming single store per order)
          const firstItem = populatedOrder.items[0];
          const storeId = typeof firstItem.store === 'object' 
            ? (firstItem.store as any)._id 
            : firstItem.store;
          
          if (storeId) {
            // Award promo coins
            await StorePromoCoin.earnCoins(
              userIdObj as Types.ObjectId,
              storeId as Types.ObjectId,
              coinsToEarn,
              populatedOrder._id as Types.ObjectId
            );
            
            console.log(`✅ [ORDER] Awarded ${coinsToEarn} promo coins from store ${storeId}`);
          } else {
            console.warn('⚠️ [ORDER] Could not determine store ID for promo coins');
          }
        } else {
          console.log('ℹ️ [ORDER] Order value too low for promo coins or promo coins disabled');
        }
      } catch (error) {
        console.error('❌ [ORDER] Error awarding promo coins:', error);
        // Don't fail the order update if promo coin creation fails
      }

      // Trigger achievement update for order delivery
      try {
        await achievementService.triggerAchievementUpdate(populatedOrder.user, 'order_delivered');
      } catch (error) {
        console.error('❌ [ORDER] Error triggering achievement update:', error);
      }

      // Update partner progress for order delivery
      try {
        const partnerService = require('../services/partnerService').default;
        const orderId = populatedOrder._id as Types.ObjectId;
        await partnerService.updatePartnerProgress(
          userIdObj.toString(),
          orderId.toString()
        );
        console.log('✅ [ORDER] Partner progress updated successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error updating partner progress:', error);
        // Don't fail the order update if partner progress update fails
      }
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');

  } catch (error) {
    throw new AppError('Failed to update order status', 500);
  }
});

// Get order tracking info
export const getOrderTracking = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    })
    .select('status tracking estimatedDeliveryTime deliveredAt createdAt items')
    .populate('items.product', 'name images')
    .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Create tracking timeline
    const timeline = [
      {
        status: 'pending',
        title: 'Order Placed',
        description: 'Your order has been placed successfully',
        timestamp: order.createdAt,
        completed: true
      },
      {
        status: 'confirmed',
        title: 'Order Confirmed',
        description: 'Store has confirmed your order',
        timestamp: order.status !== 'placed' ? order.createdAt : null,
        completed: !['placed'].includes(order.status)
      },
      {
        status: 'preparing',
        title: 'Preparing',
        description: 'Your order is being prepared',
        timestamp: null,
        completed: !['pending', 'confirmed'].includes(order.status)
      },
      {
        status: 'shipped',
        title: 'Shipped',
        description: 'Your order has been shipped',
        timestamp: null,
        completed: ['delivered'].includes(order.status)
      },
      {
        status: 'delivered',
        title: 'Delivered',
        description: 'Order delivered successfully',
        timestamp: order.deliveredAt,
        completed: order.status === 'delivered'
      }
    ];

    sendSuccess(res, {
      orderId: order._id,
      currentStatus: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      timeline,
      tracking: order.tracking
    }, 'Order tracking retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order tracking', 500);
  }
});

// Rate and review order
export const rateOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { rating, review } = req.body;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    });

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    if (order.status !== 'delivered') {
      return sendBadRequest(res, 'Can only rate delivered orders');
    }

    if (order.rating) {
      return sendBadRequest(res, 'Order already rated');
    }

    // Update order with rating
    order.rating = {
      score: Number(rating),
      review,
      ratedAt: new Date()
    };

    await order.save();

    // Update partner review task progress
    try {
      const partnerService = require('../services/partnerService').default;
      const Partner = require('../models/Partner').default;
      
      const partner = await Partner.findOne({ userId });
      if (partner) {
        const reviewTask = partner.tasks.find((t: any) => t.type === 'review');
        if (reviewTask && reviewTask.progress.current < reviewTask.progress.target) {
          reviewTask.progress.current += 1;
          
          if (reviewTask.progress.current >= reviewTask.progress.target) {
            reviewTask.completed = true;
            reviewTask.completedAt = new Date();
          }
          
          await partner.save();
          console.log('✅ [REVIEW] Partner review task updated:', reviewTask.progress.current, '/', reviewTask.progress.target);
        }
      }
    } catch (error) {
      console.error('❌ [REVIEW] Error updating partner review task:', error);
      // Don't fail the review if partner update fails
    }

    sendSuccess(res, order, 'Order rated successfully');

  } catch (error) {
    throw new AppError('Failed to rate order', 500);
  }
});

// Get order statistics for user
export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const stats = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing', 'shipped']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const userStats = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    // Get recent orders
    const recentOrders = await Order.find({ user: userId })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, {
      stats: userStats,
      recentOrders
    }, 'Order statistics retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order statistics', 500);
  }
});

// Re-order full order
export const reorderFullOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    console.log('🔄 [REORDER] Starting full order reorder:', { userId, orderId });

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId);

    console.log('✅ [REORDER] Full order reorder complete:', {
      addedItems: result.addedItems.length,
      skippedItems: result.skippedItems.length
    });

    sendSuccess(res, result, 'Items added to cart successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Full order reorder error:', error);
    throw error;
  }
});

// Re-order selected items
export const reorderItems = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.body;
  const userId = req.userId!;

  try {
    console.log('🔄 [REORDER] Starting selective reorder:', { userId, orderId, itemIds });

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return sendBadRequest(res, 'Item IDs are required');
    }

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId, itemIds);

    console.log('✅ [REORDER] Selective reorder complete:', {
      addedItems: result.addedItems.length,
      skippedItems: result.skippedItems.length
    });

    sendSuccess(res, result, 'Selected items added to cart successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Selective reorder error:', error);
    throw error;
  }
});

// Validate reorder (check availability and prices)
export const validateReorder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.query;
  const userId = req.userId!;

  try {
    console.log('🔍 [REORDER] Validating reorder:', { userId, orderId, itemIds });

    let selectedItemIds: string[] | undefined;
    if (itemIds) {
      selectedItemIds = Array.isArray(itemIds) ? itemIds as string[] : [itemIds as string];
    }

    const validation = await reorderService.validateReorder(userId, orderId, selectedItemIds);

    console.log('✅ [REORDER] Validation complete:', {
      canReorder: validation.canReorder,
      itemCount: validation.items.length
    });

    sendSuccess(res, validation, 'Reorder validation complete');

  } catch (error: any) {
    console.error('❌ [REORDER] Validation error:', error);
    throw error;
  }
});

// Get frequently ordered items
export const getFrequentlyOrdered = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  try {
    console.log('📊 [REORDER] Getting frequently ordered items:', { userId, limit });

    const items = await reorderService.getFrequentlyOrdered(userId, Number(limit));

    console.log('✅ [REORDER] Frequently ordered items retrieved:', items.length);

    sendSuccess(res, items, 'Frequently ordered items retrieved successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Frequently ordered error:', error);
    throw error;
  }
});

// Get reorder suggestions
export const getReorderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    console.log('💡 [REORDER] Getting reorder suggestions:', { userId });

    const suggestions = await reorderService.getReorderSuggestions(userId);

    console.log('✅ [REORDER] Reorder suggestions retrieved:', suggestions.length);

    sendSuccess(res, suggestions, 'Reorder suggestions retrieved successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Suggestions error:', error);
    throw error;
  }
});