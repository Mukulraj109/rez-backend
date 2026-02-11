/**
 * Cash Store Routes
 *
 * Public browsing endpoints for Cash Store category filtering and brand discovery.
 * No auth required for browsing — anyone can see categories and brands.
 *
 * These are separate from cashStoreAffiliateRoutes (which handle click tracking,
 * webhooks, and cashback — some requiring auth).
 */

import { Router } from 'express';
import {
  getCashStoreCategories,
  getCashStoreBrands,
  getCashStoreHomepage,
} from '../controllers/cashStoreController';

const router = Router();

/**
 * GET /api/cashstore/categories
 * Returns active categories with virtual filters (All, Popular, High Cashback)
 */
router.get('/categories', getCashStoreCategories);

/**
 * GET /api/cashstore/brands
 * Query params: category (slug), filter (popular|high-cashback), limit, page
 */
router.get('/brands', getCashStoreBrands);

/**
 * GET /api/cashstore/homepage
 * Aggregated data: categories + top brands + trending + high cashback
 */
router.get('/homepage', getCashStoreHomepage);

export default router;
