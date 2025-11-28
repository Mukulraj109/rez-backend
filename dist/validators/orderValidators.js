"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnRequestSchema = exports.cancelOrderSchema = exports.queryOrdersSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
// Create order validation
exports.createOrderSchema = joi_1.default.object({
    items: joi_1.default.array()
        .items(joi_1.default.object({
        product: joi_1.default.string().pattern(objectIdPattern).required(),
        variant: joi_1.default.string().pattern(objectIdPattern).optional(),
        quantity: joi_1.default.number().integer().min(1).max(999).required(),
        price: joi_1.default.number().positive().precision(2).required()
    }))
        .min(1)
        .max(50)
        .required()
        .messages({
        'array.min': 'Order must contain at least one item',
        'array.max': 'Maximum 50 items per order'
    }),
    shippingAddress: joi_1.default.string()
        .pattern(objectIdPattern)
        .required(),
    billingAddress: joi_1.default.string()
        .pattern(objectIdPattern)
        .optional(),
    paymentMethod: joi_1.default.string()
        .valid('cod', 'online', 'wallet', 'razorpay', 'stripe', 'paypal')
        .required(),
    paymentDetails: joi_1.default.object({
        transactionId: joi_1.default.string().trim().max(255).optional(),
        paymentGateway: joi_1.default.string().trim().max(50).optional(),
        paymentStatus: joi_1.default.string().valid('pending', 'completed', 'failed').optional()
    }).optional(),
    couponCode: joi_1.default.string()
        .trim()
        .uppercase()
        .max(50)
        .optional(),
    notes: joi_1.default.string()
        .trim()
        .max(500)
        .optional(),
    useWalletBalance: joi_1.default.boolean()
        .default(false)
});
// Update order status validation
exports.updateOrderStatusSchema = joi_1.default.object({
    status: joi_1.default.string()
        .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
        .required(),
    notes: joi_1.default.string()
        .trim()
        .max(500)
        .optional(),
    trackingNumber: joi_1.default.string()
        .trim()
        .max(100)
        .optional(),
    carrier: joi_1.default.string()
        .trim()
        .max(100)
        .optional()
});
// Query orders validation
exports.queryOrdersSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    sort: joi_1.default.string().valid('createdAt', '-createdAt', 'total', '-total', 'status').default('-createdAt'),
    status: joi_1.default.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').optional(),
    paymentMethod: joi_1.default.string().valid('cod', 'online', 'wallet', 'razorpay', 'stripe', 'paypal').optional(),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')).optional(),
    minAmount: joi_1.default.number().positive().precision(2).optional(),
    maxAmount: joi_1.default.number().positive().precision(2).optional()
});
// Cancel order validation
exports.cancelOrderSchema = joi_1.default.object({
    reason: joi_1.default.string()
        .trim()
        .min(10)
        .max(500)
        .required()
        .messages({
        'string.min': 'Cancellation reason must be at least 10 characters',
        'any.required': 'Cancellation reason is required'
    })
});
// Return/Refund request validation
exports.returnRequestSchema = joi_1.default.object({
    items: joi_1.default.array()
        .items(joi_1.default.object({
        orderItem: joi_1.default.string().pattern(objectIdPattern).required(),
        quantity: joi_1.default.number().integer().min(1).required(),
        reason: joi_1.default.string().trim().max(500).required()
    }))
        .min(1)
        .required(),
    returnType: joi_1.default.string()
        .valid('return', 'exchange', 'refund')
        .required(),
    notes: joi_1.default.string()
        .trim()
        .max(1000)
        .optional()
});
