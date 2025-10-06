// UserProduct Controller
// Handles user product and service request API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import userProductService from '../services/userProductService';

/**
 * Get user's products
 * GET /api/user-products
 */
export const getUserProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, category, hasWarranty, hasAMC } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (hasWarranty !== undefined) filters.hasWarranty = hasWarranty === 'true';
    if (hasAMC !== undefined) filters.hasAMC = hasAMC === 'true';

    const products = await userProductService.getUserProducts(
      new Types.ObjectId(userId),
      filters
    );

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message,
    });
  }
};

/**
 * Get product details
 * GET /api/user-products/:id
 */
export const getProductDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting product details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product details',
      error: error.message,
    });
  }
};

/**
 * Get products with expiring warranties
 * GET /api/user-products/expiring-warranties
 */
export const getExpiringWarranties = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const products = await userProductService.getExpiringWarranties(
      new Types.ObjectId(userId),
      Number(days)
    );

    res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting expiring warranties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring warranties',
      error: error.message,
    });
  }
};

/**
 * Get products with expiring AMC
 * GET /api/user-products/expiring-amc
 */
export const getExpiringAMC = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const products = await userProductService.getExpiringAMC(
      new Types.ObjectId(userId),
      Number(days)
    );

    res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting expiring AMC:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring AMC',
      error: error.message,
    });
  }
};

/**
 * Register product
 * POST /api/user-products/:id/register
 */
export const registerProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { serialNumber, registrationNumber } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!serialNumber) {
      res.status(400).json({
        success: false,
        message: 'Serial number is required',
      });
      return;
    }

    const product = await userProductService.registerProduct(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      serialNumber,
      registrationNumber
    );

    res.status(200).json({
      success: true,
      message: 'Product registered successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error registering product:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to register product',
      error: error.message,
    });
  }
};

/**
 * Schedule installation
 * POST /api/user-products/:id/schedule-installation
 */
export const scheduleInstallation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { scheduledDate, technician, notes } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!scheduledDate) {
      res.status(400).json({
        success: false,
        message: 'Scheduled date is required',
      });
      return;
    }

    const product = await userProductService.scheduleInstallation(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      new Date(scheduledDate),
      technician,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Installation scheduled successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error scheduling installation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to schedule installation',
      error: error.message,
    });
  }
};

/**
 * Renew AMC
 * POST /api/user-products/:id/renew-amc
 */
export const renewAMC = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { duration, amount } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!duration || !amount) {
      res.status(400).json({
        success: false,
        message: 'Duration and amount are required',
      });
      return;
    }

    const product = await userProductService.renewAMC(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      Number(duration),
      Number(amount)
    );

    res.status(200).json({
      success: true,
      message: 'AMC renewed successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error renewing AMC:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to renew AMC',
      error: error.message,
    });
  }
};

/**
 * Get warranty details
 * GET /api/user-products/:id/warranty
 */
export const getWarrantyDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        warranty: product.warranty,
        warrantyDaysRemaining: product.warrantyDaysRemaining,
        warrantyStatus: product.warrantyStatus,
        isWarrantyExpiringSoon: product.isWarrantyExpiringSoon,
      },
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting warranty details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get warranty details',
      error: error.message,
    });
  }
};

/**
 * Get AMC details
 * GET /api/user-products/:id/amc
 */
export const getAMCDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        amc: product.amc,
        amcDaysRemaining: product.amcDaysRemaining,
        isAMCExpiringSoon: product.isAMCExpiringSoon,
      },
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting AMC details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AMC details',
      error: error.message,
    });
  }
};

// ============================================================================
// SERVICE REQUEST ENDPOINTS
// ============================================================================

/**
 * Create service request
 * POST /api/service-requests
 */
export const createServiceRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const {
      userProductId,
      productId,
      requestType,
      priority,
      issueDescription,
      issueCategory,
      images,
      addressId,
      estimatedCost,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const serviceRequest = await userProductService.createServiceRequest({
      userId: new Types.ObjectId(userId),
      userProductId: new Types.ObjectId(userProductId),
      productId: new Types.ObjectId(productId),
      requestType,
      priority,
      issueDescription,
      issueCategory,
      images,
      addressId: new Types.ObjectId(addressId),
      estimatedCost,
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: serviceRequest,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error creating service request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create service request',
      error: error.message,
    });
  }
};

/**
 * Get service requests
 * GET /api/service-requests
 */
export const getServiceRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, requestType, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (requestType) filters.requestType = requestType;
    if (priority) filters.priority = priority;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await userProductService.getUserServiceRequests(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service requests',
      error: error.message,
    });
  }
};

/**
 * Get service request details
 * GET /api/service-requests/:id
 */
export const getServiceRequestDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const request = await userProductService.getServiceRequestDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting service request details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service request details',
      error: error.message,
    });
  }
};

/**
 * Cancel service request
 * POST /api/service-requests/:id/cancel
 */
export const cancelServiceRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
      return;
    }

    const request = await userProductService.cancelServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Service request cancelled successfully',
      data: request,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error cancelling service request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel service request',
      error: error.message,
    });
  }
};

/**
 * Reschedule service request
 * POST /api/service-requests/:id/reschedule
 */
export const rescheduleServiceRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { newDate, newTimeSlot } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!newDate || !newTimeSlot) {
      res.status(400).json({
        success: false,
        message: 'New date and time slot are required',
      });
      return;
    }

    const request = await userProductService.rescheduleServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      new Date(newDate),
      newTimeSlot
    );

    res.status(200).json({
      success: true,
      message: 'Service request rescheduled successfully',
      data: request,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error rescheduling service request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reschedule service request',
      error: error.message,
    });
  }
};

/**
 * Rate service request
 * POST /api/service-requests/:id/rate
 */
export const rateServiceRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    const request = await userProductService.rateServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      Number(rating),
      feedback
    );

    res.status(200).json({
      success: true,
      message: 'Service request rated successfully',
      data: request,
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error rating service request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to rate service request',
      error: error.message,
    });
  }
};

/**
 * Get active service requests
 * GET /api/service-requests/active
 */
export const getActiveServiceRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const requests = await userProductService.getActiveServiceRequests(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: {
        requests,
        count: requests.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [USER PRODUCT CONTROLLER] Error getting active service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active service requests',
      error: error.message,
    });
  }
};
