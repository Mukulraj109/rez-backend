export declare const TIER_PROMO_COIN_MULTIPLIERS: Record<string, number>;
export interface PromoCoinsConfig {
    enabled: boolean;
    earningRate: {
        percentage: number;
        minOrderValue: number;
        maxCoinsPerOrder: number;
        roundingRule: 'floor' | 'ceil' | 'round';
    };
    redemption: {
        minRedemptionAmount: number;
        maxUsagePercentage: number;
        conversionRate: number;
    };
    expiry: {
        enabled: boolean;
        expiryDays: number;
    };
    restrictions: {
        allowCombineWithCoupons: boolean;
        allowCombineWithREZCoins: boolean;
        onlyForPaidOrders: boolean;
    };
}
export declare const DEFAULT_PROMO_COINS_CONFIG: PromoCoinsConfig;
/**
 * Calculate promo coins to be earned from an order
 * @param orderValue Order total in INR
 * @param config Optional custom config (uses default if not provided)
 * @returns Number of promo coins to be awarded
 */
export declare function calculatePromoCoinsEarned(orderValue: number, config?: PromoCoinsConfig): number;
/**
 * Calculate maximum promo coins that can be used for an order
 * @param orderValue Order total in INR
 * @param availableCoins User's available promo coins for this store
 * @param config Optional custom config
 * @returns Maximum number of coins that can be used
 */
export declare function calculateMaxPromoCoinsUsage(orderValue: number, availableCoins: number, config?: PromoCoinsConfig): number;
/**
 * Convert promo coins to INR value
 * @param coins Number of promo coins
 * @param config Optional custom config
 * @returns Value in INR
 */
export declare function convertCoinsToINR(coins: number, config?: PromoCoinsConfig): number;
/**
 * Get expiry date for promo coins
 * @param config Optional custom config
 * @returns Expiry date or undefined if no expiry
 */
export declare function getCoinsExpiryDate(config?: PromoCoinsConfig): Date | undefined;
/**
 * Get the tier multiplier for promo coin earning
 * @param tier Subscription tier name
 * @returns Multiplier value (1.0 for free tier)
 */
export declare function getTierMultiplier(tier?: string): number;
/**
 * Calculate promo coins with tier bonus applied
 * @param orderValue Order total in INR
 * @param tier User's subscription tier
 * @param config Optional custom config
 * @returns Number of promo coins to be awarded (with tier bonus)
 */
export declare function calculatePromoCoinsWithTierBonus(orderValue: number, tier?: string, config?: PromoCoinsConfig): number;
