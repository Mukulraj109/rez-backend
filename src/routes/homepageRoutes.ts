import { Router } from 'express';
import { getHomepage, getAvailableSections, getUserContext } from '../controllers/homepageController';
import { optionalAuth, authenticate } from '../middleware/auth';
import { Joi } from '../middleware/validation';
import { validateQuery } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/homepage
 * @desc    Get all homepage data in a single batch request
 * @access  Public (optionalAuth - works with or without authentication)
 * @query   {string} sections - Comma-separated list of sections (optional, default: all)
 *          Example: "featuredProducts,newArrivals,categories"
 * @query   {number} limit - Limit for each section (optional, uses defaults per section)
 * @query   {string} location - User location as "lat,lng" (optional)
 *          Example: "28.7041,77.1025"
 *
 * @example
 * GET /api/homepage
 * GET /api/homepage?sections=featuredProducts,categories&limit=5
 * GET /api/homepage?location=28.7041,77.1025
 */
router.get('/',
  optionalAuth, // Works with or without auth token
  validateQuery(Joi.object({
    sections: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
    region: Joi.string().optional(),
    userId: Joi.string().optional(),
  })),
  getHomepage
);

/**
 * @route   GET /api/homepage/sections
 * @desc    Get list of available sections for homepage
 * @access  Public
 *
 * @example
 * GET /api/homepage/sections
 */
router.get('/sections',
  getAvailableSections
);

/**
 * @route   GET /api/homepage/user-context
 * @desc    Get all user-specific homepage data in a single request
 *          (wallet balance, voucher count, offers count, cart count, subscription)
 * @access  Private (requires auth)
 */
router.get('/user-context',
  authenticate,
  getUserContext
);

export default router;
