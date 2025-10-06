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
router.put('/payment', userSettingsController_1.updatePaymentPreferences);
router.put('/preferences', userSettingsController_1.updateAppPreferences);
router.post('/reset', userSettingsController_1.resetSettings);
exports.default = router;
