"use strict";
// UserProduct Controller
// Handles user product and service request API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveServiceRequests = exports.rateServiceRequest = exports.rescheduleServiceRequest = exports.cancelServiceRequest = exports.getServiceRequestDetails = exports.getServiceRequests = exports.createServiceRequest = exports.getAMCDetails = exports.getWarrantyDetails = exports.renewAMC = exports.scheduleInstallation = exports.registerProduct = exports.getExpiringAMC = exports.getExpiringWarranties = exports.getProductDetails = exports.getUserProducts = void 0;
const mongoose_1 = require("mongoose");
const userProductService_1 = __importDefault(require("../services/userProductService"));
/**
 * Get user's products
 * GET /api/user-products
 */
const getUserProducts = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, category, hasWarranty, hasAMC } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filters = {};
        if (status)
            filters.status = status;
        if (category)
            filters.category = category;
        if (hasWarranty !== undefined)
            filters.hasWarranty = hasWarranty === 'true';
        if (hasAMC !== undefined)
            filters.hasAMC = hasAMC === 'true';
        const products = await userProductService_1.default.getUserProducts(new mongoose_1.Types.ObjectId(userId), filters);
        res.status(200).json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products',
            error: error.message,
        });
    }
};
exports.getUserProducts = getUserProducts;
/**
 * Get product details
 * GET /api/user-products/:id
 */
const getProductDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const product = await userProductService_1.default.getProductDetails(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id));
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
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting product details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product details',
            error: error.message,
        });
    }
};
exports.getProductDetails = getProductDetails;
/**
 * Get products with expiring warranties
 * GET /api/user-products/expiring-warranties
 */
const getExpiringWarranties = async (req, res) => {
    try {
        const userId = req.userId;
        const { days = 30 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const products = await userProductService_1.default.getExpiringWarranties(new mongoose_1.Types.ObjectId(userId), Number(days));
        res.status(200).json({
            success: true,
            data: {
                products,
                count: products.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting expiring warranties:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get expiring warranties',
            error: error.message,
        });
    }
};
exports.getExpiringWarranties = getExpiringWarranties;
/**
 * Get products with expiring AMC
 * GET /api/user-products/expiring-amc
 */
const getExpiringAMC = async (req, res) => {
    try {
        const userId = req.userId;
        const { days = 30 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const products = await userProductService_1.default.getExpiringAMC(new mongoose_1.Types.ObjectId(userId), Number(days));
        res.status(200).json({
            success: true,
            data: {
                products,
                count: products.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting expiring AMC:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get expiring AMC',
            error: error.message,
        });
    }
};
exports.getExpiringAMC = getExpiringAMC;
/**
 * Register product
 * POST /api/user-products/:id/register
 */
const registerProduct = async (req, res) => {
    try {
        const userId = req.userId;
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
        const product = await userProductService_1.default.registerProduct(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), serialNumber, registrationNumber);
        res.status(200).json({
            success: true,
            message: 'Product registered successfully',
            data: product,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error registering product:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to register product',
            error: error.message,
        });
    }
};
exports.registerProduct = registerProduct;
/**
 * Schedule installation
 * POST /api/user-products/:id/schedule-installation
 */
const scheduleInstallation = async (req, res) => {
    try {
        const userId = req.userId;
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
        const product = await userProductService_1.default.scheduleInstallation(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), new Date(scheduledDate), technician, notes);
        res.status(200).json({
            success: true,
            message: 'Installation scheduled successfully',
            data: product,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error scheduling installation:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to schedule installation',
            error: error.message,
        });
    }
};
exports.scheduleInstallation = scheduleInstallation;
/**
 * Renew AMC
 * POST /api/user-products/:id/renew-amc
 */
const renewAMC = async (req, res) => {
    try {
        const userId = req.userId;
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
        const product = await userProductService_1.default.renewAMC(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), Number(duration), Number(amount));
        res.status(200).json({
            success: true,
            message: 'AMC renewed successfully',
            data: product,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error renewing AMC:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to renew AMC',
            error: error.message,
        });
    }
};
exports.renewAMC = renewAMC;
/**
 * Get warranty details
 * GET /api/user-products/:id/warranty
 */
const getWarrantyDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const product = await userProductService_1.default.getProductDetails(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id));
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
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting warranty details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get warranty details',
            error: error.message,
        });
    }
};
exports.getWarrantyDetails = getWarrantyDetails;
/**
 * Get AMC details
 * GET /api/user-products/:id/amc
 */
const getAMCDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const product = await userProductService_1.default.getProductDetails(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id));
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
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting AMC details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AMC details',
            error: error.message,
        });
    }
};
exports.getAMCDetails = getAMCDetails;
// ============================================================================
// SERVICE REQUEST ENDPOINTS
// ============================================================================
/**
 * Create service request
 * POST /api/service-requests
 */
const createServiceRequest = async (req, res) => {
    try {
        const userId = req.userId;
        const { userProductId, productId, requestType, priority, issueDescription, issueCategory, images, addressId, estimatedCost, } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const serviceRequest = await userProductService_1.default.createServiceRequest({
            userId: new mongoose_1.Types.ObjectId(userId),
            userProductId: new mongoose_1.Types.ObjectId(userProductId),
            productId: new mongoose_1.Types.ObjectId(productId),
            requestType,
            priority,
            issueDescription,
            issueCategory,
            images,
            addressId: new mongoose_1.Types.ObjectId(addressId),
            estimatedCost,
        });
        res.status(201).json({
            success: true,
            message: 'Service request created successfully',
            data: serviceRequest,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error creating service request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create service request',
            error: error.message,
        });
    }
};
exports.createServiceRequest = createServiceRequest;
/**
 * Get service requests
 * GET /api/service-requests
 */
const getServiceRequests = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, requestType, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filters = {};
        if (status)
            filters.status = status;
        if (requestType)
            filters.requestType = requestType;
        if (priority)
            filters.priority = priority;
        if (dateFrom)
            filters.dateFrom = dateFrom;
        if (dateTo)
            filters.dateTo = dateTo;
        const result = await userProductService_1.default.getUserServiceRequests(new mongoose_1.Types.ObjectId(userId), filters, Number(page), Number(limit));
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting service requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get service requests',
            error: error.message,
        });
    }
};
exports.getServiceRequests = getServiceRequests;
/**
 * Get service request details
 * GET /api/service-requests/:id
 */
const getServiceRequestDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const request = await userProductService_1.default.getServiceRequestDetails(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id));
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
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting service request details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get service request details',
            error: error.message,
        });
    }
};
exports.getServiceRequestDetails = getServiceRequestDetails;
/**
 * Cancel service request
 * POST /api/service-requests/:id/cancel
 */
const cancelServiceRequest = async (req, res) => {
    try {
        const userId = req.userId;
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
        const request = await userProductService_1.default.cancelServiceRequest(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), reason);
        res.status(200).json({
            success: true,
            message: 'Service request cancelled successfully',
            data: request,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error cancelling service request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to cancel service request',
            error: error.message,
        });
    }
};
exports.cancelServiceRequest = cancelServiceRequest;
/**
 * Reschedule service request
 * POST /api/service-requests/:id/reschedule
 */
const rescheduleServiceRequest = async (req, res) => {
    try {
        const userId = req.userId;
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
        const request = await userProductService_1.default.rescheduleServiceRequest(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), new Date(newDate), newTimeSlot);
        res.status(200).json({
            success: true,
            message: 'Service request rescheduled successfully',
            data: request,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error rescheduling service request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to reschedule service request',
            error: error.message,
        });
    }
};
exports.rescheduleServiceRequest = rescheduleServiceRequest;
/**
 * Rate service request
 * POST /api/service-requests/:id/rate
 */
const rateServiceRequest = async (req, res) => {
    try {
        const userId = req.userId;
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
        const request = await userProductService_1.default.rateServiceRequest(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id), Number(rating), feedback);
        res.status(200).json({
            success: true,
            message: 'Service request rated successfully',
            data: request,
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error rating service request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to rate service request',
            error: error.message,
        });
    }
};
exports.rateServiceRequest = rateServiceRequest;
/**
 * Get active service requests
 * GET /api/service-requests/active
 */
const getActiveServiceRequests = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const requests = await userProductService_1.default.getActiveServiceRequests(new mongoose_1.Types.ObjectId(userId));
        res.status(200).json({
            success: true,
            data: {
                requests,
                count: requests.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [USER PRODUCT CONTROLLER] Error getting active service requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active service requests',
            error: error.message,
        });
    }
};
exports.getActiveServiceRequests = getActiveServiceRequests;
