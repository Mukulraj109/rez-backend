/**
 * Rate Limiter with Redis Store
 *
 * Uses RedisStore so rate limit counters are shared across all K8s pods.
 * Falls back to MemoryStore (single-pod only) if Redis is unavailable.
 *
 * Key generator: uses userId when authenticated, falls back to IP
 * (fixes false-rate-limiting of mobile users sharing NAT IPs)
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
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

// ─── Redis client for rate limiter (separate from main app client) ────────────
let rateLimitRedisClient: ReturnType<typeof createClient> | null = null;

async function getRateLimitRedisClient() {
  if (rateLimitRedisClient) return rateLimitRedisClient;

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  });

  client.on('error', (err) =>
    console.error('[RateLimit Redis] error:', err.message)
  );

  await client.connect();
  rateLimitRedisClient = client;
  return client;
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
  console.log('⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true)');
} else {
  console.log('✅ Rate limiting is ENABLED with Redis store (global across all pods)');
}

const passthrough = (_req: Request, _res: Response, next: NextFunction) => next();

// ─── Store factory ─────────────────────────────────────────────────────────────
function makeStore(prefix: string) {
  if (isRateLimitDisabled || !process.env.REDIS_URL) return undefined; // MemoryStore fallback
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const client = await getRateLimitRedisClient();
      return (client as any).sendCommand(args);
    },
    prefix: `rl:${prefix}:`,
  });
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  : rateLimit({
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
  return rateLimit({
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
  return rateLimit({
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
