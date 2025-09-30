import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { OrderModel } from '../models/MerchantOrder';
import { Order, OrderStatus, PaymentStatus } from '../types/shared';

type SortBy = 'created' | 'updated' | 'total' | 'priority';

interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
  notifyCustomer?: boolean;
}

interface BulkOrderAction {
  orderIds: string[];
  action: 'confirm' | 'prepare' | 'ready' | 'deliver' | 'cancel';
  notes?: string;
  notifyCustomers?: boolean;
}

// Removed unused AnalyticsRequest interface

interface OrderSearchRequest {
  merchantId: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  orderNumber?: string;
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateRange?: { start: Date; end: Date };
}

const isValidOrderStatus = (status: unknown): status is OrderStatus => {
  const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
  return typeof status === 'string' && validStatuses.includes(status as OrderStatus);
};

// Removed unused OrderAnalytics interface and OrderWithId type

const router = Router();

// Test route without auth for development
router.post('/test-sample-data', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Sample data creation not allowed in production'
      });
    }

    const merchantId = req.body.merchantId || 'test-merchant-123';
    await OrderModel.createSampleOrders(merchantId);

    return res.json({
      success: true,
      message: 'Sample orders created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    console.error('Error creating sample orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear orders for testing (development only)
router.delete('/test-clear-orders', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Clear orders not allowed in production'
      });
    }

    const { OrderMongoModel } = await import('../models/MerchantOrder');
    // Clear all orders (for testing)
    const result = await OrderMongoModel.deleteMany({});

    return res.json({
      success: true,
      message: `Cleared ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test analytics route without auth for development
router.get('/test-analytics', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test analytics not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { dateStart, dateEnd } = req.query;

    let dateRange: { start: Date; end: Date } | undefined;
    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      };
    }

    console.log("Testing analytics for merchantId:", merchantId);

    const analytics = await OrderModel.getAnalytics(merchantId, dateRange);
    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test cashback routes without auth for development
router.post('/test-cashback-sample', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.body.merchantId || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    await CashbackModel.createSampleRequests(merchantId);

    return res.json({
      success: true,
      message: 'Sample cashback requests created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    console.error('Error creating sample cashback:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample cashback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-cashback-list', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    const result = await CashbackModel.search({ merchantId });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching cashback list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-cashback-metrics', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    const metrics = await CashbackModel.getMetrics(merchantId);

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

// Test route for dashboard overview (no auth required)
router.get('/test-dashboard-overview', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId);
    return res.json({ 
      success: true, 
      data: metrics, 
      message: 'Dashboard metrics retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard timeseries (no auth required)
router.get('/test-dashboard-timeseries', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const days = parseInt(req.query.days as string) || 30;
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);
    return res.json({ 
      success: true, 
      data: timeSeriesData, 
      message: 'Dashboard timeseries data retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting dashboard timeseries:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard timeseries',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard categories (no auth required)
router.get('/test-dashboard-categories', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const categoryPerformance = await BusinessMetricsService.getCategoryPerformance(merchantId);
    return res.json({ 
      success: true, 
      data: categoryPerformance, 
      message: 'Dashboard category performance retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting dashboard categories:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard categories',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard customer insights (no auth required)
router.get('/test-dashboard-customers', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const customerInsights = await BusinessMetricsService.getCustomerInsights(merchantId);
    return res.json({ 
      success: true, 
      data: customerInsights, 
      message: 'Dashboard customer insights retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting dashboard customer insights:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard customer insights',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard insights (no auth required)
router.get('/test-dashboard-insights', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const insights = await BusinessMetricsService.getBusinessInsights(merchantId);
    return res.json({ 
      success: true, 
      data: insights, 
      message: 'Dashboard insights retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting dashboard insights:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard insights',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Apply auth middleware to all other routes
router.use(authMiddleware);

// Helper: Validate if value is OrderStatus
const isOrderStatus = (value: any): value is OrderStatus => {
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
  return statuses.includes(value);
};

// @route   GET /api/orders
// @desc    Get merchant orders with search and filtering
// @access  Private
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    const {
      status,
      paymentStatus,
      customerId,
      orderNumber,
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
      page = '1',
      limit = '20',
      dateStart,
      dateEnd
    } = req.query;

    // Validate and enforce correct type for sortBy
    const sortByOptions: SortBy[] = ['created', 'updated', 'total', 'priority'];
    const sortBy: SortBy = sortByOptions.includes(sortByParam as SortBy)
      ? (sortByParam as SortBy)
      : 'created'; // default if invalid

    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

    // Build search parameters
    const searchParams: OrderSearchRequest = {
      merchantId,
      sortBy,
      sortOrder,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    if (status && typeof status === 'string' && isValidOrderStatus(status)) {
      searchParams.status = status;
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      searchParams.paymentStatus = paymentStatus as PaymentStatus;
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

    const result = await OrderModel.search(searchParams);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId as string;

    const order = await OrderModel.findById(id);
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

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, notifyCustomer = true }: UpdateOrderStatusRequest = req.body;
    const merchantId = req.merchantId as string;

    // This type should be at the top of your file, but we repeat here for clarity
    type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';

    // Using module-level isValidOrderStatus function

    // Validate new status
    if (!isValidOrderStatus(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    // Fetch and validate order
    const order = await OrderModel.findById(id);
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

    // This block is critical for TypeScript safety
    if (!isValidOrderStatus(order.status)) {
      console.error(`Invalid order status in database: ${order.status}`);
      return res.status(500).json({
        success: false,
        message: 'Invalid order status in database'
      });
    }
    // Now, order.status is guaranteed by TypeScript to be OrderStatus
    const currentStatus: OrderStatus = order.status;

    // Status transitions map
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['out_for_delivery', 'delivered'],
      out_for_delivery: ['delivered'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`
      });
    }

    // Update and validate result
    const updatedOrder = await OrderModel.updateStatus(id, status, notes);
    if (!updatedOrder) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }

    // Here you might notify customer, log, update inventory, etc.

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
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
router.post('/bulk-action', async (req: Request, res: Response) => {
  try {
    const { orderIds, action, notes, notifyCustomers = true }: BulkOrderAction = req.body;
    const merchantId = req.merchantId as string;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order IDs provided'
      });
    }

    const results: { success: boolean; orderId: string; message?: string }[] = [];
    const actionStatusMap: Record<string, OrderStatus> = {
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
        const order = await OrderModel.findById(orderId);
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

        const updatedOrder = await OrderModel.updateStatus(orderId, newStatus, notes);
        if (updatedOrder) {
          results.push({
            success: true,
            orderId
          });
        } else {
          results.push({
            success: false,
            orderId,
            message: 'Failed to update status'
          });
        }
      } catch (error) {
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
  } catch (error) {
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
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    const { dateStart, dateEnd } = req.query;
  

    let dateRange: { start: Date; end: Date } | undefined;
    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      };
    }
      console.log("merchantId:", merchantId);

    const analytics = await OrderModel.getAnalytics(merchantId, dateRange);
    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/orders/sample-data
// @desc    Create sample orders for testing (development only)
// @access  Private
router.post('/sample-data', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Sample data creation not allowed in production'
      });
    }

    // For development testing, use provided merchantId or default
    const merchantId = req.merchantId || req.body.merchantId || 'test-merchant-123';
    await OrderModel.createSampleOrders(merchantId);

    return res.json({
      success: true,
      message: 'Sample orders created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    console.error('Error creating sample orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Duplicate route removed - already exists before auth middleware


export default router;
