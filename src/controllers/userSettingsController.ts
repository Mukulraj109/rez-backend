import { Request, Response } from 'express';
import { UserSettings, IUserSettings } from '../models/UserSettings';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Get user settings
export const getUserSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  let settings = await UserSettings.findOne({ user: req.user._id })
    .populate('delivery.defaultAddressId')
    .populate('payment.defaultPaymentMethodId');

  // If settings don't exist, create default settings
  if (!settings) {
    settings = await UserSettings.create({ user: req.user._id });
  }

  sendSuccess(res, settings, 'Settings retrieved successfully');
});

// Update general settings
export const updateGeneralSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'general': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'General settings updated successfully');
});

// Update notification preferences
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'notifications': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Notification preferences updated successfully');
});

// Update privacy settings
export const updatePrivacySettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'privacy': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Privacy settings updated successfully');
});

// Update security settings
export const updateSecuritySettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'security': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Security settings updated successfully');
});

// Update delivery preferences
export const updateDeliveryPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'delivery': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Delivery preferences updated successfully');
});

// Update payment preferences
export const updatePaymentPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'payment': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Payment preferences updated successfully');
});

// Update app preferences
export const updateAppPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'preferences': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'App preferences updated successfully');
});

// Reset settings to default
export const resetSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Delete existing settings and create new default ones
  await UserSettings.findOneAndDelete({ user: req.user._id });
  const settings = await UserSettings.create({ user: req.user._id });

  sendSuccess(res, settings, 'Settings reset to default successfully');
});