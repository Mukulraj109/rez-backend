"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userProductController_1 = require("../controllers/userProductController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// ============================================================================
// USER PRODUCT ROUTES
// ============================================================================
// Get user's products
router.get('/', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('active', 'warranty_expired', 'returned', 'replaced'),
    category: validation_2.Joi.string(),
    hasWarranty: validation_2.Joi.string().valid('true', 'false'),
    hasAMC: validation_2.Joi.string().valid('true', 'false'),
})), userProductController_1.getUserProducts);
// Get products with expiring warranties
router.get('/expiring-warranties', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    days: validation_2.Joi.number().integer().min(1).max(365).default(30),
})), userProductController_1.getExpiringWarranties);
// Get products with expiring AMC
router.get('/expiring-amc', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    days: validation_2.Joi.number().integer().min(1).max(365).default(30),
})), userProductController_1.getExpiringAMC);
// Get product details
router.get('/:id', auth_1.authenticate, userProductController_1.getProductDetails);
// Get warranty details
router.get('/:id/warranty', auth_1.authenticate, userProductController_1.getWarrantyDetails);
// Get AMC details
router.get('/:id/amc', auth_1.authenticate, userProductController_1.getAMCDetails);
// Register product
router.post('/:id/register', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    serialNumber: validation_2.Joi.string().required(),
    registrationNumber: validation_2.Joi.string(),
})), userProductController_1.registerProduct);
// Schedule installation
router.post('/:id/schedule-installation', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    scheduledDate: validation_2.Joi.date().iso().required(),
    technician: validation_2.Joi.string(),
    notes: validation_2.Joi.string(),
})), userProductController_1.scheduleInstallation);
// Renew AMC
router.post('/:id/renew-amc', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    duration: validation_2.Joi.number().integer().min(1).max(60).required(), // months
    amount: validation_2.Joi.number().min(0).required(),
})), userProductController_1.renewAMC);
// ============================================================================
// SERVICE REQUEST ROUTES
// ============================================================================
// Create service request
router.post('/service-requests', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    userProductId: validation_2.Joi.string().required(),
    productId: validation_2.Joi.string().required(),
    requestType: validation_2.Joi.string().valid('repair', 'replacement', 'installation', 'maintenance', 'inspection').required(),
    priority: validation_2.Joi.string().valid('low', 'medium', 'high', 'urgent'),
    issueDescription: validation_2.Joi.string().required(),
    issueCategory: validation_2.Joi.string(),
    images: validation_2.Joi.array().items(validation_2.Joi.string()),
    addressId: validation_2.Joi.string().required(),
    estimatedCost: validation_2.Joi.number().min(0),
})), userProductController_1.createServiceRequest);
// Get active service requests
router.get('/service-requests/active', auth_1.authenticate, userProductController_1.getActiveServiceRequests);
// Get service requests
router.get('/service-requests', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'scheduled', 'in_progress', 'completed', 'cancelled'),
    requestType: validation_2.Joi.string().valid('repair', 'replacement', 'installation', 'maintenance', 'inspection'),
    priority: validation_2.Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dateFrom: validation_2.Joi.date().iso(),
    dateTo: validation_2.Joi.date().iso(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20),
})), userProductController_1.getServiceRequests);
// Get service request details
router.get('/service-requests/:id', auth_1.authenticate, userProductController_1.getServiceRequestDetails);
// Cancel service request
router.post('/service-requests/:id/cancel', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().required(),
})), userProductController_1.cancelServiceRequest);
// Reschedule service request
router.post('/service-requests/:id/reschedule', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    newDate: validation_2.Joi.date().iso().required(),
    newTimeSlot: validation_2.Joi.string().required(),
})), userProductController_1.rescheduleServiceRequest);
// Rate service request
router.post('/service-requests/:id/rate', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    rating: validation_2.Joi.number().integer().min(1).max(5).required(),
    feedback: validation_2.Joi.string(),
})), userProductController_1.rateServiceRequest);
exports.default = router;
