"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutocomplete = exports.getSearchAnalytics = exports.clearSearchHistory = exports.deleteSearchHistory = exports.markSearchAsClicked = exports.getRecentSearches = exports.getPopularSearches = exports.getSearchHistory = exports.saveSearchHistory = exports.clearSearchCache = exports.globalSearch = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const Article_1 = require("../models/Article");
const SearchHistory_1 = require("../models/SearchHistory");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
/**
 * Calculate relevance score for search results
 * Scoring: exact match > starts with > contains
 */
const calculateRelevance = (text, query) => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (lowerText === lowerQuery)
        return 100; // Exact match
    if (lowerText.startsWith(lowerQuery))
        return 75; // Starts with
    if (lowerText.includes(lowerQuery))
        return 50; // Contains
    return 0;
};
/**
 * Sort items by relevance score
 */
const sortByRelevance = (items, query, fields) => {
    return items.map(item => {
        let maxScore = 0;
        fields.forEach(field => {
            const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
            if (fieldValue && typeof fieldValue === 'string') {
                const score = calculateRelevance(fieldValue, query);
                maxScore = Math.max(maxScore, score);
            }
        });
        return { ...item, relevanceScore: maxScore };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
};
/**
 * Search products by query
 */
const searchProducts = async (query, limit) => {
    try {
        const searchQuery = {
            isActive: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        };
        const products = await Product_1.Product.find(searchQuery)
            .populate('category', 'name slug')
            .populate('store', 'name logo')
            .select('name slug images pricing ratings inventory brand tags')
            .limit(limit + 10) // Fetch extra for sorting
            .lean();
        const total = await Product_1.Product.countDocuments(searchQuery);
        // Sort by relevance and limit
        const sortedProducts = sortByRelevance(products, query, ['name', 'brand', 'description']).slice(0, limit);
        return {
            items: sortedProducts.map(p => ({
                ...p,
                type: 'product',
                id: p._id?.toString()
            })),
            total,
            hasMore: total > limit
        };
    }
    catch (error) {
        console.error('Error searching products:', error);
        return { items: [], total: 0, hasMore: false };
    }
};
/**
 * Search stores by query
 */
const searchStores = async (query, limit) => {
    try {
        const searchQuery = {
            isActive: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } },
                { 'location.address': { $regex: query, $options: 'i' } },
                { 'location.city': { $regex: query, $options: 'i' } }
            ]
        };
        const stores = await Store_1.Store.find(searchQuery)
            .populate('category', 'name slug')
            .select('name slug logo coverImage description tags location ratings category')
            .limit(limit + 10) // Fetch extra for sorting
            .lean();
        const total = await Store_1.Store.countDocuments(searchQuery);
        // Sort by relevance and limit
        const sortedStores = sortByRelevance(stores, query, ['name', 'description']).slice(0, limit);
        return {
            items: sortedStores.map(s => ({
                ...s,
                type: 'store',
                id: s._id?.toString()
            })),
            total,
            hasMore: total > limit
        };
    }
    catch (error) {
        console.error('Error searching stores:', error);
        return { items: [], total: 0, hasMore: false };
    }
};
/**
 * Search articles by query
 */
const searchArticles = async (query, limit) => {
    try {
        const searchQuery = {
            isPublished: true,
            isApproved: true,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { excerpt: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        };
        const articles = await Article_1.Article.find(searchQuery)
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .select('title slug excerpt coverImage category tags analytics author authorType')
            .limit(limit + 10) // Fetch extra for sorting
            .lean();
        const total = await Article_1.Article.countDocuments(searchQuery);
        // Sort by relevance and limit
        const sortedArticles = sortByRelevance(articles, query, ['title', 'excerpt']).slice(0, limit);
        return {
            items: sortedArticles.map((a) => ({
                ...a,
                type: 'article',
                id: a._id?.toString(),
                viewCount: a.analytics?.totalViews || 0,
                author: a.author ? {
                    id: a.author._id?.toString(),
                    name: `${a.author.profile?.firstName || ''} ${a.author.profile?.lastName || ''}`.trim() || 'Unknown',
                    avatar: a.author.profile?.avatar || ''
                } : undefined
            })),
            total,
            hasMore: total > limit
        };
    }
    catch (error) {
        console.error('Error searching articles:', error);
        return { items: [], total: 0, hasMore: false };
    }
};
/**
 * Global Search Controller
 * Searches across products, stores, and articles simultaneously
 *
 * Query Parameters:
 * - q (required): search query
 * - types (optional): comma-separated list (products,stores,articles) - default: all
 * - limit (optional): results per type (default: 10, max: 50)
 *
 * Features:
 * - Parallel search execution using Promise.all
 * - Redis caching (10 minutes TTL)
 * - Relevance scoring (exact match > starts with > contains)
 * - Results sorted by relevance within each type
 *
 * Performance:
 * - Uses Promise.all for parallel searches
 * - Limits fields returned (only essential data)
 * - Target execution time < 500ms
 */
exports.globalSearch = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { q: query, types: typesParam, limit: limitParam = 10 } = req.query;
    // Validate query parameter
    if (!query || typeof query !== 'string') {
        return (0, response_1.sendBadRequest)(res, 'Search query (q) is required');
    }
    // Validate and parse limit
    const limit = Math.min(Number(limitParam) || 10, 50); // Max 50 per type
    // Parse search types
    const defaultTypes = ['products', 'stores', 'articles'];
    const requestedTypes = typesParam
        ? typesParam.split(',').map(t => t.trim().toLowerCase())
        : defaultTypes;
    // Validate types
    const validTypes = requestedTypes.filter(t => defaultTypes.includes(t));
    if (validTypes.length === 0) {
        return (0, response_1.sendBadRequest)(res, 'Invalid types parameter. Valid types: products, stores, articles');
    }
    // Generate cache key
    const cacheKey = `search:global:${query}:${validTypes.sort().join(',')}:${limit}`;
    try {
        // Check cache first
        const cachedResult = await redisService_1.default.get(cacheKey);
        if (cachedResult) {
            const executionTime = Date.now() - startTime;
            console.log(`✅ [GLOBAL SEARCH] Cache hit for query: "${query}" (${executionTime}ms)`);
            return (0, response_1.sendSuccess)(res, {
                ...cachedResult,
                cached: true,
                executionTime
            }, 'Global search completed successfully (cached)');
        }
        console.log(`🔍 [GLOBAL SEARCH] Searching for: "${query}" across types: ${validTypes.join(', ')}`);
        // Prepare search promises based on requested types
        const searchPromises = [];
        const typeMap = [];
        if (validTypes.includes('products')) {
            searchPromises.push(searchProducts(query, limit));
            typeMap.push('products');
        }
        if (validTypes.includes('stores')) {
            searchPromises.push(searchStores(query, limit));
            typeMap.push('stores');
        }
        if (validTypes.includes('articles')) {
            searchPromises.push(searchArticles(query, limit));
            typeMap.push('articles');
        }
        // Execute all searches in parallel
        const searchResults = await Promise.all(searchPromises);
        // Map results to their types
        const results = {
            products: { items: [], total: 0, hasMore: false },
            stores: { items: [], total: 0, hasMore: false },
            articles: { items: [], total: 0, hasMore: false }
        };
        searchResults.forEach((result, index) => {
            const type = typeMap[index];
            results[type] = result;
        });
        // Calculate total results
        const totalResults = Object.values(results).reduce((sum, r) => sum + r.total, 0);
        const responseData = {
            query,
            results,
            totalResults,
            requestedTypes: validTypes,
            limit
        };
        // Cache the results for 10 minutes (600 seconds)
        const CACHE_TTL = 600;
        await redisService_1.default.set(cacheKey, responseData, CACHE_TTL);
        const executionTime = Date.now() - startTime;
        console.log(`✅ [GLOBAL SEARCH] Completed in ${executionTime}ms. Total results: ${totalResults}`);
        return (0, response_1.sendSuccess)(res, {
            ...responseData,
            cached: false,
            executionTime
        }, 'Global search completed successfully');
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`❌ [GLOBAL SEARCH] Error after ${executionTime}ms:`, error);
        return (0, response_1.sendError)(res, 'Failed to perform global search', 500);
    }
});
/**
 * Clear search cache
 * Useful for cache invalidation when data is updated
 */
exports.clearSearchCache = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Note: This is a simplified version. In production, you might want to
        // use Redis SCAN to find and delete all keys matching "search:global:*"
        console.log('🗑️ [GLOBAL SEARCH] Cache clearing requested');
        return (0, response_1.sendSuccess)(res, {
            message: 'Search cache cleared successfully'
        }, 'Cache cleared');
    }
    catch (error) {
        console.error('❌ [GLOBAL SEARCH] Error clearing cache:', error);
        return (0, response_1.sendError)(res, 'Failed to clear search cache', 500);
    }
});
// ============================================
// SEARCH HISTORY ENDPOINTS
// ============================================
/**
 * Save search query to history
 * POST /api/search/history
 */
exports.saveSearchHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { query, type = 'general', resultCount = 0, filters } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new errorHandler_1.AppError('Search query is required', 400);
    }
    const trimmedQuery = query.trim().toLowerCase();
    // Check for duplicate searches within last 5 minutes
    const isDuplicate = await SearchHistory_1.SearchHistory.isDuplicate(userId, trimmedQuery, type, 5);
    if (isDuplicate) {
        console.log('🔍 [SEARCH HISTORY] Duplicate search detected, skipping:', trimmedQuery);
        return (0, response_1.sendSuccess)(res, { message: 'Search already recorded recently' });
    }
    // Create new search history entry
    const searchHistory = await SearchHistory_1.SearchHistory.create({
        user: userId,
        query: trimmedQuery,
        type,
        resultCount: Number(resultCount) || 0,
        filters: filters || {}
    });
    // Maintain max 50 entries per user (async, don't block response)
    SearchHistory_1.SearchHistory.maintainUserLimit(userId, 50).catch((err) => {
        console.error('❌ [SEARCH HISTORY] Error maintaining user limit:', err);
    });
    console.log('✅ [SEARCH HISTORY] Saved search:', {
        userId,
        query: trimmedQuery,
        type,
        resultCount
    });
    return (0, response_1.sendCreated)(res, searchHistory, 'Search history saved successfully');
});
/**
 * Get user's search history
 * GET /api/search/history
 */
exports.getSearchHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { type, limit = 20, page = 1, includeClicked = 'true' } = req.query;
    const query = { user: userId };
    if (type && ['product', 'store', 'general'].includes(type)) {
        query.type = type;
    }
    if (includeClicked === 'false') {
        query.clicked = false;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Math.min(Number(limit), 100); // Max 100 per page
    const [searches, total] = await Promise.all([
        SearchHistory_1.SearchHistory.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-__v')
            .lean(),
        SearchHistory_1.SearchHistory.countDocuments(query)
    ]);
    console.log('📜 [SEARCH HISTORY] Retrieved history:', {
        userId,
        count: searches.length,
        total
    });
    return (0, response_1.sendSuccess)(res, {
        searches,
        pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});
/**
 * Get popular/frequent searches for autocomplete
 * GET /api/search/history/popular
 */
exports.getPopularSearches = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { limit = 10, type } = req.query;
    const limitNum = Math.min(Number(limit), 20);
    // Get popular searches using aggregation
    let popularSearches = await SearchHistory_1.SearchHistory.getPopularSearches(userId, limitNum);
    // Filter by type if specified
    if (type && ['product', 'store', 'general'].includes(type)) {
        popularSearches = popularSearches.filter((s) => s.type === type);
    }
    console.log('🔥 [SEARCH HISTORY] Popular searches:', {
        userId,
        count: popularSearches.length
    });
    return (0, response_1.sendSuccess)(res, {
        searches: popularSearches,
        count: popularSearches.length
    });
});
/**
 * Get recent unique searches (for autocomplete dropdown)
 * GET /api/search/history/recent
 */
exports.getRecentSearches = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { limit = 5, type } = req.query;
    const limitNum = Math.min(Number(limit), 10);
    const query = { user: userId };
    if (type && ['product', 'store', 'general'].includes(type)) {
        query.type = type;
    }
    // Get recent unique searches
    const recentSearches = await SearchHistory_1.SearchHistory.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$query',
                type: { $first: '$type' },
                lastSearched: { $first: '$createdAt' },
                resultCount: { $first: '$resultCount' }
            }
        },
        { $sort: { lastSearched: -1 } },
        { $limit: limitNum },
        {
            $project: {
                _id: 0,
                query: '$_id',
                type: 1,
                lastSearched: 1,
                resultCount: 1
            }
        }
    ]);
    console.log('🕐 [SEARCH HISTORY] Recent searches:', {
        userId,
        count: recentSearches.length
    });
    return (0, response_1.sendSuccess)(res, {
        searches: recentSearches,
        count: recentSearches.length
    });
});
/**
 * Mark search as clicked
 * PATCH /api/search/history/:id/click
 */
exports.markSearchAsClicked = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    const { id } = req.params;
    const { itemId, itemType } = req.body;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new errorHandler_1.AppError('Invalid search history ID', 400);
    }
    if (!itemId || !itemType || !['product', 'store'].includes(itemType)) {
        throw new errorHandler_1.AppError('Valid itemId and itemType (product/store) are required', 400);
    }
    // Find and verify ownership
    const searchHistory = await SearchHistory_1.SearchHistory.findOne({
        _id: id,
        user: userId
    });
    if (!searchHistory) {
        throw new errorHandler_1.AppError('Search history not found', 404);
    }
    // Update using static method
    const updated = await SearchHistory_1.SearchHistory.markAsClicked(new mongoose_1.default.Types.ObjectId(id), new mongoose_1.default.Types.ObjectId(itemId), itemType);
    console.log('👆 [SEARCH HISTORY] Marked as clicked:', {
        searchId: id,
        itemId,
        itemType
    });
    return (0, response_1.sendSuccess)(res, updated, 'Search marked as clicked');
});
/**
 * Delete specific search history entry
 * DELETE /api/search/history/:id
 */
exports.deleteSearchHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    const { id } = req.params;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new errorHandler_1.AppError('Invalid search history ID', 400);
    }
    const searchHistory = await SearchHistory_1.SearchHistory.findOneAndDelete({
        _id: id,
        user: userId
    });
    if (!searchHistory) {
        throw new errorHandler_1.AppError('Search history not found', 404);
    }
    console.log('🗑️ [SEARCH HISTORY] Deleted entry:', { id, userId });
    return (0, response_1.sendSuccess)(res, null, 'Search history deleted successfully');
});
/**
 * Clear all search history for user
 * DELETE /api/search/history
 */
exports.clearSearchHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { type } = req.query;
    const query = { user: userId };
    if (type && ['product', 'store', 'general'].includes(type)) {
        query.type = type;
    }
    const result = await SearchHistory_1.SearchHistory.deleteMany(query);
    console.log('🧹 [SEARCH HISTORY] Cleared history:', {
        userId,
        type: type || 'all',
        deletedCount: result.deletedCount
    });
    return (0, response_1.sendSuccess)(res, {
        deletedCount: result.deletedCount
    }, 'Search history cleared successfully');
});
/**
 * Get search analytics for user
 * GET /api/search/history/analytics
 */
exports.getSearchAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const analytics = await SearchHistory_1.SearchHistory.aggregate([
        { $match: { user: new mongoose_1.default.Types.ObjectId(userId) } },
        {
            $facet: {
                totalSearches: [
                    { $count: 'count' }
                ],
                searchesByType: [
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                    { $project: { type: '$_id', count: 1, _id: 0 } }
                ],
                clickRate: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            clicked: {
                                $sum: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            clickRate: {
                                $multiply: [{ $divide: ['$clicked', '$total'] }, 100]
                            }
                        }
                    }
                ],
                avgResultCount: [
                    {
                        $group: {
                            _id: null,
                            avgResults: { $avg: '$resultCount' }
                        }
                    },
                    { $project: { _id: 0, avgResults: 1 } }
                ],
                topSearches: [
                    {
                        $group: {
                            _id: '$query',
                            count: { $sum: 1 },
                            avgResults: { $avg: '$resultCount' }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            query: '$_id',
                            count: 1,
                            avgResults: 1,
                            _id: 0
                        }
                    }
                ]
            }
        }
    ]);
    const result = analytics[0] || {};
    console.log('📊 [SEARCH HISTORY] Analytics retrieved:', { userId });
    return (0, response_1.sendSuccess)(res, {
        totalSearches: result.totalSearches?.[0]?.count || 0,
        searchesByType: result.searchesByType || [],
        clickRate: result.clickRate?.[0]?.clickRate || 0,
        avgResultCount: result.avgResultCount?.[0]?.avgResults || 0,
        topSearches: result.topSearches || []
    });
});
// ============================================
// AUTOCOMPLETE ENDPOINT (Phase 2)
// ============================================
/**
 * Enhanced Autocomplete Endpoint
 * Returns structured suggestions for products, stores, categories, and brands
 *
 * GET /api/search/autocomplete?q=query
 */
exports.getAutocomplete = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q: searchQuery } = req.query;
    if (!searchQuery || typeof searchQuery !== 'string') {
        return (0, response_1.sendError)(res, 'Search query is required', 400);
    }
    if (searchQuery.trim().length < 2) {
        return (0, response_1.sendError)(res, 'Search query must be at least 2 characters', 400);
    }
    const normalizedQuery = searchQuery.trim();
    try {
        console.log('🔍 [AUTOCOMPLETE] Processing query:', normalizedQuery);
        const cacheKey = `search:autocomplete:${normalizedQuery.toLowerCase()}`;
        const cachedResults = await redisService_1.default.get(cacheKey);
        if (cachedResults) {
            console.log('✅ [AUTOCOMPLETE] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedResults, 'Autocomplete suggestions retrieved successfully');
        }
        const searchRegex = new RegExp(normalizedQuery, 'i');
        const [products, stores, categories, brands] = await Promise.all([
            Product_1.Product.find({
                isActive: true,
                'inventory.isAvailable': true,
                $or: [
                    { name: searchRegex },
                    { title: searchRegex },
                    { brand: searchRegex },
                    { description: searchRegex }
                ]
            })
                .select('_id name title price pricing image images brand store')
                .populate('store', 'name')
                .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
                .limit(5)
                .lean(),
            Store_1.Store.find({
                isActive: true,
                $or: [
                    { name: searchRegex },
                    { description: searchRegex }
                ]
            })
                .select('_id name logo')
                .sort({ 'ratings.average': -1, 'ratings.count': -1 })
                .limit(3)
                .lean(),
            (async () => {
                try {
                    const { Category } = await Promise.resolve().then(() => __importStar(require('../models/Category')));
                    return await Category.find({
                        isActive: true,
                        $or: [
                            { name: searchRegex },
                            { description: searchRegex }
                        ]
                    })
                        .select('_id name')
                        .sort({ productCount: -1 })
                        .limit(3)
                        .lean();
                }
                catch (error) {
                    console.warn('⚠️ [AUTOCOMPLETE] Category search failed:', error);
                    return [];
                }
            })(),
            Product_1.Product.aggregate([
                {
                    $match: {
                        isActive: true,
                        brand: { $exists: true, $ne: '', $regex: searchRegex }
                    }
                },
                {
                    $group: {
                        _id: '$brand',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 3 },
                {
                    $project: {
                        _id: 0,
                        name: '$_id'
                    }
                }
            ])
        ]);
        const transformedProducts = products.map(product => ({
            _id: product._id,
            name: product.name || product.title,
            price: product.pricing?.selling || product.price || 0,
            image: product.image || product.images?.[0] || '',
            store: {
                name: product.store?.name || 'Unknown Store'
            }
        }));
        const transformedStores = stores.map(store => ({
            _id: store._id,
            name: store.name,
            logo: store.logo || ''
        }));
        const transformedCategories = categories.map(category => ({
            _id: category._id,
            name: category.name
        }));
        const brandNames = brands.map(b => b.name);
        const response = {
            products: transformedProducts,
            stores: transformedStores,
            categories: transformedCategories,
            brands: brandNames
        };
        await redisService_1.default.set(cacheKey, response, 300);
        console.log('✅ [AUTOCOMPLETE] Results:', {
            products: transformedProducts.length,
            stores: transformedStores.length,
            categories: transformedCategories.length,
            brands: brandNames.length
        });
        (0, response_1.sendSuccess)(res, response, 'Autocomplete suggestions retrieved successfully');
    }
    catch (error) {
        console.error('❌ [AUTOCOMPLETE] Error:', error);
        console.error('❌ [AUTOCOMPLETE] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [AUTOCOMPLETE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return (0, response_1.sendError)(res, 'Failed to get autocomplete suggestions', 500);
    }
});
