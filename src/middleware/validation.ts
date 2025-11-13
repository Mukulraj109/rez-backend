import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Generic validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    next();
  };
};

// Parameters validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
 objectId: () => Joi.string().hex().length(24).message('Invalid ID format'),
  
  // Pagination
 pagination: () => ({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid(
      'createdAt', '-createdAt',
      'updatedAt', '-updatedAt',
      'name', '-name'
    ),
    search: Joi.string().trim().max(100)
  }),
  
  // Phone number (Indian format)
 phoneNumber: Joi.string().pattern(/^(\+91|91)?[6-9]\d{9}$/).message('Invalid phone number format'),
  
  // Email
  email: Joi.string().email().lowercase(),
  
  // OTP
  otp: Joi.string().pattern(/^\d{6}$/).message('OTP must be 6 digits'),
  
  // Password (for social login or password-based auth)
  password: Joi.string().min(6).max(50),
  
  // Coordinates [longitude, latitude]
  coordinates: Joi.array().items(Joi.number().min(-180).max(180)).length(2),
  
  // Rating (1-5)
  rating: Joi.number().min(1).max(5),
  
  // Price
  price: Joi.number().min(0).precision(2),
  
  // Quantity
  quantity: Joi.number().integer().min(1).max(99)
};

// Authentication validation schemas
export const authSchemas = {
  sendOTP: Joi.object({
    phoneNumber: commonSchemas.phoneNumber.required(),
    email: commonSchemas.email.optional(),
    referralCode: Joi.string().trim().uppercase().min(6).max(10).optional()
  }),
  
  verifyOTP: Joi.object({
    phoneNumber: commonSchemas.phoneNumber.required(),
    otp: commonSchemas.otp.required()
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      avatar: Joi.string().uri().allow(null, ''),
      bio: Joi.string().trim().max(500),
      website: Joi.string().uri().allow(null, ''),
      dateOfBirth: Joi.date().iso().max('now'),
      gender: Joi.string().valid('male', 'female', 'other'),
      location: Joi.object({
        address: Joi.string().trim().max(200),
        city: Joi.string().trim().max(50),
        state: Joi.string().trim().max(50),
        pincode: Joi.string().pattern(/^\d{6}$/).message('Invalid pincode format'),
        coordinates: commonSchemas.coordinates
      })
    }),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'hi', 'te', 'ta', 'bn'),
      theme: Joi.string().valid('light', 'dark'),
      notifications: Joi.object({
        push: Joi.boolean(),
        email: Joi.boolean(),
        sms: Joi.boolean()
      }),
      emailNotifications: Joi.boolean(),
      pushNotifications: Joi.boolean(),
      smsNotifications: Joi.boolean()
    })
  })
};

// Product validation schemas
export const productSchemas = {
  getProducts: Joi.object({
    category: commonSchemas.objectId,
    store: commonSchemas.objectId,
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    inStock: Joi.boolean(),
    featured: Joi.boolean(),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popular'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name')
  })
};

// Cart validation schemas
export const cartSchemas = {
  addToCart: Joi.object({
    productId: commonSchemas.objectId().required(),
    quantity: commonSchemas.quantity.required(),
    variant: Joi.object({
      type: Joi.string().required(),
      value: Joi.string().required()
    })
  }),
  
  updateCartItem: Joi.object({
    quantity: commonSchemas.quantity.required()
  }),
  
  applyCoupon: Joi.object({
    couponCode: Joi.string().trim().uppercase().required()
  })
};

// Order validation schemas
export const orderSchemas = {
  createOrder: Joi.object({
    deliveryAddress: Joi.object({
      name: Joi.string().trim().max(50).required(),
      phone: Joi.string().trim().min(10).max(15).required(), // More lenient phone validation for placeholders
      addressLine1: Joi.string().trim().max(200).required(),
      addressLine2: Joi.string().trim().max(200).allow(''), // Allow empty string
      city: Joi.string().trim().max(50).required(),
      state: Joi.string().trim().max(50).required(),
      pincode: Joi.string().pattern(/^\d{6}$/).required(),
      landmark: Joi.string().trim().max(100).allow(''), // Allow empty string
      addressType: Joi.string().valid('home', 'work', 'other')
    }).required(),
    paymentMethod: Joi.string().valid('wallet', 'card', 'upi', 'cod', 'razorpay').required(),
    specialInstructions: Joi.string().trim().max(500).allow(''), // Allow empty string
    couponCode: Joi.string().trim().uppercase(),
    coinsUsed: Joi.object({ // Add coinsUsed validation
      wasilCoins: Joi.number().min(0).default(0),
      promoCoins: Joi.number().min(0).default(0),
      storePromoCoins: Joi.number().min(0).default(0),
      totalCoinsValue: Joi.number().min(0).default(0)
    })
  })
};

// Review validation schemas
export const reviewSchemas = {
  createReview: Joi.object({
    targetType: Joi.string().valid('Product', 'Store', 'Video').required(),
    targetId: commonSchemas.objectId().required(),
    rating: commonSchemas.rating.required(),
    title: Joi.string().trim().max(100),
    content: Joi.string().trim().min(10).max(2000).required(),
    pros: Joi.array().items(Joi.string().trim().max(200)),
    cons: Joi.array().items(Joi.string().trim().max(200)),
    tags: Joi.array().items(Joi.string().trim().lowercase()),
    isAnonymous: Joi.boolean().default(false)
  }),
  
  replyToReview: Joi.object({
    content: Joi.string().trim().min(10).max(1000).required()
  })
};

// Notification validation schemas
export const notificationSchemas = {
  markAsRead: Joi.object({
    notificationIds: Joi.array().items(commonSchemas.objectId)
  })
};

// Wishlist validation schemas
export const wishlistSchemas = {
  createWishlist: Joi.object({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500),
    category: Joi.string().valid('personal', 'gift', 'business', 'event', 'custom').default('personal'),
    isPublic: Joi.boolean().default(false)
  }),
  
  addToWishlist: Joi.object({
    itemType: Joi.string().valid('Product', 'Store', 'Video').required(),
    itemId: commonSchemas.objectId().required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    notes: Joi.string().trim().max(300),
    targetPrice: commonSchemas.price,
    notifyOnPriceChange: Joi.boolean().default(true),
    notifyOnAvailability: Joi.boolean().default(true),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Video validation schemas
export const videoSchemas = {
  getVideos: Joi.object({
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video'),
    creator: commonSchemas.objectId,
    hasProducts: Joi.boolean(),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name')
  })
};

// Alias for validate (commonly used name)
export const validateBody = validate;

// Export validation middleware with common schemas
export { Joi };