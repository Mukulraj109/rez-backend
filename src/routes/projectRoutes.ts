import { Router } from 'express';
import {
  submitProject,
  getProjects,
  getProjectById,
  getProjectsByCategory,
  getFeaturedProjects,
  toggleProjectLike,
  addProjectComment,
  getMySubmissions
} from '../controllers/projectController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Submit a project (requires authentication)
router.post('/submit',
  authenticate,
  validate(Joi.object({
    projectId: commonSchemas.objectId().required(),
    content: Joi.alternatives().try(
      Joi.string().trim().min(1).max(5000),
      Joi.array().items(Joi.string().uri())
    ).required(),
    contentType: Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: Joi.string().trim().max(1000).optional(),
    metadata: Joi.object().optional()
  })),
  submitProject
);

// Get all projects with filtering
router.get('/', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().valid('beauty', 'fashion', 'lifestyle', 'tutorial', 'diy', 'fitness'),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    creator: commonSchemas.objectId(),
    status: Joi.string().valid('active', 'completed'),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('newest', 'popular', 'trending', 'difficulty_easy', 'difficulty_hard').default('newest'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getProjects
);

// Get featured projects
router.get('/featured', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedProjects
);

// Get projects by category
router.get('/category/:category',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('beauty', 'fashion', 'lifestyle', 'tutorial', 'diy', 'fitness').required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getProjectsByCategory
);

// Get user's project submissions (requires authentication)
router.get('/my-submissions',
  // generalLimiter,, // Disabled for development
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getMySubmissions
);

// Get single project by ID
router.get('/:projectId', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  getProjectById
);

// Like/Unlike project (requires authentication)
router.post('/:projectId/like', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  toggleProjectLike
);

// Add comment to project (requires authentication)
router.post('/:projectId/comments', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    comment: Joi.string().trim().min(1).max(500).required()
  })),
  addProjectComment
);

export default router;