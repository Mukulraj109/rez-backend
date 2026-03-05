/**
 * Rate Limiter with Redis Store
 *
 * Uses the shared Redis client from redisService.
 * Falls back to MemoryStore if Redis is unavailable.
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

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

// ─── Key generator: per-user when authenticated, per-IP otherwise ─────────────
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id || (req as any).userId;
  if (userId) return `user:${userId}`;
  return req.ip || 'unknown';
};

// ─── Check if disabled (dev override) ────────────────────────────────────────
const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';

if (isRateLimitDisabled) {
  logger.info('⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true)');
}

const passthrough = (_req: Request, _res: Response, next: NextFunction) => next();

// ─── Store factory — uses shared Redis client from redisService ──────────────
let redisStoreWarningLogged = false;

function makeStore(prefix: string) {
  if (isRateLimitDisabled) return undefined; // MemoryStore fallback

  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const client = redisService.getClient();
      if (!client) {
        if (!redisStoreWarningLogged) {
          logger.warn('[RateLimit] Redis not available — falling back to MemoryStore');
          redisStoreWarningLogged = true;
        }
        throw new Error('Redis not available');
      }
      return (client as any).sendCommand(args);
    },
    prefix: `rl:${prefix}:`,
  });
}

// ─── Safe rate limiter factory — catches store errors, passes request through ─
function makeLimiter(options: Parameters<typeof rateLimit>[0]) {
  const limiter = rateLimit(options);
  return (req: Request, res: Response, next: NextFunction) => {
    limiter(req, res, (err?: any) => {
      if (err) {
        if (!redisStoreWarningLogged) {
          logger.warn('[RateLimit] Store error, passing request through:', err.message);
          redisStoreWarningLogged = true;
        }
        return next();
      }
      next();
    });
  };
}

// ─── Error response helper ────────────────────────────────────────────────────
const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// LIMITERS — Redis-backed, per-user key
// ─────────────────────────────────────────────────────────────────────────────

export const generalLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 15 * 60 * 1000,
      max: 500,
      keyGenerator,
      store: makeStore('general'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const authLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('auth'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again after 15 minutes.',
          retryAfter: 15 * 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    });

export const registrationLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('register'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: 60 * 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const otpLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 30 * 1000,
      max: 3,
      keyGenerator,
      store: makeStore('otp'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Please wait 30 seconds before requesting another OTP.',
          retryAfter: 30,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const passwordResetLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 3,
      keyGenerator,
      store: makeStore('pwd-reset'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const securityLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 15 * 60 * 1000,
      max: 3,
      keyGenerator,
      store: makeStore('security'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const uploadLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('upload'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Upload limit exceeded. Please wait before uploading more files.',
          retryAfter: 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const searchLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('search'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const aiSearchLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('ai-search'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const strictLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('strict'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const reviewLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('review'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const analyticsLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('analytics'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const comparisonLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('comparison'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const favoriteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 20,
      keyGenerator,
      store: makeStore('favorite'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const recommendationLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 15,
      keyGenerator,
      store: makeStore('recommendation'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const referralLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 50,
      keyGenerator,
      store: makeStore('referral'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const referralShareLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('referral-share'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

// ================================================
// PRODUCT CRUD RATE LIMITERS
// ================================================

export const productGetLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 100,
      keyGenerator,
      store: makeStore('product-get'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productWriteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('product-write'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productDeleteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('product-delete'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productBulkLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('product-bulk'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const createProductLimiter = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'BULK') => {
  if (isRateLimitDisabled) return passthrough;
  const configs = {
    GET:    { max: 100, prefix: 'product-get' },
    POST:   { max: 30,  prefix: 'product-post' },
    PUT:    { max: 30,  prefix: 'product-put' },
    DELETE: { max: 10,  prefix: 'product-del' },
    BULK:   { max: 5,   prefix: 'product-bulk2' },
  };
  const { max, prefix } = configs[method];
  return makeLimiter({
    windowMs: 60 * 1000,
    max,
    keyGenerator,
    store: makeStore(prefix),
    message: rateLimitResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  prefix?: string;
}) => {
  if (isRateLimitDisabled) return passthrough;
  return makeLimiter({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    keyGenerator,
    store: makeStore(options.prefix || 'custom'),
    message: options.message
      ? (_req: Request, res: Response) => {
          res.status(429).json({ success: false, message: options.message });
        }
      : rateLimitResponse,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
  });
};
