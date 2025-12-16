/**
 * Mall Routes
 *
 * API routes for ReZ Mall feature including brands, categories, collections, offers, and banners.
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  // Public endpoints
  getMallHomepageData,
  getMallBrands,
  getFeaturedBrands,
  getNewArrivals,
  getTopRatedBrands,
  getLuxuryBrands,
  searchBrands,
  getMallBrandById,
  getMallCategories,
  getBrandsByCategory,
  getMallCollections,
  getBrandsByCollection,
  getExclusiveOffers,
  getMallOffers,
  getMallHeroBanners,
  getMallBanners,
  trackBrandClick,
  trackBrandPurchase,
  // Admin endpoints
  createMallBrand,
  updateMallBrand,
  deleteMallBrand,
  createMallCategory,
  updateMallCategory,
  deleteMallCategory,
  createMallCollection,
  updateMallCollection,
  deleteMallCollection,
  createMallOffer,
  updateMallOffer,
  deleteMallOffer,
  createMallBanner,
  updateMallBanner,
  deleteMallBanner
} from '../controllers/mallController';

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/mall/homepage
 * @desc    Get aggregated mall homepage data
 * @access  Public (optionalAuth for personalization)
 */
router.get('/homepage', optionalAuth, getMallHomepageData);

// ==================== BRAND ROUTES ====================

/**
 * @route   GET /api/mall/brands
 * @desc    Get all mall brands with filters
 * @access  Public
 */
router.get('/brands', optionalAuth, getMallBrands);

/**
 * @route   GET /api/mall/brands/featured
 * @desc    Get featured brands
 * @access  Public
 */
router.get('/brands/featured', optionalAuth, getFeaturedBrands);

/**
 * @route   GET /api/mall/brands/new
 * @desc    Get new arrival brands
 * @access  Public
 */
router.get('/brands/new', optionalAuth, getNewArrivals);

/**
 * @route   GET /api/mall/brands/top-rated
 * @desc    Get top rated brands
 * @access  Public
 */
router.get('/brands/top-rated', optionalAuth, getTopRatedBrands);

/**
 * @route   GET /api/mall/brands/luxury
 * @desc    Get luxury brands
 * @access  Public
 */
router.get('/brands/luxury', optionalAuth, getLuxuryBrands);

/**
 * @route   GET /api/mall/brands/search
 * @desc    Search brands by name
 * @access  Public
 */
router.get('/brands/search', optionalAuth, searchBrands);

/**
 * @route   GET /api/mall/brands/:brandId
 * @desc    Get brand by ID
 * @access  Public
 */
router.get('/brands/:brandId', optionalAuth, getMallBrandById);

/**
 * @route   POST /api/mall/brands/:brandId/click
 * @desc    Track brand click
 * @access  Public (optionalAuth for user tracking)
 */
router.post('/brands/:brandId/click', optionalAuth, trackBrandClick);

/**
 * @route   POST /api/mall/brands/:brandId/purchase
 * @desc    Track brand purchase
 * @access  Private
 */
router.post('/brands/:brandId/purchase', authenticate, trackBrandPurchase);

// ==================== CATEGORY ROUTES ====================

/**
 * @route   GET /api/mall/categories
 * @desc    Get all mall categories
 * @access  Public
 */
router.get('/categories', optionalAuth, getMallCategories);

/**
 * @route   GET /api/mall/categories/:slug/brands
 * @desc    Get brands by category slug
 * @access  Public
 */
router.get('/categories/:slug/brands', optionalAuth, getBrandsByCategory);

// ==================== COLLECTION ROUTES ====================

/**
 * @route   GET /api/mall/collections
 * @desc    Get all mall collections
 * @access  Public
 */
router.get('/collections', optionalAuth, getMallCollections);

/**
 * @route   GET /api/mall/collections/:slug/brands
 * @desc    Get brands by collection slug
 * @access  Public
 */
router.get('/collections/:slug/brands', optionalAuth, getBrandsByCollection);

// ==================== OFFER ROUTES ====================

/**
 * @route   GET /api/mall/offers
 * @desc    Get all active offers
 * @access  Public
 */
router.get('/offers', optionalAuth, getMallOffers);

/**
 * @route   GET /api/mall/offers/exclusive
 * @desc    Get exclusive mall offers
 * @access  Public
 */
router.get('/offers/exclusive', optionalAuth, getExclusiveOffers);

// ==================== BANNER ROUTES ====================

/**
 * @route   GET /api/mall/banners
 * @desc    Get all banners
 * @access  Public
 */
router.get('/banners', optionalAuth, getMallBanners);

/**
 * @route   GET /api/mall/banners/hero
 * @desc    Get hero banners
 * @access  Public
 */
router.get('/banners/hero', optionalAuth, getMallHeroBanners);

// ==================== ADMIN ROUTES ====================
// Note: In production, add admin role verification middleware

// Brand Admin Routes
router.post('/admin/brands', authenticate, createMallBrand);
router.put('/admin/brands/:brandId', authenticate, updateMallBrand);
router.delete('/admin/brands/:brandId', authenticate, deleteMallBrand);

// Category Admin Routes
router.post('/admin/categories', authenticate, createMallCategory);
router.put('/admin/categories/:categoryId', authenticate, updateMallCategory);
router.delete('/admin/categories/:categoryId', authenticate, deleteMallCategory);

// Collection Admin Routes
router.post('/admin/collections', authenticate, createMallCollection);
router.put('/admin/collections/:collectionId', authenticate, updateMallCollection);
router.delete('/admin/collections/:collectionId', authenticate, deleteMallCollection);

// Offer Admin Routes
router.post('/admin/offers', authenticate, createMallOffer);
router.put('/admin/offers/:offerId', authenticate, updateMallOffer);
router.delete('/admin/offers/:offerId', authenticate, deleteMallOffer);

// Banner Admin Routes
router.post('/admin/banners', authenticate, createMallBanner);
router.put('/admin/banners/:bannerId', authenticate, updateMallBanner);
router.delete('/admin/banners/:bannerId', authenticate, deleteMallBanner);

export default router;
