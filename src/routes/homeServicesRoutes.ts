import { Router } from 'express';
import {
  getHomeServicesCategories,
  getFeaturedHomeServices,
  getHomeServicesByCategory,
  getHomeServicesStats,
  getPopularHomeServices
} from '../controllers/homeServicesController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/home-services/categories:
 *   get:
 *     summary: Get home services categories for homepage
 *     tags: [Home Services]
 *     responses:
 *       200:
 *         description: List of home services categories
 */
router.get('/categories', optionalAuth, getHomeServicesCategories);

/**
 * @swagger
 * /api/home-services/featured:
 *   get:
 *     summary: Get featured home services for homepage
 *     tags: [Home Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured home services
 */
router.get('/featured', optionalAuth, getFeaturedHomeServices);

/**
 * @swagger
 * /api/home-services/popular:
 *   get:
 *     summary: Get popular home services
 *     tags: [Home Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of popular home services
 */
router.get('/popular', optionalAuth, getPopularHomeServices);

/**
 * @swagger
 * /api/home-services/stats:
 *   get:
 *     summary: Get home services statistics
 *     tags: [Home Services]
 *     responses:
 *       200:
 *         description: Home services statistics
 */
router.get('/stats', optionalAuth, getHomeServicesStats);

/**
 * @swagger
 * /api/home-services/category/:slug:
 *   get:
 *     summary: Get home services by category
 *     tags: [Home Services]
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
 *         description: List of home services in category
 */
router.get('/category/:slug', optionalAuth, getHomeServicesByCategory);

export default router;
