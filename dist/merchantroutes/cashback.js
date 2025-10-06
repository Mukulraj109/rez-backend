"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const Cashback_1 = require("../models/Cashback");
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
exports.default = router;
