import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant';

// Extend Request interface to include merchantId
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      merchant?: any;
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

    // Verify token
    console.log('🔍 AUTH DEBUG: Verifying token with secret:', process.env.JWT_SECRET?.substring(0, 10) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    console.log('🔍 AUTH DEBUG: Token decoded successfully, merchantId:', decoded.merchantId);
    
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
        message: 'Account is deactivated'
      });
    }

    console.log('🔍 AUTH DEBUG: Authentication successful for merchant:', merchant.businessName);
    // Add merchant to request
    req.merchantId = decoded.merchantId;
    req.merchant = merchant;
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      const merchant = await Merchant.findById(decoded.merchantId);
      
      if (merchant && merchant.isActive) {
        req.merchantId = decoded.merchantId;
        req.merchant = merchant;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};