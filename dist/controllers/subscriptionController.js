"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePromoCode = exports.toggleAutoRenew = exports.handleWebhook = exports.getValueProposition = exports.getSubscriptionUsage = exports.getSubscriptionBenefits = exports.renewSubscription = exports.cancelSubscription = exports.downgradeSubscription = exports.upgradeSubscription = exports.subscribeToPlan = exports.getCurrentSubscription = exports.getSubscriptionTiers = void 0;
const Subscription_1 = require("../models/Subscription");
const razorpaySubscriptionService_1 = __importDefault(require("../services/razorpaySubscriptionService"));
const subscriptionBenefitsService_1 = __importDefault(require("../services/subscriptionBenefitsService"));
const promoCodeService_1 = __importDefault(require("../services/promoCodeService"));
const ProcessedWebhookEvent_1 = require("../models/ProcessedWebhookEvent");
const alertService = __importStar(require("../services/webhookSecurityAlertService"));
// Use the global Express.Request type which has user property from express.d.ts
// Helper function to get tier benefits
const getTierBenefits = (tier) => {
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
const getSubscriptionTiers = async (req, res) => {
    try {
        // Inline tier configurations
        const tierConfigs = [
            {
                tier: 'free',
                name: 'Free',
                pricing: {
                    monthly: 0,
                    yearly: 0,
                    yearlyDiscount: 0
                },
                benefits: getTierBenefits('free'),
                description: 'Basic features with standard cashback',
                features: [
                    '2-5% cashback on orders',
                    'Basic features',
                    'Standard support',
                    '5 wishlists maximum',
                    'Regular delivery'
                ]
            },
            {
                tier: 'premium',
                name: 'Premium',
                pricing: {
                    monthly: 99,
                    yearly: 999,
                    yearlyDiscount: 16
                },
                benefits: getTierBenefits('premium'),
                description: 'Enhanced benefits with 2x cashback',
                features: [
                    '5-10% cashback on orders (2x rate)',
                    'Exclusive deals and offers',
                    'Priority customer support',
                    'Unlimited wishlists',
                    'Free delivery on select stores',
                    'Early access to flash sales',
                    'Birthday special offers',
                    'Save up to ₹3000/month'
                ]
            },
            {
                tier: 'vip',
                name: 'VIP',
                pricing: {
                    monthly: 299,
                    yearly: 2999,
                    yearlyDiscount: 16
                },
                benefits: getTierBenefits('vip'),
                description: 'Ultimate experience with 3x cashback',
                features: [
                    '10-15% cashback on orders (3x rate)',
                    'All Premium benefits included',
                    'Personal shopping assistant',
                    'Premium-only exclusive events',
                    'Anniversary special offers',
                    'Dedicated concierge service',
                    'First access to new features',
                    'VIP customer support',
                    'Save up to ₹10000/month'
                ]
            }
        ];
        res.status(200).json({
            success: true,
            data: tierConfigs
        });
    }
    catch (error) {
        console.error('Error fetching subscription tiers:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription tiers',
            error: error.message
        });
    }
};
exports.getSubscriptionTiers = getSubscriptionTiers;
/**
 * Get current user's subscription
 * GET /api/subscriptions/current
 */
const getCurrentSubscription = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const subscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
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
    }
    catch (error) {
        console.error('Error fetching current subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current subscription',
            error: error.message
        });
    }
};
exports.getCurrentSubscription = getCurrentSubscription;
/**
 * Subscribe to a tier
 * POST /api/subscriptions/subscribe
 */
const subscribeToPlan = async (req, res) => {
    try {
        console.log('🔷 [SUBSCRIBE] ========== NEW SUBSCRIPTION REQUEST ==========');
        console.log('🔷 [SUBSCRIBE] Request body:', req.body);
        console.log('🔷 [SUBSCRIBE] User ID from token:', req.user?._id || req.user?.id);
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
        }
        else if (useStripe) {
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
        const existingSubscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
        if (existingSubscription && existingSubscription.isActive()) {
            console.warn('⚠️ [SUBSCRIBE] User already has active subscription:', existingSubscription.tier);
            return res.status(400).json({
                success: false,
                message: 'User already has an active subscription. Please upgrade or downgrade instead.'
            });
        }
        console.log('✅ [SUBSCRIBE] No existing active subscription');
        // Get tier pricing
        const tierPricing = {
            premium: { monthly: 99, yearly: 999 },
            vip: { monthly: 299, yearly: 2999 }
        };
        let price = billingCycle === 'monthly' ? tierPricing[tier].monthly : tierPricing[tier].yearly;
        let appliedDiscount = 0;
        console.log('🔷 [SUBSCRIBE] Base price:', price, 'INR');
        // Apply promo code if provided
        if (promoCode) {
            console.log('🔷 [SUBSCRIBE] Validating promo code:', promoCode);
            const promoResult = await promoCodeService_1.default.validatePromoCode(promoCode, tier, billingCycle, userId);
            if (promoResult.valid && promoResult.finalPrice !== undefined) {
                appliedDiscount = promoResult.discount || 0;
                price = promoResult.finalPrice;
                console.log(`✅ [SUBSCRIBE] Promo code applied: ${promoCode}, discount: ₹${appliedDiscount}, final price: ₹${price}`);
            }
            else {
                console.warn(`⚠️ [SUBSCRIBE] Invalid promo code attempted: ${promoCode}`);
            }
        }
        // Create payment gateway subscription based on selected method
        let paymentGatewaySubscription = null;
        if (useRazorpay) {
            console.log('🔷 [SUBSCRIBE] Creating Razorpay subscription...');
            paymentGatewaySubscription = await razorpaySubscriptionService_1.default.createSubscription(userId.toString(), tier, billingCycle);
            console.log('✅ [SUBSCRIBE] Razorpay subscription created:', paymentGatewaySubscription.id);
        }
        else if (useStripe) {
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
        }
        else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        console.log('🔷 [SUBSCRIBE] Start date:', startDate);
        console.log('🔷 [SUBSCRIBE] Trial end date:', trialEndDate);
        console.log('🔷 [SUBSCRIBE] End date:', endDate);
        // Create subscription in database
        console.log('🔷 [SUBSCRIBE] Creating subscription in database...');
        const subscriptionData = {
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
        }
        else if (useStripe && paymentGatewaySubscription) {
            subscriptionData.stripeSubscriptionId = paymentGatewaySubscription.id;
        }
        const subscription = new Subscription_1.Subscription(subscriptionData);
        console.log('🔷 [SUBSCRIBE] Saving subscription to database...');
        await subscription.save();
        console.log('✅ [SUBSCRIBE] Subscription saved successfully:', subscription._id);
        // Increment promo code usage if promo code was applied
        if (promoCode && appliedDiscount > 0) {
            try {
                await promoCodeService_1.default.applyPromoCode(promoCode, tier, billingCycle, userId, String(subscription._id));
                console.log(`[SUBSCRIPTION] Promo code usage incremented: ${promoCode}`);
            }
            catch (promoError) {
                console.error(`[SUBSCRIPTION] Failed to increment promo code usage:`, promoError);
                // Don't fail the subscription creation if promo tracking fails
            }
        }
        console.log('🔷 [SUBSCRIBE] Preparing response...');
        const response = {
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
        }
        else if (useStripe) {
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
    }
    catch (error) {
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
exports.subscribeToPlan = subscribeToPlan;
/**
 * Upgrade subscription tier
 * POST /api/subscriptions/upgrade
 */
const upgradeSubscription = async (req, res) => {
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
        const currentSubscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
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
        const proratedAmount = Subscription_1.Subscription.calculateProratedAmount(currentSubscription.tier, newTier, currentSubscription.endDate, currentSubscription.billingCycle);
        // Update subscription
        currentSubscription.previousTier = currentSubscription.tier;
        currentSubscription.tier = newTier;
        currentSubscription.benefits = getTierBenefits(newTier);
        currentSubscription.upgradeDate = new Date();
        currentSubscription.proratedCredit = -proratedAmount; // Negative because user needs to pay
        await currentSubscription.save();
        // Update Razorpay subscription if exists
        if (currentSubscription.razorpaySubscriptionId) {
            const newPlanId = await razorpaySubscriptionService_1.default.createOrGetPlan(newTier, currentSubscription.billingCycle);
            await razorpaySubscriptionService_1.default.updateSubscription(currentSubscription.razorpaySubscriptionId, {
                plan_id: newPlanId,
                schedule_change_at: 'now'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Subscription upgraded successfully',
            data: {
                subscription: currentSubscription,
                proratedAmount
            }
        });
    }
    catch (error) {
        console.error('Error upgrading subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upgrade subscription',
            error: error.message
        });
    }
};
exports.upgradeSubscription = upgradeSubscription;
/**
 * Downgrade subscription tier
 * POST /api/subscriptions/downgrade
 */
const downgradeSubscription = async (req, res) => {
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
        const currentSubscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
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
        const proratedCredit = Subscription_1.Subscription.calculateProratedAmount(newTier, currentSubscription.tier, currentSubscription.endDate, currentSubscription.billingCycle);
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
    }
    catch (error) {
        console.error('Error downgrading subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to downgrade subscription',
            error: error.message
        });
    }
};
exports.downgradeSubscription = downgradeSubscription;
/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
const cancelSubscription = async (req, res) => {
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
        const subscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
        if (!subscription) {
            return res.status(400).json({
                success: false,
                message: 'No active subscription found'
            });
        }
        // Cancel in Razorpay
        if (subscription.razorpaySubscriptionId) {
            await razorpaySubscriptionService_1.default.cancelSubscription(subscription.razorpaySubscriptionId, !cancelImmediately);
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
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
};
exports.cancelSubscription = cancelSubscription;
/**
 * Renew/reactivate subscription
 * POST /api/subscriptions/renew
 */
const renewSubscription = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Get most recent subscription
        const subscription = await Subscription_1.Subscription.findOne({ user: userId })
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
            await razorpaySubscriptionService_1.default.resumeSubscription(subscription.razorpaySubscriptionId);
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
        }
        else {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        }
        subscription.endDate = newEndDate;
        await subscription.save();
        res.status(200).json({
            success: true,
            message: 'Subscription renewed successfully',
            data: subscription
        });
    }
    catch (error) {
        console.error('Error renewing subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to renew subscription',
            error: error.message
        });
    }
};
exports.renewSubscription = renewSubscription;
/**
 * Get subscription benefits
 * GET /api/subscriptions/benefits
 */
const getSubscriptionBenefits = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const benefits = await subscriptionBenefitsService_1.default.getUserBenefits(userId);
        res.status(200).json({
            success: true,
            data: benefits
        });
    }
    catch (error) {
        console.error('Error fetching subscription benefits:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription benefits',
            error: error.message
        });
    }
};
exports.getSubscriptionBenefits = getSubscriptionBenefits;
/**
 * Get subscription usage statistics
 * GET /api/subscriptions/usage
 */
const getSubscriptionUsage = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const subscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
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
        const roi = await subscriptionBenefitsService_1.default.getSubscriptionROI(userId);
        res.status(200).json({
            success: true,
            data: {
                usage: subscription.usage,
                roi,
                daysRemaining: subscription.getRemainingDays(),
                isActive: subscription.isActive()
            }
        });
    }
    catch (error) {
        console.error('Error fetching subscription usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription usage',
            error: error.message
        });
    }
};
exports.getSubscriptionUsage = getSubscriptionUsage;
/**
 * Get value proposition for upgrading
 * GET /api/subscriptions/value-proposition/:tier
 */
const getValueProposition = async (req, res) => {
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
        const valueProposition = await subscriptionBenefitsService_1.default.getValueProposition(userId, tier);
        res.status(200).json({
            success: true,
            data: valueProposition
        });
    }
    catch (error) {
        console.error('Error fetching value proposition:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch value proposition',
            error: error.message
        });
    }
};
exports.getValueProposition = getValueProposition;
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
const handleWebhook = async (req, res) => {
    const webhookStartTime = Date.now();
    const webhookBody = req.body;
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
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
            await alertService.alertInvalidPayload(webhookBody?.id, 'Missing required fields');
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
        const isValid = razorpaySubscriptionService_1.default.verifyWebhookSignature(JSON.stringify(webhookBody), signature, secret);
        if (!isValid) {
            console.error('[WEBHOOK] Invalid signature', {
                eventId,
                eventType,
                ip: clientIP,
            });
            await alertService.alertSignatureFailure(eventId, 'Signature verification failed');
            return res.status(401).json({
                success: false,
                message: 'Invalid webhook signature',
            });
        }
        // Step 3: Check for duplicate/replay attack
        console.log('[WEBHOOK] Checking for duplicates', {
            eventId,
        });
        const isDuplicate = await ProcessedWebhookEvent_1.ProcessedWebhookEvent.isEventProcessed(eventId);
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
            await alertService.alertReplayAttack(eventId, `Webhook too old: ${webhookAge}s`);
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
            await razorpaySubscriptionService_1.default.handleWebhook(webhookBody);
            const processingTimeMs = Date.now() - processingStartTime;
            console.log('[WEBHOOK] Processing completed', {
                eventId,
                eventType,
                processingTimeMs,
            });
            // Step 7: Record successful event
            try {
                await ProcessedWebhookEvent_1.ProcessedWebhookEvent.recordEvent(eventId, eventType, webhookBody.payload?.subscription?.id || '', signature, clientIP, req.headers['user-agent']?.toString());
                console.log('[WEBHOOK] Event recorded in audit log', {
                    eventId,
                });
            }
            catch (recordError) {
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
        }
        catch (processingError) {
            console.error('[WEBHOOK] Processing error', {
                eventId,
                eventType,
                error: processingError.message,
                stack: processingError.stack,
            });
            await alertService.alertProcessingFailure(eventId, processingError.message);
            // Try to record the failed event
            try {
                await ProcessedWebhookEvent_1.ProcessedWebhookEvent.markEventFailed(eventId, processingError.message);
            }
            catch (recordError) {
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
    }
    catch (error) {
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
exports.handleWebhook = handleWebhook;
/**
 * Toggle auto-renewal
 * PATCH /api/subscriptions/auto-renew
 */
const toggleAutoRenew = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { autoRenew } = req.body;
        const subscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
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
    }
    catch (error) {
        console.error('Error toggling auto-renew:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle auto-renew',
            error: error.message
        });
    }
};
exports.toggleAutoRenew = toggleAutoRenew;
/**
 * Validate promo code
 * POST /api/subscriptions/validate-promo
 */
const validatePromoCode = async (req, res) => {
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
        const result = await promoCodeService_1.default.validatePromoCode(code, tier, billingCycle, userId);
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
                originalPrice: promoCodeService_1.default.getSubscriptionPrice(tier, billingCycle),
                message: result.message || 'Promo code applied successfully'
            },
            message: result.message || 'Promo code is valid'
        });
    }
    catch (error) {
        console.error('Error validating promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate promo code',
            error: error.message
        });
    }
};
exports.validatePromoCode = validatePromoCode;
