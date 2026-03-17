/**
 * Admin Authentication Routes
 * Handles email/password login for admin users
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { generateToken, verifyToken, authenticate, logoutAllDevices } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import { generateTotpSecret, verifyTotp, enableTotp, disableTotp, isTotpEnabled } from '../../services/adminTotpService';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Role hierarchy for permissions
const ROLE_HIERARCHY: Record<string, number> = {
  'support': 60,
  'operator': 70,
  'admin': 80,
  'super_admin': 100
};

/**
 * POST /api/auth/login
 * Admin login with email and password
 */
router.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totpCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Find user by email with password field
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user has an admin-level role
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!adminRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Verify password
  if (!user.password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Password not set.'
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check TOTP 2FA if enabled for this admin
  const totpEnabled = await isTotpEnabled(String(user._id));
  if (totpEnabled) {
    if (!totpCode) {
      return res.status(403).json({
        success: false,
        message: 'TOTP code required',
        requiresTotp: true
      });
    }
    const totpValid = await verifyTotp(String(user._id), totpCode);
    if (!totpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid TOTP code'
      });
    }
  }

  // Generate JWT token with actual role (critical for RBAC + socket.io auth)
  const token = generateToken((user._id as string).toString(), user.role);

  // Update last login
  user.auth.lastLogin = new Date();
  await user.save();

  // Return user data (map to admin format expected by frontend)
  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        level: ROLE_HIERARCHY[user.role] || ROLE_HIERARCHY['admin'],
        permissions: user.role === 'super_admin' ? ['*'] : [],
        lastLogin: user.auth.lastLogin,
        createdAt: user.createdAt
      },
      token
    }
  });

}));

/**
 * POST /api/auth/logout
 * Admin logout
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // Clear any server-side session if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * GET /api/auth/me
 * Get current admin user
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  // Verify token using shared auth utility (pinned HS256, no fallback secret)
  const decoded = verifyToken(token);

  const user = await User.findById(decoded.userId);

  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!user || !adminRoles.includes(user.role)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or not an admin'
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        level: ROLE_HIERARCHY[user.role] || ROLE_HIERARCHY['admin'],
        permissions: user.role === 'super_admin' ? ['*'] : [],
        lastLogin: user.auth.lastLogin,
        createdAt: user.createdAt
      }
    }
  });

}));

/**
 * POST /api/admin/auth/totp/setup
 * Generate TOTP secret and QR code URI for admin 2FA setup
 */
router.post('/totp/setup', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const result = await generateTotpSecret(userId);

  res.json({
    success: true,
    data: {
      secret: result.secret,
      uri: result.uri,
      message: 'Scan the QR code with your authenticator app, then verify with /totp/verify'
    }
  });
}));

/**
 * POST /api/admin/auth/totp/verify
 * Verify TOTP code and enable 2FA
 */
router.post('/totp/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Valid 6-digit TOTP code required' });
  }

  const enabled = await enableTotp(userId, code);
  if (!enabled) {
    return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
  }

  res.json({ success: true, message: 'TOTP 2FA enabled successfully' });
}));

/**
 * DELETE /api/admin/auth/totp
 * Disable TOTP 2FA (requires valid code)
 */
router.delete('/totp', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Valid 6-digit TOTP code required to disable 2FA' });
  }

  const disabled = await disableTotp(userId, code);
  if (!disabled) {
    return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
  }

  res.json({ success: true, message: 'TOTP 2FA disabled successfully' });
}));

/**
 * POST /api/admin/auth/logout-all-devices
 * Invalidate all tokens for the current admin user
 */
router.post('/logout-all-devices', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  await logoutAllDevices(userId);

  // Clear stored refresh token
  await User.findByIdAndUpdate(userId, { $unset: { 'auth.refreshToken': 1 } });

  res.json({ success: true, message: 'All sessions invalidated. All devices must re-login.' });
}));

export default router;
