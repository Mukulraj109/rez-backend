import { Router } from 'express';
import {
  getTravelServicesCategories,
  getFeaturedTravelServices,
  getTravelServicesByCategory,
  getTravelServicesStats,
  getPopularTravelServices
} from '../controllers/travelServicesController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/travel-services/categories:
 *   get:
 *     summary: Get travel service categories for homepage
 *     tags: [Travel Services]
 *     responses:
 *       200:
 *         description: List of travel service categories
 */
router.get('/categories', optionalAuth, getTravelServicesCategories);

/**
 * @swagger
 * /api/travel-services/featured:
 *   get:
 *     summary: Get featured travel services for homepage
 *     tags: [Travel Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured travel services
 */
router.get('/featured', optionalAuth, getFeaturedTravelServices);

/**
 * @swagger
 * /api/travel-services/popular:
 *   get:
 *     summary: Get popular travel services
 *     tags: [Travel Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of popular travel services
 */
router.get('/popular', optionalAuth, getPopularTravelServices);

/**
 * @swagger
 * /api/travel-services/stats:
 *   get:
 *     summary: Get travel services statistics
 *     tags: [Travel Services]
 *     responses:
 *       200:
 *         description: Travel services statistics
 */
router.get('/stats', optionalAuth, getTravelServicesStats);

/**
 * @swagger
 * /api/travel-services/category/:slug:
 *   get:
 *     summary: Get travel services by category
 *     tags: [Travel Services]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest, popular]
 *     responses:
 *       200:
 *         description: List of travel services in category
 */
router.get('/category/:slug', optionalAuth, getTravelServicesByCategory);

export default router;
