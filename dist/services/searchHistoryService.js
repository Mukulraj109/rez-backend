"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldSearches = exports.getSearchSuggestions = exports.logGeneralSearch = exports.logStoreSearch = exports.logProductSearch = exports.logSearch = void 0;
const SearchHistory_1 = require("../models/SearchHistory");
/**
 * Log search query asynchronously
 * This function doesn't block - it fires and forgets
 */
const logSearch = async (params) => {
    const { userId, query, type, resultCount, filters } = params;
    try {
        // Skip if query is empty
        if (!query || query.trim().length === 0) {
            return;
        }
        const trimmedQuery = query.trim().toLowerCase();
        // Check for duplicate searches within last 5 minutes (non-blocking)
        const isDuplicate = await SearchHistory_1.SearchHistory.isDuplicate(userId, trimmedQuery, type, 5);
        if (isDuplicate) {
            console.log('🔍 [SEARCH SERVICE] Duplicate search detected, skipping:', trimmedQuery);
            return;
        }
        // Create search history entry
        await SearchHistory_1.SearchHistory.create({
            user: userId,
            query: trimmedQuery,
            type,
            resultCount: Number(resultCount) || 0,
            filters: filters || {}
        });
        console.log('✅ [SEARCH SERVICE] Logged search:', {
            userId: userId.toString(),
            query: trimmedQuery,
            type,
            resultCount
        });
        // Maintain max 50 entries per user (fire and forget)
        SearchHistory_1.SearchHistory.maintainUserLimit(userId, 50).catch((err) => {
            console.error('❌ [SEARCH SERVICE] Error maintaining user limit:', err.message);
        });
    }
    catch (error) {
        // Log error but don't throw - we don't want to break the search API
        console.error('❌ [SEARCH SERVICE] Error logging search:', error);
    }
};
exports.logSearch = logSearch;
/**
 * Log search for products
 * Convenience wrapper for product searches
 */
const logProductSearch = async (userId, query, resultCount, filters) => {
    // Fire and forget - don't await
    setImmediate(() => {
        (0, exports.logSearch)({
            userId,
            query,
            type: 'product',
            resultCount,
            filters
        });
    });
};
exports.logProductSearch = logProductSearch;
/**
 * Log search for stores
 * Convenience wrapper for store searches
 */
const logStoreSearch = async (userId, query, resultCount, filters) => {
    // Fire and forget - don't await
    setImmediate(() => {
        (0, exports.logSearch)({
            userId,
            query,
            type: 'store',
            resultCount,
            filters
        });
    });
};
exports.logStoreSearch = logStoreSearch;
/**
 * Log general search
 * For global/multi-type searches
 */
const logGeneralSearch = async (userId, query, resultCount) => {
    // Fire and forget - don't await
    setImmediate(() => {
        (0, exports.logSearch)({
            userId,
            query,
            type: 'general',
            resultCount
        });
    });
};
exports.logGeneralSearch = logGeneralSearch;
/**
 * Get user's search suggestions for autocomplete
 * Returns recent and popular searches combined
 */
const getSearchSuggestions = async (userId, type, limit = 10) => {
    try {
        const query = { user: userId };
        if (type && ['product', 'store', 'general'].includes(type)) {
            query.type = type;
        }
        // Get unique recent searches with their metadata
        const suggestions = await SearchHistory_1.SearchHistory.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$query',
                    type: { $first: '$type' },
                    lastSearched: { $first: '$createdAt' },
                    searchCount: { $sum: 1 },
                    avgResults: { $avg: '$resultCount' },
                    clicked: { $max: '$clicked' }
                }
            },
            { $sort: { searchCount: -1, lastSearched: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    query: '$_id',
                    type: 1,
                    lastSearched: 1,
                    searchCount: 1,
                    avgResults: 1,
                    clicked: 1
                }
            }
        ]);
        return suggestions;
    }
    catch (error) {
        console.error('❌ [SEARCH SERVICE] Error getting suggestions:', error);
        return [];
    }
};
exports.getSearchSuggestions = getSearchSuggestions;
/**
 * Clean up old search history entries
 * Should be run as a cron job
 */
const cleanupOldSearches = async (daysToKeep = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await SearchHistory_1.SearchHistory.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        console.log(`🧹 [SEARCH SERVICE] Cleaned up ${result.deletedCount} old search entries`);
        return result.deletedCount || 0;
    }
    catch (error) {
        console.error('❌ [SEARCH SERVICE] Error cleaning up old searches:', error);
        return 0;
    }
};
exports.cleanupOldSearches = cleanupOldSearches;
exports.default = {
    logSearch: exports.logSearch,
    logProductSearch: exports.logProductSearch,
    logStoreSearch: exports.logStoreSearch,
    logGeneralSearch: exports.logGeneralSearch,
    getSearchSuggestions: exports.getSearchSuggestions,
    cleanupOldSearches: exports.cleanupOldSearches
};
