/**
 * Admin Authentication Routes
 * Handles email/password login for admin users
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { generateToken } from '../../middleware/auth';

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
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('🔐 [Admin Auth] Login attempt for:', email);

    // Find user by email with password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      console.log('❌ [Admin Auth] User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.log('❌ [Admin Auth] User does not have admin role:', email, 'role:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ [Admin Auth] Account is inactive:', email);
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    if (!user.password) {
      console.log('❌ [Admin Auth] No password set for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password not set.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ [Admin Auth] Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token with admin role (critical for socket.io auth)
    const token = generateToken((user._id as string).toString(), 'admin');

    // Update last login
    user.auth.lastLogin = new Date();
    await user.save();

    console.log('✅ [Admin Auth] Login successful for:', email);

    // Return user data (map to admin format expected by frontend)
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
          role: 'super_admin', // Map 'admin' to 'super_admin' for frontend compatibility
          level: ROLE_HIERARCHY['super_admin'],
          permissions: ['*'], // Full access for admin
          lastLogin: user.auth.lastLogin,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error: any) {
    console.error('❌ [Admin Auth] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * POST /api/auth/logout
 * Admin logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Clear any server-side session if needed
    console.log('🚪 [Admin Auth] Logout');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('❌ [Admin Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current admin user
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token and get user
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'admin') {
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
          role: 'super_admin',
          level: ROLE_HIERARCHY['super_admin'],
          permissions: ['*'],
          lastLogin: user.auth.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [Admin Auth] Get me error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

export default router;
