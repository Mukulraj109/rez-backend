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
const Cashback_1 = require("../models/Cashback");
const PaymentService_1 = __importDefault(require("../services/PaymentService"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// @route   GET /api/cashback
// @desc    Get cashback requests with search and filtering
// @access  Private
router.get('/', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const { status, customerId, startDate, endDate, minAmount, maxAmount, riskLevel, flaggedOnly, sortBy, sortOrder, page, limit } = req.query;
        const searchParams = { merchantId: req.merchantId };
        if (status)
            searchParams.status = status;
        if (customerId)
            searchParams.customerId = customerId;
        if (startDate && endDate) {
            searchParams.dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        }
        if (minAmount || maxAmount) {
            searchParams.amountRange = {
                min: minAmount ? parseFloat(minAmount) : 0,
                max: maxAmount ? parseFloat(maxAmount) : Number.MAX_VALUE
            };
        }
        if (riskLevel)
            searchParams.riskLevel = riskLevel;
        if (flaggedOnly === 'true')
            searchParams.flaggedOnly = true;
        if (sortBy)
            searchParams.sortBy = sortBy;
        if (sortOrder)
            searchParams.sortOrder = sortOrder;
        if (page)
            searchParams.page = parseInt(page);
        if (limit)
            searchParams.limit = parseInt(limit);
        const result = await Cashback_1.CashbackModel.search(searchParams);
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error fetching cashback requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback requests',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/cashback/metrics
router.get('/metrics', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const metrics = await Cashback_1.CashbackModel.getMetrics(req.merchantId);
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
// @route   GET /api/cashback/analytics
router.get('/analytics', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const { startDate, endDate } = req.query;
        let dateRange;
        if (startDate && endDate) {
            dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        }
        const analytics = await Cashback_1.CashbackModel.getAnalytics(req.merchantId, dateRange);
        return res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching cashback analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback analytics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/cashback/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashback request not found'
            });
        }
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        return res.json({
            success: true,
            data: request
        });
    }
    catch (error) {
        console.error('Error fetching cashback request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   POST /api/cashback
router.post('/', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const requestData = {
            ...req.body,
            merchantId: req.merchantId
        };
        const riskAssessment = Cashback_1.CashbackModel.assessRisk(requestData);
        const fullRequestData = { ...requestData, ...riskAssessment };
        const request = await Cashback_1.CashbackModel.create(fullRequestData);
        return res.status(201).json({
            success: true,
            message: 'Cashback request created successfully',
            data: request
        });
    }
    catch (error) {
        console.error('Error creating cashback request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create cashback request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   PUT /api/cashback/:id/approve
router.put('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedAmount, notes } = req.body;
        const reviewedBy = 'system';
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Cashback request not found' });
        }
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const updatedRequest = await Cashback_1.CashbackModel.approve(id, approvedAmount, notes, reviewedBy);
        if (!updatedRequest) {
            return res.status(400).json({
                success: false,
                message: 'Cannot approve request - invalid status or request not found'
            });
        }
        // Process payment if customer has bank details
        if (updatedRequest.customerBankDetails &&
            updatedRequest.customerBankDetails.accountNumber &&
            updatedRequest.customerBankDetails.ifscCode &&
            updatedRequest.customerBankDetails.accountHolderName) {
            try {
                console.log(`💰 [CASHBACK] Processing payout for cashback request: ${id}`);
                const payoutResult = await PaymentService_1.default.processCashbackPayout(updatedRequest, updatedRequest.customerBankDetails);
                if (payoutResult.success) {
                    // Update cashback with payment details using MongoDB directly
                    const { CashbackMongoModel } = await Promise.resolve().then(() => __importStar(require('../models/Cashback')));
                    const cashbackDoc = await CashbackMongoModel.findById(id);
                    if (cashbackDoc) {
                        cashbackDoc.status = 'paid';
                        cashbackDoc.paidAt = new Date();
                        cashbackDoc.payoutId = payoutResult.payoutId;
                        cashbackDoc.paymentStatus = payoutResult.status;
                        cashbackDoc.timeline.push({
                            status: 'paid',
                            timestamp: new Date(),
                            notes: `Payment processed via Razorpay payout`,
                            by: 'system'
                        });
                        await cashbackDoc.save();
                        console.log(`✅ [CASHBACK] Cashback ${id} paid successfully`);
                        return res.json({
                            success: true,
                            message: 'Cashback approved and paid successfully',
                            data: {
                                ...updatedRequest,
                                status: 'paid',
                                payoutId: payoutResult.payoutId,
                                paymentStatus: payoutResult.status
                            }
                        });
                    }
                }
                else {
                    console.error(`❌ [CASHBACK] Payment failed for cashback ${id}:`, payoutResult.error);
                    // Keep status as approved but log error
                }
            }
            catch (paymentError) {
                console.error('❌ [CASHBACK] Payment processing error:', paymentError);
                // Keep status as approved, merchant can manually process
            }
        }
        return res.json({
            success: true,
            message: 'Cashback request approved successfully',
            data: updatedRequest
        });
    }
    catch (error) {
        console.error('Error approving cashback request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to approve cashback request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   PUT /api/cashback/:id/reject
router.put('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const reviewedBy = 'system';
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Cashback request not found' });
        }
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const updatedRequest = await Cashback_1.CashbackModel.reject(id, reason, reviewedBy);
        if (!updatedRequest) {
            return res.status(400).json({
                success: false,
                message: 'Cannot reject request - invalid status or request not found'
            });
        }
        return res.json({
            success: true,
            message: 'Cashback request rejected successfully',
            data: updatedRequest
        });
    }
    catch (error) {
        console.error('Error rejecting cashback request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reject cashback request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   PUT /api/cashback/:id/mark-paid
router.put('/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, paymentReference } = req.body;
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashback request not found'
            });
        }
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const updatedRequest = await Cashback_1.CashbackModel.markAsPaid(id, paymentMethod, paymentReference);
        if (!updatedRequest) {
            return res.status(400).json({
                success: false,
                message: 'Cannot mark as paid - request must be approved first'
            });
        }
        return res.json({
            success: true,
            message: 'Cashback marked as paid successfully',
            data: updatedRequest
        });
    }
    catch (error) {
        console.error('Error marking cashback as paid:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark cashback as paid',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   POST /api/cashback/bulk-action
router.post('/bulk-action', async (req, res) => {
    try {
        const { requestIds, action, notes, approvedAmount, rejectionReason } = req.body;
        const reviewedBy = 'system';
        if (!requestIds || requestIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No request IDs provided' });
        }
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        for (const requestId of requestIds) {
            const request = await Cashback_1.CashbackModel.findById(requestId);
            if (request && request.merchantId !== merchantId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - one or more requests do not belong to your account'
                });
            }
        }
        let results;
        switch (action) {
            case 'approve':
                results = await Cashback_1.CashbackModel.bulkApprove(requestIds, notes, reviewedBy);
                break;
            case 'reject':
                if (!rejectionReason) {
                    return res.status(400).json({
                        success: false,
                        message: 'Rejection reason is required for bulk rejection'
                    });
                }
                results = await Cashback_1.CashbackModel.bulkReject(requestIds, rejectionReason, reviewedBy);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid bulk action'
                });
        }
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        return res.json({
            success: true,
            message: `Bulk ${action} completed: ${successCount} successful, ${failureCount} failed`,
            data: {
                results,
                summary: {
                    total: requestIds.length,
                    successful: successCount,
                    failed: failureCount
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
// @route   POST /api/cashback/:id/process-payment
// @desc    Manually process payment for approved cashback
// @access  Private
router.post('/:id/process-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { bankDetails } = req.body;
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashback request not found'
            });
        }
        // Verify merchant owns this
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        // Check if already paid
        if (request.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Cashback already paid'
            });
        }
        // Check if approved
        if (request.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cashback must be approved first'
            });
        }
        // Use provided bank details or existing customer bank details
        const customerBankDetails = bankDetails || request.customerBankDetails;
        if (!customerBankDetails || !customerBankDetails.accountNumber || !customerBankDetails.ifscCode || !customerBankDetails.accountHolderName) {
            return res.status(400).json({
                success: false,
                message: 'Bank details are required for payment processing'
            });
        }
        // Process payment
        console.log(`💰 [CASHBACK] Manually processing payout for cashback request: ${id}`);
        const payoutResult = await PaymentService_1.default.processCashbackPayout(request, customerBankDetails);
        if (payoutResult.success) {
            // Update cashback with payment details using MongoDB directly
            const { CashbackMongoModel } = await Promise.resolve().then(() => __importStar(require('../models/Cashback')));
            const cashbackDoc = await CashbackMongoModel.findById(id);
            if (cashbackDoc) {
                cashbackDoc.status = 'paid';
                cashbackDoc.paidAt = new Date();
                cashbackDoc.payoutId = payoutResult.payoutId;
                cashbackDoc.paymentStatus = payoutResult.status;
                if (bankDetails) {
                    cashbackDoc.customerBankDetails = bankDetails;
                }
                cashbackDoc.timeline.push({
                    status: 'paid',
                    timestamp: new Date(),
                    notes: `Payment manually processed via Razorpay payout`,
                    by: req.merchantId || 'system'
                });
                await cashbackDoc.save();
                console.log(`✅ [CASHBACK] Cashback ${id} paid successfully (manual)`);
                return res.json({
                    success: true,
                    message: 'Payment processed successfully',
                    data: {
                        cashback: cashbackDoc.toObject(),
                        payout: payoutResult
                    }
                });
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Payment processing failed',
            error: payoutResult.error
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK] Error processing payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/cashback/:id/payout-status
// @desc    Get payout status for a cashback request
// @access  Private
router.get('/:id/payout-status', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Cashback_1.CashbackModel.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashback request not found'
            });
        }
        // Verify merchant owns this
        if (request.merchantId !== req.merchantId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (!request.payoutId) {
            return res.status(400).json({
                success: false,
                message: 'No payout associated with this cashback request'
            });
        }
        const payoutStatus = await PaymentService_1.default.getPayoutStatus(request.payoutId);
        return res.json({
            success: true,
            data: {
                cashbackId: id,
                payoutId: request.payoutId,
                ...payoutStatus
            }
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK] Error fetching payout status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payout status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   POST /api/cashback/generate-sample
router.post('/generate-sample', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        await Cashback_1.CashbackModel.createSampleRequests(req.merchantId);
        return res.json({
            success: true,
            message: 'Sample cashback requests generated successfully'
        });
    }
    catch (error) {
        console.error('Error generating sample data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate sample data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/cashback/stats
// @desc    Get cashback statistics
// @access  Private
router.get('/stats', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const metrics = await Cashback_1.CashbackModel.getMetrics(req.merchantId);
        return res.status(200).json({
            success: true,
            data: {
                stats: metrics
            }
        });
    }
    catch (error) {
        console.error('Error fetching cashback stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback stats',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/cashback/transactions
// @desc    Get cashback transactions
// @access  Private
router.get('/transactions', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const { page = '1', limit = '50' } = req.query;
        const searchParams = {
            merchantId: req.merchantId,
            page: parseInt(page),
            limit: parseInt(limit)
        };
        const result = await Cashback_1.CashbackModel.search(searchParams);
        // Ensure we always return an array
        const transactionsArray = Array.isArray(result?.requests) ? result.requests : [];
        return res.status(200).json({
            success: true,
            data: transactionsArray
        });
    }
    catch (error) {
        console.error('Error fetching cashback transactions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback transactions',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/cashback/summary
// @desc    Get cashback summary
// @access  Private
router.get('/summary', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        const { startDate, endDate } = req.query;
        let dateRange;
        if (startDate && endDate) {
            dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        }
        const analytics = await Cashback_1.CashbackModel.getAnalytics(req.merchantId, dateRange);
        // Create summary object - CashbackAnalytics interface has different fields
        const summary = {
            totalPaid: analytics?.totalPaid ?? 0,
            totalPending: analytics?.totalPending ?? 0,
            averageApprovalTime: analytics?.averageApprovalTime ?? 0,
            approvalRate: analytics?.approvalRate ?? 0,
            fraudDetectionRate: analytics?.fraudDetectionRate ?? 0,
            customerRetentionImpact: analytics?.customerRetentionImpact ?? 0,
            revenueImpact: analytics?.revenueImpact ?? 0,
            topCategories: Array.isArray(analytics?.topCategories) ? analytics.topCategories : [],
            monthlyTrends: Array.isArray(analytics?.monthlyTrends) ? analytics.monthlyTrends : []
        };
        return res.status(200).json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Error fetching cashback summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cashback summary',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/cashback/export
// @desc    Export cashback data
// @access  Private
router.get('/export', async (req, res) => {
    try {
        if (!req.merchantId) {
            return res.status(400).json({ success: false, message: 'MerchantId missing' });
        }
        // For now, return success - actual export implementation can be added later
        return res.status(200).json({
            success: true,
            message: 'Export functionality coming soon'
        });
    }
    catch (error) {
        console.error('Error exporting cashback data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export cashback data',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
exports.default = router;
