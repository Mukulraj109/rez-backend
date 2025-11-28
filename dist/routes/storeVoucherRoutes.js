"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storeVoucherController_1 = require("../controllers/storeVoucherController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes (no authentication required, but can use optionalAuth for personalization)
// Get store vouchers for a specific store
router.get('/store/:storeId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), storeVoucherController_1.getStoreVouchers);
// Get single store voucher by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), storeVoucherController_1.getStoreVoucherById);
// Validate store voucher code
router.post('/validate', auth_1.optionalAuth, (0, validation_1.validate)(validation_2.Joi.object({
    code: validation_2.Joi.string().required().trim().uppercase(),
    storeId: validation_1.commonSchemas.objectId().required(),
    billAmount: validation_2.Joi.number().required().min(0),
})), storeVoucherController_1.validateStoreVoucher);
// Authenticated Routes (require user login)
// Claim a store voucher (assign to user)
router.post('/:id/claim', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), storeVoucherController_1.claimStoreVoucher);
// Redeem a claimed store voucher
router.post('/:id/redeem', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required(),
    billAmount: validation_2.Joi.number().required().min(0),
})), storeVoucherController_1.redeemStoreVoucher);
// Get user's claimed store vouchers
router.get('/my-vouchers', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('assigned', 'used', 'expired'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), storeVoucherController_1.getMyStoreVouchers);
// Get single user voucher details
router.get('/my-vouchers/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), storeVoucherController_1.getMyStoreVoucherById);
// Remove a claimed voucher (only if not used)
router.delete('/my-vouchers/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), storeVoucherController_1.removeClaimedVoucher);
exports.default = router;
