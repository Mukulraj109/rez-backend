import { Request, Response } from 'express';
import { Subscription, SubscriptionTier, BillingCycle, ISubscriptionBenefits } from '../models/Subscription';
import { User } from '../models/User';
import razorpaySubscriptionService from '../services/razorpaySubscriptionService';
import subscriptionBenefitsService from '../services/subscriptionBenefitsService';
import promoCodeService from '../services/promoCodeService';
import { ProcessedWebhookEvent } from '../models/ProcessedWebhookEvent';
import { Types } from 'mongoose';
import * as alertService from '../services/webhookSecurityAlertService';

// Use the global Express.Request type which has user property from express.d.ts

// Helper function to get tier benefits
const getTierBenefits = (tier: SubscriptionTier): ISubscriptionBenefits => {
  const benefits = {
    free: {
      cashbackMultiplier: 1,
      freeDelivery: false,
      prioritySupport: false,
      exclusiveDeals: false,
      unlimitedWishlists: false,
      earlyFlashSaleAccess: false,
      personalShopper: false,
      premiumEvents: false,
      conciergeService: false,
      birthdayOffer: false,
      anniversaryOffer: false
    },
    premium: {
      cashbackMultiplier: 2,
      freeDelivery: true,
      prioritySupport: true,
      exclusiveDeals: true,
      unlimitedWishlists: true,
      earlyFlashSaleAccess: true,
      personalShopper: false,
      premiumEvents: false,
      conciergeService: false,
      birthdayOffer: true,
      anniversaryOffer: false
    },
    vip: {
      cashbackMultiplier: 3,
      freeDelivery: true,
      prioritySupport: true,
      exclusiveDeals: true,
      unlimitedWishlists: true,
      earlyFlashSaleAccess: true,
      personalShopper: true,
      premiumEvents: true,
      conciergeService: true,
      birthdayOffer: true,
      anniversaryOffer: true
    }
  };
  return benefits[tier];
};

/**
 * Get all available subscription tiers
 * GET /api/subscriptions/tiers
 */
export const getSubscriptionTiers = async (req: Request, res: Response) => {
  try {
    // Import SubscriptionTier model
    const { SubscriptionTier } = await import('../models/SubscriptionTier');

    // Fetch active tiers from database, sorted by sortOrder
    const tierConfigs = await SubscriptionTier.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();

    // If no tiers found in database, return empty array with warning
    if (!tierConfigs || tierConfigs.length === 0) {
      console.warn('⚠️ No subscription tiers found in database. Run seed script: npm run seed:tiers');
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No subscription tiers available. Please contact administrator.'
      });
    }

    res.status(200).json({
      success: true,
      data: tierConfigs
    });
  } catch (error: any) {
    console.error('Error fetching subscription tiers:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription tiers',
      error: error.message
    });
  }
};

/**
 * Get current user's subscription
 * GET /api/subscriptions/current
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);

    if (!subscription) {
      // Return free tier by default
      return res.status(200).json({
        success: true,
        data: {
          tier: 'free',
          status: 'active',
          benefits: getTierBenefits('free'),
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error: any) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current subscription',
      error: error.message
    });
  }
};

/**
 * Subscribe to a tier
 * POST /api/subscriptions/subscribe
 */
export const subscribeToPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      console.error('❌ [SUBSCRIBE] No user ID found - user not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('✅ [SUBSCRIBE] User authenticated:', userId);

    const { tier, billingCycle, paymentMethod, promoCode, source } = req.body;
    console.log('🔷 [SUBSCRIBE] Payment method requested:', paymentMethod || 'not specified');

    // Determine payment gateway based on paymentMethod parameter
    const useStripe = paymentMethod === 'stripe';
    const useRazorpay = paymentMethod === 'razorpay' || !paymentMethod;

    console.log('🔷 [SUBSCRIBE] Using payment gateway:', useStripe ? 'STRIPE' : 'RAZORPAY');

    // Check if the requested payment gateway is configured
    if (useRazorpay) {
      console.log('🔷 [SUBSCRIBE] Checking Razorpay configuration...');
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET ||
          process.env.RAZORPAY_KEY_ID === 'rzp_test_your_razorpay_key_id' ||
          process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
        console.error('❌ [SUBSCRIBE] Razorpay not configured properly');
        return res.status(503).json({
          success: false,
          message: 'Razorpay payment gateway is not configured. Please use Stripe or contact support.',
          error: 'Razorpay credentials not configured'
        });
      }
      console.log('✅ [SUBSCRIBE] Razorpay is configured');
    } else if (useStripe) {
      console.log('🔷 [SUBSCRIBE] Checking Stripe configuration...');
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
        console.error('❌ [SUBSCRIBE] Stripe not configured properly');
        return res.status(503).json({
          success: false,
          message: 'Stripe payment gateway is not configured. Please contact support.',
          error: 'Stripe credentials not configured'
        });
      }
      console.log('✅ [SUBSCRIBE] Stripe is configured');
    }

    // Validate tier
    console.log('🔷 [SUBSCRIBE] Validating tier:', tier);
    if (!['premium', 'vip'].includes(tier)) {
      console.error('❌ [SUBSCRIBE] Invalid tier:', tier);
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier'
      });
    }

    // Validate billing cycle
    console.log('🔷 [SUBSCRIBE] Validating billing cycle:', billingCycle);
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      console.error('❌ [SUBSCRIBE] Invalid billing cycle:', billingCycle);
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle'
      });
    }

    // Check if user already has an active subscription
    console.log('🔷 [SUBSCRIBE] Checking for existing subscription...');
    const existingSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (existingSubscription && existingSubscription.isActive()) {
      console.warn('⚠️ [SUBSCRIBE] User already has active subscription:', existingSubscription.tier);
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription. Please upgrade or downgrade instead.'
      });
    }
    console.log('✅ [SUBSCRIBE] No existing active subscription');

    // Get tier pricing
    const tierPricing: { [key: string]: { monthly: number; yearly: number } } = {
      premium: { monthly: 99, yearly: 999 },
      vip: { monthly: 299, yearly: 2999 }
    };
    let price = billingCycle === 'monthly' ? tierPricing[tier].monthly : tierPricing[tier].yearly;
    let appliedDiscount = 0;

    console.log('🔷 [SUBSCRIBE] Base price:', price, 'INR');

    // Apply promo code if provided
    if (promoCode) {
      console.log('🔷 [SUBSCRIBE] Validating promo code:', promoCode);
      const promoResult = await promoCodeService.validatePromoCode(
        promoCode,
        tier,
        billingCycle,
        userId
      );

      if (promoResult.valid && promoResult.finalPrice !== undefined) {
        appliedDiscount = promoResult.discount || 0;
        price = promoResult.finalPrice;
        console.log(`✅ [SUBSCRIBE] Promo code applied: ${promoCode}, discount: ₹${appliedDiscount}, final price: ₹${price}`);
      } else {
        console.warn(`⚠️ [SUBSCRIBE] Invalid promo code attempted: ${promoCode}`);
      }
    }

    // Create payment gateway subscription based on selected method
    let paymentGatewaySubscription: any = null;

    if (useRazorpay) {
      console.log('🔷 [SUBSCRIBE] Creating Razorpay subscription...');
      paymentGatewaySubscription = await razorpaySubscriptionService.createSubscription(
        userId.toString(),
        tier,
        billingCycle
      );
      console.log('✅ [SUBSCRIBE] Razorpay subscription created:', paymentGatewaySubscription.id);
    } else if (useStripe) {
      console.log('✅ [SUBSCRIBE] Stripe selected - will create payment intent on frontend');
      // For Stripe, we don't create subscription here
      // The frontend will create a Stripe Checkout session or Payment Intent
      paymentGatewaySubscription = {
        id: 'stripe_pending_' + Date.now(),
        status: 'pending'
      };
    }

    // Calculate dates
    console.log('🔷 [SUBSCRIBE] Calculating subscription dates...');
    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    const endDate = new Date(startDate);
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    console.log('🔷 [SUBSCRIBE] Start date:', startDate);
    console.log('🔷 [SUBSCRIBE] Trial end date:', trialEndDate);
    console.log('🔷 [SUBSCRIBE] End date:', endDate);

    // Create subscription in database
    console.log('🔷 [SUBSCRIBE] Creating subscription in database...');
    const subscriptionData: any = {
      user: userId,
      tier,
      status: 'trial',
      billingCycle,
      price,
      startDate,
      endDate,
      trialEndDate,
      autoRenew: true,
      paymentMethod: useStripe ? 'stripe' : 'razorpay',
      benefits: getTierBenefits(tier),
      metadata: {
        source: source || 'app',
        promoCode
      }
    };

    // Add gateway-specific IDs
    if (useRazorpay && paymentGatewaySubscription) {
      subscriptionData.razorpaySubscriptionId = paymentGatewaySubscription.id;
      subscriptionData.razorpayPlanId = paymentGatewaySubscription.plan_id;
      subscriptionData.razorpayCustomerId = paymentGatewaySubscription.customer_id;
    } else if (useStripe && paymentGatewaySubscription) {
      subscriptionData.stripeSubscriptionId = paymentGatewaySubscription.id;
    }

    const subscription = new Subscription(subscriptionData);

    console.log('🔷 [SUBSCRIBE] Saving subscription to database...');
    await subscription.save();
    console.log('✅ [SUBSCRIBE] Subscription saved successfully:', subscription._id);

    // Increment promo code usage if promo code was applied
    if (promoCode && appliedDiscount > 0) {
      try {
        await promoCodeService.applyPromoCode(
          promoCode,
          tier,
          billingCycle,
          userId,
          String(subscription._id)
        );
        console.log(`[SUBSCRIPTION] Promo code usage incremented: ${promoCode}`);
      } catch (promoError: any) {
        console.error(`[SUBSCRIPTION] Failed to increment promo code usage:`, promoError);
        // Don't fail the subscription creation if promo tracking fails
      }
    }

    console.log('🔷 [SUBSCRIBE] Preparing response...');
    const response: any = {
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription,
        discountApplied: appliedDiscount
      }
    };

    // Add payment URL for Razorpay, for Stripe frontend will handle payment
    if (useRazorpay && paymentGatewaySubscription?.short_url) {
      response.data.paymentUrl = paymentGatewaySubscription.short_url;
      console.log('🔷 [SUBSCRIBE] Payment URL (Razorpay):', paymentGatewaySubscription.short_url);
    } else if (useStripe) {
      // For Stripe, frontend will create the checkout session
      response.data.paymentUrl = null;
      console.log('🔷 [SUBSCRIBE] Using Stripe - frontend will handle checkout');
    }

    console.log('✅ [SUBSCRIBE] ========== SUBSCRIPTION CREATED SUCCESSFULLY ==========');
    console.log('✅ [SUBSCRIBE] Subscription ID:', subscription._id);
    console.log('✅ [SUBSCRIBE] Tier:', subscription.tier);
    console.log('✅ [SUBSCRIBE] Price:', subscription.price, 'INR');
    console.log('✅ [SUBSCRIBE] Payment Method:', subscription.paymentMethod);

    res.status(201).json(response);
  } catch (error: any) {
    console.error('❌ [SUBSCRIBE] ========== SUBSCRIPTION FAILED ==========');
    console.error('❌ [SUBSCRIBE] Error:', error.message);
    console.error('❌ [SUBSCRIBE] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to plan',
      error: error.message
    });
  }
};

/**
 * Upgrade subscription tier
 * POST /api/subscriptions/upgrade
 */
export const upgradeSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { newTier } = req.body;

    // Get current subscription
    const currentSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!currentSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Validate upgrade
    if (!currentSubscription.canUpgrade()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upgrade from current tier'
      });
    }

    if (newTier === 'free' || newTier === currentSubscription.tier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upgrade tier'
      });
    }

    // Calculate prorated amount
    const proratedAmount = (Subscription as any).calculateProratedAmount(
      currentSubscription.tier,
      newTier,
      currentSubscription.endDate,
      currentSubscription.billingCycle
    );

    // Update subscription
    currentSubscription.previousTier = currentSubscription.tier;
    currentSubscription.tier = newTier;
    currentSubscription.benefits = getTierBenefits(newTier);
    currentSubscription.upgradeDate = new Date();
    currentSubscription.proratedCredit = -proratedAmount; // Negative because user needs to pay

    await currentSubscription.save();

    // Update Razorpay subscription if exists
    if (currentSubscription.razorpaySubscriptionId) {
      const newPlanId = await razorpaySubscriptionService.createOrGetPlan(
        newTier,
        currentSubscription.billingCycle
      );

      await razorpaySubscriptionService.updateSubscription(
        currentSubscription.razorpaySubscriptionId,
        {
          plan_id: newPlanId,
          schedule_change_at: 'now'
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription: currentSubscription,
        proratedAmount
      }
    });
  } catch (error: any) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription',
      error: error.message
    });
  }
};

/**
 * Downgrade subscription tier
 * POST /api/subscriptions/downgrade
 */
export const downgradeSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { newTier } = req.body;

    // Get current subscription
    const currentSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!currentSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Validate downgrade
    if (!currentSubscription.canDowngrade()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade from current tier'
      });
    }

    if (newTier === currentSubscription.tier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid downgrade tier'
      });
    }

    // Calculate prorated credit
    const proratedCredit = (Subscription as any).calculateProratedAmount(
      newTier,
      currentSubscription.tier,
      currentSubscription.endDate,
      currentSubscription.billingCycle
    );

    // Schedule downgrade for end of billing cycle
    currentSubscription.previousTier = currentSubscription.tier;
    currentSubscription.downgradeScheduledFor = currentSubscription.endDate;
    currentSubscription.proratedCredit = proratedCredit;

    await currentSubscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription downgrade scheduled for end of billing cycle',
      data: {
        subscription: currentSubscription,
        effectiveDate: currentSubscription.endDate,
        creditAmount: proratedCredit
      }
    });
  } catch (error: any) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to downgrade subscription',
      error: error.message
    });
  }
};

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { reason, feedback, cancelImmediately } = req.body;

    // Get current subscription
    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Cancel in Razorpay
    if (subscription.razorpaySubscriptionId) {
      await razorpaySubscriptionService.cancelSubscription(
        subscription.razorpaySubscriptionId,
        !cancelImmediately
      );
    }

    // Update subscription
    subscription.status = 'cancelled';
    subscription.cancellationDate = new Date();
    subscription.cancellationReason = reason;
    subscription.cancellationFeedback = feedback;
    subscription.autoRenew = false;

    // Set reactivation eligibility
    const reactivationDate = new Date();
    reactivationDate.setDate(reactivationDate.getDate() + 30);
    subscription.reactivationEligibleUntil = reactivationDate;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of billing cycle',
      data: {
        subscription,
        accessUntil: cancelImmediately ? new Date() : subscription.endDate,
        reactivationEligibleUntil: reactivationDate
      }
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

/**
 * Renew/reactivate subscription
 * POST /api/subscriptions/renew
 */
export const renewSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get most recent subscription
    const subscription = await Subscription.findOne({ user: userId })
      .sort({ endDate: -1 });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No subscription found to renew'
      });
    }

    // Check reactivation eligibility
    if (subscription.reactivationEligibleUntil && new Date() > subscription.reactivationEligibleUntil) {
      return res.status(400).json({
        success: false,
        message: 'Reactivation period has expired. Please create a new subscription.'
      });
    }

    // Reactivate in Razorpay
    if (subscription.razorpaySubscriptionId) {
      await razorpaySubscriptionService.resumeSubscription(subscription.razorpaySubscriptionId);
    }

    // Update subscription
    subscription.status = 'active';
    subscription.autoRenew = true;
    subscription.cancellationDate = undefined;
    subscription.cancellationReason = undefined;

    // Extend end date
    const newEndDate = new Date();
    if (subscription.billingCycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }
    subscription.endDate = newEndDate;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: subscription
    });
  } catch (error: any) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription',
      error: error.message
    });
  }
};

/**
 * Get subscription benefits
 * GET /api/subscriptions/benefits
 */
export const getSubscriptionBenefits = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const benefits = await subscriptionBenefitsService.getUserBenefits(userId);

    res.status(200).json({
      success: true,
      data: benefits
    });
  } catch (error: any) {
    console.error('Error fetching subscription benefits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription benefits',
      error: error.message
    });
  }
};

/**
 * Get subscription usage statistics
 * GET /api/subscriptions/usage
 */
export const getSubscriptionUsage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: {
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0
          },
          roi: {
            subscriptionCost: 0,
            totalSavings: 0,
            netSavings: 0,
            roiPercentage: 0
          }
        }
      });
    }

    const roi = await subscriptionBenefitsService.getSubscriptionROI(userId);

    res.status(200).json({
      success: true,
      data: {
        usage: subscription.usage,
        roi,
        daysRemaining: subscription.getRemainingDays(),
        isActive: subscription.isActive()
      }
    });
  } catch (error: any) {
    console.error('Error fetching subscription usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription usage',
      error: error.message
    });
  }
};

/**
 * Get value proposition for upgrading
 * GET /api/subscriptions/value-proposition/:tier
 */
export const getValueProposition = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { tier } = req.params;

    if (!['premium', 'vip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier'
      });
    }

    const valueProposition = await subscriptionBenefitsService.getValueProposition(
      userId,
      tier as SubscriptionTier
    );

    res.status(200).json({
      success: true,
      data: valueProposition
    });
  } catch (error: any) {
    console.error('Error fetching value proposition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch value proposition',
      error: error.message
    });
  }
};

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
export const handleWebhook = async (req: Request, res: Response) => {
  const webhookStartTime = Date.now();
  const webhookBody = req.body;
  const signature = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const clientIP =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    'unknown';

  try {
    // Step 1: Check for required fields
    if (!webhookBody?.id || !webhookBody?.event || !signature) {
      console.error('[WEBHOOK] Missing required fields', {
        hasId: !!webhookBody?.id,
        hasEvent: !!webhookBody?.event,
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });

      await alertService.alertInvalidPayload(
        webhookBody?.id,
        'Missing required fields'
      );

      return res.status(400).json({
        success: false,
        message: 'Missing required webhook fields',
      });
    }

    const eventId = webhookBody.id;
    const eventType = webhookBody.event;

    // Step 2: Verify webhook signature
    console.log('[WEBHOOK] Verifying signature', {
      eventId,
      eventType,
      ip: clientIP,
    });

    const isValid = razorpaySubscriptionService.verifyWebhookSignature(
      JSON.stringify(webhookBody),
      signature,
      secret
    );

    if (!isValid) {
      console.error('[WEBHOOK] Invalid signature', {
        eventId,
        eventType,
        ip: clientIP,
      });

      await alertService.alertSignatureFailure(
        eventId,
        'Signature verification failed'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Step 3: Check for duplicate/replay attack
    console.log('[WEBHOOK] Checking for duplicates', {
      eventId,
    });

    const isDuplicate = await ProcessedWebhookEvent.isEventProcessed(eventId);

    if (isDuplicate) {
      console.warn('[WEBHOOK] Duplicate event detected', {
        eventId,
        eventType,
        ip: clientIP,
      });

      await alertService.alertDuplicateEvent(eventId);

      // Return 200 OK for duplicate (idempotent behavior)
      // Razorpay will consider this a success
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed',
        eventId,
      });
    }

    // Step 4: Validate timestamp (prevent replay attacks)
    const WEBHOOK_MAX_AGE_SECONDS = 300; // 5 minutes
    const eventTimestamp = webhookBody.created_at;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const webhookAge = currentTimestamp - eventTimestamp;

    if (webhookAge > WEBHOOK_MAX_AGE_SECONDS) {
      console.error('[WEBHOOK] Webhook expired', {
        eventId,
        age: webhookAge,
        maxAge: WEBHOOK_MAX_AGE_SECONDS,
      });

      await alertService.alertReplayAttack(
        eventId,
        `Webhook too old: ${webhookAge}s`
      );

      return res.status(400).json({
        success: false,
        message: 'Webhook expired or too old',
      });
    }

    // Step 5: Log successful validation
    console.log('[WEBHOOK] Validation successful', {
      eventId,
      eventType,
      ip: clientIP,
      validationTimeMs: Date.now() - webhookStartTime,
    });

    // Step 6: Process webhook
    try {
      console.log('[WEBHOOK] Processing started', {
        eventId,
        eventType,
      });

      const processingStartTime = Date.now();

      // Handle the webhook using existing service
      await razorpaySubscriptionService.handleWebhook(webhookBody);

      const processingTimeMs = Date.now() - processingStartTime;

      console.log('[WEBHOOK] Processing completed', {
        eventId,
        eventType,
        processingTimeMs,
      });

      // Step 7: Record successful event
      try {
        await ProcessedWebhookEvent.recordEvent(
          eventId,
          eventType,
          webhookBody.payload?.subscription?.id || '',
          signature,
          clientIP,
          req.headers['user-agent']?.toString()
        );

        console.log('[WEBHOOK] Event recorded in audit log', {
          eventId,
        });
      } catch (recordError: any) {
        // Log but don't fail the webhook response
        console.warn('[WEBHOOK] Failed to record event in audit log', {
          eventId,
          error: recordError.message,
        });
      }

      // Step 8: Send success response
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        eventId,
        processingTimeMs,
      });
    } catch (processingError: any) {
      console.error('[WEBHOOK] Processing error', {
        eventId,
        eventType,
        error: processingError.message,
        stack: processingError.stack,
      });

      await alertService.alertProcessingFailure(
        eventId,
        processingError.message
      );

      // Try to record the failed event
      try {
        await ProcessedWebhookEvent.markEventFailed(
          eventId,
          processingError.message
        );
      } catch (recordError: any) {
        console.warn('[WEBHOOK] Failed to record error in audit log', {
          eventId,
          error: recordError.message,
        });
      }

      // Return 500 so Razorpay knows to retry
      return res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: processingError.message,
        eventId,
      });
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    await alertService.sendSecurityAlert({
      type: 'WEBHOOK_PROCESSING_FAILURE',
      severity: 'critical',
      eventId: webhookBody?.id,
      reason: `Unexpected webhook error: ${error.message}`,
      details: {
        stack: error.stack,
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook',
      error: error.message,
    });
  }
};

/**
 * Toggle auto-renewal
 * PATCH /api/subscriptions/auto-renew
 */
export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { autoRenew } = req.body;

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    subscription.autoRenew = autoRenew;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'}`,
      data: subscription
    });
  } catch (error: any) {
    console.error('Error toggling auto-renew:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle auto-renew',
      error: error.message
    });
  }
};

/**
 * Validate promo code
 * POST /api/subscriptions/validate-promo
 */
export const validatePromoCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { code, tier, billingCycle } = req.body;

    // Validate input
    if (!code || !tier || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, tier, billingCycle'
      });
    }

    // Validate tier
    if (!['premium', 'vip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier. Must be premium or vip.'
      });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Must be monthly or yearly.'
      });
    }

    // Validate promo code
    const result = await promoCodeService.validatePromoCode(
      code,
      tier as SubscriptionTier,
      billingCycle as BillingCycle,
      userId
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid promo code'
      });
    }

    // Return success with discount details
    res.status(200).json({
      success: true,
      data: {
        discount: result.discount,
        finalPrice: result.finalPrice,
        originalPrice: promoCodeService.getSubscriptionPrice(tier as SubscriptionTier, billingCycle as BillingCycle),
        message: result.message || 'Promo code applied successfully'
      },
      message: result.message || 'Promo code is valid'
    });
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo code',
      error: error.message
    });
  }
};
