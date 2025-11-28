"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const TeamInvitationService_1 = __importDefault(require("../services/TeamInvitationService"));
const Merchant_1 = require("../models/Merchant");
const router = (0, express_1.Router)();
// Validation schemas
const acceptInvitationSchema = joi_1.default.object({
    password: joi_1.default.string().min(6).required(),
    confirmPassword: joi_1.default.string().min(6).required().valid(joi_1.default.ref('password')).messages({
        'any.only': 'Passwords do not match'
    })
});
/**
 * @route   GET /api/merchant/team-public/validate-invitation/:token
 * @desc    Validate invitation token
 * @access  Public
 */
router.get('/validate-invitation/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await TeamInvitationService_1.default.validateInvitationToken(token);
        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Invalid invitation token'
            });
        }
        // Get merchant details
        const merchant = await Merchant_1.Merchant.findById(result.merchantUser.merchantId);
        return res.json({
            success: true,
            data: {
                valid: true,
                invitation: {
                    name: result.merchantUser.name,
                    email: result.merchantUser.email,
                    role: result.merchantUser.role,
                    businessName: merchant?.businessName || 'Unknown Business',
                    expiresAt: result.merchantUser.invitationExpiry
                }
            }
        });
    }
    catch (error) {
        console.error('Error validating invitation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate invitation',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/team-public/accept-invitation/:token
 * @desc    Accept invitation and set password
 * @access  Public
 */
router.post('/accept-invitation/:token', (0, merchantvalidation_1.validateRequest)(acceptInvitationSchema), async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const result = await TeamInvitationService_1.default.acceptInvitation(token, password);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        return res.json({
            success: true,
            message: 'Invitation accepted successfully! You can now login with your credentials.',
            data: {
                email: result.merchantUser.email,
                name: result.merchantUser.name,
                role: result.merchantUser.role
            }
        });
    }
    catch (error) {
        console.error('Error accepting invitation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to accept invitation',
            error: error.message
        });
    }
});
exports.default = router;
