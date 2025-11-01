"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userSettingsController_1 = require("../controllers/userSettingsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Settings routes
router.get('/', userSettingsController_1.getUserSettings);
router.put('/general', userSettingsController_1.updateGeneralSettings);
router.put('/notifications', userSettingsController_1.updateNotificationPreferences);
router.put('/privacy', userSettingsController_1.updatePrivacySettings);
router.put('/security', userSettingsController_1.updateSecuritySettings);
router.put('/delivery', userSettingsController_1.updateDeliveryPreferences);
// Security-specific routes
router.get('/security/status', userSettingsController_1.getSecurityStatus);
router.post('/security/2fa/enable', userSettingsController_1.enableTwoFactorAuth);
router.post('/security/2fa/disable', userSettingsController_1.disableTwoFactorAuth);
router.post('/security/2fa/verify', userSettingsController_1.verifyTwoFactorCode);
router.post('/security/2fa/backup-codes', userSettingsController_1.generateBackupCodes);
router.put('/security/biometric', userSettingsController_1.updateBiometricSettings);
router.put('/payment', userSettingsController_1.updatePaymentPreferences);
router.put('/preferences', userSettingsController_1.updateAppPreferences);
router.post('/reset', userSettingsController_1.resetSettings);
// Courier preference routes
router.get('/courier', userSettingsController_1.getCourierPreferences);
router.put('/courier', userSettingsController_1.updateCourierPreferences);
// Enhanced notification routes
router.get('/notifications/all', userSettingsController_1.getNotificationSettings);
router.put('/notifications/push', userSettingsController_1.updatePushNotifications);
router.put('/notifications/email', userSettingsController_1.updateEmailNotifications);
router.put('/notifications/sms', userSettingsController_1.updateSMSNotifications);
router.put('/notifications/inapp', userSettingsController_1.updateInAppNotifications);
exports.default = router;
