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
