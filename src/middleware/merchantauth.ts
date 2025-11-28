import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant';
import { MerchantUser, IMerchantUser } from '../models/MerchantUser';

// Extend Request interface to include merchantId and merchantUser
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      merchant?: any;
      merchantUser?: IMerchantUser;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    console.log('🔍 AUTH DEBUG: Request to', req.path);
    console.log('🔍 AUTH DEBUG: Auth header exists:', !!authHeader);
    console.log('🔍 AUTH DEBUG: Token exists:', !!token);

    if (token) {
      console.log('🔍 AUTH DEBUG: Token preview:', token.substring(0, 20) + '...');
    }

    if (!token) {
      console.log('🔍 AUTH DEBUG: No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token using merchant-specific secret
    const merchantSecret = process.env.JWT_MERCHANT_SECRET;
    if (!merchantSecret) {
      console.warn('⚠️ WARNING: JWT_MERCHANT_SECRET not set! Using fallback. Set JWT_MERCHANT_SECRET in .env for production!');
    }
    console.log('🔍 AUTH DEBUG: Verifying token with merchant secret');
    const decoded = jwt.verify(token, merchantSecret || 'fallback-merchant-secret') as any;
    console.log('🔍 AUTH DEBUG: Token decoded successfully');
    console.log('🔍 AUTH DEBUG: MerchantId:', decoded.merchantId);
    console.log('🔍 AUTH DEBUG: MerchantUserId:', decoded.merchantUserId);
    console.log('🔍 AUTH DEBUG: Role:', decoded.role);

    // Find merchant
    const merchant = await Merchant.findById(decoded.merchantId);
    console.log('🔍 AUTH DEBUG: Merchant found:', !!merchant);

    if (!merchant) {
      console.log('🔍 AUTH DEBUG: Merchant not found for ID:', decoded.merchantId);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - merchant not found'
      });
    }

    // Check if merchant is active
    console.log('🔍 AUTH DEBUG: Merchant isActive:', merchant.isActive);
    if (!merchant.isActive) {
      console.log('🔍 AUTH DEBUG: Merchant account is deactivated');
      return res.status(401).json({
        success: false,
        message: 'Merchant account is deactivated'
      });
    }

    // Add merchant to request
    req.merchantId = decoded.merchantId;
    req.merchant = merchant;

    // If this is a team member (has merchantUserId), load their data
    if (decoded.merchantUserId) {
      console.log('🔍 AUTH DEBUG: Loading MerchantUser data');
      const merchantUser = await MerchantUser.findById(decoded.merchantUserId);

      if (!merchantUser) {
        console.log('🔍 AUTH DEBUG: MerchantUser not found for ID:', decoded.merchantUserId);
        return res.status(401).json({
          success: false,
          message: 'Token is not valid - user not found'
        });
      }

      // Check if user is active
      if (merchantUser.status !== 'active') {
        console.log('🔍 AUTH DEBUG: MerchantUser account is', merchantUser.status);
        return res.status(403).json({
          success: false,
          message: `Account is ${merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check if account is locked
      if (merchantUser.accountLockedUntil && merchantUser.accountLockedUntil > new Date()) {
        console.log('🔍 AUTH DEBUG: MerchantUser account is locked');
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.'
        });
      }

      req.merchantUser = merchantUser;
      console.log('🔍 AUTH DEBUG: Authentication successful for team member:', merchantUser.name);
    } else {
      console.log('🔍 AUTH DEBUG: Authentication successful for merchant owner:', merchant.businessName);
    }

    return next();
  } catch (error: any) {
    console.error('🔍 AUTH DEBUG: Auth middleware error:', error);
    console.error('🔍 AUTH DEBUG: Error name:', error.name);
    console.error('🔍 AUTH DEBUG: Error message:', error.message);

    if (error.name === 'JsonWebTokenError') {
      console.log('🔍 AUTH DEBUG: JWT verification failed');
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      console.log('🔍 AUTH DEBUG: JWT token expired');
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    console.log('🔍 AUTH DEBUG: General authentication error');
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const merchantSecret = process.env.JWT_MERCHANT_SECRET;
      const decoded = jwt.verify(token, merchantSecret || 'fallback-merchant-secret') as any;
      const merchant = await Merchant.findById(decoded.merchantId);

      if (merchant && merchant.isActive) {
        req.merchantId = decoded.merchantId;
        req.merchant = merchant;

        // Load MerchantUser if present
        if (decoded.merchantUserId) {
          const merchantUser = await MerchantUser.findById(decoded.merchantUserId);
          if (merchantUser && merchantUser.status === 'active') {
            req.merchantUser = merchantUser;
          }
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};