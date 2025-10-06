"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultPaymentMethod = exports.deletePaymentMethod = exports.updatePaymentMethod = exports.createPaymentMethod = exports.getPaymentMethodById = exports.getUserPaymentMethods = void 0;
const PaymentMethod_1 = require("../models/PaymentMethod");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get all payment methods for user
exports.getUserPaymentMethods = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const paymentMethods = await PaymentMethod_1.PaymentMethod.find({
        user: req.user._id,
        isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });
    (0, response_1.sendSuccess)(res, paymentMethods, 'Payment methods retrieved successfully');
});
// Get single payment method by ID
exports.getPaymentMethodById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!paymentMethod) {
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    (0, response_1.sendSuccess)(res, paymentMethod, 'Payment method retrieved successfully');
});
// Create new payment method
exports.createPaymentMethod = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const paymentMethodData = {
        ...req.body,
        user: req.user._id
    };
    // Validate based on type
    if (paymentMethodData.type === 'CARD' && !paymentMethodData.card) {
        throw new errorHandler_1.AppError('Card details are required', 400);
    }
    if (paymentMethodData.type === 'BANK_ACCOUNT' && !paymentMethodData.bankAccount) {
        throw new errorHandler_1.AppError('Bank account details are required', 400);
    }
    if (paymentMethodData.type === 'UPI' && !paymentMethodData.upi) {
        throw new errorHandler_1.AppError('UPI details are required', 400);
    }
    const paymentMethod = await PaymentMethod_1.PaymentMethod.create(paymentMethodData);
    (0, response_1.sendSuccess)(res, paymentMethod, 'Payment method created successfully', 201);
});
// Update payment method
exports.updatePaymentMethod = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    // Find payment method and ensure it belongs to the user
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!paymentMethod) {
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    // Update only allowed fields (prevent type change)
    const allowedUpdates = ['card', 'bankAccount', 'upi', 'isDefault'];
    const updates = {};
    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            updates[key] = req.body[key];
        }
    }
    Object.assign(paymentMethod, updates);
    await paymentMethod.save();
    (0, response_1.sendSuccess)(res, paymentMethod, 'Payment method updated successfully');
});
// Delete payment method (soft delete - set isActive to false)
exports.deletePaymentMethod = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!paymentMethod) {
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    // Soft delete
    paymentMethod.isActive = false;
    await paymentMethod.save();
    (0, response_1.sendSuccess)(res, { deletedId: id }, 'Payment method deleted successfully');
});
// Set default payment method
exports.setDefaultPaymentMethod = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    // Find payment method and ensure it belongs to the user
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!paymentMethod) {
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    // Update all payment methods to non-default
    await PaymentMethod_1.PaymentMethod.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
    // Set this payment method as default
    paymentMethod.isDefault = true;
    await paymentMethod.save();
    (0, response_1.sendSuccess)(res, paymentMethod, 'Default payment method updated successfully');
});
