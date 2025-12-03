"use strict";
// Security Routes
// Routes for device verification, fraud detection, and security checks
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const securityController_1 = require("../controllers/securityController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Verify device fingerprint and get trust score
router.post('/verify-device', (0, validation_1.validateBody)(validation_2.Joi.object({
    deviceId: validation_2.Joi.string().required(),
    platform: validation_2.Joi.string().valid('ios', 'android', 'web').required(),
    osVersion: validation_2.Joi.string().optional(),
    appVersion: validation_2.Joi.string().optional(),
    deviceModel: validation_2.Joi.string().optional(),
    deviceName: validation_2.Joi.string().optional()
})), securityController_1.verifyDevice);
// Check if device/IP is blacklisted
router.post('/check-blacklist', (0, validation_1.validateBody)(validation_2.Joi.object({
    deviceId: validation_2.Joi.string().optional(),
    ip: validation_2.Joi.string().optional()
})), securityController_1.checkBlacklist);
// Report suspicious activity
router.post('/report-suspicious', (0, validation_1.validateBody)(validation_2.Joi.object({
    type: validation_2.Joi.string().required(),
    details: validation_2.Joi.object().optional()
})), securityController_1.reportSuspicious);
// Verify captcha token
router.post('/verify-captcha', (0, validation_1.validateBody)(validation_2.Joi.object({
    token: validation_2.Joi.string().required(),
    action: validation_2.Joi.string().optional()
})), securityController_1.verifyCaptcha);
// Get IP information (geolocation, VPN detection)
router.post('/ip-info', (0, validation_1.validateBody)(validation_2.Joi.object({
    ip: validation_2.Joi.string().optional()
})), securityController_1.getIpInfo);
// Check for multi-account patterns
router.post('/check-multi-account', (0, validation_1.validateBody)(validation_2.Joi.object({
    deviceId: validation_2.Joi.string().optional(),
    ip: validation_2.Joi.string().optional()
})), securityController_1.checkMultiAccount);
exports.default = router;
