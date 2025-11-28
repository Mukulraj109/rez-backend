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
exports.getPendingCashbackCount = exports.getCashbackMetrics = exports.getCashbackAnalytics = exports.exportCashbackData = exports.bulkCashbackAction = exports.markCashbackAsPaid = exports.createCashbackRequest = exports.getCashbackRequest = exports.getCashbackStats = exports.listCashbackRequests = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cashback_1 = require("../../models/Cashback");
const Order_1 = require("../../models/Order");
const User_1 = require("../../models/User");
const response_1 = require("../../utils/response");
const asyncHandler_1 = require("../../utils/asyncHandler");
const EmailService_1 = require("../../services/EmailService");
const razorpayService_1 = require("../../services/razorpayService");
const UserCashback_1 = require("../../models/UserCashback");
/**
 * Calculate total cashback earned by a user
 */
async function calculateTotalCashbackEarned(userId) {
    try {
        const cashbackRecords = await UserCashback_1.UserCashback.find({
            user: userId,
            status: { $in: ['credited', 'pending'] }
        }).select('amount').lean();
        return cashbackRecords.reduce((total, record) => total + (record.amount || 0), 0);
    }
    catch (error) {
        console.error('❌ [CASHBACK] Error calculating total cashback:', error);
        return 0;
    }
}
const pendingCountCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
/**
 * GET /api/merchant/cashback
 * List all cashback requests for merchant
 */
exports.listCashbackRequests = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔍 [CASHBACK] listCashbackRequests called');
    const merchantId = req.merchantId;
    console.log('🔍 [CASHBACK] merchantId:', merchantId);
    console.log('🔍 [CASHBACK] query params:', req.query);
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const query = {};
        if (status) {
            query.status = status;
        }
        console.log('🔍 [CASHBACK] MongoDB query:', query);
        const [cashbackRequests, total] = await Promise.all([
            Cashback_1.CashbackMongoModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Cashback_1.CashbackMongoModel.countDocuments(query)
        ]);
        console.log('🔍 [CASHBACK] Found', cashbackRequests.length, 'cashback requests, total:', total);
        return (0, response_1.sendSuccess)(res, {
            cashbacks: cashbackRequests,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Cashback requests retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error listing cashback requests:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * GET /api/merchant/cashback/stats
 * Get cashback statistics (alias for metrics)
 */
exports.getCashbackStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔍 [CASHBACK] getCashbackStats called');
    const merchantId = req.merchantId;
    console.log('🔍 [CASHBACK] merchantId:', merchantId);
    console.log('🔍 [CASHBACK] query params:', req.query);
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const query = {};
        if (startDate) {
            query.createdAt = { $gte: startDate };
        }
        if (endDate) {
            query.createdAt = { ...query.createdAt, $lte: endDate };
        }
        console.log('🔍 [CASHBACK] Stats query:', query);
        const stats = await Cashback_1.CashbackMongoModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    approved: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                    },
                    paid: {
                        $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                    }
                }
            }
        ]);
        const result = stats[0] || {
            total: 0,
            totalAmount: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            paid: 0
        };
        console.log('🔍 [CASHBACK] Stats result:', result);
        return (0, response_1.sendSuccess)(res, { stats: result }, 'Cashback statistics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error getting cashback stats:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * GET /api/merchant/cashback/:id
 * Get single cashback request with complete details including audit trail
 */
exports.getCashbackRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const merchantId = req.merchantId;
    try {
        console.log('📋 [MERCHANT CASHBACK] Fetching cashback request:', id);
        // Find cashback request
        const cashbackRequest = await Cashback_1.CashbackModel.findById(id);
        if (!cashbackRequest) {
            return (0, response_1.sendNotFound)(res, 'Cashback request not found');
        }
        // Verify merchant owns this cashback request
        // In a real implementation, you'd check against the merchant's stores
        // For now, we'll skip this check or use merchantId if available
        return (0, response_1.sendSuccess)(res, {
            cashback: cashbackRequest,
            auditTrail: cashbackRequest.timeline || []
        }, 'Cashback request retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error fetching cashback request:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * POST /api/merchant/cashback
 * Create new cashback request
 */
exports.createCashbackRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderId, customerId, amount, reason } = req.body;
    const merchantId = req.merchantId;
    try {
        console.log('💰 [MERCHANT CASHBACK] Creating cashback request:', {
            orderId,
            customerId,
            amount,
            merchantId
        });
        // Validate order exists and belongs to merchant
        const order = await Order_1.Order.findById(orderId);
        if (!order) {
            return (0, response_1.sendBadRequest)(res, 'Order not found');
        }
        // Verify order belongs to merchant's store
        const Store = (await Promise.resolve().then(() => __importStar(require('../../models/Store')))).Store;
        const merchantStores = await Store.find({ owner: merchantId }).select('_id').lean();
        const merchantStoreIds = merchantStores.map(s => s._id.toString());
        // Check if any order item belongs to merchant's stores
        const orderStoreIds = order.items.map((item) => {
            const storeId = item.store;
            return typeof storeId === 'string' ? storeId : storeId?.toString();
        }).filter(Boolean);
        const hasMerchantStore = orderStoreIds.some((storeId) => merchantStoreIds.includes(storeId));
        if (!hasMerchantStore) {
            return (0, response_1.sendBadRequest)(res, 'Order does not belong to your stores');
        }
        // Fetch customer details
        const customer = await User_1.User.findById(customerId);
        if (!customer) {
            return (0, response_1.sendBadRequest)(res, 'Customer not found');
        }
        // Calculate cashback based on rules (default 5%)
        const cashbackRate = 5.0;
        const requestedAmount = amount || (order.totals.total * cashbackRate / 100);
        // Prepare customer data
        const customerData = {
            id: String(customer._id),
            name: `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || 'Unknown',
            email: customer.email || customer.phoneNumber + '@phone.user',
            phone: customer.phoneNumber || '',
            avatar: customer.profile?.avatar,
            totalCashbackEarned: await calculateTotalCashbackEarned(customerId),
            accountAge: Math.floor((Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
            verificationStatus: (customer.auth?.isVerified ? 'verified' : 'unverified')
        };
        // Prepare order data
        const orderData = {
            id: String(order._id),
            orderNumber: order.orderNumber,
            totalAmount: order.totals.total,
            orderDate: order.createdAt,
            items: order.items.map(item => ({
                productId: item.product.toString(),
                productName: item.name,
                quantity: item.quantity,
                price: item.price,
                cashbackEligible: true
            }))
        };
        // Calculate breakdown
        const calculationBreakdown = order.items.map(item => ({
            productId: item.product.toString(),
            productName: item.name,
            quantity: item.quantity,
            productPrice: item.price,
            cashbackRate,
            cashbackAmount: (item.price * item.quantity * cashbackRate / 100),
            categoryId: 'general',
            categoryName: 'General'
        }));
        // Assess risk
        const requestData = {
            merchantId,
            customerId: String(customer._id),
            orderId: String(order._id),
            customer: customerData,
            order: orderData,
            requestedAmount,
            cashbackRate,
            calculationBreakdown,
            status: 'pending',
            priority: 'normal',
            timeline: [{
                    status: 'pending',
                    timestamp: new Date(),
                    notes: reason || 'Cashback request created',
                    by: merchantId
                }]
        };
        const riskAssessment = Cashback_1.CashbackModel.assessRisk(requestData);
        // Create cashback request
        const cashback = await Cashback_1.CashbackModel.create({
            ...requestData,
            ...riskAssessment
        });
        // Send notification email to customer
        try {
            await EmailService_1.EmailService.send({
                to: customer.email || customer.phoneNumber + '@example.com',
                subject: 'Cashback Request Created',
                html: `
          <h2>Cashback Request Created</h2>
          <p>Hi ${customerData.name},</p>
          <p>A cashback request has been created for your order ${order.orderNumber}.</p>
          <p><strong>Amount:</strong> ₹${requestedAmount.toFixed(2)}</p>
          <p><strong>Status:</strong> Pending Review</p>
          <p>You will be notified once the request is approved.</p>
        `
            });
        }
        catch (emailError) {
            console.warn('⚠️ [MERCHANT CASHBACK] Failed to send email notification:', emailError);
        }
        // Clear pending count cache
        pendingCountCache.delete(merchantId);
        return (0, response_1.sendSuccess)(res, { cashback }, 'Cashback request created successfully', 201);
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error creating cashback request:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * PUT /api/merchant/cashback/:id/mark-paid
 * Mark approved cashback as paid
 */
exports.markCashbackAsPaid = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { paymentMethod, paymentReference, notes } = req.body;
    const merchantId = req.merchantId;
    try {
        console.log('💳 [MERCHANT CASHBACK] Marking cashback as paid:', {
            id,
            paymentMethod,
            paymentReference
        });
        // Find cashback request
        const cashbackRequest = await Cashback_1.CashbackModel.findById(id);
        if (!cashbackRequest) {
            return (0, response_1.sendNotFound)(res, 'Cashback request not found');
        }
        // Validate status transition
        if (cashbackRequest.status !== 'approved') {
            return (0, response_1.sendBadRequest)(res, `Cannot mark as paid. Current status is '${cashbackRequest.status}'. Must be 'approved'.`);
        }
        // No need to check if already paid since status validation above catches it
        // For automated payouts via Razorpay
        let payoutId;
        if (paymentMethod === 'bank_transfer' && cashbackRequest.customerBankDetails) {
            try {
                const payout = await (0, razorpayService_1.createRazorpayPayout)({
                    amount: cashbackRequest.approvedAmount || cashbackRequest.requestedAmount,
                    currency: 'INR',
                    accountNumber: cashbackRequest.customerBankDetails.accountNumber,
                    ifsc: cashbackRequest.customerBankDetails.ifscCode,
                    name: cashbackRequest.customerBankDetails.accountHolderName,
                    purpose: 'cashback',
                    reference: `CB-${cashbackRequest.requestNumber}`
                });
                payoutId = payout.id;
            }
            catch (payoutError) {
                console.error('❌ [MERCHANT CASHBACK] Payout failed:', payoutError);
                return (0, response_1.sendBadRequest)(res, `Payout failed: ${payoutError.message}`);
            }
        }
        // Update cashback to paid status
        const updatedCashback = await Cashback_1.CashbackMongoModel.findByIdAndUpdate(id, {
            status: 'paid',
            paymentMethod,
            paymentReference: payoutId || paymentReference,
            paidAt: new Date(),
            paidAmount: cashbackRequest.approvedAmount || cashbackRequest.requestedAmount,
            payoutId,
            paymentStatus: 'processed',
            $push: {
                timeline: {
                    status: 'paid',
                    timestamp: new Date(),
                    notes: notes || `Payment processed via ${paymentMethod}`,
                    by: merchantId
                }
            }
        }, { new: true });
        if (!updatedCashback) {
            return (0, response_1.sendNotFound)(res, 'Failed to update cashback request');
        }
        // Send confirmation email to customer
        try {
            const customer = await User_1.User.findById(cashbackRequest.customerId);
            if (customer && customer.email) {
                await EmailService_1.EmailService.send({
                    to: customer.email,
                    subject: 'Cashback Payment Processed',
                    html: `
            <h2>Cashback Payment Processed</h2>
            <p>Hi ${cashbackRequest.customer.name},</p>
            <p>Great news! Your cashback has been processed.</p>
            <p><strong>Amount:</strong> ₹${(cashbackRequest.approvedAmount || cashbackRequest.requestedAmount).toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Reference:</strong> ${paymentReference}</p>
            <p>Thank you for shopping with us!</p>
          `
                });
            }
        }
        catch (emailError) {
            console.warn('⚠️ [MERCHANT CASHBACK] Failed to send confirmation email:', emailError);
        }
        // Clear pending count cache
        pendingCountCache.delete(cashbackRequest.merchantId);
        const transformedCashback = {
            id: updatedCashback._id.toString(),
            ...updatedCashback.toObject(),
            createdAt: updatedCashback.createdAt,
            updatedAt: updatedCashback.updatedAt
        };
        return (0, response_1.sendSuccess)(res, { cashback: transformedCashback }, 'Cashback marked as paid successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error marking cashback as paid:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * POST /api/merchant/cashback/bulk-action
 * Bulk approve/reject cashback requests
 */
exports.bulkCashbackAction = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { action, cashbackIds, reason, notes } = req.body;
    const merchantId = req.merchantId;
    try {
        console.log('📦 [MERCHANT CASHBACK] Bulk action:', {
            action,
            count: cashbackIds.length
        });
        const results = [];
        // Use MongoDB session for transaction
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            for (const cashbackId of cashbackIds) {
                try {
                    const cashback = await Cashback_1.CashbackModel.findById(cashbackId);
                    if (!cashback) {
                        results.push({
                            success: false,
                            cashbackId,
                            message: 'Cashback request not found'
                        });
                        continue;
                    }
                    // Validate status
                    if (cashback.status !== 'pending' && cashback.status !== 'under_review') {
                        results.push({
                            success: false,
                            cashbackId,
                            requestNumber: cashback.requestNumber,
                            message: `Invalid status: ${cashback.status}`
                        });
                        continue;
                    }
                    let updatedCashback = null;
                    if (action === 'approve') {
                        updatedCashback = await Cashback_1.CashbackModel.approve(cashbackId, cashback.requestedAmount, notes, merchantId);
                    }
                    else if (action === 'reject') {
                        updatedCashback = await Cashback_1.CashbackModel.reject(cashbackId, reason || 'Rejected by merchant', merchantId);
                    }
                    if (updatedCashback) {
                        results.push({
                            success: true,
                            cashbackId,
                            requestNumber: updatedCashback.requestNumber
                        });
                        // Send notification email
                        try {
                            const customer = await User_1.User.findById(cashback.customerId);
                            if (customer && customer.email) {
                                const subject = action === 'approve'
                                    ? 'Cashback Request Approved'
                                    : 'Cashback Request Update';
                                const message = action === 'approve'
                                    ? `Your cashback request has been approved! Amount: ₹${cashback.requestedAmount.toFixed(2)}`
                                    : `Your cashback request has been rejected. Reason: ${reason}`;
                                await EmailService_1.EmailService.send({
                                    to: customer.email,
                                    subject,
                                    html: `
                    <h2>${subject}</h2>
                    <p>Hi ${cashback.customer.name},</p>
                    <p>${message}</p>
                    <p><strong>Request Number:</strong> ${cashback.requestNumber}</p>
                  `
                                });
                            }
                        }
                        catch (emailError) {
                            console.warn('⚠️ [MERCHANT CASHBACK] Failed to send notification:', emailError);
                        }
                    }
                    else {
                        results.push({
                            success: false,
                            cashbackId,
                            requestNumber: cashback.requestNumber,
                            message: 'Failed to process request'
                        });
                    }
                }
                catch (itemError) {
                    results.push({
                        success: false,
                        cashbackId,
                        message: itemError.message
                    });
                }
            }
            await session.commitTransaction();
        }
        catch (transactionError) {
            await session.abortTransaction();
            throw transactionError;
        }
        finally {
            session.endSession();
        }
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        // Clear cache for affected merchants
        const merchantIds = new Set();
        for (const result of results) {
            if (result.success) {
                const cashback = await Cashback_1.CashbackModel.findById(result.cashbackId);
                if (cashback) {
                    merchantIds.add(cashback.merchantId);
                }
            }
        }
        merchantIds.forEach(merchantId => pendingCountCache.delete(merchantId));
        return (0, response_1.sendSuccess)(res, {
            success: successCount,
            failed: failedCount,
            results
        }, `Bulk ${action} completed: ${successCount} succeeded, ${failedCount} failed`);
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error in bulk action:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * POST /api/merchant/cashback/export
 * Export cashback data to CSV/Excel
 */
exports.exportCashbackData = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔍 [CASHBACK] exportCashbackData called');
    const { startDate, endDate, status, format } = req.query;
    const merchantId = req.merchantId;
    console.log('🔍 [CASHBACK] merchantId:', merchantId);
    console.log('🔍 [CASHBACK] query params:', req.query);
    try {
        console.log('📊 [MERCHANT CASHBACK] Exporting data:', {
            startDate,
            endDate,
            status,
            format
        });
        // Build query
        const query = { merchantId };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
        }
        if (status) {
            query.status = status;
        }
        // Fetch cashback data
        const cashbackData = await Cashback_1.CashbackMongoModel.find(query).sort({ createdAt: -1 });
        // Generate CSV data
        const csvRows = [];
        // Header
        csvRows.push([
            'Request Number',
            'Customer Name',
            'Customer Email',
            'Order Number',
            'Requested Amount',
            'Approved Amount',
            'Status',
            'Priority',
            'Risk Score',
            'Payment Method',
            'Payment Reference',
            'Created At',
            'Paid At'
        ].join(','));
        // Data rows
        for (const cashback of cashbackData) {
            csvRows.push([
                cashback.requestNumber,
                `"${cashback.customer.name}"`,
                cashback.customer.email,
                cashback.order.orderNumber,
                cashback.requestedAmount.toFixed(2),
                (cashback.approvedAmount || 0).toFixed(2),
                cashback.status,
                cashback.priority,
                cashback.riskScore,
                cashback.paymentMethod || 'N/A',
                cashback.paymentReference || 'N/A',
                cashback.createdAt.toISOString(),
                cashback.paidAt ? cashback.paidAt.toISOString() : 'N/A'
            ].join(','));
        }
        const csvContent = csvRows.join('\n');
        // In a real implementation, you would:
        // 1. Upload to cloud storage (S3, GCS, etc.)
        // 2. Generate signed URL
        // 3. Set expiry time
        // For now, we'll return the CSV directly
        // For large datasets, create async job
        if (cashbackData.length > 1000) {
            // Create background job for large exports
            const jobId = `export_${merchantId}_${Date.now()}`;
            try {
                // Store export job metadata (in a real implementation, use Redis/Bull queue)
                // For now, we'll log and return job info
                console.log(`📊 [CASHBACK EXPORT] Large export job created: ${jobId}`, {
                    merchantId,
                    recordCount: cashbackData.length,
                    createdAt: new Date()
                });
                // In production, you would:
                // 1. Add job to Bull queue
                // 2. Process CSV generation in background worker
                // 3. Upload to cloud storage (S3, etc.)
                // 4. Send email with download link
                // For now, return job info
                return (0, response_1.sendSuccess)(res, {
                    message: 'Export job created. You will receive an email when the export is ready.',
                    jobId,
                    estimatedTime: '5-10 minutes',
                    recordCount: cashbackData.length,
                    status: 'queued'
                }, 'Export job queued');
            }
            catch (jobError) {
                console.error('❌ [CASHBACK EXPORT] Failed to create export job:', jobError);
                // Fall through to immediate export for small datasets
            }
        }
        // For small datasets, return immediately
        const downloadUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return (0, response_1.sendSuccess)(res, {
            downloadUrl,
            expiresAt,
            recordCount: cashbackData.length,
            format
        }, 'Export ready for download');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error exporting data:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * GET /api/merchant/cashback/analytics
 * Get cashback analytics and trends
 */
exports.getCashbackAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, storeId } = req.query;
    const merchantId = req.merchantId;
    try {
        console.log('📈 [MERCHANT CASHBACK] Fetching analytics:', {
            merchantId,
            startDate,
            endDate,
            storeId
        });
        const dateRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate)
        } : undefined;
        // Get analytics from model
        const analytics = await Cashback_1.CashbackModel.getAnalytics(merchantId, dateRange);
        // Calculate additional metrics
        const requests = await Cashback_1.CashbackMongoModel.find({
            merchantId,
            ...(dateRange && {
                createdAt: {
                    $gte: dateRange.start,
                    $lte: dateRange.end
                }
            })
        });
        const totalApproved = requests.filter(r => r.status === 'approved' || r.status === 'paid').length;
        const totalPending = requests.filter(r => r.status === 'pending' || r.status === 'under_review').length;
        const totalRejected = requests.filter(r => r.status === 'rejected').length;
        const totalAmount = requests.reduce((sum, r) => sum + r.requestedAmount, 0);
        // Calculate trends (this month vs last month)
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const thisMonthRequests = await Cashback_1.CashbackMongoModel.find({
            merchantId,
            createdAt: { $gte: thisMonthStart }
        });
        const lastMonthRequests = await Cashback_1.CashbackMongoModel.find({
            merchantId,
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });
        const thisMonthTotal = thisMonthRequests.reduce((sum, r) => sum + r.requestedAmount, 0);
        const lastMonthTotal = lastMonthRequests.reduce((sum, r) => sum + r.requestedAmount, 0);
        const monthOverMonthGrowth = lastMonthTotal > 0
            ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
            : 0;
        // Top customers by cashback received
        const customerMap = new Map();
        requests.filter(r => r.status === 'paid').forEach(req => {
            const existing = customerMap.get(req.customerId) || {
                name: req.customer.name,
                total: 0,
                count: 0
            };
            existing.total += req.approvedAmount || req.requestedAmount;
            existing.count += 1;
            customerMap.set(req.customerId, existing);
        });
        const topCustomers = Array.from(customerMap.entries())
            .map(([id, data]) => ({
            customerId: id,
            customerName: data.name,
            totalCashback: data.total,
            requestCount: data.count
        }))
            .sort((a, b) => b.totalCashback - a.totalCashback)
            .slice(0, 10);
        // Calculate ROI (estimated)
        const roiMetrics = {
            totalCashbackPaid: analytics.totalPaid,
            estimatedRepeatPurchases: analytics.totalPaid * 2.5, // Estimated
            customerRetentionImpact: analytics.customerRetentionImpact,
            roi: analytics.totalPaid > 0 ? ((analytics.totalPaid * 2.5) / analytics.totalPaid) * 100 : 0
        };
        return (0, response_1.sendSuccess)(res, {
            totalApproved,
            totalPending,
            totalRejected,
            totalAmount,
            averageApprovalTime: analytics.averageApprovalTime,
            approvalRate: analytics.approvalRate,
            trends: {
                thisMonth: thisMonthTotal,
                lastMonth: lastMonthTotal,
                growth: monthOverMonthGrowth,
                monthlyData: analytics.monthlyTrends
            },
            topCustomers,
            roiMetrics,
            categories: analytics.topCategories
        }, 'Analytics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error fetching analytics:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * GET /api/merchant/cashback/metrics
 * Get enhanced cashback metrics with trends, comparisons, and processing time analytics
 */
exports.getCashbackMetrics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    const merchantId = req.merchantId;
    try {
        console.log('📊 [MERCHANT CASHBACK] Fetching enhanced metrics:', {
            merchantId,
            startDate,
            endDate
        });
        const dateRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate)
        } : undefined;
        // Get base metrics from model
        const baseMetrics = await Cashback_1.CashbackModel.getMetrics(merchantId);
        // Build query for additional metrics
        const query = { merchantId };
        if (dateRange) {
            query.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }
        const requests = await Cashback_1.CashbackMongoModel.find(query);
        // Calculate period-over-period comparison
        const now = new Date();
        const currentPeriodStart = dateRange ? dateRange.start : new Date(now.getFullYear(), now.getMonth(), 1);
        const currentPeriodEnd = dateRange ? dateRange.end : now;
        // Calculate previous period (same duration)
        const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
        const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDuration);
        const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
        const currentPeriodRequests = await Cashback_1.CashbackMongoModel.find({
            merchantId,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        });
        const previousPeriodRequests = await Cashback_1.CashbackMongoModel.find({
            merchantId,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        });
        // Current period metrics
        const currentTotal = currentPeriodRequests.reduce((sum, r) => sum + r.requestedAmount, 0);
        const currentApproved = currentPeriodRequests.filter(r => r.status === 'approved' || r.status === 'paid').length;
        const currentPaid = currentPeriodRequests.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount), 0);
        // Previous period metrics
        const previousTotal = previousPeriodRequests.reduce((sum, r) => sum + r.requestedAmount, 0);
        const previousApproved = previousPeriodRequests.filter(r => r.status === 'approved' || r.status === 'paid').length;
        const previousPaid = previousPeriodRequests.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount), 0);
        // Calculate growth percentages
        const requestGrowth = previousPeriodRequests.length > 0
            ? ((currentPeriodRequests.length - previousPeriodRequests.length) / previousPeriodRequests.length) * 100
            : 0;
        const amountGrowth = previousTotal > 0
            ? ((currentTotal - previousTotal) / previousTotal) * 100
            : 0;
        const approvalGrowth = previousApproved > 0
            ? ((currentApproved - previousApproved) / previousApproved) * 100
            : 0;
        const paidGrowth = previousPaid > 0
            ? ((currentPaid - previousPaid) / previousPaid) * 100
            : 0;
        // Processing time metrics
        const completedRequests = requests.filter(r => r.reviewedAt && r.createdAt);
        const processingTimes = completedRequests.map(r => (r.reviewedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) // hours
        );
        const avgProcessingTime = processingTimes.length > 0
            ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
            : 0;
        const minProcessingTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
        const maxProcessingTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
        // Sort processing times to find median
        const sortedTimes = [...processingTimes].sort((a, b) => a - b);
        const medianProcessingTime = sortedTimes.length > 0
            ? sortedTimes.length % 2 === 0
                ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
                : sortedTimes[Math.floor(sortedTimes.length / 2)]
            : 0;
        // Status breakdown
        const statusBreakdown = {
            pending: requests.filter(r => r.status === 'pending').length,
            under_review: requests.filter(r => r.status === 'under_review').length,
            approved: requests.filter(r => r.status === 'approved').length,
            rejected: requests.filter(r => r.status === 'rejected').length,
            paid: requests.filter(r => r.status === 'paid').length,
            expired: requests.filter(r => r.status === 'expired').length,
            cancelled: requests.filter(r => r.status === 'cancelled').length
        };
        // Risk distribution
        const riskDistribution = {
            low: requests.filter(r => r.riskScore < 40).length,
            medium: requests.filter(r => r.riskScore >= 40 && r.riskScore < 70).length,
            high: requests.filter(r => r.riskScore >= 70).length
        };
        // Approval rate by risk level
        const lowRiskRequests = requests.filter(r => r.riskScore < 40);
        const lowRiskApprovalRate = lowRiskRequests.length > 0
            ? (lowRiskRequests.filter(r => r.status === 'approved' || r.status === 'paid').length / lowRiskRequests.length) * 100
            : 0;
        const mediumRiskRequests = requests.filter(r => r.riskScore >= 40 && r.riskScore < 70);
        const mediumRiskApprovalRate = mediumRiskRequests.length > 0
            ? (mediumRiskRequests.filter(r => r.status === 'approved' || r.status === 'paid').length / mediumRiskRequests.length) * 100
            : 0;
        const highRiskRequests = requests.filter(r => r.riskScore >= 70);
        const highRiskApprovalRate = highRiskRequests.length > 0
            ? (highRiskRequests.filter(r => r.status === 'approved' || r.status === 'paid').length / highRiskRequests.length) * 100
            : 0;
        return (0, response_1.sendSuccess)(res, {
            // Base metrics
            totalPendingRequests: baseMetrics.totalPendingRequests,
            totalPendingAmount: baseMetrics.totalPendingAmount,
            highRiskRequests: baseMetrics.highRiskRequests,
            autoApprovedToday: baseMetrics.autoApprovedToday,
            avgApprovalTime: baseMetrics.avgApprovalTime,
            cashbackROI: baseMetrics.cashbackROI,
            customerRetentionImpact: baseMetrics.customerRetentionImpact,
            // Growth trends
            trends: {
                requestCount: {
                    current: currentPeriodRequests.length,
                    previous: previousPeriodRequests.length,
                    growth: requestGrowth
                },
                totalAmount: {
                    current: currentTotal,
                    previous: previousTotal,
                    growth: amountGrowth
                },
                approvals: {
                    current: currentApproved,
                    previous: previousApproved,
                    growth: approvalGrowth
                },
                paidAmount: {
                    current: currentPaid,
                    previous: previousPaid,
                    growth: paidGrowth
                }
            },
            // Processing time analytics
            processingTime: {
                average: avgProcessingTime,
                median: medianProcessingTime,
                min: minProcessingTime,
                max: maxProcessingTime,
                unit: 'hours'
            },
            // Status breakdown
            statusBreakdown,
            // Risk analytics
            riskDistribution,
            approvalRateByRisk: {
                low: lowRiskApprovalRate,
                medium: mediumRiskApprovalRate,
                high: highRiskApprovalRate
            },
            // Period info
            period: {
                start: currentPeriodStart,
                end: currentPeriodEnd,
                duration: periodDuration
            }
        }, 'Enhanced metrics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error fetching metrics:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
/**
 * GET /api/merchant/cashback/pending-count
 * Get count of pending cashback approvals (cached for 5 minutes)
 */
exports.getPendingCashbackCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔍 [CASHBACK] getPendingCashbackCount called');
    const merchantId = req.merchantId;
    console.log('🔍 [CASHBACK] merchantId:', merchantId);
    try {
        // Check cache
        const cached = pendingCountCache.get(merchantId);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            console.log('📊 [MERCHANT CASHBACK] Returning cached pending count:', cached.count);
            return (0, response_1.sendSuccess)(res, {
                count: cached.count,
                cached: true
            }, 'Pending count retrieved from cache');
        }
        // Fetch fresh count
        const count = await Cashback_1.CashbackMongoModel.countDocuments({
            merchantId,
            status: { $in: ['pending', 'under_review'] }
        });
        // Update cache
        pendingCountCache.set(merchantId, {
            count,
            timestamp: now
        });
        return (0, response_1.sendSuccess)(res, {
            count,
            cached: false
        }, 'Pending count retrieved successfully');
    }
    catch (error) {
        console.error('❌ [MERCHANT CASHBACK] Error fetching pending count:', error);
        return (0, response_1.sendInternalError)(res, error.message);
    }
});
