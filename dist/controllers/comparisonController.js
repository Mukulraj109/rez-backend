"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllComparisons = exports.getComparisonStats = exports.removeStoreFromComparison = exports.addStoreToComparison = exports.deleteComparison = exports.updateComparison = exports.getComparisonById = exports.getUserComparisons = exports.createComparison = void 0;
const StoreComparison_1 = require("../models/StoreComparison");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Create a new store comparison
exports.createComparison = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeIds, name } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    if (!Array.isArray(storeIds) || storeIds.length < 2 || storeIds.length > 5) {
        throw new errorHandler_1.AppError('Comparison must include 2-5 stores', 400);
    }
    try {
        // Verify all stores exist and are active
        const stores = await Store_1.Store.find({
            _id: { $in: storeIds },
            isActive: true
        });
        if (stores.length !== storeIds.length) {
            throw new errorHandler_1.AppError('One or more stores not found or inactive', 404);
        }
        // Check if comparison already exists
        const existingComparison = await StoreComparison_1.StoreComparison.findComparisonByStores(userId, storeIds);
        if (existingComparison) {
            throw new errorHandler_1.AppError('Comparison with these stores already exists', 400);
        }
        // Create new comparison
        const comparison = new StoreComparison_1.StoreComparison({
            user: userId,
            stores: storeIds,
            name: name || `Comparison ${new Date().toLocaleDateString()}`
        });
        await comparison.save();
        await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        (0, response_1.sendCreated)(res, {
            comparison
        }, 'Store comparison created successfully');
    }
    catch (error) {
        console.error('Create comparison error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to create store comparison', 500);
    }
});
// Get user's store comparisons
exports.getUserComparisons = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const result = await StoreComparison_1.StoreComparison.getUserComparisons(userId, Number(page), Number(limit));
        (0, response_1.sendSuccess)(res, {
            comparisons: result.comparisons,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error('Get user comparisons error:', error);
        throw new errorHandler_1.AppError('Failed to fetch user comparisons', 500);
    }
});
// Get specific comparison by ID
exports.getComparisonById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { comparisonId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const comparison = await StoreComparison_1.StoreComparison.findOne({
            _id: comparisonId,
            user: userId
        }).populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        if (!comparison) {
            throw new errorHandler_1.AppError('Comparison not found', 404);
        }
        (0, response_1.sendSuccess)(res, {
            comparison
        });
    }
    catch (error) {
        console.error('Get comparison by ID error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to fetch comparison', 500);
    }
});
// Update comparison (add/remove stores or rename)
exports.updateComparison = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { comparisonId } = req.params;
    const { storeIds, name } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const comparison = await StoreComparison_1.StoreComparison.findOne({
            _id: comparisonId,
            user: userId
        });
        if (!comparison) {
            throw new errorHandler_1.AppError('Comparison not found', 404);
        }
        // Update stores if provided
        if (storeIds) {
            if (!Array.isArray(storeIds) || storeIds.length < 2 || storeIds.length > 5) {
                throw new errorHandler_1.AppError('Comparison must include 2-5 stores', 400);
            }
            // Verify all stores exist and are active
            const stores = await Store_1.Store.find({
                _id: { $in: storeIds },
                isActive: true
            });
            if (stores.length !== storeIds.length) {
                throw new errorHandler_1.AppError('One or more stores not found or inactive', 404);
            }
            comparison.stores = storeIds;
        }
        // Update name if provided
        if (name) {
            comparison.name = name;
        }
        await comparison.save();
        await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        (0, response_1.sendSuccess)(res, {
            comparison
        }, 'Comparison updated successfully');
    }
    catch (error) {
        console.error('Update comparison error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to update comparison', 500);
    }
});
// Delete comparison
exports.deleteComparison = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { comparisonId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const comparison = await StoreComparison_1.StoreComparison.findOneAndDelete({
            _id: comparisonId,
            user: userId
        });
        if (!comparison) {
            throw new errorHandler_1.AppError('Comparison not found', 404);
        }
        (0, response_1.sendSuccess)(res, null, 'Comparison deleted successfully');
    }
    catch (error) {
        console.error('Delete comparison error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to delete comparison', 500);
    }
});
// Add store to comparison
exports.addStoreToComparison = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { comparisonId } = req.params;
    const { storeId } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const comparison = await StoreComparison_1.StoreComparison.findOne({
            _id: comparisonId,
            user: userId
        });
        if (!comparison) {
            throw new errorHandler_1.AppError('Comparison not found', 404);
        }
        // Check if store is already in comparison
        if (comparison.stores.includes(storeId)) {
            throw new errorHandler_1.AppError('Store is already in this comparison', 400);
        }
        // Check if comparison has reached maximum stores
        if (comparison.stores.length >= 5) {
            throw new errorHandler_1.AppError('Comparison can have maximum 5 stores', 400);
        }
        // Verify store exists and is active
        const store = await Store_1.Store.findOne({
            _id: storeId,
            isActive: true
        });
        if (!store) {
            throw new errorHandler_1.AppError('Store not found or inactive', 404);
        }
        // Add store to comparison
        comparison.stores.push(storeId);
        await comparison.save();
        await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        (0, response_1.sendSuccess)(res, {
            comparison
        }, 'Store added to comparison successfully');
    }
    catch (error) {
        console.error('Add store to comparison error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to add store to comparison', 500);
    }
});
// Remove store from comparison
exports.removeStoreFromComparison = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { comparisonId, storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const comparison = await StoreComparison_1.StoreComparison.findOne({
            _id: comparisonId,
            user: userId
        });
        if (!comparison) {
            throw new errorHandler_1.AppError('Comparison not found', 404);
        }
        // Check if comparison has minimum stores
        if (comparison.stores.length <= 2) {
            throw new errorHandler_1.AppError('Comparison must have at least 2 stores', 400);
        }
        // Remove store from comparison
        comparison.stores = comparison.stores.filter(id => id.toString() !== storeId);
        await comparison.save();
        await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
        (0, response_1.sendSuccess)(res, {
            comparison
        }, 'Store removed from comparison successfully');
    }
    catch (error) {
        console.error('Remove store from comparison error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to remove store from comparison', 500);
    }
});
// Get comparison statistics
exports.getComparisonStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const stats = await StoreComparison_1.StoreComparison.getComparisonStats(userId);
        (0, response_1.sendSuccess)(res, {
            stats
        });
    }
    catch (error) {
        console.error('Get comparison stats error:', error);
        throw new errorHandler_1.AppError('Failed to fetch comparison statistics', 500);
    }
});
// Clear all comparisons
exports.clearAllComparisons = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const result = await StoreComparison_1.StoreComparison.deleteMany({ user: userId });
        (0, response_1.sendSuccess)(res, {
            deletedCount: result.deletedCount
        }, 'All comparisons cleared successfully');
    }
    catch (error) {
        console.error('Clear all comparisons error:', error);
        throw new errorHandler_1.AppError('Failed to clear all comparisons', 500);
    }
});
