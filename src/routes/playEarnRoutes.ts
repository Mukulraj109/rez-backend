/**
 * Play & Earn Routes
 *
 * Configuration endpoints for the Play & Earn page.
 * Base path: /api/play-earn
 */

import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { getShoppingMethods } from '../controllers/playEarnController';

const router = Router();

// Shopping methods config (public, no auth required)
router.get('/shopping-methods', optionalAuth, getShoppingMethods);

export default router;
