import { Router } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, notificationSchemas, commonSchemas } from '../middleware/validation';
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Get user notifications
router.get('/',
  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    type: Joi.string().valid('order', 'promotion', 'social', 'system'),
    isRead: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserNotifications
);

// Mark notifications as read
router.patch('/read', 
  // generalLimiter,, // Disabled for development
  validate(notificationSchemas.markAsRead),
  markAsRead
);

// Delete notification
router.delete('/:notificationId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    notificationId: commonSchemas.objectId().required()
  })),
  deleteNotification
);

export default router;