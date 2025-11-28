"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllFavorites = exports.getFavoriteStatuses = exports.isStoreFavorited = exports.getUserFavorites = exports.toggleFavorite = exports.removeFromFavorites = exports.addToFavorites = void 0;
const Favorite_1 = require("../models/Favorite");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Add store to favorites
exports.addToFavorites = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new errorHandler_1.AppError('Store not found', 404);
        }
        // Check if already favorited
        const existingFavorite = await Favorite_1.Favorite.findOne({
            user: userId,
            store: storeId
        });
        if (existingFavorite) {
            throw new errorHandler_1.AppError('Store is already in your favorites', 400);
        }
        // Create new favorite
        const favorite = new Favorite_1.Favorite({
            user: userId,
            store: storeId
        });
        await favorite.save();
        // Populate store info for response
        await favorite.populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        (0, response_1.sendCreated)(res, {
            favorite
        }, 'Store added to favorites successfully');
    }
    catch (error) {
        console.error('Add to favorites error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to add store to favorites', 500);
    }
});
// Remove store from favorites
exports.removeFromFavorites = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const favorite = await Favorite_1.Favorite.findOneAndDelete({
            user: userId,
            store: storeId
        });
        if (!favorite) {
            throw new errorHandler_1.AppError('Store not found in favorites', 404);
        }
        (0, response_1.sendSuccess)(res, null, 'Store removed from favorites successfully');
    }
    catch (error) {
        console.error('Remove from favorites error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to remove store from favorites', 500);
    }
});
// Toggle favorite status
exports.toggleFavorite = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new errorHandler_1.AppError('Store not found', 404);
        }
        // Check if already favorited
        const existingFavorite = await Favorite_1.Favorite.findOne({
            user: userId,
            store: storeId
        });
        let isFavorited = false;
        let favorite = null;
        if (existingFavorite) {
            // Remove from favorites
            await Favorite_1.Favorite.findByIdAndDelete(existingFavorite._id);
            isFavorited = false;
        }
        else {
            // Add to favorites
            favorite = new Favorite_1.Favorite({
                user: userId,
                store: storeId
            });
            await favorite.save();
            await favorite.populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
            isFavorited = true;
        }
        (0, response_1.sendSuccess)(res, {
            isFavorited,
            favorite
        }, isFavorited ? 'Store added to favorites' : 'Store removed from favorites');
    }
    catch (error) {
        console.error('Toggle favorite error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to toggle favorite status', 500);
    }
});
// Get user's favorite stores
exports.getUserFavorites = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const result = await Favorite_1.Favorite.getUserFavorites(userId, Number(page), Number(limit));
        (0, response_1.sendSuccess)(res, {
            favorites: result.favorites,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error('Get user favorites error:', error);
        throw new errorHandler_1.AppError('Failed to fetch user favorites', 500);
    }
});
// Check if store is favorited by user
exports.isStoreFavorited = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const isFavorited = await Favorite_1.Favorite.isStoreFavorited(userId, storeId);
        (0, response_1.sendSuccess)(res, {
            isFavorited
        });
    }
    catch (error) {
        console.error('Check favorite status error:', error);
        throw new errorHandler_1.AppError('Failed to check favorite status', 500);
    }
});
// Get favorite status for multiple stores
exports.getFavoriteStatuses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeIds } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
        throw new errorHandler_1.AppError('Store IDs array is required', 400);
    }
    try {
        const favorites = await Favorite_1.Favorite.find({
            user: userId,
            store: { $in: storeIds }
        }).select('store');
        const favoritedStoreIds = favorites.map(fav => fav.store.toString());
        const statuses = storeIds.reduce((acc, storeId) => {
            acc[storeId] = favoritedStoreIds.includes(storeId);
            return acc;
        }, {});
        (0, response_1.sendSuccess)(res, {
            statuses
        });
    }
    catch (error) {
        console.error('Get favorite statuses error:', error);
        throw new errorHandler_1.AppError('Failed to get favorite statuses', 500);
    }
});
// Clear all favorites
exports.clearAllFavorites = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const result = await Favorite_1.Favorite.deleteMany({ user: userId });
        (0, response_1.sendSuccess)(res, {
            deletedCount: result.deletedCount
        }, 'All favorites cleared successfully');
    }
    catch (error) {
        console.error('Clear all favorites error:', error);
        throw new errorHandler_1.AppError('Failed to clear all favorites', 500);
    }
});
