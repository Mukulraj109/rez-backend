import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { CashbackModel } from '../models/Cashback';
import { 
  CashbackSearchRequest, 
  ApproveCashbackRequest, 
  RejectCashbackRequest,
  BulkCashbackAction,
  CashbackStatus
} from '../types/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/cashback
// @desc    Get cashback requests with search and filtering
// @access  Private
router.get('/', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const {
      status,
      customerId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      riskLevel,
      flaggedOnly,
      sortBy,
      sortOrder,
      page,
      limit
    } = req.query;

    const searchParams: CashbackSearchRequest = { merchantId: req.merchantId };

    if (status) searchParams.status = status as CashbackStatus;
    if (customerId) searchParams.customerId = customerId as string;
    if (startDate && endDate) {
      searchParams.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    if (minAmount || maxAmount) {
      searchParams.amountRange = {
        min: minAmount ? parseFloat(minAmount as string) : 0,
        max: maxAmount ? parseFloat(maxAmount as string) : Number.MAX_VALUE
      };
    }
    if (riskLevel) searchParams.riskLevel = riskLevel as 'low' | 'medium' | 'high';
    if (flaggedOnly === 'true') searchParams.flaggedOnly = true;
    if (sortBy) searchParams.sortBy = sortBy as 'created' | 'amount' | 'risk_score' | 'expires';
    if (sortOrder) searchParams.sortOrder = sortOrder as 'asc' | 'desc';
    if (page) searchParams.page = parseInt(page as string);
    if (limit) searchParams.limit = parseInt(limit as string);

    const result = await CashbackModel.search(searchParams);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
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

    const metrics = await CashbackModel.getMetrics(req.merchantId);

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
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
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await CashbackModel.getAnalytics(req.merchantId, dateRange);

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
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
    const request = await CashbackModel.findById(id);

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
  } catch (error) {
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

    const riskAssessment = CashbackModel.assessRisk(requestData);
    const fullRequestData = { ...requestData, ...riskAssessment };

    const request = await CashbackModel.create(fullRequestData);

    return res.status(201).json({
      success: true,
      message: 'Cashback request created successfully',
      data: request
    });
  } catch (error) {
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
    const { approvedAmount, notes }: ApproveCashbackRequest = req.body;
    const reviewedBy = 'system';

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cashback request not found' });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.approve(id, approvedAmount, notes, reviewedBy);

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
  } catch (error) {
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
    const { reason }: RejectCashbackRequest = req.body;
    const reviewedBy = 'system';

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cashback request not found' });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.reject(id, reason, reviewedBy);

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
  } catch (error) {
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

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cashback request not found'
      });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.markAsPaid(id, paymentMethod, paymentReference);

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
  } catch (error) {
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
    const { requestIds, action, notes, approvedAmount, rejectionReason }: BulkCashbackAction = req.body;
    const reviewedBy = 'system';

    if (!requestIds || requestIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No request IDs provided' });
    }

    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    for (const requestId of requestIds) {
      const request = await CashbackModel.findById(requestId);
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
        results = await CashbackModel.bulkApprove(requestIds, notes, reviewedBy);
        break;
      case 'reject':
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'Rejection reason is required for bulk rejection'
          });
        }
        results = await CashbackModel.bulkReject(requestIds, rejectionReason, reviewedBy);
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
  } catch (error) {
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

    await CashbackModel.createSampleRequests(req.merchantId);

    return res.json({
      success: true,
      message: 'Sample cashback requests generated successfully'
    });
  } catch (error) {
    console.error('Error generating sample data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate sample data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
