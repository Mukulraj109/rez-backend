"use strict";
// Partner Route Input Validation Middleware
// Validates all partner API inputs to prevent malicious data
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequestBody = exports.sanitizeString = exports.validateRequestPayout = exports.validateClaimOffer = exports.validateUpdateTaskProgress = exports.validateClaimJackpot = exports.validateClaimTask = exports.validateClaimMilestone = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
/**
 * Middleware to check validation results
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg
            }))
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Validation for claiming milestone rewards
 */
exports.validateClaimMilestone = [
    (0, express_validator_1.param)('milestoneId')
        .notEmpty().withMessage('Milestone ID is required')
        .isString().withMessage('Milestone ID must be a string')
        .matches(/^milestone-\d+$/).withMessage('Invalid milestone ID format (expected: milestone-{number})')
        .isLength({ max: 50 }).withMessage('Milestone ID too long'),
    exports.handleValidationErrors
];
/**
 * Validation for claiming task rewards
 */
exports.validateClaimTask = [
    (0, express_validator_1.param)('taskId')
        .notEmpty().withMessage('Task ID is required')
        .isString().withMessage('Task ID must be a string')
        .isLength({ min: 3, max: 100 }).withMessage('Task ID must be between 3 and 100 characters')
        .matches(/^[a-zA-Z0-9\s]+$/).withMessage('Task ID contains invalid characters'),
    exports.handleValidationErrors
];
/**
 * Validation for claiming jackpot rewards
 */
exports.validateClaimJackpot = [
    (0, express_validator_1.param)('spendAmount')
        .notEmpty().withMessage('Spend amount is required')
        .isInt({ min: 25000, max: 100000 }).withMessage('Spend amount must be between 25000 and 100000')
        .custom((value) => {
        const validAmounts = [25000, 50000, 100000];
        const numValue = parseInt(value);
        if (!validAmounts.includes(numValue)) {
            throw new Error('Invalid jackpot tier. Must be 25000, 50000, or 100000');
        }
        return true;
    }),
    exports.handleValidationErrors
];
/**
 * Validation for updating task progress
 */
exports.validateUpdateTaskProgress = [
    (0, express_validator_1.param)('taskType')
        .notEmpty().withMessage('Task type is required')
        .isString().withMessage('Task type must be a string')
        .isIn(['profile', 'review', 'referral', 'social', 'purchase'])
        .withMessage('Invalid task type. Must be one of: profile, review, referral, social, purchase')
        .isLength({ max: 50 }).withMessage('Task type too long'),
    (0, express_validator_1.body)('progress')
        .optional()
        .isInt({ min: 0, max: 1000 }).withMessage('Progress must be a number between 0 and 1000'),
    exports.handleValidationErrors
];
/**
 * Validation for claiming partner offers
 */
exports.validateClaimOffer = [
    (0, express_validator_1.body)('offerId')
        .notEmpty().withMessage('Offer ID is required')
        .isString().withMessage('Offer ID must be a string')
        .trim()
        .isLength({ min: 1, max: 200 }).withMessage('Offer ID must be between 1 and 200 characters'),
    exports.handleValidationErrors
];
/**
 * Validation for requesting payout
 */
exports.validateRequestPayout = [
    (0, express_validator_1.body)('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between ₹100 and ₹100,000')
        .custom((value) => {
        // Amount must be in multiples of 100
        if (value % 100 !== 0) {
            throw new Error('Amount must be in multiples of ₹100');
        }
        return true;
    }),
    (0, express_validator_1.body)('method')
        .notEmpty().withMessage('Payout method is required')
        .isString().withMessage('Payout method must be a string')
        .isIn(['bank', 'upi', 'wallet']).withMessage('Invalid payout method. Must be: bank, upi, or wallet'),
    (0, express_validator_1.body)('details')
        .optional()
        .isObject().withMessage('Details must be an object')
        .custom((value) => {
        // Validate based on method
        if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value);
            if (keys.length > 10) {
                throw new Error('Too many detail fields');
            }
        }
        return true;
    }),
    exports.handleValidationErrors
];
/**
 * Sanitize string input (remove HTML, scripts, etc.)
 */
const sanitizeString = (value) => {
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, '') // Remove potential XSS characters
        .trim()
        .slice(0, 1000); // Limit length
};
exports.sanitizeString = sanitizeString;
/**
 * Validate and sanitize user input in request body
 */
const sanitizeRequestBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = (0, exports.sanitizeString)(req.body[key]);
            }
        });
    }
    next();
};
exports.sanitizeRequestBody = sanitizeRequestBody;
