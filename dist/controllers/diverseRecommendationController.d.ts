import { Request, Response } from 'express';
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
export declare const getDiverseRecommendations: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const _default: {
    getDiverseRecommendations: (req: Request, res: Response, next: import("express").NextFunction) => void;
};
export default _default;
