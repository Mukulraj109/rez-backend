import { Request, Response } from 'express';
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
export declare const globalSearch: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Clear search cache
 * Useful for cache invalidation when data is updated
 */
export declare const clearSearchCache: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Save search query to history
 * POST /api/search/history
 */
export declare const saveSearchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's search history
 * GET /api/search/history
 */
export declare const getSearchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get popular/frequent searches for autocomplete
 * GET /api/search/history/popular
 */
export declare const getPopularSearches: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get recent unique searches (for autocomplete dropdown)
 * GET /api/search/history/recent
 */
export declare const getRecentSearches: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Mark search as clicked
 * PATCH /api/search/history/:id/click
 */
export declare const markSearchAsClicked: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Delete specific search history entry
 * DELETE /api/search/history/:id
 */
export declare const deleteSearchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Clear all search history for user
 * DELETE /api/search/history
 */
export declare const clearSearchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get search analytics for user
 * GET /api/search/history/analytics
 */
export declare const getSearchAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Enhanced Autocomplete Endpoint
 * Returns structured suggestions for products, stores, categories, and brands
 *
 * GET /api/search/autocomplete?q=query
 */
export declare const getAutocomplete: (req: Request, res: Response, next: import("express").NextFunction) => void;
