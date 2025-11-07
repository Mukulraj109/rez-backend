import { Router } from 'express';
import { 
  getEarningsSummary, 
  getProjectStats, 
  getNotifications, 
  getReferralInfo,
  markNotificationAsRead,
  getEarningsHistory,
  withdrawEarnings
} from '../controllers/earningsController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's earnings summary
router.get('/summary', getEarningsSummary);

// Get user's project statistics
router.get('/project-stats', getProjectStats);

// Get user's earning notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.patch('/notifications/:id/read', 
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  markNotificationAsRead
);

// Get user's referral information
router.get('/referral-info', getReferralInfo);

// Get user's earnings history
router.get('/history',
  validateQuery(Joi.object({
    type: Joi.string().valid('project', 'referral', 'social_media', 'spin', 'withdrawal').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })),
  getEarningsHistory
);

// Withdraw earnings
router.post('/withdraw',
  validate(Joi.object({
    amount: Joi.number().positive().required(),
    method: Joi.string().valid('bank', 'upi', 'wallet').default('bank'),
    accountDetails: Joi.object({
      accountNumber: Joi.string().optional(),
      ifsc: Joi.string().optional(),
      upiId: Joi.string().optional(),
      walletType: Joi.string().optional()
    }).optional()
  })),
  withdrawEarnings
);

export default router;

