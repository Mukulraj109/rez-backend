import { Router } from 'express';
import {
  getBankOffers,
  getBankOfferById,
  getExclusiveOffers,
  getExclusiveOfferById
} from '../controllers/offersController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Bank Offers Routes
router.get('/bank',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string(),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getBankOffers
);

router.get('/bank/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: Joi.string().required()
  })),
  getBankOfferById
);

// Exclusive Offers Routes
router.get('/exclusive',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string(),
    targetAudience: Joi.string().valid('student', 'women', 'senior', 'corporate', 'birthday', 'first', 'all')
  })),
  getExclusiveOffers
);

router.get('/exclusive/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: Joi.string().required()
  })),
  getExclusiveOfferById
);

export default router;





