"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voucherController_1 = require("../controllers/voucherController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes - Voucher Brands
// Get all voucher brands with filters
router.get('/brands', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().trim().lowercase(),
    featured: validation_2.Joi.boolean(),
    newlyAdded: validation_2.Joi.boolean(),
    search: validation_2.Joi.string().trim().min(1).max(100),
    sortBy: validation_2.Joi.string().valid('name', 'cashbackRate', 'purchaseCount', 'rating', 'createdAt').default('name'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('asc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), voucherController_1.getVoucherBrands);
// Get featured voucher brands
router.get('/brands/featured', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), voucherController_1.getFeaturedBrands);
// Get newly added voucher brands
router.get('/brands/newly-added', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), voucherController_1.getNewlyAddedBrands);
// Get voucher categories
router.get('/categories', auth_1.optionalAuth, voucherController_1.getVoucherCategories);
// Get hero carousel for online voucher page
router.get('/hero-carousel', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(10).default(5)
})), voucherController_1.getHeroCarousel);
// Get single voucher brand by ID
router.get('/brands/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), voucherController_1.getVoucherBrandById);
// Track brand view (analytics)
router.post('/brands/:id/track-view', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), voucherController_1.trackBrandView);
// Authenticated Routes - User Voucher Management
// Purchase a voucher
router.post('/purchase', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    brandId: validation_1.commonSchemas.objectId().required(),
    denomination: validation_2.Joi.number().integer().min(1).required(),
    paymentMethod: validation_2.Joi.string().valid('wallet', 'card', 'upi', 'netbanking').default('wallet')
})), voucherController_1.purchaseVoucher);
// Get user's purchased vouchers
router.get('/my-vouchers', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('active', 'used', 'expired', 'cancelled'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), voucherController_1.getUserVouchers);
// Get single user voucher by ID
router.get('/my-vouchers/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), voucherController_1.getUserVoucherById);
// Use a voucher (mark as used)
router.post('/:id/use', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    usageLocation: validation_2.Joi.string().trim().max(200)
})), voucherController_1.useVoucher);
exports.default = router;
