"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const flashSaleController_1 = __importDefault(require("../controllers/flashSaleController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (no auth required)
/**
 * @route   GET /api/flash-sales/active
 * @desc    Get all active flash sales
 * @access  Public
 */
router.get('/active', flashSaleController_1.default.getActiveFlashSales);
/**
 * @route   GET /api/flash-sales/upcoming
 * @desc    Get upcoming flash sales
 * @access  Public
 */
router.get('/upcoming', flashSaleController_1.default.getUpcomingFlashSales);
/**
 * @route   GET /api/flash-sales/expiring-soon
 * @desc    Get flash sales expiring soon (within specified minutes)
 * @query   minutes - Number of minutes (default: 5)
 * @access  Public
 */
router.get('/expiring-soon', flashSaleController_1.default.getExpiringSoonFlashSales);
/**
 * @route   GET /api/flash-sales/:id
 * @desc    Get flash sale by ID
 * @access  Public
 */
router.get('/:id', flashSaleController_1.default.getFlashSaleById);
/**
 * @route   GET /api/flash-sales/product/:productId
 * @desc    Get flash sales for a specific product
 * @access  Public
 */
router.get('/product/:productId', flashSaleController_1.default.getFlashSalesByProduct);
/**
 * @route   GET /api/flash-sales/category/:categoryId
 * @desc    Get flash sales for a specific category
 * @access  Public
 */
router.get('/category/:categoryId', flashSaleController_1.default.getFlashSalesByCategory);
/**
 * @route   POST /api/flash-sales/:id/track-click
 * @desc    Track click on flash sale
 * @access  Public
 */
router.post('/:id/track-click', flashSaleController_1.default.trackClick);
// Protected routes (require authentication)
/**
 * @route   POST /api/flash-sales/validate-purchase
 * @desc    Validate flash sale purchase
 * @access  Private
 */
router.post('/validate-purchase', auth_1.authenticate, flashSaleController_1.default.validateFlashSalePurchase);
/**
 * @route   POST /api/flash-sales/best-offer
 * @desc    Find best offer for cart (auto-apply)
 * @access  Private
 */
router.post('/best-offer', auth_1.authenticate, flashSaleController_1.default.findBestOffer);
/**
 * @route   POST /api/flash-sales/apply-offer
 * @desc    Apply specific offer to cart
 * @access  Private
 */
router.post('/apply-offer', auth_1.authenticate, flashSaleController_1.default.applyOffer);
/**
 * @route   POST /api/flash-sales/validate-promo
 * @desc    Validate promo code
 * @access  Private
 */
router.post('/validate-promo', auth_1.authenticate, flashSaleController_1.default.validatePromoCode);
// Admin routes (require admin authentication)
// Note: Add admin middleware when available
/**
 * @route   POST /api/flash-sales
 * @desc    Create new flash sale
 * @access  Private (Admin)
 */
router.post('/', auth_1.authenticate, flashSaleController_1.default.createFlashSale);
/**
 * @route   PUT /api/flash-sales/:id
 * @desc    Update flash sale
 * @access  Private (Admin)
 */
router.put('/:id', auth_1.authenticate, flashSaleController_1.default.updateFlashSale);
/**
 * @route   DELETE /api/flash-sales/:id
 * @desc    Delete flash sale
 * @access  Private (Admin)
 */
router.delete('/:id', auth_1.authenticate, flashSaleController_1.default.deleteFlashSale);
/**
 * @route   GET /api/flash-sales/:id/stats
 * @desc    Get flash sale statistics
 * @access  Private (Admin)
 */
router.get('/:id/stats', auth_1.authenticate, flashSaleController_1.default.getFlashSaleStats);
exports.default = router;
