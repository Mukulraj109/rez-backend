"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartController_1 = require("../controllers/cartController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All cart routes require authentication
router.use(auth_1.authenticate);
// Get user's cart
router.get('/', 
// generalLimiter,, // Disabled for development
cartController_1.getCart);
// Get cart summary
router.get('/summary', 
// generalLimiter,, // Disabled for development
cartController_1.getCartSummary);
// Validate cart
router.get('/validate', 
// generalLimiter,, // Disabled for development
cartController_1.validateCart);
// Add item to cart
router.post('/add', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_1.cartSchemas.addToCart), cartController_1.addToCart);
// Update cart item
router.put('/item/:productId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_1.cartSchemas.updateCartItem), cartController_1.updateCartItem);
// Update cart item with variant
router.put('/item/:productId/:variant', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required(),
    variant: validation_2.Joi.string().required()
})), (0, validation_1.validate)(validation_1.cartSchemas.updateCartItem), cartController_1.updateCartItem);
// Remove item from cart
router.delete('/item/:productId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), cartController_1.removeFromCart);
// Remove item from cart with variant
router.delete('/item/:productId/:variant', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required(),
    variant: validation_2.Joi.string().required()
})), cartController_1.removeFromCart);
// Clear entire cart
router.delete('/clear', 
// generalLimiter,, // Disabled for development
cartController_1.clearCart);
// Apply coupon
router.post('/coupon', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_1.cartSchemas.applyCoupon), cartController_1.applyCoupon);
// Remove coupon
router.delete('/coupon', 
// generalLimiter,, // Disabled for development
cartController_1.removeCoupon);
// Lock item at current price
router.post('/lock', 
// generalLimiter,, // Disabled for development
cartController_1.lockItem);
// Get locked items
router.get('/locked', 
// generalLimiter,, // Disabled for development
cartController_1.getLockedItems);
// Unlock item
router.delete('/lock/:productId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), cartController_1.unlockItem);
// Move locked item to cart
router.post('/lock/:productId/move-to-cart', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), cartController_1.moveLockedToCart);
// Lock item with payment (MakeMyTrip style)
router.post('/lock-with-payment', 
// generalLimiter,, // Disabled for development
cartController_1.lockItemWithPayment);
// Get lock fee options for a product
router.get('/lock-fee-options', 
// generalLimiter,, // Disabled for development
cartController_1.getLockFeeOptions);
exports.default = router;
