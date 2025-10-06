import express from 'express';
import flashSaleController from '../controllers/flashSaleController';
import { authenticate as authMiddleware } from '../middleware/auth';

const router = express.Router();

// Public routes (no auth required)

/**
 * @route   GET /api/flash-sales/active
 * @desc    Get all active flash sales
 * @access  Public
 */
router.get('/active', flashSaleController.getActiveFlashSales);

/**
 * @route   GET /api/flash-sales/upcoming
 * @desc    Get upcoming flash sales
 * @access  Public
 */
router.get('/upcoming', flashSaleController.getUpcomingFlashSales);

/**
 * @route   GET /api/flash-sales/expiring-soon
 * @desc    Get flash sales expiring soon (within specified minutes)
 * @query   minutes - Number of minutes (default: 5)
 * @access  Public
 */
router.get('/expiring-soon', flashSaleController.getExpiringSoonFlashSales);

/**
 * @route   GET /api/flash-sales/:id
 * @desc    Get flash sale by ID
 * @access  Public
 */
router.get('/:id', flashSaleController.getFlashSaleById);

/**
 * @route   GET /api/flash-sales/product/:productId
 * @desc    Get flash sales for a specific product
 * @access  Public
 */
router.get('/product/:productId', flashSaleController.getFlashSalesByProduct);

/**
 * @route   GET /api/flash-sales/category/:categoryId
 * @desc    Get flash sales for a specific category
 * @access  Public
 */
router.get('/category/:categoryId', flashSaleController.getFlashSalesByCategory);

/**
 * @route   POST /api/flash-sales/:id/track-click
 * @desc    Track click on flash sale
 * @access  Public
 */
router.post('/:id/track-click', flashSaleController.trackClick);

// Protected routes (require authentication)

/**
 * @route   POST /api/flash-sales/validate-purchase
 * @desc    Validate flash sale purchase
 * @access  Private
 */
router.post('/validate-purchase', authMiddleware, flashSaleController.validateFlashSalePurchase);

/**
 * @route   POST /api/flash-sales/best-offer
 * @desc    Find best offer for cart (auto-apply)
 * @access  Private
 */
router.post('/best-offer', authMiddleware, flashSaleController.findBestOffer);

/**
 * @route   POST /api/flash-sales/apply-offer
 * @desc    Apply specific offer to cart
 * @access  Private
 */
router.post('/apply-offer', authMiddleware, flashSaleController.applyOffer);

/**
 * @route   POST /api/flash-sales/validate-promo
 * @desc    Validate promo code
 * @access  Private
 */
router.post('/validate-promo', authMiddleware, flashSaleController.validatePromoCode);

// Admin routes (require admin authentication)
// Note: Add admin middleware when available

/**
 * @route   POST /api/flash-sales
 * @desc    Create new flash sale
 * @access  Private (Admin)
 */
router.post('/', authMiddleware, flashSaleController.createFlashSale);

/**
 * @route   PUT /api/flash-sales/:id
 * @desc    Update flash sale
 * @access  Private (Admin)
 */
router.put('/:id', authMiddleware, flashSaleController.updateFlashSale);

/**
 * @route   DELETE /api/flash-sales/:id
 * @desc    Delete flash sale
 * @access  Private (Admin)
 */
router.delete('/:id', authMiddleware, flashSaleController.deleteFlashSale);

/**
 * @route   GET /api/flash-sales/:id/stats
 * @desc    Get flash sale statistics
 * @access  Private (Admin)
 */
router.get('/:id/stats', authMiddleware, flashSaleController.getFlashSaleStats);

export default router;
