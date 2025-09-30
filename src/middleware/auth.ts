import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

// JWT payload interface
interface JWTPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

// Extend Request interface to include user and userId properties
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

// Generate JWT token
export const generateToken = (userId: string, role: string = 'user'): string => {
  const payload = { userId, role };
  const secret = process.env.JWT_SECRET || 'your-fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn } as any);
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  
  return jwt.sign(payload, secret, { expiresIn } as any);
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET || 'your-fallback-secret';
  return jwt.verify(token, secret) as JWTPayload;
};

// Verify refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret';
  return jwt.verify(token, secret) as JWTPayload;
};

// Extract token from request
const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-auth.refreshToken');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      if (user.isAccountLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.'
        });
      }
      
      // Attach user to request
      req.user = user;
      req.userId = String(user._id);
      
      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-auth.refreshToken');
        
        if (user && user.isActive && !user.isAccountLocked()) {
          req.user = user;
          req.userId = String(user._id);
        }
      } catch (tokenError) {
        // Ignore token errors for optional auth
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = authorize('admin');

// Check if user is store owner or admin
export const requireStoreOwnerOrAdmin = authorize('store_owner', 'admin');

// Alias for authenticate (commonly used name)
export const requireAuth = authenticate;