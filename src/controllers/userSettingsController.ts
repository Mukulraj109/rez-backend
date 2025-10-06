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

// ============================================================================
// COURIER PREFERENCE ENDPOINTS
// ============================================================================

// Get courier preferences
export const getCourierPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id });

  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  sendSuccess(res, settings.courier, 'Courier preferences retrieved successfully');
});

// Update courier preferences
export const updateCourierPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'courier': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.courier, 'Courier preferences updated successfully');
});

// ============================================================================
// ENHANCED NOTIFICATION ENDPOINTS
// ============================================================================

// Get all notification settings
export const getNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id });

  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  sendSuccess(res, settings.notifications, 'Notification settings retrieved successfully');
});

// Update push notification settings
export const updatePushNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'notifications.push': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.push, 'Push notification settings updated successfully');
});

// Update email notification settings
export const updateEmailNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'notifications.email': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.email, 'Email notification settings updated successfully');
});

// Update SMS notification settings
export const updateSMSNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'notifications.sms': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.sms, 'SMS notification settings updated successfully');
});

// Update in-app notification settings
export const updateInAppNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'notifications.inApp': req.body } },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.inApp, 'In-app notification settings updated successfully');
});