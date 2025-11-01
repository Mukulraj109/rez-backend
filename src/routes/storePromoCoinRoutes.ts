// Store Promo Coin Routes
// Routes for managing store-specific promotional coins

import { Router } from 'express';
import {
  getUserStorePromoCoins,
  getStorePromoCoins,
  getStorePromoCoinTransactions,
  useStorePromoCoins
} from '../controllers/storePromoCoinController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/store-promo-coins
 * @desc    Get all store promo coins for the authenticated user
 * @access  Private
 */
router.get('/', getUserStorePromoCoins);

/**
 * @route   GET /api/store-promo-coins/store/:storeId
 * @desc    Get promo coins for a specific store
 * @access  Private
 */
router.get('/store/:storeId', getStorePromoCoins);

/**
 * @route   GET /api/store-promo-coins/transactions
 * @desc    Get transaction history for all store promo coins
 * @access  Private
 */
router.get('/transactions', getStorePromoCoinTransactions);

/**
 * @route   POST /api/store-promo-coins/use
 * @desc    Use promo coins (internal use, called during checkout)
 * @access  Private
 */
router.post('/use', useStorePromoCoins);

export default router;

