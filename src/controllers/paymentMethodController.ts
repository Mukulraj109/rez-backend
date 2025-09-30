import { Request, Response } from 'express';
import { PaymentMethod, IPaymentMethod } from '../models/PaymentMethod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Get all payment methods for user
export const getUserPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const paymentMethods = await PaymentMethod.find({
    user: req.user._id,
    isActive: true
  }).sort({ isDefault: -1, createdAt: -1 });

  sendSuccess(res, paymentMethods, 'Payment methods retrieved successfully');
});

// Get single payment method by ID
export const getPaymentMethodById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  sendSuccess(res, paymentMethod, 'Payment method retrieved successfully');
});

// Create new payment method
export const createPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const paymentMethodData = {
    ...req.body,
    user: req.user._id
  };

  // Validate based on type
  if (paymentMethodData.type === 'CARD' && !paymentMethodData.card) {
    throw new AppError('Card details are required', 400);
  }

  if (paymentMethodData.type === 'BANK_ACCOUNT' && !paymentMethodData.bankAccount) {
    throw new AppError('Bank account details are required', 400);
  }

  if (paymentMethodData.type === 'UPI' && !paymentMethodData.upi) {
    throw new AppError('UPI details are required', 400);
  }

  const paymentMethod = await PaymentMethod.create(paymentMethodData);

  sendSuccess(res, paymentMethod, 'Payment method created successfully', 201);
});

// Update payment method
export const updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find payment method and ensure it belongs to the user
  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Update only allowed fields (prevent type change)
  const allowedUpdates = ['card', 'bankAccount', 'upi', 'isDefault'];
  const updates: any = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  Object.assign(paymentMethod, updates);
  await paymentMethod.save();

  sendSuccess(res, paymentMethod, 'Payment method updated successfully');
});

// Delete payment method (soft delete - set isActive to false)
export const deletePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Soft delete
  paymentMethod.isActive = false;
  await paymentMethod.save();

  sendSuccess(res, { deletedId: id }, 'Payment method deleted successfully');
});

// Set default payment method
export const setDefaultPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find payment method and ensure it belongs to the user
  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Update all payment methods to non-default
  await PaymentMethod.updateMany(
    { user: req.user._id },
    { $set: { isDefault: false } }
  );

  // Set this payment method as default
  paymentMethod.isDefault = true;
  await paymentMethod.save();

  sendSuccess(res, paymentMethod, 'Default payment method updated successfully');
});