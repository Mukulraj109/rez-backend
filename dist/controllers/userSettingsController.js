"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInAppNotifications = exports.updateSMSNotifications = exports.updateEmailNotifications = exports.updatePushNotifications = exports.getNotificationSettings = exports.updateCourierPreferences = exports.getCourierPreferences = exports.resetSettings = exports.updateAppPreferences = exports.updatePaymentPreferences = exports.updateDeliveryPreferences = exports.getSecurityStatus = exports.updateBiometricSettings = exports.generateBackupCodes = exports.verifyTwoFactorCode = exports.disableTwoFactorAuth = exports.enableTwoFactorAuth = exports.updateSecuritySettings = exports.updatePrivacySettings = exports.updateNotificationPreferences = exports.updateGeneralSettings = exports.getUserSettings = void 0;
const UserSettings_1 = require("../models/UserSettings");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get user settings
exports.getUserSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    let settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id })
        .populate('delivery.defaultAddressId')
        .populate('payment.defaultPaymentMethodId');
    // If settings don't exist, create default settings
    if (!settings) {
        settings = await UserSettings_1.UserSettings.create({ user: req.user._id });
    }
    (0, response_1.sendSuccess)(res, settings, 'Settings retrieved successfully');
});
// Update general settings
exports.updateGeneralSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'general': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'General settings updated successfully');
});
// Update notification preferences
exports.updateNotificationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Notification preferences updated successfully');
});
// Update privacy settings
exports.updatePrivacySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'privacy': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Privacy settings updated successfully');
});
// Update security settings
exports.updateSecuritySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'security': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Security settings updated successfully');
});
// Enable Two-Factor Authentication
exports.enableTwoFactorAuth = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { method } = req.body;
    if (!['2FA_SMS', '2FA_EMAIL', '2FA_APP'].includes(method)) {
        throw new errorHandler_1.AppError('Invalid 2FA method', 400);
    }
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 8).toUpperCase());
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, {
        $set: {
            'security.twoFactorAuth': {
                enabled: true,
                method,
                backupCodes,
                lastUpdated: new Date()
            }
        }
    }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, {
        enabled: true,
        method,
        backupCodes,
        message: 'Two-factor authentication enabled successfully'
    }, '2FA enabled successfully');
});
// Disable Two-Factor Authentication
exports.disableTwoFactorAuth = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, {
        $set: {
            'security.twoFactorAuth': {
                enabled: false,
                method: '2FA_SMS',
                backupCodes: [],
                lastUpdated: new Date()
            }
        }
    }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, { enabled: false }, '2FA disabled successfully');
});
// Verify Two-Factor Authentication Code
exports.verifyTwoFactorCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { code, method } = req.body;
    const settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id });
    if (!settings || !settings.security.twoFactorAuth.enabled) {
        throw new errorHandler_1.AppError('2FA is not enabled', 400);
    }
    // Check if it's a backup code
    const isBackupCode = settings.security.twoFactorAuth.backupCodes.includes(code);
    if (isBackupCode) {
        // Remove used backup code
        const updatedBackupCodes = settings.security.twoFactorAuth.backupCodes.filter(backupCode => backupCode !== code);
        await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'security.twoFactorAuth.backupCodes': updatedBackupCodes } });
        (0, response_1.sendSuccess)(res, { verified: true, usedBackupCode: true }, 'Backup code verified successfully');
    }
    else {
        // In a real app, you would verify the TOTP code here
        // For demo purposes, we'll accept any 6-digit code
        if (code.length === 6 && /^\d+$/.test(code)) {
            (0, response_1.sendSuccess)(res, { verified: true, usedBackupCode: false }, '2FA code verified successfully');
        }
        else {
            throw new errorHandler_1.AppError('Invalid 2FA code', 400);
        }
    }
});
// Generate New Backup Codes
exports.generateBackupCodes = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id });
    if (!settings || !settings.security.twoFactorAuth.enabled) {
        throw new errorHandler_1.AppError('2FA is not enabled', 400);
    }
    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 8).toUpperCase());
    await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'security.twoFactorAuth.backupCodes': backupCodes } });
    (0, response_1.sendSuccess)(res, { backupCodes }, 'New backup codes generated successfully');
});
// Update Biometric Settings
exports.updateBiometricSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { fingerprintEnabled, faceIdEnabled, voiceEnabled, availableMethods } = req.body;
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, {
        $set: {
            'security.biometric': {
                fingerprintEnabled: fingerprintEnabled || false,
                faceIdEnabled: faceIdEnabled || false,
                voiceEnabled: voiceEnabled || false,
                availableMethods: availableMethods || []
            }
        }
    }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.security.biometric, 'Biometric settings updated successfully');
});
// Get Security Status
exports.getSecurityStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id });
    if (!settings) {
        throw new errorHandler_1.AppError('Settings not found', 404);
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
    (0, response_1.sendSuccess)(res, securityStatus, 'Security status retrieved successfully');
});
// Update delivery preferences
exports.updateDeliveryPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'delivery': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Delivery preferences updated successfully');
});
// Update payment preferences
exports.updatePaymentPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'payment': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Payment preferences updated successfully');
});
// Update app preferences
exports.updateAppPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'preferences': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'App preferences updated successfully');
});
// Reset settings to default
exports.resetSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    // Delete existing settings and create new default ones
    await UserSettings_1.UserSettings.findOneAndDelete({ user: req.user._id });
    const settings = await UserSettings_1.UserSettings.create({ user: req.user._id });
    (0, response_1.sendSuccess)(res, settings, 'Settings reset to default successfully');
});
// ============================================================================
// COURIER PREFERENCE ENDPOINTS
// ============================================================================
// Get courier preferences
exports.getCourierPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id });
    if (!settings) {
        throw new errorHandler_1.AppError('Settings not found', 404);
    }
    (0, response_1.sendSuccess)(res, settings.courier, 'Courier preferences retrieved successfully');
});
// Update courier preferences
exports.updateCourierPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'courier': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.courier, 'Courier preferences updated successfully');
});
// ============================================================================
// ENHANCED NOTIFICATION ENDPOINTS
// ============================================================================
// Get all notification settings
exports.getNotificationSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id });
    if (!settings) {
        throw new errorHandler_1.AppError('Settings not found', 404);
    }
    (0, response_1.sendSuccess)(res, settings.notifications, 'Notification settings retrieved successfully');
});
// Update push notification settings
exports.updatePushNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications.push': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.notifications.push, 'Push notification settings updated successfully');
});
// Update email notification settings
exports.updateEmailNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications.email': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.notifications.email, 'Email notification settings updated successfully');
});
// Update SMS notification settings
exports.updateSMSNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications.sms': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.notifications.sms, 'SMS notification settings updated successfully');
});
// Update in-app notification settings
exports.updateInAppNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications.inApp': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings.notifications.inApp, 'In-app notification settings updated successfully');
});
