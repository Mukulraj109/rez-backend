"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackProductView = exports.getPersonalizedProductRecommendations = exports.getBundleDeals = exports.getFrequentlyBoughtTogether = exports.getSimilarProducts = exports.updateUserRecommendationPreferences = exports.getUserRecommendationPreferences = exports.getCategoryRecommendations = exports.getTrendingStores = exports.getStoreRecommendations = exports.getPersonalizedRecommendations = void 0;
const recommendationService_1 = require("../services/recommendationService");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Get personalized store recommendations
exports.getPersonalizedRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { location, radius = 10, limit = 10, excludeStores, category, minRating, maxDeliveryTime, priceRange, features } = req.query;
    try {
        const options = {
            userId,
            location: location ? {
                coordinates: location.toString().split(',').map(Number),
                radius: Number(radius)
            } : undefined,
            limit: Number(limit),
            excludeStores: excludeStores ? excludeStores.toString().split(',') : [],
            category: category,
            preferences: {
                minRating: minRating ? Number(minRating) : undefined,
                maxDeliveryTime: maxDeliveryTime ? Number(maxDeliveryTime) : undefined,
                priceRange: priceRange ? {
                    min: Number(priceRange.toString().split('-')[0]),
                    max: Number(priceRange.toString().split('-')[1])
                } : undefined,
                features: features ? features.toString().split(',') : undefined
            }
        };
        const recommendations = await recommendationService_1.recommendationService.getPersonalizedRecommendations(options);
        (0, response_1.sendSuccess)(res, {
            recommendations,
            total: recommendations.length,
            userId: userId || null
        }, 'Recommendations retrieved successfully');
    }
    catch (error) {
        console.error('Get personalized recommendations error:', error);
        throw new errorHandler_1.AppError('Failed to get recommendations', 500);
    }
});
// Get recommendations for a specific store
exports.getStoreRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    const { limit = 5 } = req.query;
    try {
        // Get similar stores based on the current store
        const options = {
            userId,
            limit: Number(limit),
            excludeStores: [storeId]
        };
        const recommendations = await recommendationService_1.recommendationService.getPersonalizedRecommendations(options);
        (0, response_1.sendSuccess)(res, {
            storeId,
            recommendations,
            total: recommendations.length
        }, 'Store recommendations retrieved successfully');
    }
    catch (error) {
        console.error('Get store recommendations error:', error);
        throw new errorHandler_1.AppError('Failed to get store recommendations', 500);
    }
});
// Get trending stores
exports.getTrendingStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { location, radius = 10, limit = 10, category, timeRange = '7d' // 7 days, 30 days, etc.
     } = req.query;
    try {
        // Calculate time range
        let startDate;
        switch (timeRange) {
            case '1d':
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }
        const options = {
            location: location ? {
                coordinates: location.toString().split(',').map(Number),
                radius: Number(radius)
            } : undefined,
            limit: Number(limit),
            category: category
        };
        const recommendations = await recommendationService_1.recommendationService.getPersonalizedRecommendations(options);
        (0, response_1.sendSuccess)(res, {
            trendingStores: recommendations,
            total: recommendations.length,
            timeRange,
            period: {
                startDate,
                endDate: new Date()
            }
        }, 'Trending stores retrieved successfully');
    }
    catch (error) {
        console.error('Get trending stores error:', error);
        throw new errorHandler_1.AppError('Failed to get trending stores', 500);
    }
});
// Get category-based recommendations
exports.getCategoryRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const userId = req.user?.id;
    const { location, radius = 10, limit = 10 } = req.query;
    try {
        const options = {
            userId,
            location: location ? {
                coordinates: location.toString().split(',').map(Number),
                radius: Number(radius)
            } : undefined,
            limit: Number(limit),
            category
        };
        const recommendations = await recommendationService_1.recommendationService.getPersonalizedRecommendations(options);
        (0, response_1.sendSuccess)(res, {
            category,
            recommendations,
            total: recommendations.length
        }, 'Category recommendations retrieved successfully');
    }
    catch (error) {
        console.error('Get category recommendations error:', error);
        throw new errorHandler_1.AppError('Failed to get category recommendations', 500);
    }
});
// Get user's recommendation preferences
exports.getUserRecommendationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        // This would typically come from a user preferences model
        // For now, we'll return a basic structure
        const preferences = {
            categories: [],
            priceRange: { min: 0, max: 1000 },
            maxDeliveryTime: 60,
            minRating: 3.0,
            features: []
        };
        (0, response_1.sendSuccess)(res, {
            preferences
        }, 'User preferences retrieved successfully');
    }
    catch (error) {
        console.error('Get user preferences error:', error);
        throw new errorHandler_1.AppError('Failed to get user preferences', 500);
    }
});
// Update user's recommendation preferences
exports.updateUserRecommendationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { preferences } = req.body;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        // This would typically update a user preferences model
        // For now, we'll just return success
        (0, response_1.sendSuccess)(res, {
            preferences
        }, 'User preferences updated successfully');
    }
    catch (error) {
        console.error('Update user preferences error:', error);
        throw new errorHandler_1.AppError('Failed to update user preferences', 500);
    }
});
// ============================================
// PRODUCT RECOMMENDATION CONTROLLERS
// ============================================
// Get similar products for a specific product
exports.getSimilarProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const { limit = 6 } = req.query;
    try {
        const similarProducts = await recommendationService_1.recommendationService.getSimilarProducts(productId, Number(limit));
        (0, response_1.sendSuccess)(res, {
            productId,
            similarProducts,
            total: similarProducts.length
        }, 'Similar products retrieved successfully');
    }
    catch (error) {
        console.error('Get similar products error:', error);
        throw new errorHandler_1.AppError('Failed to get similar products', 500);
    }
});
// Get frequently bought together products
exports.getFrequentlyBoughtTogether = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const { limit = 4 } = req.query;
    try {
        const bundles = await recommendationService_1.recommendationService.getFrequentlyBoughtTogether(productId, Number(limit));
        (0, response_1.sendSuccess)(res, {
            productId,
            bundles,
            total: bundles.length
        }, 'Frequently bought together retrieved successfully');
    }
    catch (error) {
        console.error('Get frequently bought together error:', error);
        throw new errorHandler_1.AppError('Failed to get frequently bought together', 500);
    }
});
// Get bundle deals for a product
exports.getBundleDeals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const { limit = 3 } = req.query;
    try {
        const bundles = await recommendationService_1.recommendationService.getBundleDeals(productId, Number(limit));
        (0, response_1.sendSuccess)(res, {
            productId,
            bundles,
            total: bundles.length
        }, 'Bundle deals retrieved successfully');
    }
    catch (error) {
        console.error('Get bundle deals error:', error);
        throw new errorHandler_1.AppError('Failed to get bundle deals', 500);
    }
});
// Get personalized product recommendations for user
exports.getPersonalizedProductRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { limit = 10, excludeProducts } = req.query;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const options = {
            limit: Number(limit),
            excludeProducts: excludeProducts ? excludeProducts.toString().split(',') : []
        };
        const recommendations = await recommendationService_1.recommendationService.getPersonalizedProductRecommendations(userId, options);
        (0, response_1.sendSuccess)(res, {
            recommendations,
            total: recommendations.length,
            userId
        }, 'Personalized product recommendations retrieved successfully');
    }
    catch (error) {
        console.error('Get personalized product recommendations error:', error);
        throw new errorHandler_1.AppError('Failed to get personalized product recommendations', 500);
    }
});
// Track product view
exports.trackProductView = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    try {
        await recommendationService_1.recommendationService.trackProductView(productId, userId);
        (0, response_1.sendSuccess)(res, {
            productId,
            tracked: true
        }, 'Product view tracked successfully');
    }
    catch (error) {
        console.error('Track product view error:', error);
        throw new errorHandler_1.AppError('Failed to track product view', 500);
    }
});
