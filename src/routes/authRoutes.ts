import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  completeOnboarding,
  changePassword,
  deleteAccount,
  getUserStatistics,
  uploadAvatar
} from '../controllers/authController';

import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { authSchemas } from '../middleware/validation';
import { uploadProfileImage } from '../middleware/upload';
// import { authLimiter, otpLimiter, securityLimiter } from '../middleware/rateLimiter'; // Disabled for development

const router = Router();

// Public routes
router.post('/send-otp', 
  // otpLimiter, // Disabled for development 
  validate(authSchemas.sendOTP), 
  sendOTP
);

router.post('/verify-otp', 
  // authLimiter, // Disabled for development 
  validate(authSchemas.verifyOTP), 
  verifyOTP
);

router.post('/refresh-token', 
  // authLimiter, // Disabled for development 
  validate(authSchemas.refreshToken), 
  refreshToken
);

// Protected routes
router.post('/logout', 
  logout
);

router.get('/me', 
  authenticate, 
  getCurrentUser
);

router.put('/profile', 
  authenticate, 
  validate(authSchemas.updateProfile), 
  updateProfile
);

router.put('/change-password',
  authenticate,
  changePassword
);

router.post('/complete-onboarding', 
  authenticate, 
  validate(authSchemas.updateProfile), 
  completeOnboarding
);

router.delete('/account',
  authenticate,
  // securityLimiter, // Disabled for development
  deleteAccount
);

router.get('/statistics',
  authenticate,
  getUserStatistics
);

router.post('/upload-avatar',
  authenticate,
  uploadProfileImage.single('avatar'),
  uploadAvatar
);

export default router;