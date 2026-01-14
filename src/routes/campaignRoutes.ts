import { Router } from 'express';
import {
  getActiveCampaigns,
  getCampaignsByType,
  getCampaignById,
  getAllCampaigns,
  getExcitingDeals,
  trackDealInteraction,
} from '../controllers/campaignController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, Joi } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with pagination
 * @access  Public
 */
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    active: Joi.string().valid('true', 'false').default('true'),
  })),
  getAllCampaigns
);

/**
 * @route   GET /api/campaigns/active
 * @desc    Get all active campaigns
 * @access  Public
 */
router.get('/active',
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general'),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getActiveCampaigns
);

/**
 * @route   GET /api/campaigns/exciting-deals
 * @desc    Get campaigns formatted for exciting deals section
 * @access  Public
 */
router.get('/exciting-deals',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6),
  })),
  getExcitingDeals
);

/**
 * @route   GET /api/campaigns/type/:type
 * @desc    Get campaigns by type
 * @access  Public
 */
router.get('/type/:type',
  optionalAuth,
  validateParams(Joi.object({
    type: Joi.string().valid('cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general').required(),
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getCampaignsByType
);

/**
 * @route   GET /api/campaigns/:campaignId
 * @desc    Get single campaign by ID or slug
 * @access  Public
 */
router.get('/:campaignId',
  optionalAuth,
  validateParams(Joi.object({
    campaignId: Joi.string().required(),
  })),
  getCampaignById
);

/**
 * @route   POST /api/campaigns/deals/track
 * @desc    Track deal interaction (view, redeem, like, share)
 * @access  Public (optional auth)
 */
router.post('/deals/track',
  optionalAuth,
  trackDealInteraction
);

export default router;
