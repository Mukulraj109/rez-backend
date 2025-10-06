"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// @route   GET /api/merchants/profile
// @desc    Get merchant profile
// @access  Private
router.get('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'Merchant profile endpoint - to be implemented',
        data: { merchantId: req.merchantId }
    });
});
// @route   PUT /api/merchants/profile
// @desc    Update merchant profile
// @access  Private
router.put('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'Update merchant profile endpoint - to be implemented'
    });
});
exports.default = router;
