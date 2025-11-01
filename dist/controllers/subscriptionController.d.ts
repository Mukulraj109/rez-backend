import { Request, Response } from 'express';
/**
 * Get all available subscription tiers
 * GET /api/subscriptions/tiers
 */
export declare const getSubscriptionTiers: (req: Request, res: Response) => Promise<void>;
/**
 * Get current user's subscription
 * GET /api/subscriptions/current
 */
export declare const getCurrentSubscription: (req: Request, res: Response) => Promise<any>;
/**
 * Subscribe to a tier
 * POST /api/subscriptions/subscribe
 */
export declare const subscribeToPlan: (req: Request, res: Response) => Promise<any>;
/**
 * Upgrade subscription tier
 * POST /api/subscriptions/upgrade
 */
export declare const upgradeSubscription: (req: Request, res: Response) => Promise<any>;
/**
 * Downgrade subscription tier
 * POST /api/subscriptions/downgrade
 */
export declare const downgradeSubscription: (req: Request, res: Response) => Promise<any>;
/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<any>;
/**
 * Renew/reactivate subscription
 * POST /api/subscriptions/renew
 */
export declare const renewSubscription: (req: Request, res: Response) => Promise<any>;
/**
 * Get subscription benefits
 * GET /api/subscriptions/benefits
 */
export declare const getSubscriptionBenefits: (req: Request, res: Response) => Promise<any>;
/**
 * Get subscription usage statistics
 * GET /api/subscriptions/usage
 */
export declare const getSubscriptionUsage: (req: Request, res: Response) => Promise<any>;
/**
 * Get value proposition for upgrading
 * GET /api/subscriptions/value-proposition/:tier
 */
export declare const getValueProposition: (req: Request, res: Response) => Promise<any>;
/**
 * Handle Razorpay webhook with comprehensive security
 * POST /api/subscriptions/webhook
 *
 * Security features:
 * - IP whitelisting (Razorpay IP ranges only)
 * - Signature verification
 * - Event deduplication (replay attack prevention)
 * - Timestamp validation
 * - Rate limiting
 * - Comprehensive audit logging
 * - Alert on violations
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<any>;
/**
 * Toggle auto-renewal
 * PATCH /api/subscriptions/auto-renew
 */
export declare const toggleAutoRenew: (req: Request, res: Response) => Promise<any>;
/**
 * Validate promo code
 * POST /api/subscriptions/validate-promo
 */
export declare const validatePromoCode: (req: Request, res: Response) => Promise<any>;
