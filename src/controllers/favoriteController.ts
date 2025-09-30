import { Request, Response } from 'express';
import { Favorite } from '../models/Favorite';
import { Store } from '../models/Store';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest,
  sendCreated 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Add store to favorites
export const addToFavorites = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ 
      user: userId, 
      store: storeId 
    });

    if (existingFavorite) {
      throw new AppError('Store is already in your favorites', 400);
    }

    // Create new favorite
    const favorite = new Favorite({
      user: userId,
      store: storeId
    });

    await favorite.save();

    // Populate store info for response
    await favorite.populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

    sendCreated(res, {
      favorite
    }, 'Store added to favorites successfully');

  } catch (error) {
    console.error('Add to favorites error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to add store to favorites', 500);
  }
});

// Remove store from favorites
export const removeFromFavorites = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const favorite = await Favorite.findOneAndDelete({ 
      user: userId, 
      store: storeId 
    });

    if (!favorite) {
      throw new AppError('Store not found in favorites', 404);
    }

    sendSuccess(res, null, 'Store removed from favorites successfully');

  } catch (error) {
    console.error('Remove from favorites error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to remove store from favorites', 500);
  }
});

// Toggle favorite status
export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ 
      user: userId, 
      store: storeId 
    });

    let isFavorited = false;
    let favorite = null;

    if (existingFavorite) {
      // Remove from favorites
      await Favorite.findByIdAndDelete(existingFavorite._id);
      isFavorited = false;
    } else {
      // Add to favorites
      favorite = new Favorite({
        user: userId,
        store: storeId
      });
      await favorite.save();
      await favorite.populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
      isFavorited = true;
    }

    sendSuccess(res, {
      isFavorited,
      favorite
    }, isFavorited ? 'Store added to favorites' : 'Store removed from favorites');

  } catch (error) {
    console.error('Toggle favorite error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle favorite status', 500);
  }
});

// Get user's favorite stores
export const getUserFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await Favorite.getUserFavorites(userId, Number(page), Number(limit));

    sendSuccess(res, {
      favorites: result.favorites,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get user favorites error:', error);
    throw new AppError('Failed to fetch user favorites', 500);
  }
});

// Check if store is favorited by user
export const isStoreFavorited = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const isFavorited = await Favorite.isStoreFavorited(userId, storeId);

    sendSuccess(res, {
      isFavorited
    });

  } catch (error) {
    console.error('Check favorite status error:', error);
    throw new AppError('Failed to check favorite status', 500);
  }
});

// Get favorite status for multiple stores
export const getFavoriteStatuses = asyncHandler(async (req: Request, res: Response) => {
  const { storeIds } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  if (!Array.isArray(storeIds) || storeIds.length === 0) {
    throw new AppError('Store IDs array is required', 400);
  }

  try {
    const favorites = await Favorite.find({
      user: userId,
      store: { $in: storeIds }
    }).select('store');

    const favoritedStoreIds = favorites.map(fav => fav.store.toString());
    const statuses = storeIds.reduce((acc, storeId) => {
      acc[storeId] = favoritedStoreIds.includes(storeId);
      return acc;
    }, {} as { [key: string]: boolean });

    sendSuccess(res, {
      statuses
    });

  } catch (error) {
    console.error('Get favorite statuses error:', error);
    throw new AppError('Failed to get favorite statuses', 500);
  }
});

// Clear all favorites
export const clearAllFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await Favorite.deleteMany({ user: userId });

    sendSuccess(res, {
      deletedCount: result.deletedCount
    }, 'All favorites cleared successfully');

  } catch (error) {
    console.error('Clear all favorites error:', error);
    throw new AppError('Failed to clear all favorites', 500);
  }
});
