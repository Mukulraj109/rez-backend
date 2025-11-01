"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const couponController_1 = require("../controllers/couponController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes - Coupon Discovery
// Search coupons
router.get('/search', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().trim().min(1).max(100).required(),
    category: validation_2.Joi.string().trim(),
    tag: validation_2.Joi.string().trim().lowercase()
})), couponController_1.searchCoupons);
// Get featured coupons
router.get('/featured', auth_1.optionalAuth, couponController_1.getFeaturedCoupons);
// Get all available coupons with filters
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().trim(),
    tag: validation_2.Joi.string().trim().lowercase(),
    featured: validation_2.Joi.boolean()
})), couponController_1.getAvailableCoupons);
// Authenticated Routes - User Coupon Management
// Get user's claimed coupons (MUST come before /:id route)
router.get('/my-coupons', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('available', 'used', 'expired')
})), couponController_1.getMyCoupons);
// Get single coupon details (MUST come after /my-coupons route)
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), couponController_1.getCouponDetails);
// Claim a coupon
router.post('/:id/claim', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), couponController_1.claimCoupon);
// Validate coupon for cart
router.post('/validate', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    couponCode: validation_2.Joi.string().trim().uppercase().required(),
    cartData: validation_2.Joi.object({
        items: validation_2.Joi.array().items(validation_2.Joi.object({
            product: validation_1.commonSchemas.objectId().required(),
            quantity: validation_2.Joi.number().integer().min(1).required(),
            price: validation_2.Joi.number().min(0).required(),
            category: validation_1.commonSchemas.objectId(),
            store: validation_1.commonSchemas.objectId()
        })).min(1).required(),
        subtotal: validation_2.Joi.number().min(0).required()
    }).required()
})), couponController_1.validateCoupon);
// Get best coupon offer for cart
router.post('/best-offer', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    cartData: validation_2.Joi.object({
        items: validation_2.Joi.array().items(validation_2.Joi.object({
            product: validation_1.commonSchemas.objectId().required(),
            quantity: validation_2.Joi.number().integer().min(1).required(),
            price: validation_2.Joi.number().min(0).required(),
            category: validation_1.commonSchemas.objectId(),
            store: validation_1.commonSchemas.objectId()
        })).min(1).required(),
        subtotal: validation_2.Joi.number().min(0).required()
    }).required()
})), couponController_1.getBestOffer);
// Remove claimed coupon
router.delete('/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), couponController_1.removeCoupon);
exports.default = router;
