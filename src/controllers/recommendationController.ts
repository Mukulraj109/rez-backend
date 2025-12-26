import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService';
import { 
  sendSuccess, 
  sendBadRequest 
} from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get personalized store recommendations
export const getPersonalizedRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { 
    location, 
    radius = 10, 
    limit = 10, 
    excludeStores, 
    category,
    minRating,
    maxDeliveryTime,
    priceRange,
    features
  } = req.query;

  try {
    const options = {
      userId,
      location: location ? {
        coordinates: location.toString().split(',').map(Number) as [number, number],
        radius: Number(radius)
      } : undefined,
      limit: Number(limit),
      excludeStores: excludeStores ? excludeStores.toString().split(',') : [],
      category: category as string,
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

    const recommendations = await recommendationService.getPersonalizedRecommendations(options);

    sendSuccess(res, {
      recommendations,
      total: recommendations.length,
      userId: userId || null
    }, 'Recommendations retrieved successfully');

  } catch (error) {
    console.error('Get personalized recommendations error:', error);
    throw new AppError('Failed to get recommendations', 500);
  }
});

// Get recommendations for a specific store
export const getStoreRecommendations = asyncHandler(async (req: Request, res: Response) => {
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

    const recommendations = await recommendationService.getPersonalizedRecommendations(options);

    sendSuccess(res, {
      storeId,
      recommendations,
      total: recommendations.length
    }, 'Store recommendations retrieved successfully');

  } catch (error) {
    console.error('Get store recommendations error:', error);
    throw new AppError('Failed to get store recommendations', 500);
  }
});

// Get trending stores
export const getTrendingStores = asyncHandler(async (req: Request, res: Response) => {
  const { 
    location, 
    radius = 10, 
    limit = 10, 
    category,
    timeRange = '7d' // 7 days, 30 days, etc.
  } = req.query;

  try {
    // Calculate time range
    let startDate: Date;
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
        coordinates: location.toString().split(',').map(Number) as [number, number],
        radius: Number(radius)
      } : undefined,
      limit: Number(limit),
      category: category as string
    };

    const recommendations = await recommendationService.getPersonalizedRecommendations(options);

    sendSuccess(res, {
      trendingStores: recommendations,
      total: recommendations.length,
      timeRange,
      period: {
        startDate,
        endDate: new Date()
      }
    }, 'Trending stores retrieved successfully');

  } catch (error) {
    console.error('Get trending stores error:', error);
    throw new AppError('Failed to get trending stores', 500);
  }
});

// Get category-based recommendations
export const getCategoryRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const userId = req.user?.id;
  const { 
    location, 
    radius = 10, 
    limit = 10 
  } = req.query;

  try {
    const options = {
      userId,
      location: location ? {
        coordinates: location.toString().split(',').map(Number) as [number, number],
        radius: Number(radius)
      } : undefined,
      limit: Number(limit),
      category
    };

    const recommendations = await recommendationService.getPersonalizedRecommendations(options);

    sendSuccess(res, {
      category,
      recommendations,
      total: recommendations.length
    }, 'Category recommendations retrieved successfully');

  } catch (error) {
    console.error('Get category recommendations error:', error);
    throw new AppError('Failed to get category recommendations', 500);
  }
});

// Get user's recommendation preferences
export const getUserRecommendationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
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

    sendSuccess(res, {
      preferences
    }, 'User preferences retrieved successfully');

  } catch (error) {
    console.error('Get user preferences error:', error);
    throw new AppError('Failed to get user preferences', 500);
  }
});

// Update user's recommendation preferences
export const updateUserRecommendationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { preferences } = req.body;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    // This would typically update a user preferences model
    // For now, we'll just return success
    sendSuccess(res, {
      preferences
    }, 'User preferences updated successfully');

  } catch (error) {
    console.error('Update user preferences error:', error);
    throw new AppError('Failed to update user preferences', 500);
  }
});

// ============================================
// PRODUCT RECOMMENDATION CONTROLLERS
// ============================================

// Get similar products for a specific product
export const getSimilarProducts = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit = 6 } = req.query;

  try {
    const similarProducts = await recommendationService.getSimilarProducts(
      productId,
      Number(limit)
    );

    sendSuccess(res, {
      productId,
      similarProducts,
      total: similarProducts.length
    }, 'Similar products retrieved successfully');

  } catch (error) {
    console.error('Get similar products error:', error);
    throw new AppError('Failed to get similar products', 500);
  }
});

// Get frequently bought together products
export const getFrequentlyBoughtTogether = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit = 4 } = req.query;

  try {
    const bundles = await recommendationService.getFrequentlyBoughtTogether(
      productId,
      Number(limit)
    );

    sendSuccess(res, {
      productId,
      bundles,
      total: bundles.length
    }, 'Frequently bought together retrieved successfully');

  } catch (error) {
    console.error('Get frequently bought together error:', error);
    throw new AppError('Failed to get frequently bought together', 500);
  }
});

// Get bundle deals for a product
export const getBundleDeals = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit = 3 } = req.query;

  try {
    const bundles = await recommendationService.getBundleDeals(
      productId,
      Number(limit)
    );

    sendSuccess(res, {
      productId,
      bundles,
      total: bundles.length
    }, 'Bundle deals retrieved successfully');

  } catch (error) {
    console.error('Get bundle deals error:', error);
    throw new AppError('Failed to get bundle deals', 500);
  }
});

// Get personalized product recommendations for user
export const getPersonalizedProductRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { limit = 10, excludeProducts } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const options = {
      limit: Number(limit),
      excludeProducts: excludeProducts ? excludeProducts.toString().split(',') : []
    };

    const recommendations = await recommendationService.getPersonalizedProductRecommendations(
      userId,
      options
    );

    sendSuccess(res, {
      recommendations,
      total: recommendations.length,
      userId
    }, 'Personalized product recommendations retrieved successfully');

  } catch (error) {
    console.error('Get personalized product recommendations error:', error);
    throw new AppError('Failed to get personalized product recommendations', 500);
  }
});

// Get "Picked For You" recommendations (homepage section)
// Works with or without authentication
export const getPickedForYouRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { location, limit = 10 } = req.query;

  try {
    // Parse location if provided
    let userLocation: { lat: number; lng: number } | undefined;
    if (location) {
      const coords = location.toString().split(',').map(Number);
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        userLocation = { lng: coords[0], lat: coords[1] };
      }
    }

    let recommendations: any[];

    if (userId) {
      // Authenticated user: Get personalized recommendations
      const options = {
        limit: Number(limit),
        excludeProducts: []
      };

      const personalizedRecs = await recommendationService.getPersonalizedProductRecommendations(
        userId,
        options
      );

      // Transform and add location boost if available
      recommendations = personalizedRecs.map((rec: any) => {
        const baseScore = rec.score / 100; // Normalize to 0-1
        let finalScore = baseScore;
        let reason = rec.reasons?.[0] || 'Recommended for you';

        // Apply location boost if we have distance info
        if (userLocation && rec.product?.store?.location?.coordinates) {
          const storeCoords = rec.product.store.location.coordinates;
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            storeCoords[1],
            storeCoords[0]
          );

          if (distance < 5) { // Within 5km
            finalScore = Math.min(1, baseScore * 1.2);
            reason = 'Near you & based on your preferences';
          }
        }

        return {
          ...rec.product,
          recommendationScore: finalScore,
          recommendationReason: reason,
          confidence: rec.confidence,
          personalizedFor: userId
        };
      });
    } else {
      // Anonymous user: Get popular/featured products
      const { Product } = require('../models/Product');

      const products = await Product.find({
        isActive: true,
        isFeatured: true,
        'inventory.isAvailable': true
      })
        .populate('category', 'name slug')
        .populate('store', 'name slug logo location')
        .select('name slug images pricing inventory ratings badges tags analytics store')
        .sort({ 'analytics.views': -1, 'ratings.average': -1 })
        .limit(Number(limit))
        .lean();

      recommendations = products.map((product: any, index: number) => {
        const baseScore = 0.7 + (0.3 * (1 - index / products.length)); // Higher score for first items

        return {
          ...product,
          recommendationScore: baseScore,
          recommendationReason: 'Popular item you might like',
          confidence: 0.6,
          personalizedFor: null
        };
      });
    }

    sendSuccess(res, {
      recommendations,
      total: recommendations.length,
      userId: userId || null,
      isPersonalized: !!userId
    }, 'Picked for you recommendations retrieved successfully');

  } catch (error) {
    console.error('Get picked for you recommendations error:', error);
    throw new AppError('Failed to get picked for you recommendations', 500);
  }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Track product view
export const trackProductView = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = req.user?.id;

  try {
    await recommendationService.trackProductView(productId, userId);

    sendSuccess(res, {
      productId,
      tracked: true
    }, 'Product view tracked successfully');

  } catch (error) {
    console.error('Track product view error:', error);
    throw new AppError('Failed to track product view', 500);
  }
});
