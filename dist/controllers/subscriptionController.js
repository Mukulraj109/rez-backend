"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleAutoRenew = exports.handleWebhook = exports.getValueProposition = exports.getSubscriptionUsage = exports.getSubscriptionBenefits = exports.renewSubscription = exports.cancelSubscription = exports.downgradeSubscription = exports.upgradeSubscription = exports.subscribeToPlan = exports.getCurrentSubscription = exports.getSubscriptionTiers = void 0;
const Subscription_1 = require("../models/Subscription");
const razorpaySubscriptionService_1 = __importDefault(require("../services/razorpaySubscriptionService"));
const subscriptionBenefitsService_1 = __importDefault(require("../services/subscriptionBenefitsService"));
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
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Check if Razorpay is configured
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET ||
            process.env.RAZORPAY_KEY_ID === 'rzp_test_your_razorpay_key_id' ||
            process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
            return res.status(503).json({
                success: false,
                message: 'Payment gateway is not configured. Please contact support.',
                error: 'Razorpay credentials not configured'
            });
        }
        const { tier, billingCycle, paymentMethod, promoCode, source } = req.body;
        // Validate tier
        if (!['premium', 'vip'].includes(tier)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription tier'
            });
        }
        // Validate billing cycle
        if (!['monthly', 'yearly'].includes(billingCycle)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid billing cycle'
            });
        }
        // Check if user already has an active subscription
        const existingSubscription = await subscriptionBenefitsService_1.default.getUserSubscription(userId);
        if (existingSubscription && existingSubscription.isActive()) {
            return res.status(400).json({
                success: false,
                message: 'User already has an active subscription. Please upgrade or downgrade instead.'
            });
        }
        // Get tier pricing
        const tierPricing = {
            premium: { monthly: 99, yearly: 999 },
            vip: { monthly: 299, yearly: 2999 }
        };
        const price = billingCycle === 'monthly' ? tierPricing[tier].monthly : tierPricing[tier].yearly;
        // Create Razorpay subscription
        const razorpaySubscription = await razorpaySubscriptionService_1.default.createSubscription(userId.toString(), tier, billingCycle);
        // Calculate dates
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
        // Create subscription in database
        const subscription = new Subscription_1.Subscription({
            user: userId,
            tier,
            status: 'trial',
            billingCycle,
            price,
            startDate,
            endDate,
            trialEndDate,
            autoRenew: true,
            paymentMethod,
            razorpaySubscriptionId: razorpaySubscription.id,
            razorpayPlanId: razorpaySubscription.plan_id,
            razorpayCustomerId: razorpaySubscription.customer_id,
            benefits: getTierBenefits(tier),
            metadata: {
                source: source || 'app',
                promoCode
            }
        });
        await subscription.save();
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: {
                subscription,
                paymentUrl: razorpaySubscription.short_url
            }
        });
    }
    catch (error) {
        console.error('Error subscribing to plan:', error);
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
 * Handle Razorpay webhook
 * POST /api/subscriptions/webhook
 */
const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
        // Verify webhook signature
        const isValid = razorpaySubscriptionService_1.default.verifyWebhookSignature(JSON.stringify(req.body), signature, secret);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }
        // Handle webhook
        await razorpaySubscriptionService_1.default.handleWebhook(req.body);
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully'
        });
    }
    catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process webhook',
            error: error.message
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
