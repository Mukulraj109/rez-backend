export interface RecommendationOptions {
    userId?: string;
    location?: {
        coordinates: [number, number];
        radius?: number;
    };
    limit?: number;
    excludeStores?: string[];
    category?: string;
    preferences?: {
        minRating?: number;
        maxDeliveryTime?: number;
        priceRange?: {
            min: number;
            max: number;
        };
        features?: string[];
    };
}
export interface StoreRecommendation {
    store: any;
    score: number;
    reasons: string[];
    confidence: number;
}
export interface ProductRecommendation {
    product: any;
    score: number;
    reasons: string[];
    confidence: number;
    similarity?: number;
}
export interface BundleRecommendation {
    products: any[];
    combinedPrice: number;
    savings: number;
    frequency: number;
}
declare class RecommendationService {
    /**
     * Get personalized store recommendations for a user
     */
    getPersonalizedRecommendations(options: RecommendationOptions): Promise<StoreRecommendation[]>;
    /**
     * Get user-based recommendations based on user's history
     */
    private getUserBasedRecommendations;
    /**
     * Get collaborative filtering recommendations
     */
    private getCollaborativeRecommendations;
    /**
     * Get trending/popular recommendations
     */
    private getTrendingRecommendations;
    /**
     * Extract user preferences from their history
     */
    private extractUserPreferences;
    /**
     * Find stores similar to user preferences
     */
    private findSimilarStores;
    /**
     * Find users with similar preferences
     */
    private findSimilarUsers;
    /**
     * Get stores from similar users
     */
    private getStoresFromSimilarUsers;
    /**
     * Calculate user-based recommendation score
     */
    private calculateUserBasedScore;
    /**
     * Calculate collaborative filtering score
     */
    private calculateCollaborativeScore;
    /**
     * Calculate trending score
     */
    private calculateTrendingScore;
    /**
     * Generate recommendation reasons
     */
    private generateUserBasedReasons;
    private generateCollaborativeReasons;
    private generateTrendingReasons;
    /**
     * Calculate confidence scores
     */
    private calculateConfidence;
    private calculateCollaborativeConfidence;
    private calculateTrendingConfidence;
    /**
     * Remove duplicate recommendations
     */
    private deduplicateRecommendations;
    /**
     * Get similar products based on category, price range, brand
     */
    getSimilarProducts(productId: string, limit?: number): Promise<ProductRecommendation[]>;
    /**
     * Get frequently bought together products based on order history
     */
    getFrequentlyBoughtTogether(productId: string, limit?: number): Promise<BundleRecommendation[]>;
    /**
     * Get personalized product recommendations based on user history
     */
    getPersonalizedProductRecommendations(userId: string, options?: {
        limit?: number;
        excludeProducts?: string[];
    }): Promise<ProductRecommendation[]>;
    /**
     * Get bundle deals (predefined product combinations with special pricing)
     */
    getBundleDeals(productId: string, limit?: number): Promise<BundleRecommendation[]>;
    /**
     * Track product view for analytics
     */
    trackProductView(productId: string, userId?: string): Promise<void>;
    /**
     * Calculate similarity between two products
     */
    private calculateProductSimilarity;
    /**
     * Extract product preferences from user history
     */
    private extractProductPreferences;
    /**
     * Generate reasons for similar product recommendations
     */
    private generateSimilarProductReasons;
    /**
     * Generate reasons for personalized recommendations
     */
    private generatePersonalizedProductReasons;
    /**
     * Calculate confidence scores for product recommendations
     */
    private calculateSimilarityConfidence;
    private calculatePersonalizedProductConfidence;
    /**
     * Calculate personalized product score
     */
    private calculatePersonalizedProductScore;
}
export declare const recommendationService: RecommendationService;
export default recommendationService;
