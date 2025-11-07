"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const earningsController_1 = require("../controllers/earningsController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get user's earnings summary
router.get('/summary', earningsController_1.getEarningsSummary);
// Get user's project statistics
router.get('/project-stats', earningsController_1.getProjectStats);
// Get user's earning notifications
router.get('/notifications', earningsController_1.getNotifications);
// Mark notification as read
router.patch('/notifications/:id/read', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), earningsController_1.markNotificationAsRead);
// Get user's referral information
router.get('/referral-info', earningsController_1.getReferralInfo);
// Get user's earnings history
router.get('/history', (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('project', 'referral', 'social_media', 'spin', 'withdrawal').optional(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    startDate: validation_2.Joi.date().optional(),
    endDate: validation_2.Joi.date().optional()
})), earningsController_1.getEarningsHistory);
// Withdraw earnings
router.post('/withdraw', (0, validation_1.validate)(validation_2.Joi.object({
    amount: validation_2.Joi.number().positive().required(),
    method: validation_2.Joi.string().valid('bank', 'upi', 'wallet').default('bank'),
    accountDetails: validation_2.Joi.object({
        accountNumber: validation_2.Joi.string().optional(),
        ifsc: validation_2.Joi.string().optional(),
        upiId: validation_2.Joi.string().optional(),
        walletType: validation_2.Joi.string().optional()
    }).optional()
})), earningsController_1.withdrawEarnings);
exports.default = router;
