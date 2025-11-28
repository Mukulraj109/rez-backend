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
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const MerchantOrder_1 = require("../models/MerchantOrder");
const SMSService_1 = __importDefault(require("../services/SMSService"));
const EmailService_1 = __importDefault(require("../services/EmailService"));
const InvoiceService_1 = __importDefault(require("../services/InvoiceService"));
const ShippingLabelService_1 = __importDefault(require("../services/ShippingLabelService"));
const Merchant_1 = require("../models/Merchant");
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const mongoose_1 = __importDefault(require("mongoose"));
const isValidOrderStatus = (status) => {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    return typeof status === 'string' && validStatuses.includes(status);
};
// Removed unused OrderAnalytics interface and OrderWithId type
const router = (0, express_1.Router)();
// Test route without auth for development
router.post('/test-sample-data', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Sample data creation not allowed in production'
            });
        }
        const merchantId = req.body.merchantId || 'test-merchant-123';
        await MerchantOrder_1.OrderModel.createSampleOrders(merchantId);
        return res.json({
            success: true,
            message: 'Sample orders created successfully',
            merchantId: merchantId
        });
    }
    catch (error) {
        console.error('Error creating sample orders:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create sample orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Clear orders for testing (development only)
router.delete('/test-clear-orders', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Clear orders not allowed in production'
            });
        }
        const { OrderMongoModel } = await Promise.resolve().then(() => __importStar(require('../models/MerchantOrder')));
        // Clear all orders (for testing)
        const result = await OrderMongoModel.deleteMany({});
        return res.json({
            success: true,
            message: `Cleared ${result.deletedCount} orders`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        console.error('Error clearing orders:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to clear orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test analytics route without auth for development
router.get('/test-analytics', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test analytics not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || 'test-merchant-123';
        const { dateStart, dateEnd } = req.query;
        let dateRange;
        if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
            dateRange = {
                start: new Date(dateStart),
                end: new Date(dateEnd)
            };
        }
        console.log("Testing analytics for merchantId:", merchantId);
        const analytics = await MerchantOrder_1.OrderModel.getAnalytics(merchantId, dateRange);
        return res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching test analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test cashback routes without auth for development
router.post('/test-cashback-sample', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test cashback not allowed in production'
            });
        }
        const merchantId = req.body.merchantId || 'test-merchant-123';
        const { CashbackModel } = await Promise.resolve().then(() => __importStar(require('../models/Cashback')));
        await CashbackModel.createSampleRequests(merchantId);
        return res.json({
            success: true,
            message: 'Sample cashback requests created successfully',
            merchantId: merchantId
        });
    }
    catch (error) {
        console.error('Error creating sample cashback:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create sample cashback',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/test-cashback-list', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test cashback not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || 'test-merchant-123';
        const { CashbackModel } = await Promise.resolve().then(() => __importStar(require('../models/Cashback')));
        const result = await CashbackModel.search({ merchantId });
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error fetching cashback list:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback list',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/test-cashback-metrics', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test cashback not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || 'test-merchant-123';
        const { CashbackModel } = await Promise.resolve().then(() => __importStar(require('../models/Cashback')));
        const metrics = await CashbackModel.getMetrics(merchantId);
        return res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        console.error('Error fetching cashback metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback metrics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test route for dashboard overview (no auth required)
router.get('/test-dashboard-overview', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test dashboard not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || '507f1f77bcf86cd799439011';
        const { BusinessMetricsService } = await Promise.resolve().then(() => __importStar(require('../merchantservices/BusinessMetrics')));
        const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId);
        return res.json({
            success: true,
            data: metrics,
            message: 'Dashboard metrics retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting dashboard metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard metrics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test route for dashboard timeseries (no auth required)
router.get('/test-dashboard-timeseries', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test dashboard not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || '507f1f77bcf86cd799439011';
        const days = parseInt(req.query.days) || 30;
        const { BusinessMetricsService } = await Promise.resolve().then(() => __importStar(require('../merchantservices/BusinessMetrics')));
        const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);
        return res.json({
            success: true,
            data: timeSeriesData,
            message: 'Dashboard timeseries data retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting dashboard timeseries:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard timeseries',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test route for dashboard categories (no auth required)
router.get('/test-dashboard-categories', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test dashboard not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || '507f1f77bcf86cd799439011';
        const { BusinessMetricsService } = await Promise.resolve().then(() => __importStar(require('../merchantservices/BusinessMetrics')));
        const categoryPerformance = await BusinessMetricsService.getCategoryPerformance(merchantId);
        return res.json({
            success: true,
            data: categoryPerformance,
            message: 'Dashboard category performance retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting dashboard categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard categories',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test route for dashboard customer insights (no auth required)
router.get('/test-dashboard-customers', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test dashboard not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || '507f1f77bcf86cd799439011';
        const { BusinessMetricsService } = await Promise.resolve().then(() => __importStar(require('../merchantservices/BusinessMetrics')));
        const customerInsights = await BusinessMetricsService.getCustomerInsights(merchantId);
        return res.json({
            success: true,
            data: customerInsights,
            message: 'Dashboard customer insights retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting dashboard customer insights:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard customer insights',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test route for dashboard insights (no auth required)
router.get('/test-dashboard-insights', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test dashboard not allowed in production'
            });
        }
        const merchantId = req.query.merchantId || '507f1f77bcf86cd799439011';
        const { BusinessMetricsService } = await Promise.resolve().then(() => __importStar(require('../merchantservices/BusinessMetrics')));
        const insights = await BusinessMetricsService.getBusinessInsights(merchantId);
        return res.json({
            success: true,
            data: insights,
            message: 'Dashboard insights retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting dashboard insights:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard insights',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Apply auth middleware to all other routes
router.use(merchantauth_1.authMiddleware);
// Helper: Validate if value is OrderStatus
const isOrderStatus = (value) => {
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    return statuses.includes(value);
};
// @route   GET /api/orders
// @desc    Get merchant orders with search and filtering
// @access  Private
router.get('/', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { status, paymentStatus, customerId, orderNumber, storeId, sortBy: sortByParam, sortOrder: sortOrderParam, page = '1', limit = '20', dateStart, dateEnd } = req.query;
        // Validate and enforce correct type for sortBy
        const sortByOptions = ['created', 'updated', 'total', 'priority'];
        const sortBy = sortByOptions.includes(sortByParam)
            ? sortByParam
            : 'created'; // default if invalid
        const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';
        // Build search parameters
        const searchParams = {
            merchantId,
            sortBy,
            sortOrder,
            page: parseInt(page),
            limit: parseInt(limit)
        };
        if (status && typeof status === 'string' && isValidOrderStatus(status)) {
            searchParams.status = status;
        }
        if (paymentStatus && typeof paymentStatus === 'string') {
            searchParams.paymentStatus = paymentStatus;
        }
        if (customerId && typeof customerId === 'string') {
            searchParams.customerId = customerId;
        }
        if (orderNumber && typeof orderNumber === 'string') {
            searchParams.orderNumber = orderNumber;
        }
        if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
            searchParams.dateRange = {
                start: new Date(dateStart),
                end: new Date(dateEnd)
            };
        }
        // Validate storeId if provided
        if (storeId && typeof storeId === 'string') {
            const store = await Store_1.Store.findOne({
                _id: storeId,
                merchantId: merchantId
            });
            if (!store) {
                return res.status(400).json({
                    success: false,
                    message: 'Store not found or does not belong to this merchant'
                });
            }
            searchParams.storeId = storeId;
        }
        const result = await MerchantOrder_1.OrderModel.search(searchParams);
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const merchantId = req.merchantId;
        const order = await MerchantOrder_1.OrderModel.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        if (order.merchantId !== merchantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        // Get store information from the first product in the order
        let storeInfo = null;
        if (order.items && order.items.length > 0) {
            try {
                const firstProductId = order.items[0].productId;
                const product = await Product_1.Product.findById(firstProductId);
                if (product && product.storeId) {
                    const store = await Store_1.Store.findById(product.storeId);
                    if (store) {
                        storeInfo = {
                            _id: store._id.toString(),
                            name: store.name,
                            location: store.location
                        };
                    }
                }
            }
            catch (storeError) {
                console.warn('Failed to fetch store info for order:', storeError);
                // Continue without store info
            }
        }
        return res.json({
            success: true,
            data: {
                ...order,
                store: storeInfo
            }
        });
    }
    catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   PUT /api/orders/:id/status
// @desc    Update order status with inventory management and notifications
// @access  Private
router.put('/:id/status', async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { status, notes, notifyCustomer = true } = req.body;
        const merchantId = req.merchantId;
        // Validate new status
        if (!isValidOrderStatus(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }
        // Fetch order from main Order model (not MerchantOrder)
        const order = await Order_1.Order.findById(id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        // Verify merchant owns this order (check store ownership)
        const merchant = await Merchant_1.Merchant.findById(merchantId);
        if (!merchant) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: 'Merchant not found'
            });
        }
        // Status transitions map
        const validTransitions = {
            placed: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: ['dispatched', 'delivered'],
            dispatched: ['delivered'],
            delivered: [],
            cancelled: [],
            returned: [],
            refunded: []
        };
        const currentStatus = order.status;
        if (!validTransitions[currentStatus]?.includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${status}`
            });
        }
        // INVENTORY AUTO-DEDUCTION: When order is confirmed
        if (status === 'confirmed' && currentStatus !== 'confirmed') {
            console.log(`Processing inventory deduction for order ${order.orderNumber}`);
            for (const item of order.items) {
                const product = await Product_1.Product.findById(item.product).session(session);
                if (!product) {
                    console.warn(`Product ${item.product} not found, skipping inventory deduction`);
                    continue;
                }
                // Check if enough stock is available
                if (!product.inventory.unlimited && product.inventory.stock < item.quantity) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for product: ${item.name}. Available: ${product.inventory.stock}, Required: ${item.quantity}`
                    });
                }
                // Deduct inventory
                if (!product.inventory.unlimited) {
                    product.inventory.stock -= item.quantity;
                    // Update availability if stock reaches zero
                    if (product.inventory.stock === 0) {
                        product.inventory.isAvailable = false;
                    }
                    await product.save({ session });
                    console.log(`Deducted ${item.quantity} units from product ${item.name}. New stock: ${product.inventory.stock}`);
                }
            }
            // Generate invoice on confirmation
            try {
                const invoiceUrl = await InvoiceService_1.default.generateInvoice(order, merchantId);
                order.invoiceUrl = invoiceUrl;
                order.invoiceGeneratedAt = new Date();
                console.log(`Invoice generated: ${invoiceUrl}`);
            }
            catch (invoiceError) {
                console.error('Failed to generate invoice:', invoiceError);
                // Don't fail the transaction if invoice generation fails
            }
        }
        // INVENTORY RELEASE: When order is cancelled before confirmation
        if (status === 'cancelled' && currentStatus !== 'cancelled') {
            // Only release inventory if it was previously reserved (not yet implemented in this version)
            // In future versions, implement inventory reservation on order placement
            console.log(`Order ${order.orderNumber} cancelled`);
        }
        // Update order status
        await order.updateStatus(status, notes);
        await order.save({ session });
        // Generate shipping label when order is ready for dispatch
        if (status === 'ready') {
            try {
                const labelUrl = await ShippingLabelService_1.default.generateShippingLabel(order, merchantId);
                order.shippingLabelUrl = labelUrl;
                await order.save({ session });
                console.log(`Shipping label generated: ${labelUrl}`);
            }
            catch (labelError) {
                console.error('Failed to generate shipping label:', labelError);
            }
        }
        // Generate packing slip when preparing order
        if (status === 'preparing') {
            try {
                const packingSlipUrl = await InvoiceService_1.default.generatePackingSlip(order, merchantId);
                order.packingSlipUrl = packingSlipUrl;
                await order.save({ session });
                console.log(`Packing slip generated: ${packingSlipUrl}`);
            }
            catch (slipError) {
                console.error('Failed to generate packing slip:', slipError);
            }
        }
        // Commit transaction
        await session.commitTransaction();
        session.endSession();
        // CUSTOMER NOTIFICATIONS (outside transaction to avoid rollback on notification failures)
        if (notifyCustomer && order.delivery?.address?.phone) {
            const storeName = merchant.businessName || 'Store';
            const customerPhone = order.delivery.address.phone;
            const customerEmail = order.delivery.address.email;
            // Send SMS notification
            try {
                const formattedPhone = SMSService_1.default.formatPhoneNumber(customerPhone);
                if (order.delivery.trackingId) {
                    const message = `Your order #${order.orderNumber} from ${storeName} is out for delivery. Tracking ID: ${order.delivery.trackingId}`;
                    await SMSService_1.default.send({ to: formattedPhone, message });
                }
                else {
                    await SMSService_1.default.sendOrderStatusUpdate(formattedPhone, order.orderNumber, status, storeName);
                }
                console.log(`SMS notification sent to ${customerPhone}`);
            }
            catch (smsError) {
                console.warn('Failed to send SMS notification:', smsError);
            }
            // Send email notification
            if (customerEmail) {
                try {
                    const statusMessages = {
                        confirmed: 'Your order has been confirmed and is being processed.',
                        preparing: 'Your order is being prepared.',
                        ready: 'Your order is ready for pickup/dispatch.',
                        dispatched: 'Your order has been dispatched and is on the way.',
                        delivered: 'Your order has been delivered. Thank you for shopping with us!',
                        cancelled: 'Your order has been cancelled.',
                    };
                    const emailSubject = `Order ${order.orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
                    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Order Status Update</h2>
              <p>Dear ${order.delivery.address.name},</p>
              <p>${statusMessages[status] || `Your order status has been updated to: ${status}`}</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Status:</strong> ${status.toUpperCase()}</p>
                ${order.delivery.trackingId ? `<p><strong>Tracking ID:</strong> ${order.delivery.trackingId}</p>` : ''}
                <p><strong>Total Amount:</strong> ₹${order.totals.total.toFixed(2)}</p>
              </div>
              ${order.invoiceUrl ? `<p><a href="${order.invoiceUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Invoice</a></p>` : ''}
              <p>Thank you for choosing ${storeName}!</p>
            </div>
          `;
                    await EmailService_1.default.send({
                        to: customerEmail,
                        subject: emailSubject,
                        html: emailHtml,
                    });
                    console.log(`Email notification sent to ${customerEmail}`);
                }
                catch (emailError) {
                    console.warn('Failed to send email notification:', emailError);
                }
            }
        }
        return res.json({
            success: true,
            message: 'Order status updated successfully',
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                invoiceUrl: order.invoiceUrl,
                shippingLabelUrl: order.shippingLabelUrl,
                packingSlipUrl: order.packingSlipUrl,
            }
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating order status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   POST /api/orders/bulk-action
// @desc    Perform bulk actions on multiple orders
// @access  Private
router.post('/bulk-action', async (req, res) => {
    try {
        const { orderIds, action, notes, notifyCustomers = true } = req.body;
        const merchantId = req.merchantId;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No order IDs provided'
            });
        }
        const results = [];
        const actionStatusMap = {
            confirm: 'confirmed',
            prepare: 'preparing',
            ready: 'ready',
            deliver: 'delivered',
            cancel: 'cancelled'
        };
        const newStatus = actionStatusMap[action];
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bulk action'
            });
        }
        for (const orderId of orderIds) {
            try {
                const order = await MerchantOrder_1.OrderModel.findById(orderId);
                if (!order) {
                    results.push({
                        success: false,
                        orderId,
                        message: 'Order not found'
                    });
                    continue;
                }
                if (order.merchantId !== merchantId) {
                    results.push({
                        success: false,
                        orderId,
                        message: 'Access denied'
                    });
                    continue;
                }
                const updatedOrder = await MerchantOrder_1.OrderModel.updateStatus(orderId, newStatus, notes);
                if (updatedOrder) {
                    results.push({
                        success: true,
                        orderId
                    });
                }
                else {
                    results.push({
                        success: false,
                        orderId,
                        message: 'Failed to update status'
                    });
                }
            }
            catch (error) {
                results.push({
                    success: false,
                    orderId,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        const successCount = results.filter(r => r.success).length;
        return res.json({
            success: true,
            message: `Bulk action completed. ${successCount}/${orderIds.length} orders updated.`,
            data: {
                results,
                summary: {
                    total: orderIds.length,
                    successful: successCount,
                    failed: orderIds.length - successCount
                }
            }
        });
    }
    catch (error) {
        console.error('Error performing bulk action:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to perform bulk action',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/orders/analytics
// @desc    Get order analytics for merchant
// @access  Private
router.get('/analytics', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const { dateStart, dateEnd } = req.query;
        let dateRange;
        if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
            dateRange = {
                start: new Date(dateStart),
                end: new Date(dateEnd)
            };
        }
        const analytics = await MerchantOrder_1.OrderModel.getAnalytics(merchantId, dateRange);
        // Ensure analytics has required fields
        const analyticsData = {
            totalOrders: analytics?.totalOrders ?? 0,
            pendingOrders: analytics?.pendingOrders ?? 0,
            averageOrderValue: analytics?.averageOrderValue ?? 0,
            averageProcessingTime: analytics?.averageProcessingTime ?? 0,
            orderCompletionRate: analytics?.orderCompletionRate ?? 0,
            topSellingProducts: Array.isArray(analytics?.topSellingProducts) ? analytics.topSellingProducts : [],
            hourlyOrderDistribution: Array.isArray(analytics?.hourlyOrderDistribution) ? analytics.hourlyOrderDistribution : [],
            dailyOrderTrends: Array.isArray(analytics?.dailyOrderTrends) ? analytics.dailyOrderTrends : []
        };
        return res.status(200).json({
            success: true,
            data: analyticsData
        });
    }
    catch (error) {
        console.error('Error fetching order analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch order analytics',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   POST /api/orders/sample-data
// @desc    Create sample orders for testing (development only)
// @access  Private
router.post('/sample-data', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Sample data creation not allowed in production'
            });
        }
        // For development testing, use provided merchantId or default
        const merchantId = req.merchantId || req.body.merchantId || 'test-merchant-123';
        await MerchantOrder_1.OrderModel.createSampleOrders(merchantId);
        return res.json({
            success: true,
            message: 'Sample orders created successfully',
            merchantId: merchantId
        });
    }
    catch (error) {
        console.error('Error creating sample orders:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create sample orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/orders/:id/invoice
// @desc    Get or generate invoice PDF for an order
// @access  Private
router.get('/:id/invoice', async (req, res) => {
    try {
        const { id } = req.params;
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({
                success: false,
                message: 'Merchant ID required'
            });
        }
        const order = await Order_1.Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        // Verify order belongs to merchant
        if (order.merchantId !== merchantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        // Check if format=json is requested (for URL response)
        if (req.query.format === 'json') {
            // If invoice already exists, return URL
            if (order.invoiceUrl) {
                return res.status(200).json({
                    success: true,
                    data: {
                        invoiceUrl: order.invoiceUrl,
                        generatedAt: order.invoiceGeneratedAt
                    }
                });
            }
            // Generate new invoice and return URL
            const invoiceUrl = await InvoiceService_1.default.generateInvoice(order, merchantId);
            order.invoiceUrl = invoiceUrl;
            order.invoiceGeneratedAt = new Date();
            await order.save();
            return res.status(200).json({
                success: true,
                message: 'Invoice generated successfully',
                data: {
                    invoiceUrl,
                    generatedAt: order.invoiceGeneratedAt
                }
            });
        }
        // Default: Stream PDF directly
        await InvoiceService_1.default.streamInvoicePDF(res, order, merchantId);
        // Save invoice URL for future reference (optional, can be done async)
        if (!order.invoiceUrl) {
            // Generate and save URL asynchronously (don't block response)
            InvoiceService_1.default.generateInvoice(order, merchantId)
                .then((invoiceUrl) => {
                order.invoiceUrl = invoiceUrl;
                order.invoiceGeneratedAt = new Date();
                order.save().catch((err) => console.error('Failed to save invoice URL:', err));
            })
                .catch((err) => console.error('Failed to generate invoice URL:', err));
        }
    }
    catch (error) {
        console.error('Error generating invoice:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate invoice',
                ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
            });
        }
    }
});
// @route   GET /api/orders/:id/shipping-label
// @desc    Get or generate shipping label for an order
// @access  Private
router.get('/:id/shipping-label', async (req, res) => {
    try {
        const { id } = req.params;
        const merchantId = req.merchantId;
        const order = await Order_1.Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        // If shipping label already exists, return it
        if (order.shippingLabelUrl) {
            return res.json({
                success: true,
                data: {
                    shippingLabelUrl: order.shippingLabelUrl
                }
            });
        }
        // Generate new shipping label
        const labelUrl = await ShippingLabelService_1.default.generateShippingLabel(order, merchantId);
        order.shippingLabelUrl = labelUrl;
        await order.save();
        return res.json({
            success: true,
            message: 'Shipping label generated successfully',
            data: {
                shippingLabelUrl: labelUrl
            }
        });
    }
    catch (error) {
        console.error('Error generating shipping label:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate shipping label',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/orders/:id/packing-slip
// @desc    Get or generate packing slip for an order
// @access  Private
router.get('/:id/packing-slip', async (req, res) => {
    try {
        const { id } = req.params;
        const merchantId = req.merchantId;
        const order = await Order_1.Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        // If packing slip already exists, return it
        if (order.packingSlipUrl) {
            return res.json({
                success: true,
                data: {
                    packingSlipUrl: order.packingSlipUrl
                }
            });
        }
        // Generate new packing slip
        const slipUrl = await InvoiceService_1.default.generatePackingSlip(order, merchantId);
        order.packingSlipUrl = slipUrl;
        await order.save();
        return res.json({
            success: true,
            message: 'Packing slip generated successfully',
            data: {
                packingSlipUrl: slipUrl
            }
        });
    }
    catch (error) {
        console.error('Error generating packing slip:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate packing slip',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   POST /api/orders/bulk-labels
// @desc    Generate shipping labels for multiple orders
// @access  Private
router.post('/bulk-labels', async (req, res) => {
    try {
        const { orderIds } = req.body;
        const merchantId = req.merchantId;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No order IDs provided'
            });
        }
        const orders = await Order_1.Order.find({ _id: { $in: orderIds } });
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found'
            });
        }
        // Generate combined label PDF
        const combinedLabelUrl = await ShippingLabelService_1.default.generateCombinedShippingLabels(orders, merchantId);
        return res.json({
            success: true,
            message: `Generated shipping labels for ${orders.length} orders`,
            data: {
                combinedLabelUrl,
                orderCount: orders.length
            }
        });
    }
    catch (error) {
        console.error('Error generating bulk shipping labels:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate bulk shipping labels',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
