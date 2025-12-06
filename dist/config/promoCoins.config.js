"use strict";
// Store Promo Coins Configuration
// Configure how users earn store-specific promo coins
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROMO_COINS_CONFIG = exports.TIER_PROMO_COIN_MULTIPLIERS = void 0;
exports.calculatePromoCoinsEarned = calculatePromoCoinsEarned;
exports.calculateMaxPromoCoinsUsage = calculateMaxPromoCoinsUsage;
exports.convertCoinsToINR = convertCoinsToINR;
exports.getCoinsExpiryDate = getCoinsExpiryDate;
exports.getTierMultiplier = getTierMultiplier;
exports.calculatePromoCoinsWithTierBonus = calculatePromoCoinsWithTierBonus;
// Subscription tier multipliers for promo coin earning
// Higher tiers earn more coins per order
exports.TIER_PROMO_COIN_MULTIPLIERS = {
    free: 1.0, // 5% base earning
    bronze: 1.25, // 6.25% effective
    silver: 1.5, // 7.5% effective
    gold: 1.75, // 8.75% effective
    platinum: 2.0 // 10% effective
};
// Default configuration
exports.DEFAULT_PROMO_COINS_CONFIG = {
    enabled: true,
    earningRate: {
        percentage: 5, // 5% of order value
        minOrderValue: 200, // Minimum ₹200 order to earn coins
        maxCoinsPerOrder: 500, // Max 500 coins per order
        roundingRule: 'floor' // Always round down (₹205 * 5% = 10.25 → 10 coins)
    },
    redemption: {
        minRedemptionAmount: 10, // Need at least 10 coins to use
        maxUsagePercentage: 30, // Can use up to 30% of order value in coins
        conversionRate: 1 // 1 coin = ₹1
    },
    expiry: {
        enabled: true,
        expiryDays: 90 // Coins expire after 90 days
    },
    restrictions: {
        allowCombineWithCoupons: true, // Can use with coupons
        allowCombineWithREZCoins: true, // CAN use with REZ coins
        onlyForPaidOrders: false // Award for all successful orders including COD
    }
};
/**
 * Calculate promo coins to be earned from an order
 * @param orderValue Order total in INR
 * @param config Optional custom config (uses default if not provided)
 * @returns Number of promo coins to be awarded
 */
function calculatePromoCoinsEarned(orderValue, config = exports.DEFAULT_PROMO_COINS_CONFIG) {
    if (!config.enabled) {
        return 0;
    }
    // Check minimum order value
    if (orderValue < config.earningRate.minOrderValue) {
        return 0;
    }
    // Calculate coins based on percentage
    let coins = (orderValue * config.earningRate.percentage) / 100;
    // Apply rounding rule
    switch (config.earningRate.roundingRule) {
        case 'floor':
            coins = Math.floor(coins);
            break;
        case 'ceil':
            coins = Math.ceil(coins);
            break;
        case 'round':
            coins = Math.round(coins);
            break;
    }
    // Cap at maximum
    coins = Math.min(coins, config.earningRate.maxCoinsPerOrder);
    return coins;
}
/**
 * Calculate maximum promo coins that can be used for an order
 * @param orderValue Order total in INR
 * @param availableCoins User's available promo coins for this store
 * @param config Optional custom config
 * @returns Maximum number of coins that can be used
 */
function calculateMaxPromoCoinsUsage(orderValue, availableCoins, config = exports.DEFAULT_PROMO_COINS_CONFIG) {
    if (!config.enabled || availableCoins < config.redemption.minRedemptionAmount) {
        return 0;
    }
    // Calculate max coins based on order value percentage
    const maxByPercentage = Math.floor((orderValue * config.redemption.maxUsagePercentage) / 100);
    // Return the minimum of available coins and max allowed
    return Math.min(availableCoins, maxByPercentage);
}
/**
 * Convert promo coins to INR value
 * @param coins Number of promo coins
 * @param config Optional custom config
 * @returns Value in INR
 */
function convertCoinsToINR(coins, config = exports.DEFAULT_PROMO_COINS_CONFIG) {
    return coins * config.redemption.conversionRate;
}
/**
 * Get expiry date for promo coins
 * @param config Optional custom config
 * @returns Expiry date or undefined if no expiry
 */
function getCoinsExpiryDate(config = exports.DEFAULT_PROMO_COINS_CONFIG) {
    if (!config.expiry.enabled || config.expiry.expiryDays === 0) {
        return undefined;
    }
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + config.expiry.expiryDays);
    return expiryDate;
}
/**
 * Get the tier multiplier for promo coin earning
 * @param tier Subscription tier name
 * @returns Multiplier value (1.0 for free tier)
 */
function getTierMultiplier(tier = 'free') {
    const normalizedTier = tier.toLowerCase();
    return exports.TIER_PROMO_COIN_MULTIPLIERS[normalizedTier] || exports.TIER_PROMO_COIN_MULTIPLIERS.free;
}
/**
 * Calculate promo coins with tier bonus applied
 * @param orderValue Order total in INR
 * @param tier User's subscription tier
 * @param config Optional custom config
 * @returns Number of promo coins to be awarded (with tier bonus)
 */
function calculatePromoCoinsWithTierBonus(orderValue, tier = 'free', config = exports.DEFAULT_PROMO_COINS_CONFIG) {
    const baseCoins = calculatePromoCoinsEarned(orderValue, config);
    const multiplier = getTierMultiplier(tier);
    // Apply tier multiplier and floor the result
    const bonusCoins = Math.floor(baseCoins * multiplier);
    // Still respect the max coins per order limit
    return Math.min(bonusCoins, config.earningRate.maxCoinsPerOrder);
}
