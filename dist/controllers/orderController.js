"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReorderSuggestions = exports.getFrequentlyOrdered = exports.validateReorder = exports.reorderItems = exports.reorderFullOrder = exports.getOrderStats = exports.rateOrder = exports.getOrderTracking = exports.updateOrderStatus = exports.cancelOrder = exports.getOrderById = exports.getUserOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = require("../models/Order");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const stockSocketService_1 = __importDefault(require("../services/stockSocketService"));
const reorderService_1 = __importDefault(require("../services/reorderService"));
// Create new order from cart
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { deliveryAddress, paymentMethod, specialInstructions, couponCode } = req.body;
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
        // Use cart totals for order totals
        const deliveryFee = cart.totals.delivery || 0;
        const tax = cart.totals.tax || 0;
        const subtotal = cart.totals.subtotal || 0;
        const discount = cart.totals.discount || 0;
        const cashback = cart.totals.cashback || 0;
        const total = cart.totals.total || 0;
        console.log('📦 [CREATE ORDER] Order totals:', { subtotal, tax, deliveryFee, discount, cashback, total });
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
            .populate('user', 'profile.firstName profile.lastName');
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
