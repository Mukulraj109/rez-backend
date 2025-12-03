import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include rateLimit property
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

// Check if rate limiting is disabled
const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';

// Log rate limiting status
if (isRateLimitDisabled) {
  console.log('⚠️  Rate limiting is DISABLED for development');
} else {
  console.log('✅ Rate limiting is ENABLED');
}

// Passthrough middleware for when rate limiting is disabled
const passthroughMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Rate limiter error response
const rateLimitErrorResponse = (req: Request, res: Response) => {
  const resetTime = req.rateLimit?.resetTime ? 
    Math.round(req.rateLimit.resetTime.getTime() / 1000) : 
    Math.round(Date.now() / 1000) + 900; // Default to 15 minutes from now

  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: resetTime
  });
};

// General API rate limiter
export const generalLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: rateLimitErrorResponse,
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false // Disable the `X-RateLimit-*` headers
    });

// Authentication rate limiter (stricter) - for login attempts
export const authLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again after 15 minutes.',
          retryAfter: 15 * 60 // seconds
        });
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      skipSuccessfulRequests: true // Don't count successful requests
    });

// Registration rate limiter - Medium limit
export const registrationLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 registrations per hour per IP
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: 60 * 60 // seconds
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

// Password reset rate limiter - Strict limit
export const passwordResetLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per hour
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many password reset attempts. Please try again after 1 hour.',
          retryAfter: 60 * 60 // seconds
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

// OTP rate limiter (adjusted for development)
export const otpLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 30 * 1000, // 30 seconds (reduced for development)
      max: 3, // Allow 3 OTP requests per 30 seconds (increased for development)
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Please wait 30 seconds before requesting another OTP.',
          retryAfter: 30
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Password/security related operations
export const securityLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3, // 3 attempts per window
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// File upload rate limiter
export const uploadLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 uploads per minute
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Upload limit exceeded. Please wait before uploading more files.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Search rate limiter
export const searchLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Strict rate limiter for sensitive operations
export const strictLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 requests per hour
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Review rate limiter (for review operations)
export const reviewLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 review operations per minute
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Too many review requests. Please wait before submitting another review.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Analytics rate limiter
export const analyticsLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 analytics requests per minute
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Comparison rate limiter
export const comparisonLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 comparison operations per minute
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Favorite rate limiter
export const favoriteLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 20, // 20 favorite operations per minute
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Recommendation rate limiter
export const recommendationLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 15, // 15 recommendation requests per minute
      message: rateLimitErrorResponse,
      standardHeaders: true,
      legacyHeaders: false
    });

// Referral rate limiter (prevent abuse of referral system)
export const referralLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 referral operations per hour (viewing, sharing, etc.)
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Referral activity limit exceeded. Please try again later.',
          retryAfter: Math.round(Date.now() / 1000) + 3600
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Referral share rate limiter (stricter to prevent spam)
export const referralShareLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 shares per minute
      message: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Too many share requests. Please wait before sharing again.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// ================================================
// PRODUCT CRUD RATE LIMITERS
// ================================================

// Product GET requests rate limiter
export const productGetLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 GET requests per minute
      message: (req: Request, res: Response) => {
        console.warn(`[RATE LIMIT] Product GET exceeded: IP ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
          success: false,
          message: 'Too many product requests. Please try again in a minute.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Product POST/PUT rate limiter (create/update)
export const productWriteLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 POST/PUT requests per minute
      message: (req: Request, res: Response) => {
        console.warn(`[RATE LIMIT] Product write exceeded: IP ${req.ip}, Path: ${req.path}, Method: ${req.method}`);
        res.status(429).json({
          success: false,
          message: 'Too many product creation/update requests. Please slow down.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Product DELETE rate limiter
export const productDeleteLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 DELETE requests per minute
      message: (req: Request, res: Response) => {
        console.warn(`[RATE LIMIT] Product delete exceeded: IP ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
          success: false,
          message: 'Too many product deletion requests. Please try again later.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Product bulk operations rate limiter (stricter)
export const productBulkLimiter = isRateLimitDisabled
  ? passthroughMiddleware
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 bulk operations per minute
      message: (req: Request, res: Response) => {
        console.warn(`[RATE LIMIT] Product bulk operation exceeded: IP ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
          success: false,
          message: 'Too many bulk operations. Please wait before performing another bulk action.',
          retryAfter: 60
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Combined product operation limiter (for routes that need flexible control)
export const createProductLimiter = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'BULK') => {
  if (isRateLimitDisabled) {
    return passthroughMiddleware;
  }

  const configs = {
    GET: { windowMs: 60 * 1000, max: 100, operation: 'read' },
    POST: { windowMs: 60 * 1000, max: 30, operation: 'create' },
    PUT: { windowMs: 60 * 1000, max: 30, operation: 'update' },
    DELETE: { windowMs: 60 * 1000, max: 10, operation: 'delete' },
    BULK: { windowMs: 60 * 1000, max: 5, operation: 'bulk operation' }
  };

  const config = configs[method];

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: (req: Request, res: Response) => {
      console.warn(`[RATE LIMIT] Product ${config.operation} exceeded: IP ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        message: `Too many product ${config.operation} requests. Please try again later.`,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Create custom rate limiter
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  if (isRateLimitDisabled) {
    return passthroughMiddleware;
  }

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message ?
      (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: options.message
        });
      } :
      rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false
  });
};