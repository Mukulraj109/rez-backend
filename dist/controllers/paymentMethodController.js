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
    }).sort({ isDefault: -1, createdAt: -1 }).lean();
    // Map _id to id for frontend compatibility
    const mappedPaymentMethods = paymentMethods.map((pm) => ({
        ...pm,
        id: pm._id.toString(),
        _id: undefined
    }));
    (0, response_1.sendSuccess)(res, mappedPaymentMethods, 'Payment methods retrieved successfully');
});
// Get single payment method by ID
exports.getPaymentMethodById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id }).lean();
    if (!paymentMethod) {
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    // Map _id to id for frontend compatibility
    const mappedPaymentMethod = {
        ...paymentMethod,
        id: paymentMethod._id.toString(),
        _id: undefined
    };
    (0, response_1.sendSuccess)(res, mappedPaymentMethod, 'Payment method retrieved successfully');
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
    // Convert to plain object and map _id to id
    const paymentMethodObj = paymentMethod.toObject();
    const mappedPaymentMethod = {
        ...paymentMethodObj,
        id: paymentMethodObj._id.toString(),
        _id: undefined
    };
    (0, response_1.sendSuccess)(res, mappedPaymentMethod, 'Payment method created successfully', 201);
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
    // Convert to plain object and map _id to id
    const paymentMethodObj = paymentMethod.toObject();
    const mappedPaymentMethod = {
        ...paymentMethodObj,
        id: paymentMethodObj._id.toString(),
        _id: undefined
    };
    (0, response_1.sendSuccess)(res, mappedPaymentMethod, 'Payment method updated successfully');
});
// Delete payment method (soft delete - set isActive to false)
exports.deletePaymentMethod = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    console.log('[DELETE] Request to delete payment method ID:', id);
    console.log('[DELETE] User ID:', req.user._id);
    const paymentMethod = await PaymentMethod_1.PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!paymentMethod) {
        console.log('[DELETE] Payment method not found');
        return (0, response_1.sendNotFound)(res, 'Payment method not found');
    }
    console.log('[DELETE] Found payment method:', {
        id: paymentMethod._id,
        type: paymentMethod.type,
        isActive: paymentMethod.isActive,
        isDefault: paymentMethod.isDefault
    });
    // Soft delete
    console.log('[DELETE] Setting isActive to false...');
    paymentMethod.isActive = false;
    await paymentMethod.save();
    console.log('[DELETE] Payment method soft-deleted successfully');
    console.log('[DELETE] Verifying update - isActive:', paymentMethod.isActive);
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
    // Convert to plain object and map _id to id
    const paymentMethodObj = paymentMethod.toObject();
    const mappedPaymentMethod = {
        ...paymentMethodObj,
        id: paymentMethodObj._id.toString(),
        _id: undefined
    };
    (0, response_1.sendSuccess)(res, mappedPaymentMethod, 'Default payment method updated successfully');
});
