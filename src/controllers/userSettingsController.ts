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

// Enable Two-Factor Authentication
export const enableTwoFactorAuth = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { method } = req.body;

  if (!['2FA_SMS', '2FA_EMAIL', '2FA_APP'].includes(method)) {
    throw new AppError('Invalid 2FA method', 400);
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { 
      $set: { 
        'security.twoFactorAuth': {
          enabled: true,
          method,
          backupCodes,
          lastUpdated: new Date()
        }
      } 
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, { 
    enabled: true, 
    method, 
    backupCodes,
    message: 'Two-factor authentication enabled successfully' 
  }, '2FA enabled successfully');
});

// Disable Two-Factor Authentication
export const disableTwoFactorAuth = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { 
      $set: { 
        'security.twoFactorAuth': {
          enabled: false,
          method: '2FA_SMS',
          backupCodes: [],
          lastUpdated: new Date()
        }
      } 
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, { enabled: false }, '2FA disabled successfully');
});

// Verify Two-Factor Authentication Code
export const verifyTwoFactorCode = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { code, method } = req.body;

  const settings = await UserSettings.findOne({ user: req.user._id });
  if (!settings || !settings.security.twoFactorAuth.enabled) {
    throw new AppError('2FA is not enabled', 400);
  }

  // Check if it's a backup code
  const isBackupCode = settings.security.twoFactorAuth.backupCodes.includes(code);
  
  if (isBackupCode) {
    // Remove used backup code
    const updatedBackupCodes = settings.security.twoFactorAuth.backupCodes.filter(
      backupCode => backupCode !== code
    );
    
    await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      { $set: { 'security.twoFactorAuth.backupCodes': updatedBackupCodes } }
    );

    sendSuccess(res, { verified: true, usedBackupCode: true }, 'Backup code verified successfully');
  } else {
    // In a real app, you would verify the TOTP code here
    // For demo purposes, we'll accept any 6-digit code
    if (code.length === 6 && /^\d+$/.test(code)) {
      sendSuccess(res, { verified: true, usedBackupCode: false }, '2FA code verified successfully');
    } else {
      throw new AppError('Invalid 2FA code', 400);
    }
  }
});

// Generate New Backup Codes
export const generateBackupCodes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id });
  if (!settings || !settings.security.twoFactorAuth.enabled) {
    throw new AppError('2FA is not enabled', 400);
  }

  // Generate new backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'security.twoFactorAuth.backupCodes': backupCodes } }
  );

  sendSuccess(res, { backupCodes }, 'New backup codes generated successfully');
});

// Update Biometric Settings
export const updateBiometricSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { fingerprintEnabled, faceIdEnabled, voiceEnabled, availableMethods } = req.body;

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { 
      $set: { 
        'security.biometric': {
          fingerprintEnabled: fingerprintEnabled || false,
          faceIdEnabled: faceIdEnabled || false,
          voiceEnabled: voiceEnabled || false,
          availableMethods: availableMethods || []
        }
      } 
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.security.biometric, 'Biometric settings updated successfully');
});

// Get Security Status
export const getSecurityStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id });
  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  const securityStatus = {
    twoFactorAuth: {
      enabled: settings.security.twoFactorAuth.enabled,
      method: settings.security.twoFactorAuth.method,
      backupCodesCount: settings.security.twoFactorAuth.backupCodes.length,
      lastUpdated: settings.security.twoFactorAuth.lastUpdated
    },
    biometric: settings.security.biometric,
    sessionManagement: settings.security.sessionManagement,
    loginAlerts: settings.security.loginAlerts
  };

  sendSuccess(res, securityStatus, 'Security status retrieved successfully');
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