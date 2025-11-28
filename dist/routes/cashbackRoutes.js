"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cashbackController_1 = require("../controllers/cashbackController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get cashback summary
router.get('/summary', auth_1.authenticate, cashbackController_1.getCashbackSummary);
// Get cashback history
router.get('/history', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'credited', 'expired', 'cancelled'),
    source: validation_2.Joi.string().valid('order', 'referral', 'promotion', 'special_offer', 'bonus', 'signup'),
    dateFrom: validation_2.Joi.date().iso(),
    dateTo: validation_2.Joi.date().iso(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20),
})), cashbackController_1.getCashbackHistory);
// Get pending cashback (ready for redemption)
router.get('/pending', auth_1.authenticate, cashbackController_1.getPendingCashback);
// Get expiring soon cashback
router.get('/expiring-soon', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    days: validation_2.Joi.number().integer().min(1).max(30).default(7),
})), cashbackController_1.getExpiringSoon);
// Redeem pending cashback
router.post('/redeem', auth_1.authenticate, cashbackController_1.redeemCashback);
// Get active cashback campaigns
router.get('/campaigns', auth_1.optionalAuth, cashbackController_1.getCashbackCampaigns);
// Forecast cashback for cart
router.post('/forecast', auth_1.optionalAuth, (0, validation_1.validate)(validation_2.Joi.object({
    cartData: validation_2.Joi.object({
        items: validation_2.Joi.array().items(validation_2.Joi.object({
            product: validation_2.Joi.object().required(),
            quantity: validation_2.Joi.number().integer().min(1).required(),
            price: validation_2.Joi.number().min(0).required(),
        })).min(1).required(),
        subtotal: validation_2.Joi.number().min(0).required(),
    }).required(),
})), cashbackController_1.forecastCashback);
// Get cashback statistics
router.get('/statistics', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    period: validation_2.Joi.string().valid('day', 'week', 'month', 'year').default('month'),
})), cashbackController_1.getCashbackStatistics);
exports.default = router;
