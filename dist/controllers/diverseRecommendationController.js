"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiverseRecommendations = void 0;
const mongoose_1 = require("mongoose");
const Product_1 = require("../models/Product");
const diversityService_1 = require("../services/diversityService");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
/**
 * Calculate relevance score for a product
 *
 * This scoring system combines multiple signals:
 * - Rating (40%)
 * - Popularity (views + purchases) (30%)
 * - Recency (20%)
 * - Availability (10%)
 *
 * @param product - Product to score
 * @returns Relevance score between 0 and 1
 */
function calculateRelevanceScore(product) {
    // Rating score (0-1, based on 5-star scale)
    const rating = product.ratings?.average || product.rating?.value || 0;
    const ratingScore = rating / 5;
    // Popularity score (normalized by log scale to prevent extreme values)
    const views = product.analytics?.views || 0;
    const purchases = product.analytics?.purchases || 0;
    const popularityRaw = views + (purchases * 10); // Weight purchases 10x more than views
    const popularityScore = Math.min(Math.log10(popularityRaw + 1) / 4, 1); // Cap at log10(10000) = 4
    // Recency score (products created in last 30 days get bonus)
    const createdAt = product.createdAt || new Date();
    const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(1 - (daysSinceCreation / 30), 0);
    // Availability score
    const stock = product.inventory?.stock || 0;
    const availabilityScore = stock > 0 ? 1 : 0;
    // Weighted combination
    const relevanceScore = (ratingScore * 0.4 +
        popularityScore * 0.3 +
        recencyScore * 0.2 +
        availabilityScore * 0.1);
    return parseFloat(relevanceScore.toFixed(3));
}
/**
 * Calculate diversity contribution of adding a product to a set
 *
 * This measures how much a product would increase diversity if added.
 *
 * @param product - Product to evaluate
 * @param selectedProducts - Products already selected
 * @returns Diversity contribution score (0-1)
 */
function calculateDiversityContribution(product, selectedProducts) {
    if (selectedProducts.length === 0)
        return 1;
    // Get product attributes
    const category = product.category?.name || product.category || 'unknown';
    const brand = product.brand || product.store?.name || 'generic';
    const price = product.pricing?.selling || product.price?.current || 0;
    // Check uniqueness
    const categoryCount = selectedProducts.filter(p => (p.category?.name || p.category) === category).length;
    const brandCount = selectedProducts.filter(p => (p.brand || p.store?.name) === brand).length;
    // Price range uniqueness (divide into 3 ranges)
    const allPrices = selectedProducts.map(p => p.pricing?.selling || p.price?.current || 0);
    allPrices.push(price);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = (maxPrice - minPrice) / 3;
    let priceRangeIndex = 0;
    if (price > minPrice + priceRange)
        priceRangeIndex = 1;
    if (price > minPrice + 2 * priceRange)
        priceRangeIndex = 2;
    const samePriceRange = selectedProducts.filter(p => {
        const pPrice = p.pricing?.selling || p.price?.current || 0;
        let pRangeIndex = 0;
        if (pPrice > minPrice + priceRange)
            pRangeIndex = 1;
        if (pPrice > minPrice + 2 * priceRange)
            pRangeIndex = 2;
        return pRangeIndex === priceRangeIndex;
    }).length;
    // Calculate diversity contribution (lower counts = higher contribution)
    const categoryDiversity = 1 / (categoryCount + 1);
    const brandDiversity = 1 / (brandCount + 1);
    const priceDiversity = 1 / (samePriceRange + 1);
    const diversityContribution = (categoryDiversity * 0.4 +
        brandDiversity * 0.3 +
        priceDiversity * 0.3);
    return parseFloat(diversityContribution.toFixed(3));
}
/**
 * POST /api/v1/recommendations/diverse
 *
 * Get diverse product recommendations with advanced deduplication
 *
 * This endpoint implements a hybrid scoring algorithm:
 * 1. Fetch candidate products (5x requested limit)
 * 2. Score each: (0.6 × relevance) + (0.4 × diversity)
 * 3. Greedy selection maximizing diversity
 * 4. Cache results for 5 minutes
 *
 * @route POST /api/v1/recommendations/diverse
 * @access Public (optionalAuth for personalization)
 *
 * @example Request Body
 * ```json
 * {
 *   "excludeProducts": ["507f1f77bcf86cd799439011"],
 *   "excludeStores": ["507f1f77bcf86cd799439012"],
 *   "shownProducts": ["507f1f77bcf86cd799439013"],
 *   "limit": 10,
 *   "context": "homepage",
 *   "options": {
 *     "minCategories": 3,
 *     "maxPerCategory": 2,
 *     "diversityScore": 0.7,
 *     "algorithm": "hybrid"
 *   }
 * }
 * ```
 *
 * @example Response
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "recommendations": [...],
 *     "metadata": {
 *       "categoriesShown": ["Electronics", "Fashion", "Home"],
 *       "diversityScore": 0.83,
 *       "deduplicatedCount": 15
 *     }
 *   }
 * }
 * ```
 */
exports.getDiverseRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const userId = req.user?.id;
    console.log('🎯 [DIVERSE RECOMMENDATIONS] Request received');
    console.log('👤 [DIVERSE RECOMMENDATIONS] User ID:', userId || 'Anonymous');
    // Parse and validate request body
    const { excludeProducts = [], excludeStores = [], shownProducts = [], limit = 10, context = 'homepage', options = {} } = req.body;
    // Validate limit
    const requestLimit = Math.min(Math.max(limit, 1), 50); // Clamp between 1-50
    console.log('📋 [DIVERSE RECOMMENDATIONS] Parameters:', {
        excludeProducts: excludeProducts.length,
        excludeStores: excludeStores.length,
        shownProducts: shownProducts.length,
        limit: requestLimit,
        context,
        options
    });
    // Extract options with defaults
    const { minCategories = 3, maxPerCategory = 2, maxPerBrand = 2, diversityScore: targetDiversityScore = 0.7, includeStores = false, algorithm = 'hybrid', minRating = 3.0, priceRanges = 3 } = options;
    // Generate cache key
    const cacheKey = `diverse-recommendations:${context}:${userId || 'anon'}:${requestLimit}:${JSON.stringify(options)}`;
    try {
        // Try to get from cache first
        const cached = await redisService_1.default.get(cacheKey);
        if (cached) {
            console.log('✅ [DIVERSE RECOMMENDATIONS] Returning from cache');
            console.log('⏱️ [DIVERSE RECOMMENDATIONS] Response time:', Date.now() - startTime, 'ms');
            return (0, response_1.sendSuccess)(res, cached, 'Diverse recommendations retrieved from cache');
        }
        console.log('🔍 [DIVERSE RECOMMENDATIONS] Fetching candidates from database');
        // Build exclusion lists
        const allExcludedProducts = [
            ...excludeProducts,
            ...shownProducts
        ].map(id => {
            try {
                return new mongoose_1.Types.ObjectId(id);
            }
            catch {
                return null;
            }
        }).filter(id => id !== null);
        const excludedStoreIds = excludeStores.map(id => {
            try {
                return new mongoose_1.Types.ObjectId(id);
            }
            catch {
                return null;
            }
        }).filter(id => id !== null);
        console.log('🚫 [DIVERSE RECOMMENDATIONS] Exclusions:', {
            products: allExcludedProducts.length,
            stores: excludedStoreIds.length
        });
        // Build query
        const query = {
            isActive: true,
            'inventory.isAvailable': true,
            'inventory.stock': { $gt: 0 }
        };
        // Add exclusions
        if (allExcludedProducts.length > 0) {
            query._id = { $nin: allExcludedProducts };
        }
        if (excludedStoreIds.length > 0) {
            query.store = { $nin: excludedStoreIds };
        }
        // Fetch candidates (5x limit to have good selection pool)
        const candidateLimit = requestLimit * 5;
        console.log('📦 [DIVERSE RECOMMENDATIONS] Fetching', candidateLimit, 'candidates');
        const candidates = await Product_1.Product.find(query)
            .populate('category', 'name slug type')
            .populate('store', 'name logo ratings')
            .sort({ 'ratings.average': -1, 'analytics.views': -1 })
            .limit(candidateLimit)
            .lean();
        console.log('✅ [DIVERSE RECOMMENDATIONS] Found', candidates.length, 'candidates');
        if (candidates.length === 0) {
            console.log('⚠️ [DIVERSE RECOMMENDATIONS] No candidates found');
            return (0, response_1.sendSuccess)(res, {
                recommendations: [],
                metadata: {
                    categoriesShown: [],
                    brandsShown: [],
                    diversityScore: 0,
                    deduplicatedCount: 0,
                    priceDistribution: { budget: 0, mid: 0, premium: 0 }
                }
            }, 'No recommendations available');
        }
        // Apply algorithm based on type
        let recommendations = [];
        if (algorithm === 'hybrid' || algorithm === 'content_based') {
            console.log('🎨 [DIVERSE RECOMMENDATIONS] Applying hybrid scoring algorithm');
            // Score each candidate
            const scoredCandidates = candidates.map(product => {
                const relevance = calculateRelevanceScore(product);
                const diversity = calculateDiversityContribution(product, recommendations);
                const hybridScore = (relevance * 0.6) + (diversity * 0.4);
                return {
                    product,
                    relevance,
                    diversity,
                    hybridScore
                };
            });
            // Sort by hybrid score
            scoredCandidates.sort((a, b) => b.hybridScore - a.hybridScore);
            console.log('📊 [DIVERSE RECOMMENDATIONS] Top scored candidates:', scoredCandidates.slice(0, 3).map(c => ({
                name: c.product.name,
                relevance: c.relevance,
                diversity: c.diversity,
                hybridScore: c.hybridScore
            })));
            // Greedy selection maximizing diversity
            const selectedProducts = [];
            for (const { product } of scoredCandidates) {
                if (selectedProducts.length >= requestLimit)
                    break;
                // Recalculate diversity contribution for current selection
                const diversityContribution = calculateDiversityContribution(product, selectedProducts);
                // Accept product if it contributes to diversity
                if (diversityContribution > 0.3 || selectedProducts.length < 5) {
                    selectedProducts.push(product);
                }
            }
            recommendations = selectedProducts;
            console.log('✅ [DIVERSE RECOMMENDATIONS] Greedy selection complete:', recommendations.length);
        }
        else {
            // Collaborative filtering (simplified - just use diversity service)
            console.log('🎨 [DIVERSE RECOMMENDATIONS] Applying diversity service');
            recommendations = await diversityService_1.diversityService.applyDiversityMode(candidates, 'balanced', {
                maxPerCategory,
                maxPerBrand,
                priceRanges,
                minRating
            });
            // Limit to requested amount
            recommendations = recommendations.slice(0, requestLimit);
        }
        // Validate minimum categories requirement
        const categoriesRepresented = new Set(recommendations.map(p => p.category?.name || p.category || 'unknown'));
        console.log('📊 [DIVERSE RECOMMENDATIONS] Categories represented:', categoriesRepresented.size);
        if (categoriesRepresented.size < minCategories) {
            console.log('⚠️ [DIVERSE RECOMMENDATIONS] Not enough categories, fetching more');
            // Fetch from underrepresented categories
            const missingCategories = minCategories - categoriesRepresented.size;
            const additionalQuery = {
                ...query,
                _id: { $nin: [...allExcludedProducts, ...recommendations.map(p => p._id)] },
                category: { $nin: Array.from(categoriesRepresented) }
            };
            const additionalProducts = await Product_1.Product.find(additionalQuery)
                .populate('category', 'name slug type')
                .populate('store', 'name logo ratings')
                .limit(missingCategories)
                .lean();
            recommendations = [...recommendations.slice(0, requestLimit - additionalProducts.length), ...additionalProducts];
            console.log('✅ [DIVERSE RECOMMENDATIONS] Added', additionalProducts.length, 'products from new categories');
        }
        // Calculate final diversity score
        const finalDiversityScore = diversityService_1.diversityService.calculateDiversityScore(recommendations);
        // Generate metadata
        const metadata = diversityService_1.diversityService.getMetadata(recommendations);
        metadata.deduplicatedCount = candidates.length - recommendations.length;
        console.log('📈 [DIVERSE RECOMMENDATIONS] Final diversity score:', finalDiversityScore);
        console.log('📊 [DIVERSE RECOMMENDATIONS] Metadata:', {
            categories: metadata.categoriesShown.length,
            brands: metadata.brandsShown.length,
            deduplicatedCount: metadata.deduplicatedCount
        });
        // Transform for response
        const transformedRecommendations = recommendations.map(product => ({
            id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.shortDescription || product.description,
            image: product.images?.[0] || '',
            images: product.images || [],
            pricing: product.pricing,
            rating: product.ratings,
            category: product.category,
            store: product.store,
            tags: product.tags || [],
            cashback: product.cashback,
            inventory: {
                inStock: product.inventory?.stock > 0,
                stock: product.inventory?.stock
            }
        }));
        const responseData = {
            recommendations: transformedRecommendations,
            metadata: {
                ...metadata,
                algorithm,
                context,
                requestedLimit: requestLimit,
                returnedCount: transformedRecommendations.length
            }
        };
        // Cache for 5 minutes (300 seconds)
        await redisService_1.default.set(cacheKey, responseData, 300);
        console.log('✅ [DIVERSE RECOMMENDATIONS] Request complete');
        console.log('⏱️ [DIVERSE RECOMMENDATIONS] Response time:', Date.now() - startTime, 'ms');
        // Track analytics (async, don't wait)
        trackRecommendationAnalytics(context, requestLimit, finalDiversityScore, Date.now() - startTime)
            .catch(err => console.error('❌ [DIVERSE RECOMMENDATIONS] Analytics error:', err));
        return (0, response_1.sendSuccess)(res, responseData, 'Diverse recommendations retrieved successfully');
    }
    catch (error) {
        console.error('❌ [DIVERSE RECOMMENDATIONS] Error:', error);
        console.error('❌ [DIVERSE RECOMMENDATIONS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to get diverse recommendations', 500);
    }
});
/**
 * Track recommendation analytics (async)
 *
 * This logs metrics to help monitor and improve the recommendation system.
 *
 * @param context - Request context
 * @param limit - Number of recommendations requested
 * @param diversityScore - Final diversity score achieved
 * @param responseTime - Time taken to generate recommendations (ms)
 */
async function trackRecommendationAnalytics(context, limit, diversityScore, responseTime) {
    try {
        // Store in Redis for aggregation
        const analyticsKey = `analytics:recommendations:${new Date().toISOString().split('T')[0]}`;
        const analytics = {
            timestamp: new Date().toISOString(),
            context,
            limit,
            diversityScore,
            responseTime
        };
        // Push to a Redis list (for time-series analysis)
        // Note: Using set instead of lpush for simpler analytics storage
        await redisService_1.default.set(analyticsKey, analytics, 30 * 24 * 60 * 60);
        console.log('📊 [ANALYTICS] Tracked recommendation request:', {
            context,
            diversityScore,
            responseTime: `${responseTime}ms`
        });
    }
    catch (error) {
        console.error('❌ [ANALYTICS] Failed to track:', error);
    }
}
exports.default = {
    getDiverseRecommendations: exports.getDiverseRecommendations
};
