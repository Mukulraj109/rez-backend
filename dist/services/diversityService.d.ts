import { Types } from 'mongoose';
/**
 * Product Diversity Service
 *
 * This service provides algorithms to ensure product recommendations are diverse
 * across multiple dimensions: category, brand, price range, etc.
 *
 * The goal is to eliminate duplicate products and ensure variety in recommendation sections.
 *
 * @module diversityService
 */
/**
 * Interface for product objects used in diversity calculations
 */
export interface DiversityProduct {
    _id: Types.ObjectId | string;
    name: string;
    category?: Types.ObjectId | string | {
        _id: string;
        name: string;
    };
    brand?: string;
    store?: Types.ObjectId | string | {
        _id: string;
        name: string;
    };
    pricing?: {
        selling: number;
        original?: number;
        currency?: string;
    };
    price?: {
        current: number;
        original?: number;
    };
    ratings?: {
        average: number;
        count: number;
    };
    rating?: {
        value: number;
        count: number;
    };
    [key: string]: any;
}
/**
 * Options for diversity mode application
 */
export interface DiversityOptions {
    maxPerCategory?: number;
    maxPerBrand?: number;
    priceRanges?: number;
    minRating?: number;
    targetDiversityScore?: number;
}
/**
 * Diversity metadata returned with results
 */
export interface DiversityMetadata {
    categoriesShown: string[];
    brandsShown: string[];
    diversityScore: number;
    deduplicatedCount: number;
    priceDistribution: {
        budget: number;
        mid: number;
        premium: number;
    };
}
/**
 * Balance products by limiting items per category
 *
 * This ensures no single category dominates the recommendation list.
 *
 * @param products - Array of products to balance
 * @param maxPerCategory - Maximum products allowed per category (default: 2)
 * @returns Balanced array of products
 *
 * @example
 * ```typescript
 * const balanced = balanceByCategory(products, 2);
 * // Returns at most 2 products per category
 * ```
 */
export declare function balanceByCategory(products: DiversityProduct[], maxPerCategory?: number): DiversityProduct[];
/**
 * Balance products by limiting items per brand/store
 *
 * This prevents a single brand from dominating recommendations.
 *
 * @param products - Array of products to balance
 * @param maxPerBrand - Maximum products allowed per brand (default: 2)
 * @returns Balanced array of products
 *
 * @example
 * ```typescript
 * const balanced = balanceByBrand(products, 2);
 * // Returns at most 2 products per brand
 * ```
 */
export declare function balanceByBrand(products: DiversityProduct[], maxPerBrand?: number): DiversityProduct[];
/**
 * Balance products by price range stratification
 *
 * Divides products into price ranges (budget, mid-tier, premium) and
 * ensures representation from each tier.
 *
 * @param products - Array of products to balance
 * @param ranges - Number of price ranges to create (default: 3)
 * @returns Balanced array of products with diverse pricing
 *
 * @example
 * ```typescript
 * const balanced = balanceByPriceRange(products, 3);
 * // Returns products from budget, mid, and premium tiers
 * ```
 */
export declare function balanceByPriceRange(products: DiversityProduct[], ranges?: number): DiversityProduct[];
/**
 * Calculate diversity score using Gini coefficient
 *
 * The Gini coefficient measures inequality. A score of 0 indicates perfect diversity,
 * while 1 indicates complete homogeneity.
 *
 * We invert this (1 - gini) so higher scores mean better diversity.
 *
 * @param products - Array of products to score
 * @returns Diversity score between 0 (poor) and 1 (excellent)
 *
 * @example
 * ```typescript
 * const score = calculateDiversityScore(products);
 * console.log('Diversity score:', score); // 0.75 = good diversity
 * ```
 */
export declare function calculateDiversityScore(products: DiversityProduct[]): number;
/**
 * Apply diversity mode to product list
 *
 * This is the main algorithm that applies diversity transformations based on the mode.
 *
 * Modes:
 * - `balanced`: Balances across categories, brands, and price ranges
 * - `category_diverse`: Focuses on category diversity, allows more brand repetition
 * - `price_diverse`: Focuses on price stratification, allows category repetition
 *
 * @param products - Array of products to diversify
 * @param mode - Diversity mode to apply
 * @param options - Configuration options
 * @returns Diversified array of products
 *
 * @example
 * ```typescript
 * const diverse = await diversityService.applyDiversityMode(
 *   products,
 *   'balanced',
 *   { maxPerCategory: 2, maxPerBrand: 2 }
 * );
 * ```
 */
export declare function applyDiversityMode(products: DiversityProduct[], mode: 'balanced' | 'category_diverse' | 'price_diverse', options?: DiversityOptions): Promise<DiversityProduct[]>;
/**
 * Diversity Service Export
 */
export declare const diversityService: {
    balanceByCategory: typeof balanceByCategory;
    balanceByBrand: typeof balanceByBrand;
    balanceByPriceRange: typeof balanceByPriceRange;
    calculateDiversityScore: typeof calculateDiversityScore;
    applyDiversityMode: typeof applyDiversityMode;
    /**
     * Utility to extract diversity metadata from products
     */
    getMetadata(products: DiversityProduct[]): DiversityMetadata;
};
export default diversityService;
