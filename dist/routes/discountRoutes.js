"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discountController_1 = require("../controllers/discountController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes (no authentication required)
// Get all discounts with filters
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    applicableOn: validation_2.Joi.string().valid('bill_payment', 'card_payment', 'all', 'specific_products', 'specific_categories'),
    paymentMethod: validation_2.Joi.string().valid('upi', 'card', 'all'),
    type: validation_2.Joi.string().valid('percentage', 'fixed'),
    minValue: validation_2.Joi.number().min(0),
    maxValue: validation_2.Joi.number().min(0),
    orderValue: validation_2.Joi.number().min(0).optional(), // Added: filter by minimum order value
    sortBy: validation_2.Joi.string().valid('priority', 'value', 'createdAt').default('priority'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('desc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    storeId: validation_2.Joi.string().optional(),
    cardType: validation_2.Joi.string().valid('credit', 'debit', 'all').optional(), // Added: filter by card type
})), discountController_1.getDiscounts);
// Get bill payment discounts
router.get('/bill-payment', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    orderValue: validation_2.Joi.number().min(0).default(0),
    storeId: validation_2.Joi.string().optional(), // Phase 2: Optional storeId for store-specific filtering
})), discountController_1.getBillPaymentDiscounts);
// Get single discount by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), discountController_1.getDiscountById);
// Get discounts for a specific product
router.get('/product/:productId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    orderValue: validation_2.Joi.number().min(0).default(0),
})), discountController_1.getDiscountsForProduct);
// Validate discount code
router.post('/validate', auth_1.optionalAuth, (0, validation_1.validate)(validation_2.Joi.object({
    code: validation_2.Joi.string().required().trim().uppercase(),
    orderValue: validation_2.Joi.number().required().min(0),
    productIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()),
    categoryIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()),
})), discountController_1.validateDiscount);
// Authenticated Routes (require user login)
// Apply discount to order
router.post('/apply', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    discountId: validation_1.commonSchemas.objectId().required(),
    orderId: validation_1.commonSchemas.objectId().required(),
    orderValue: validation_2.Joi.number().required().min(0),
})), discountController_1.applyDiscount);
// Get user's discount usage history
router.get('/my-history', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), discountController_1.getUserDiscountHistory);
// Get analytics for a discount (admin only)
router.get('/:id/analytics', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), discountController_1.getDiscountAnalytics);
// Card Offers Routes
// Validate card for offers
router.post('/card-offers/validate', auth_1.optionalAuth, (0, validation_1.validate)(validation_2.Joi.object({
    cardNumber: validation_2.Joi.string().required().min(13).max(19),
    storeId: validation_1.commonSchemas.objectId().required(),
    orderValue: validation_2.Joi.number().min(0).default(0),
})), discountController_1.validateCardForOffers);
// Apply card offer
router.post('/card-offers/apply', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    discountId: validation_1.commonSchemas.objectId().required(),
    orderId: validation_1.commonSchemas.objectId().optional(),
    cardLast4: validation_2.Joi.string().optional().length(4),
})), discountController_1.applyCardOffer);
exports.default = router;
