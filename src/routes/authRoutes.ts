import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  completeOnboarding,
  deleteAccount,
  getUserStatistics
} from '../controllers/authController';

import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { authSchemas } from '../middleware/validation';
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
  authenticate, 
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

export default router;