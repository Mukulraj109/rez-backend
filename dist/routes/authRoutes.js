"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const upload_1 = require("../middleware/upload");
// import { authLimiter, otpLimiter, securityLimiter } from '../middleware/rateLimiter'; // Disabled for development
const router = (0, express_1.Router)();
// Public routes
router.post('/send-otp', 
// otpLimiter, // Disabled for development 
(0, validation_1.validate)(validation_2.authSchemas.sendOTP), authController_1.sendOTP);
router.post('/verify-otp', 
// authLimiter, // Disabled for development 
(0, validation_1.validate)(validation_2.authSchemas.verifyOTP), authController_1.verifyOTP);
router.post('/refresh-token', 
// authLimiter, // Disabled for development 
(0, validation_1.validate)(validation_2.authSchemas.refreshToken), authController_1.refreshToken);
// Protected routes
router.post('/logout', auth_1.authenticate, authController_1.logout);
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
router.put('/profile', auth_1.authenticate, (0, validation_1.validate)(validation_2.authSchemas.updateProfile), authController_1.updateProfile);
router.post('/complete-onboarding', auth_1.authenticate, (0, validation_1.validate)(validation_2.authSchemas.updateProfile), authController_1.completeOnboarding);
router.delete('/account', auth_1.authenticate, 
// securityLimiter, // Disabled for development
authController_1.deleteAccount);
router.get('/statistics', auth_1.authenticate, authController_1.getUserStatistics);
router.post('/upload-avatar', auth_1.authenticate, upload_1.uploadProfileImage.single('avatar'), authController_1.uploadAvatar);
exports.default = router;
