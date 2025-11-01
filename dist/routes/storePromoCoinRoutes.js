"use strict";
// Store Promo Coin Routes
// Routes for managing store-specific promotional coins
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storePromoCoinController_1 = require("../controllers/storePromoCoinController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/store-promo-coins
 * @desc    Get all store promo coins for the authenticated user
 * @access  Private
 */
router.get('/', storePromoCoinController_1.getUserStorePromoCoins);
/**
 * @route   GET /api/store-promo-coins/store/:storeId
 * @desc    Get promo coins for a specific store
 * @access  Private
 */
router.get('/store/:storeId', storePromoCoinController_1.getStorePromoCoins);
/**
 * @route   GET /api/store-promo-coins/transactions
 * @desc    Get transaction history for all store promo coins
 * @access  Private
 */
router.get('/transactions', storePromoCoinController_1.getStorePromoCoinTransactions);
/**
 * @route   POST /api/store-promo-coins/use
 * @desc    Use promo coins (internal use, called during checkout)
 * @access  Private
 */
router.post('/use', storePromoCoinController_1.useStorePromoCoins);
exports.default = router;
