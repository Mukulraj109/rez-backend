import { Request, Response } from 'express';
/**
 * Get user's products
 * GET /api/user-products
 */
export declare const getUserProducts: (req: Request, res: Response) => Promise<void>;
/**
 * Get product details
 * GET /api/user-products/:id
 */
export declare const getProductDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Get products with expiring warranties
 * GET /api/user-products/expiring-warranties
 */
export declare const getExpiringWarranties: (req: Request, res: Response) => Promise<void>;
/**
 * Get products with expiring AMC
 * GET /api/user-products/expiring-amc
 */
export declare const getExpiringAMC: (req: Request, res: Response) => Promise<void>;
/**
 * Register product
 * POST /api/user-products/:id/register
 */
export declare const registerProduct: (req: Request, res: Response) => Promise<void>;
/**
 * Schedule installation
 * POST /api/user-products/:id/schedule-installation
 */
export declare const scheduleInstallation: (req: Request, res: Response) => Promise<void>;
/**
 * Renew AMC
 * POST /api/user-products/:id/renew-amc
 */
export declare const renewAMC: (req: Request, res: Response) => Promise<void>;
/**
 * Get warranty details
 * GET /api/user-products/:id/warranty
 */
export declare const getWarrantyDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Get AMC details
 * GET /api/user-products/:id/amc
 */
export declare const getAMCDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Create service request
 * POST /api/service-requests
 */
export declare const createServiceRequest: (req: Request, res: Response) => Promise<void>;
/**
 * Get service requests
 * GET /api/service-requests
 */
export declare const getServiceRequests: (req: Request, res: Response) => Promise<void>;
/**
 * Get service request details
 * GET /api/service-requests/:id
 */
export declare const getServiceRequestDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel service request
 * POST /api/service-requests/:id/cancel
 */
export declare const cancelServiceRequest: (req: Request, res: Response) => Promise<void>;
/**
 * Reschedule service request
 * POST /api/service-requests/:id/reschedule
 */
export declare const rescheduleServiceRequest: (req: Request, res: Response) => Promise<void>;
/**
 * Rate service request
 * POST /api/service-requests/:id/rate
 */
export declare const rateServiceRequest: (req: Request, res: Response) => Promise<void>;
/**
 * Get active service requests
 * GET /api/service-requests/active
 */
export declare const getActiveServiceRequests: (req: Request, res: Response) => Promise<void>;
