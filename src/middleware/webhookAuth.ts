/**
 * Webhook Authentication Middleware
 *
 * Authenticates incoming webhooks from brands/affiliate networks
 * using API keys and optional HMAC signature verification.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { MallBrand } from '../models/MallBrand';

// Environment variable for master webhook key
// SECURITY: In production, this MUST be set via environment variable
// The hardcoded fallback only works in development/test environments
const MASTER_WEBHOOK_KEY = process.env.MALL_WEBHOOK_MASTER_KEY ||
  (process.env.NODE_ENV !== 'production' ? 'rez_webhook_demo_key_2024' : undefined);

/**
 * Webhook Authentication Middleware
 *
 * Checks for API key in headers:
 * - x-api-key: The API key for authentication
 * - x-webhook-signature: Optional HMAC signature for payload verification
 * - x-brand-id: Optional brand ID for brand-specific key validation
 */
export const webhookAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const signature = req.headers['x-webhook-signature'] as string;
    const brandId = req.headers['x-brand-id'] as string;

    // Check if API key is provided
    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'API key is required',
        error: 'Missing x-api-key header',
      });
      return;
    }

    // Check master key first (for testing/demo)
    // SECURITY: Master key only works if explicitly set (not in production without env var)
    if (MASTER_WEBHOOK_KEY && apiKey === MASTER_WEBHOOK_KEY) {
      console.log('🔑 [WEBHOOK] Authenticated with master key');
      (req as any).webhookAuth = {
        type: 'master',
        brandId: null,
      };
      next();
      return;
    }

    // If brand ID is provided, validate brand-specific key
    if (brandId) {
      const brand = await MallBrand.findById(brandId).select('webhookConfig name');

      if (!brand) {
        res.status(401).json({
          success: false,
          message: 'Invalid brand ID',
        });
        return;
      }

      const webhookConfig = (brand as any).webhookConfig;

      if (!webhookConfig || !webhookConfig.apiKey) {
        res.status(401).json({
          success: false,
          message: 'Brand does not have webhook configuration',
        });
        return;
      }

      // Validate API key
      if (apiKey !== webhookConfig.apiKey) {
        res.status(401).json({
          success: false,
          message: 'Invalid API key for this brand',
        });
        return;
      }

      // Validate signature if secret key is configured
      if (webhookConfig.secretKey && signature) {
        const isValidSignature = verifySignature(
          req.body,
          signature,
          webhookConfig.secretKey
        );

        if (!isValidSignature) {
          res.status(401).json({
            success: false,
            message: 'Invalid webhook signature',
          });
          return;
        }
      }

      console.log(`🔑 [WEBHOOK] Authenticated for brand: ${brand.name}`);
      (req as any).webhookAuth = {
        type: 'brand',
        brandId: brand._id,
        brandName: brand.name,
      };
      next();
      return;
    }

    // Generic API key validation (check against all brands)
    const brand = await MallBrand.findOne({
      'webhookConfig.apiKey': apiKey,
      isActive: true,
    }).select('name webhookConfig');

    if (brand) {
      const webhookConfig = (brand as any).webhookConfig;

      // Validate signature if secret key is configured
      if (webhookConfig.secretKey && signature) {
        const isValidSignature = verifySignature(
          req.body,
          signature,
          webhookConfig.secretKey
        );

        if (!isValidSignature) {
          res.status(401).json({
            success: false,
            message: 'Invalid webhook signature',
          });
          return;
        }
      }

      console.log(`🔑 [WEBHOOK] Authenticated for brand: ${brand.name}`);
      (req as any).webhookAuth = {
        type: 'brand',
        brandId: brand._id,
        brandName: brand.name,
      };
      next();
      return;
    }

    // No valid authentication found
    res.status(401).json({
      success: false,
      message: 'Invalid API key',
    });
  } catch (error) {
    console.error('❌ [WEBHOOK] Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Verify HMAC signature
 */
function verifySignature(
  payload: any,
  signature: string,
  secretKey: string
): boolean {
  try {
    const payloadString = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadString)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Rate limiting for webhooks (optional)
 * Tracks webhook calls per IP/brand to prevent abuse
 */
const webhookRateLimits = new Map<string, { count: number; resetAt: number }>();

export const webhookRateLimit = (
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}_${(req as any).webhookAuth?.brandId || 'unknown'}`;
    const now = Date.now();

    let record = webhookRateLimits.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      webhookRateLimits.set(key, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Too many webhook requests',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
};

/**
 * Demo/Test webhook auth (allows any request in development)
 * SECURITY: Demo routes are COMPLETELY BLOCKED in production
 */
export const demoWebhookAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // SECURITY: Block demo routes entirely in production
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({
      success: false,
      message: 'Not found',
    });
    return;
  }

  // In development/test, allow all requests to demo endpoints
  (req as any).webhookAuth = {
    type: 'demo',
    brandId: null,
  };
  next();
};

export default webhookAuth;
