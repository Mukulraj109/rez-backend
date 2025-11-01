"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Subscription_1 = require("../models/Subscription");
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
class SubscriptionBenefitsService {
    /**
     * Get user's current subscription
     */
    async getUserSubscription(userId) {
        try {
            const subscription = await Subscription_1.Subscription.findOne({
                user: userId,
                status: { $in: ['active', 'trial', 'grace_period'] }
            }).sort({ endDate: -1 });
            return subscription;
        }
        catch (error) {
            console.error('Error fetching user subscription:', error);
            return null;
        }
    }
    /**
     * Get cashback multiplier based on user's subscription tier
     */
    async getCashbackMultiplier(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return 1; // Free tier: 1x multiplier
            }
            return subscription.benefits.cashbackMultiplier;
        }
        catch (error) {
            console.error('Error getting cashback multiplier:', error);
            return 1;
        }
    }
    /**
     * Check if user has free delivery benefit
     */
    async hasFreeDelivery(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.freeDelivery;
        }
        catch (error) {
            console.error('Error checking free delivery:', error);
            return false;
        }
    }
    /**
     * Check if user can access exclusive deals
     */
    async canAccessExclusiveDeals(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.exclusiveDeals;
        }
        catch (error) {
            console.error('Error checking exclusive deals access:', error);
            return false;
        }
    }
    /**
     * Check if user has priority support
     */
    async hasPrioritySupport(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.prioritySupport;
        }
        catch (error) {
            console.error('Error checking priority support:', error);
            return false;
        }
    }
    /**
     * Check if user has unlimited wishlists
     */
    async hasUnlimitedWishlists(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.unlimitedWishlists;
        }
        catch (error) {
            console.error('Error checking unlimited wishlists:', error);
            return false;
        }
    }
    /**
     * Check if user has early flash sale access
     */
    async hasEarlyFlashSaleAccess(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.earlyFlashSaleAccess;
        }
        catch (error) {
            console.error('Error checking early flash sale access:', error);
            return false;
        }
    }
    /**
     * Check if user has personal shopper access
     */
    async hasPersonalShopper(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.personalShopper;
        }
        catch (error) {
            console.error('Error checking personal shopper:', error);
            return false;
        }
    }
    /**
     * Check if user can access premium events
     */
    async canAccessPremiumEvents(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.premiumEvents;
        }
        catch (error) {
            console.error('Error checking premium events access:', error);
            return false;
        }
    }
    /**
     * Check if user has concierge service
     */
    async hasConciergeService(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            return subscription.benefits.conciergeService;
        }
        catch (error) {
            console.error('Error checking concierge service:', error);
            return false;
        }
    }
    /**
     * Apply subscription benefits to an order
     */
    async applyTierBenefits(userId, orderData) {
        try {
            const subscription = await this.getUserSubscription(userId);
            const appliedBenefits = [];
            let totalSavings = 0;
            // Default values
            let cashbackRate = orderData.cashbackRate;
            let deliveryFee = orderData.deliveryFee;
            if (subscription && subscription.isActive()) {
                // Apply cashback multiplier
                const multiplier = subscription.benefits.cashbackMultiplier;
                if (multiplier > 1) {
                    cashbackRate = orderData.cashbackRate * multiplier;
                    const extraCashback = (orderData.subtotal * orderData.cashbackRate * (multiplier - 1)) / 100;
                    totalSavings += extraCashback;
                    appliedBenefits.push(`${multiplier}x Cashback`);
                }
                // Apply free delivery
                if (subscription.benefits.freeDelivery && deliveryFee > 0) {
                    totalSavings += deliveryFee;
                    deliveryFee = 0;
                    appliedBenefits.push('Free Delivery');
                    // Update delivery fees saved
                    subscription.usage.deliveryFeesSaved += orderData.deliveryFee;
                }
                // Update usage stats
                subscription.usage.ordersThisMonth += 1;
                subscription.usage.ordersAllTime += 1;
                subscription.usage.totalSavings += totalSavings;
                subscription.usage.lastUsedAt = new Date();
                await subscription.save();
            }
            return {
                cashbackRate,
                deliveryFee,
                totalSavings,
                appliedBenefits
            };
        }
        catch (error) {
            console.error('Error applying tier benefits:', error);
            return {
                cashbackRate: orderData.cashbackRate,
                deliveryFee: orderData.deliveryFee,
                totalSavings: 0,
                appliedBenefits: []
            };
        }
    }
    /**
     * Get all benefits for a user
     */
    async getUserBenefits(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription) {
                return {
                    tier: 'free',
                    isActive: false,
                    benefits: Subscription_1.Subscription.getTierConfig('free').benefits,
                    usage: {
                        totalSavings: 0,
                        ordersThisMonth: 0,
                        ordersAllTime: 0,
                        cashbackEarned: 0,
                        deliveryFeesSaved: 0,
                        exclusiveDealsUsed: 0
                    }
                };
            }
            return {
                tier: subscription.tier,
                isActive: subscription.isActive(),
                benefits: subscription.benefits,
                usage: subscription.usage
            };
        }
        catch (error) {
            console.error('Error getting user benefits:', error);
            throw error;
        }
    }
    /**
     * Track exclusive deal usage
     */
    async trackExclusiveDealUsage(userId, savingsAmount) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (subscription && subscription.isActive()) {
                subscription.usage.exclusiveDealsUsed += 1;
                subscription.usage.totalSavings += savingsAmount;
                await subscription.save();
            }
        }
        catch (error) {
            console.error('Error tracking exclusive deal usage:', error);
        }
    }
    /**
     * Track cashback earned
     */
    async trackCashbackEarned(userId, cashbackAmount) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (subscription && subscription.isActive()) {
                subscription.usage.cashbackEarned += cashbackAmount;
                await subscription.save();
            }
        }
        catch (error) {
            console.error('Error tracking cashback earned:', error);
        }
    }
    /**
     * Get subscription ROI (Return on Investment)
     */
    async getSubscriptionROI(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || subscription.tier === 'free') {
                return {
                    subscriptionCost: 0,
                    totalSavings: 0,
                    netSavings: 0,
                    roi: 0,
                    roiPercentage: 0
                };
            }
            const totalValue = subscription.usage.totalSavings + subscription.usage.cashbackEarned;
            const netSavings = totalValue - subscription.price;
            const roiPercentage = subscription.price > 0 ? ((netSavings / subscription.price) * 100) : 0;
            return {
                subscriptionCost: subscription.price,
                totalSavings: totalValue,
                netSavings,
                roi: netSavings,
                roiPercentage
            };
        }
        catch (error) {
            console.error('Error calculating subscription ROI:', error);
            throw error;
        }
    }
    /**
     * Check if user qualifies for birthday offer
     */
    async qualifiesForBirthdayOffer(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            const user = await User_1.User.findById(userId);
            if (!subscription || !subscription.isActive() || !user) {
                return false;
            }
            if (!subscription.benefits.birthdayOffer) {
                return false;
            }
            // Check if it's user's birthday month
            if (user.profile.dateOfBirth) {
                const now = new Date();
                const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
                const currentMonth = now.getMonth();
                return birthMonth === currentMonth;
            }
            return false;
        }
        catch (error) {
            console.error('Error checking birthday offer qualification:', error);
            return false;
        }
    }
    /**
     * Check if user qualifies for anniversary offer
     */
    async qualifiesForAnniversaryOffer(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || !subscription.isActive()) {
                return false;
            }
            if (!subscription.benefits.anniversaryOffer) {
                return false;
            }
            // Check if it's subscription anniversary month
            const now = new Date();
            const anniversaryMonth = new Date(subscription.startDate).getMonth();
            const currentMonth = now.getMonth();
            return anniversaryMonth === currentMonth;
        }
        catch (error) {
            console.error('Error checking anniversary offer qualification:', error);
            return false;
        }
    }
    /**
     * Reset monthly usage stats (to be run via cron job)
     */
    async resetMonthlyUsageStats() {
        try {
            await Subscription_1.Subscription.updateMany({ status: { $in: ['active', 'trial', 'grace_period'] } }, { $set: { 'usage.ordersThisMonth': 0 } });
            console.log('Monthly usage stats reset successfully');
        }
        catch (error) {
            console.error('Error resetting monthly usage stats:', error);
        }
    }
    /**
     * Get subscription value proposition for upselling
     */
    async getValueProposition(userId, targetTier) {
        try {
            // Calculate average order value and frequency
            const recentOrders = await Order_1.Order.find({
                user: userId,
                status: 'delivered',
                createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
            });
            if (recentOrders.length === 0) {
                // Default estimates for new users
                return {
                    estimatedMonthlySavings: targetTier === 'premium' ? 300 : 1000,
                    estimatedYearlySavings: targetTier === 'premium' ? 3600 : 12000,
                    paybackPeriod: targetTier === 'premium' ? 10 : 9,
                    benefits: Subscription_1.Subscription.getTierConfig(targetTier).features
                };
            }
            // Calculate averages
            const totalSpent = recentOrders.reduce((sum, order) => sum + order.totals.total, 0);
            const avgOrderValue = totalSpent / recentOrders.length;
            const ordersPerMonth = recentOrders.length / 3; // 90 days = 3 months
            // Get tier config
            const tierConfig = Subscription_1.Subscription.getTierConfig(targetTier);
            const multiplier = tierConfig.benefits.cashbackMultiplier;
            // Calculate savings
            const avgCashbackRate = 0.05; // 5% average
            const extraCashbackPerOrder = avgOrderValue * avgCashbackRate * (multiplier - 1);
            const deliverySavingsPerOrder = tierConfig.benefits.freeDelivery ? 30 : 0; // Avg ₹30 delivery
            const monthlySavings = (extraCashbackPerOrder + deliverySavingsPerOrder) * ordersPerMonth;
            const yearlySavings = monthlySavings * 12;
            // Calculate payback period
            const subscriptionCost = tierConfig.pricing.monthly;
            const paybackPeriod = Math.ceil((subscriptionCost / monthlySavings) * 30); // in days
            return {
                estimatedMonthlySavings: Math.round(monthlySavings),
                estimatedYearlySavings: Math.round(yearlySavings),
                paybackPeriod,
                benefits: tierConfig.features
            };
        }
        catch (error) {
            console.error('Error calculating value proposition:', error);
            throw error;
        }
    }
}
exports.default = new SubscriptionBenefitsService();
