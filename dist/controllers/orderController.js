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
exports.getRefundDetails = exports.getUserRefunds = exports.requestRefund = exports.getReorderSuggestions = exports.getFrequentlyOrdered = exports.validateReorder = exports.reorderItems = exports.reorderFullOrder = exports.getOrderStats = exports.rateOrder = exports.getOrderTracking = exports.updateOrderStatus = exports.cancelOrder = exports.getOrderById = exports.getUserOrders = exports.createOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Order_1 = require("../models/Order");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const stockSocketService_1 = __importDefault(require("../services/stockSocketService"));
const reorderService_1 = __importDefault(require("../services/reorderService"));
const activityService_1 = __importDefault(require("../services/activityService"));
const referralService_1 = __importDefault(require("../services/referralService"));
const cashbackService_1 = __importDefault(require("../services/cashbackService"));
const userProductService_1 = __importDefault(require("../services/userProductService"));
const couponService_1 = __importDefault(require("../services/couponService"));
const achievementService_1 = __importDefault(require("../services/achievementService"));
const StorePromoCoin_1 = require("../models/StorePromoCoin");
const promoCoins_config_1 = require("../config/promoCoins.config");
const SMSService_1 = require("../services/SMSService");
const EmailService_1 = __importDefault(require("../services/EmailService"));
const Store_1 = require("../models/Store");
const Refund_1 = require("../models/Refund");
// Create new order from cart
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { deliveryAddress, paymentMethod, specialInstructions, couponCode, voucherCode } = req.body;
    // Start a MongoDB session for transaction
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        console.log('📦 [CREATE ORDER] Starting order creation for user:', userId);
        // Get user's cart
        const cart = await Cart_1.Cart.findOne({ user: userId })
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
            return (0, response_1.sendBadRequest)(res, 'Cart is empty');
        }
        // Validate products availability and build order items
        const orderItems = [];
        const stockUpdates = []; // Track stock updates for atomic operation
        for (const cartItem of cart.items) {
            const product = cartItem.product;
            const store = cartItem.store;
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
                return (0, response_1.sendBadRequest)(res, 'Invalid product in cart');
            }
            if (!store) {
                await session.abortTransaction();
                session.endSession();
                console.error('❌ [CREATE ORDER] Store is null/undefined for product:', product.name);
                return (0, response_1.sendBadRequest)(res, `Product "${product.name}" has no associated store`);
            }
            if (!product.isActive) {
                await session.abortTransaction();
                session.endSession();
                return (0, response_1.sendBadRequest)(res, `Product "${product.name}" is not available`);
            }
            // Check stock availability and prepare atomic update
            const requestedQuantity = cartItem.quantity;
            let availableStock = 0;
            let updateQuery = {};
            let stockCheckQuery = { _id: product._id };
            // Handle variant stock
            if (cartItem.variant && product.inventory?.variants?.length > 0) {
                const variant = product.inventory.variants.find((v) => v.type === cartItem.variant?.type && v.value === cartItem.variant?.value);
                if (!variant) {
                    await session.abortTransaction();
                    session.endSession();
                    return (0, response_1.sendBadRequest)(res, `Variant not found for product "${product.name}"`);
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
                    return (0, response_1.sendBadRequest)(res, `Insufficient stock for "${product.name}" (${variant.type}: ${variant.value}). Available: ${availableStock}, Requested: ${requestedQuantity}`);
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
            }
            else {
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
                    return (0, response_1.sendBadRequest)(res, `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${requestedQuantity}`);
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
            const voucherResult = await partnerService.applyVoucher(userId.toString(), voucherCode, subtotal);
            if (voucherResult.valid) {
                voucherDiscount = voucherResult.discount;
                voucherApplied = voucherCode;
                discount += voucherDiscount;
                console.log(`✅ [VOUCHER] Applied ${voucherResult.offerTitle}: ₹${voucherDiscount} discount`);
            }
            else {
                console.warn(`⚠️ [VOUCHER] Invalid voucher: ${voucherResult.error}`);
                // Don't fail order creation, just don't apply the voucher
            }
        }
        // Calculate total with partner benefits and voucher
        let total = subtotal + tax + deliveryFee - discount;
        if (total < 0)
            total = 0;
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
        const orderCount = await Order_1.Order.countDocuments().session(session);
        const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;
        console.log('📦 [CREATE ORDER] Generated order number:', orderNumber);
        // Create order
        const order = new Order_1.Order({
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
            }
            catch (error) {
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
        }
        catch (error) {
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
        const populatedOrder = await Order_1.Order.findById(order._id)
            .populate('items.product', 'name image images')
            .populate('items.store', 'name logo')
            .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');
        console.log('📦 [CREATE ORDER] Order creation complete');
        // Mark coupon as used if one was applied
        if (cart.coupon?.code) {
            console.log('🎟️ [CREATE ORDER] Marking coupon as used:', cart.coupon.code);
            await couponService_1.default.markCouponAsUsed(new mongoose_1.Types.ObjectId(userId), cart.coupon.code, order._id);
        }
        // Create activity for order placement
        if (populatedOrder) {
            const storeData = populatedOrder.items[0]?.store;
            const storeName = storeData?.name || 'Store';
            await activityService_1.default.order.onOrderPlaced(new mongoose_1.Types.ObjectId(userId), populatedOrder._id, storeName, total);
        }
        // Trigger achievement update for order creation
        try {
            await achievementService_1.default.triggerAchievementUpdate(userId, 'order_created');
        }
        catch (error) {
            console.error('❌ [ORDER] Error triggering achievement update:', error);
        }
        // Send notifications to customer and merchant
        try {
            const user = populatedOrder?.user;
            const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
            const userName = user?.profile?.firstName || user?.fullName || 'Customer';
            const userEmail = user?.email;
            const storeData = populatedOrder?.items[0]?.store;
            const storeName = storeData?.name || 'Store';
            const orderNumber = populatedOrder?.orderNumber || order._id.toString();
            // Send SMS to customer
            if (userPhone) {
                console.log('📱 [ORDER] Sending order confirmation SMS to customer...');
                await SMSService_1.SMSService.sendOrderConfirmation(userPhone, orderNumber, storeName);
            }
            // Send email to customer
            if (userEmail && userName) {
                console.log('📧 [ORDER] Sending order confirmation email to customer...');
                const orderItems = populatedOrder?.items.map((item) => ({
                    name: item.product?.name || 'Product',
                    quantity: item.quantity,
                    price: item.price * item.quantity
                })) || [];
                await EmailService_1.default.sendOrderConfirmation(userEmail, userName, {
                    orderId: order._id.toString(),
                    orderNumber,
                    items: orderItems,
                    subtotal: populatedOrder?.totals?.subtotal || 0,
                    deliveryFee: populatedOrder?.delivery?.deliveryFee || 0,
                    total: populatedOrder?.totals?.total || 0,
                    estimatedDelivery: 'Within 30-45 minutes',
                    storeName,
                    deliveryAddress: deliveryAddress
                });
            }
            // Send new order alert to merchant
            if (storeData?._id) {
                console.log('📱 [ORDER] Sending new order alert to merchant...');
                const store = await Store_1.Store.findById(storeData._id).select('contact');
                const merchantPhone = store?.contact?.phone;
                if (merchantPhone) {
                    await SMSService_1.SMSService.sendNewOrderAlertToMerchant(merchantPhone, orderNumber, userName, total);
                    // Send high-value order alert if total > ₹10,000
                    if (total > 10000) {
                        console.log('💰 [ORDER] Sending high-value order alert to merchant...');
                        await SMSService_1.SMSService.sendHighValueOrderAlert(merchantPhone, orderNumber, total);
                    }
                }
            }
            console.log('✅ [ORDER] All notifications sent successfully');
        }
        catch (error) {
            console.error('❌ [ORDER] Error sending notifications:', error);
            // Don't fail order creation if notifications fail
        }
        (0, response_1.sendSuccess)(res, populatedOrder, 'Order created successfully', 201);
    }
    catch (error) {
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
        throw new errorHandler_1.AppError(`Failed to create order: ${error.message}`, 500);
    }
});
// Get user's orders
exports.getUserOrders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;
    try {
        const query = { user: userId };
        if (status)
            query.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order_1.Order.find(query)
            .populate('items.product', 'name images basePrice')
            .populate('items.store', 'name logo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Order_1.Order.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch orders', 500);
    }
});
// Get single order by ID
exports.getOrderById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    try {
        const order = await Order_1.Order.findOne({
            _id: orderId,
            user: userId
        })
            .populate('items.product', 'name images basePrice description')
            .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
            .lean();
        if (!order) {
            return (0, response_1.sendNotFound)(res, 'Order not found');
        }
        (0, response_1.sendSuccess)(res, order, 'Order retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch order', 500);
    }
});
// Cancel order
exports.cancelOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    const { reason } = req.body;
    // Start a MongoDB session for transaction
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        console.log('🚫 [CANCEL ORDER] Starting cancellation for order:', orderId);
        const order = await Order_1.Order.findOne({
            _id: orderId,
            user: userId
        }).session(session);
        console.log('🚫 [CANCEL ORDER] Order found:', order ? 'Yes' : 'No');
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return (0, response_1.sendNotFound)(res, 'Order not found');
        }
        console.log('🚫 [CANCEL ORDER] Current status:', order.status);
        // Check if order can be cancelled
        if (!['placed', 'confirmed', 'preparing'].includes(order.status)) {
            await session.abortTransaction();
            session.endSession();
            return (0, response_1.sendBadRequest)(res, 'Order cannot be cancelled at this stage');
        }
        console.log('🚫 [CANCEL ORDER] Updating order status to cancelled');
        // Restore stock for cancelled order items
        console.log('🚫 [CANCEL ORDER] Restoring stock for order items...');
        const stockRestorations = [];
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
                const updateResult = await Product_1.Product.findOneAndUpdate({
                    _id: productId,
                    'inventory.variants': {
                        $elemMatch: {
                            type: variant.type,
                            value: variant.value
                        }
                    }
                }, {
                    $inc: {
                        'inventory.variants.$[variant].stock': quantity
                    }
                }, {
                    session,
                    new: true,
                    arrayFilters: [{
                            'variant.type': variant.type,
                            'variant.value': variant.value
                        }]
                });
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
                }
                else {
                    console.warn('⚠️ [CANCEL ORDER] Could not restore variant stock for product:', productId);
                }
            }
            else {
                // Restore main product stock
                const updateResult = await Product_1.Product.findByIdAndUpdate(productId, {
                    $inc: {
                        'inventory.stock': quantity
                    },
                    $set: {
                        'inventory.isAvailable': true
                    }
                }, {
                    session,
                    new: true
                });
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
                }
                else {
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
                stockSocketService_1.default.emitStockUpdate(restoration.productId, restoration.newStock, {
                    storeId: restoration.storeId,
                    reason: 'return'
                });
            }
            catch (socketError) {
                // Log but don't fail the cancellation if socket emission fails
                console.error('❌ [CANCEL ORDER] Socket emission failed:', socketError);
            }
        }
        // Create activity for order cancellation
        const storeData = order.items[0]?.store;
        const storeName = storeData?.name || storeData?.toString() || 'Store';
        await activityService_1.default.order.onOrderCancelled(new mongoose_1.Types.ObjectId(userId), order._id, storeName);
        (0, response_1.sendSuccess)(res, order, 'Order cancelled successfully');
    }
    catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CANCEL ORDER] Error:', error);
        console.error('❌ [CANCEL ORDER] Error message:', error.message);
        console.error('❌ [CANCEL ORDER] Error stack:', error.stack);
        throw new errorHandler_1.AppError(`Failed to cancel order: ${error.message}`, 500);
    }
});
// Update order status (admin/store owner)
exports.updateOrderStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const { status, estimatedDeliveryTime, trackingInfo } = req.body;
    try {
        const order = await Order_1.Order.findById(orderId);
        if (!order) {
            return (0, response_1.sendNotFound)(res, 'Order not found');
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
        const populatedOrder = await Order_1.Order.findById(order._id)
            .populate('items.product', 'name images')
            .populate('items.store', 'name')
            .populate('user', 'profile.firstName profile.lastName');
        // Create activity for order delivery
        if (status === 'delivered' && populatedOrder) {
            const storeData = populatedOrder.items[0]?.store;
            const storeName = storeData?.name || 'Store';
            const userIdObj = typeof populatedOrder.user === 'object' ? populatedOrder.user._id : populatedOrder.user;
            await activityService_1.default.order.onOrderDelivered(userIdObj, populatedOrder._id, storeName);
            // Process referral rewards when order is delivered
            try {
                // Check if this is referee's first order (process referral completion)
                await referralService_1.default.processFirstOrder({
                    refereeId: userIdObj,
                    orderId: populatedOrder._id,
                    orderAmount: populatedOrder.totals.total,
                });
                // Check for milestone bonus (3rd order)
                const deliveredOrdersCount = await Order_1.Order.countDocuments({
                    user: userIdObj,
                    status: 'delivered',
                });
                if (deliveredOrdersCount >= 3) {
                    await referralService_1.default.processMilestoneBonus(userIdObj, deliveredOrdersCount);
                }
            }
            catch (error) {
                console.error('❌ [ORDER] Error processing referral rewards:', error);
                // Don't fail the order update if referral processing fails
            }
            // Create cashback for delivered order
            try {
                console.log('💰 [ORDER] Creating cashback for delivered order:', populatedOrder._id);
                await cashbackService_1.default.createCashbackFromOrder(populatedOrder._id);
                console.log('✅ [ORDER] Cashback created successfully');
            }
            catch (error) {
                console.error('❌ [ORDER] Error creating cashback:', error);
                // Don't fail the order update if cashback creation fails
            }
            // Create user products for delivered order
            try {
                console.log('📦 [ORDER] Creating user products for delivered order:', populatedOrder._id);
                await userProductService_1.default.createUserProductsFromOrder(populatedOrder._id);
                console.log('✅ [ORDER] User products created successfully');
            }
            catch (error) {
                console.error('❌ [ORDER] Error creating user products:', error);
                // Don't fail the order update if user product creation fails
            }
            // Award store promo coins for delivered order
            try {
                console.log('💎 [ORDER] Awarding store promo coins for delivered order:', populatedOrder._id);
                // Calculate promo coins to be earned
                const orderValue = populatedOrder.totals.total;
                const coinsToEarn = (0, promoCoins_config_1.calculatePromoCoinsEarned)(orderValue);
                if (coinsToEarn > 0) {
                    // Get store ID from first item (assuming single store per order)
                    const firstItem = populatedOrder.items[0];
                    const storeId = typeof firstItem.store === 'object'
                        ? firstItem.store._id
                        : firstItem.store;
                    if (storeId) {
                        // Award promo coins
                        await StorePromoCoin_1.StorePromoCoin.earnCoins(userIdObj, storeId, coinsToEarn, populatedOrder._id);
                        console.log(`✅ [ORDER] Awarded ${coinsToEarn} promo coins from store ${storeId}`);
                    }
                    else {
                        console.warn('⚠️ [ORDER] Could not determine store ID for promo coins');
                    }
                }
                else {
                    console.log('ℹ️ [ORDER] Order value too low for promo coins or promo coins disabled');
                }
            }
            catch (error) {
                console.error('❌ [ORDER] Error awarding promo coins:', error);
                // Don't fail the order update if promo coin creation fails
            }
            // Trigger achievement update for order delivery
            try {
                await achievementService_1.default.triggerAchievementUpdate(populatedOrder.user, 'order_delivered');
            }
            catch (error) {
                console.error('❌ [ORDER] Error triggering achievement update:', error);
            }
            // Update partner progress for order delivery
            try {
                const partnerService = require('../services/partnerService').default;
                const orderId = populatedOrder._id;
                await partnerService.updatePartnerProgress(userIdObj.toString(), orderId.toString());
                console.log('✅ [ORDER] Partner progress updated successfully');
            }
            catch (error) {
                console.error('❌ [ORDER] Error updating partner progress:', error);
                // Don't fail the order update if partner progress update fails
            }
        }
        (0, response_1.sendSuccess)(res, populatedOrder, 'Order status updated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to update order status', 500);
    }
});
// Get order tracking info
exports.getOrderTracking = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    try {
        const order = await Order_1.Order.findOne({
            _id: orderId,
            user: userId
        })
            .select('status tracking estimatedDeliveryTime deliveredAt createdAt items')
            .populate('items.product', 'name images')
            .lean();
        if (!order) {
            return (0, response_1.sendNotFound)(res, 'Order not found');
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
        (0, response_1.sendSuccess)(res, {
            orderId: order._id,
            currentStatus: order.status,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            timeline,
            tracking: order.tracking
        }, 'Order tracking retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch order tracking', 500);
    }
});
// Rate and review order
exports.rateOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    const { rating, review } = req.body;
    try {
        const order = await Order_1.Order.findOne({
            _id: orderId,
            user: userId
        });
        if (!order) {
            return (0, response_1.sendNotFound)(res, 'Order not found');
        }
        if (order.status !== 'delivered') {
            return (0, response_1.sendBadRequest)(res, 'Can only rate delivered orders');
        }
        if (order.rating) {
            return (0, response_1.sendBadRequest)(res, 'Order already rated');
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
                const reviewTask = partner.tasks.find((t) => t.type === 'review');
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
        }
        catch (error) {
            console.error('❌ [REVIEW] Error updating partner review task:', error);
            // Don't fail the review if partner update fails
        }
        (0, response_1.sendSuccess)(res, order, 'Order rated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to rate order', 500);
    }
});
// Get order statistics for user
exports.getOrderStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    try {
        const stats = await Order_1.Order.aggregate([
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
        const recentOrders = await Order_1.Order.find({ user: userId })
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        (0, response_1.sendSuccess)(res, {
            stats: userStats,
            recentOrders
        }, 'Order statistics retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch order statistics', 500);
    }
});
// Re-order full order
exports.reorderFullOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    try {
        console.log('🔄 [REORDER] Starting full order reorder:', { userId, orderId });
        // Validate and add to cart
        const result = await reorderService_1.default.addToCart(userId, orderId);
        console.log('✅ [REORDER] Full order reorder complete:', {
            addedItems: result.addedItems.length,
            skippedItems: result.skippedItems.length
        });
        (0, response_1.sendSuccess)(res, result, 'Items added to cart successfully');
    }
    catch (error) {
        console.error('❌ [REORDER] Full order reorder error:', error);
        throw error;
    }
});
// Re-order selected items
exports.reorderItems = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const { itemIds } = req.body;
    const userId = req.userId;
    try {
        console.log('🔄 [REORDER] Starting selective reorder:', { userId, orderId, itemIds });
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return (0, response_1.sendBadRequest)(res, 'Item IDs are required');
        }
        // Validate and add to cart
        const result = await reorderService_1.default.addToCart(userId, orderId, itemIds);
        console.log('✅ [REORDER] Selective reorder complete:', {
            addedItems: result.addedItems.length,
            skippedItems: result.skippedItems.length
        });
        (0, response_1.sendSuccess)(res, result, 'Selected items added to cart successfully');
    }
    catch (error) {
        console.error('❌ [REORDER] Selective reorder error:', error);
        throw error;
    }
});
// Validate reorder (check availability and prices)
exports.validateReorder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const { itemIds } = req.query;
    const userId = req.userId;
    try {
        console.log('🔍 [REORDER] Validating reorder:', { userId, orderId, itemIds });
        let selectedItemIds;
        if (itemIds) {
            selectedItemIds = Array.isArray(itemIds) ? itemIds : [itemIds];
        }
        const validation = await reorderService_1.default.validateReorder(userId, orderId, selectedItemIds);
        console.log('✅ [REORDER] Validation complete:', {
            canReorder: validation.canReorder,
            itemCount: validation.items.length
        });
        (0, response_1.sendSuccess)(res, validation, 'Reorder validation complete');
    }
    catch (error) {
        console.error('❌ [REORDER] Validation error:', error);
        throw error;
    }
});
// Get frequently ordered items
exports.getFrequentlyOrdered = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { limit = 10 } = req.query;
    try {
        console.log('📊 [REORDER] Getting frequently ordered items:', { userId, limit });
        const items = await reorderService_1.default.getFrequentlyOrdered(userId, Number(limit));
        console.log('✅ [REORDER] Frequently ordered items retrieved:', items.length);
        (0, response_1.sendSuccess)(res, items, 'Frequently ordered items retrieved successfully');
    }
    catch (error) {
        console.error('❌ [REORDER] Frequently ordered error:', error);
        throw error;
    }
});
// Get reorder suggestions
exports.getReorderSuggestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    try {
        console.log('💡 [REORDER] Getting reorder suggestions:', { userId });
        const suggestions = await reorderService_1.default.getReorderSuggestions(userId);
        console.log('✅ [REORDER] Reorder suggestions retrieved:', suggestions.length);
        (0, response_1.sendSuccess)(res, suggestions, 'Reorder suggestions retrieved successfully');
    }
    catch (error) {
        console.error('❌ [REORDER] Suggestions error:', error);
        throw error;
    }
});
/**
 * Request refund for an order (user-facing)
 * POST /api/orders/:orderId/refund-request
 */
exports.requestRefund = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.userId;
    const { reason, refundItems } = req.body;
    try {
        console.log('💰 [REFUND REQUEST] User requesting refund:', { orderId, userId, reason });
        // Verify order belongs to user
        const order = await Order_1.Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            return (0, response_1.sendNotFound)(res, 'Order not found');
        }
        // Validate refund eligibility
        if (order.payment.status !== 'paid' && order.payment.status !== 'partially_refunded') {
            return (0, response_1.sendBadRequest)(res, 'Only paid or partially refunded orders can be refunded');
        }
        // Check if already fully refunded
        const alreadyRefunded = order.totals.refundAmount || 0;
        const remaining = order.totals.paidAmount - alreadyRefunded;
        if (remaining <= 0) {
            return (0, response_1.sendBadRequest)(res, 'Order is already fully refunded');
        }
        if (!['delivered', 'cancelled'].includes(order.status)) {
            return (0, response_1.sendBadRequest)(res, 'Refund can only be requested for delivered or cancelled orders');
        }
        // Check refund window (e.g., 7 days for delivered orders)
        if (order.status === 'delivered') {
            const deliveredAt = order.delivery?.deliveredAt;
            if (!deliveredAt) {
                return (0, response_1.sendBadRequest)(res, 'Delivery date not found');
            }
            const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDelivery > 7) {
                return (0, response_1.sendBadRequest)(res, 'Refund window has expired (7 days)');
            }
        }
        // Calculate refund amount
        let refundAmount = order.totals.paidAmount - (order.totals.refundAmount || 0);
        const refundType = refundItems && refundItems.length > 0 ? 'partial' : 'full';
        if (refundType === 'partial') {
            refundAmount = refundItems.reduce((sum, item) => {
                const orderItem = order.items.find((oi) => oi._id.toString() === item.itemId);
                if (orderItem) {
                    return sum + (orderItem.price * item.quantity);
                }
                return sum;
            }, 0);
        }
        // Create refund record
        const refund = new Refund_1.Refund({
            order: order._id,
            user: userId,
            orderNumber: order.orderNumber,
            paymentMethod: (order.payment.method || 'razorpay'),
            refundAmount,
            refundType,
            refundReason: reason,
            refundedItems: refundItems?.map((item) => {
                const orderItem = order.items.find((oi) => oi._id.toString() === item.itemId);
                return {
                    itemId: item.itemId,
                    productId: orderItem?.product,
                    quantity: item.quantity,
                    refundAmount: orderItem ? orderItem.price * item.quantity : 0
                };
            }) || [],
            status: 'pending',
            estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
        await refund.save();
        console.log('✅ [REFUND REQUEST] Refund request created:', refund._id);
        // Notify admin/merchant for approval
        try {
            console.log('📧 [REFUND REQUEST] Sending notification to merchant/admin...');
            // Get user information
            const user = await User_1.User.findById(userId);
            const customerName = user?.profile?.firstName || user?.phoneNumber || 'Customer';
            const refundId = refund._id?.toString() || '';
            // Get store information from order
            const storeIds = [...new Set(order.items.map((item) => item.store?.toString()).filter(Boolean))];
            if (storeIds.length > 0) {
                const Store = (await Promise.resolve().then(() => __importStar(require('../models/Store')))).Store;
                const stores = await Store.find({ _id: { $in: storeIds } }).select('name contact owner');
                for (const store of stores) {
                    // Get merchant contact info
                    const merchantPhone = store.contact?.phone;
                    const merchantEmail = store.contact?.email;
                    const storeName = store.name || 'Store';
                    // Send SMS to merchant
                    if (merchantPhone) {
                        try {
                            await SMSService_1.SMSService.sendRefundRequestNotification(merchantPhone, order.orderNumber, refundAmount, refundType);
                            console.log(`✅ [REFUND REQUEST] SMS sent to merchant: ${merchantPhone}`);
                        }
                        catch (smsError) {
                            console.error(`❌ [REFUND REQUEST] Failed to send SMS to merchant:`, smsError);
                        }
                    }
                    // Send email to merchant
                    if (merchantEmail) {
                        try {
                            await EmailService_1.default.sendRefundRequestNotification(merchantEmail, storeName, {
                                orderNumber: order.orderNumber,
                                refundAmount,
                                refundType,
                                refundReason: reason,
                                customerName,
                                refundId
                            });
                            console.log(`✅ [REFUND REQUEST] Email sent to merchant: ${merchantEmail}`);
                        }
                        catch (emailError) {
                            console.error(`❌ [REFUND REQUEST] Failed to send email to merchant:`, emailError);
                        }
                    }
                }
            }
            // Also notify admin if admin email is configured
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                try {
                    await EmailService_1.default.sendAdminRefundRequestNotification(adminEmail, {
                        orderNumber: order.orderNumber,
                        refundAmount,
                        refundType,
                        refundReason: reason,
                        customerName,
                        refundId
                    });
                    console.log(`✅ [REFUND REQUEST] Admin notification sent`);
                }
                catch (adminError) {
                    console.error(`❌ [REFUND REQUEST] Failed to send admin notification:`, adminError);
                }
            }
        }
        catch (notificationError) {
            console.error('❌ [REFUND REQUEST] Error sending notifications:', notificationError);
            // Don't fail refund request if notifications fail
        }
        (0, response_1.sendSuccess)(res, {
            refundId: refund._id?.toString() || '',
            orderNumber: order.orderNumber,
            refundAmount,
            refundType,
            status: 'pending',
            message: 'Refund request submitted successfully. It will be reviewed within 24-48 hours.'
        }, 'Refund request submitted successfully', 201);
    }
    catch (error) {
        console.error('❌ [REFUND REQUEST] Error:', error);
        throw new errorHandler_1.AppError(`Failed to request refund: ${error.message}`, 500);
    }
});
/**
 * Get refund history for user
 * GET /api/orders/refunds
 */
exports.getUserRefunds = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;
    try {
        const query = { user: userId };
        if (status)
            query.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const refunds = await Refund_1.Refund.find(query)
            .populate('order', 'orderNumber totals.total createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Refund_1.Refund.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            refunds,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Refunds retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET REFUNDS] Error:', error);
        throw new errorHandler_1.AppError('Failed to fetch refunds', 500);
    }
});
/**
 * Get refund details
 * GET /api/orders/refunds/:refundId
 */
exports.getRefundDetails = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { refundId } = req.params;
    const userId = req.userId;
    try {
        const refund = await Refund_1.Refund.findOne({ _id: refundId, user: userId })
            .populate('order', 'orderNumber totals items createdAt')
            .populate('refundedItems.productId', 'name image')
            .lean();
        if (!refund) {
            return (0, response_1.sendNotFound)(res, 'Refund not found');
        }
        (0, response_1.sendSuccess)(res, refund, 'Refund details retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET REFUND DETAILS] Error:', error);
        throw new errorHandler_1.AppError('Failed to fetch refund details', 500);
    }
});
