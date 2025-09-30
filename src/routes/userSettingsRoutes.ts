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
  resetSettings
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

export default router;