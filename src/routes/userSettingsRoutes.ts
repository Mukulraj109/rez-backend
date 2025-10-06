import { Router } from 'express';
import {
  getUserSettings,
  updateGeneralSettings,
  updateNotificationPreferences,
  updatePrivacySettings,
  updateSecuritySettings,
  updateDeliveryPreferences,
  updatePaymentPreferences,
  updateAppPreferences,
  resetSettings,
  getCourierPreferences,
  updateCourierPreferences,
  getNotificationSettings,
  updatePushNotifications,
  updateEmailNotifications,
  updateSMSNotifications,
  updateInAppNotifications
} from '../controllers/userSettingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Settings routes
router.get('/', getUserSettings);
router.put('/general', updateGeneralSettings);
router.put('/notifications', updateNotificationPreferences);
router.put('/privacy', updatePrivacySettings);
router.put('/security', updateSecuritySettings);
router.put('/delivery', updateDeliveryPreferences);
router.put('/payment', updatePaymentPreferences);
router.put('/preferences', updateAppPreferences);
router.post('/reset', resetSettings);

// Courier preference routes
router.get('/courier', getCourierPreferences);
router.put('/courier', updateCourierPreferences);

// Enhanced notification routes
router.get('/notifications/all', getNotificationSettings);
router.put('/notifications/push', updatePushNotifications);
router.put('/notifications/email', updateEmailNotifications);
router.put('/notifications/sms', updateSMSNotifications);
router.put('/notifications/inapp', updateInAppNotifications);

export default router;