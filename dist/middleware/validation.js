"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Joi = exports.validateBody = exports.videoSchemas = exports.wishlistSchemas = exports.notificationSchemas = exports.reviewSchemas = exports.orderSchemas = exports.cartSchemas = exports.productSchemas = exports.authSchemas = exports.commonSchemas = exports.validateParams = exports.validateQuery = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
exports.Joi = joi_1.default;
// Generic validation middleware
const validate = (schema) => {
    return (req, res, next) => {
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
exports.validate = validate;
// Query validation middleware
const validateQuery = (schema) => {
    return (req, res, next) => {
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
exports.validateQuery = validateQuery;
// Parameters validation middleware
const validateParams = (schema) => {
    return (req, res, next) => {
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
exports.validateParams = validateParams;
// Common validation schemas
exports.commonSchemas = {
    // MongoDB ObjectId validation
    objectId: () => joi_1.default.string().hex().length(24).message('Invalid ID format'),
    // Pagination
    pagination: () => ({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sort: joi_1.default.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name'),
        search: joi_1.default.string().trim().max(100)
    }),
    // Phone number (Indian format)
    phoneNumber: joi_1.default.string().pattern(/^(\+91|91)?[6-9]\d{9}$/).message('Invalid phone number format'),
    // Email
    email: joi_1.default.string().email().lowercase(),
    // OTP
    otp: joi_1.default.string().pattern(/^\d{6}$/).message('OTP must be 6 digits'),
    // Password (for social login or password-based auth)
    password: joi_1.default.string().min(6).max(50),
    // Coordinates [longitude, latitude]
    coordinates: joi_1.default.array().items(joi_1.default.number().min(-180).max(180)).length(2),
    // Rating (1-5)
    rating: joi_1.default.number().min(1).max(5),
    // Price
    price: joi_1.default.number().min(0).precision(2),
    // Quantity
    quantity: joi_1.default.number().integer().min(1).max(99)
};
// Authentication validation schemas
exports.authSchemas = {
    sendOTP: joi_1.default.object({
        phoneNumber: exports.commonSchemas.phoneNumber.required(),
        email: exports.commonSchemas.email.optional(),
        referralCode: joi_1.default.string().trim().uppercase().min(6).max(10).optional()
    }),
    verifyOTP: joi_1.default.object({
        phoneNumber: exports.commonSchemas.phoneNumber.required(),
        otp: exports.commonSchemas.otp.required()
    }),
    refreshToken: joi_1.default.object({
        refreshToken: joi_1.default.string().required()
    }),
    updateProfile: joi_1.default.object({
        profile: joi_1.default.object({
            firstName: joi_1.default.string().trim().max(50),
            lastName: joi_1.default.string().trim().max(50),
            avatar: joi_1.default.string().uri().allow(null, ''),
            bio: joi_1.default.string().trim().max(500),
            dateOfBirth: joi_1.default.date().iso().max('now'),
            gender: joi_1.default.string().valid('male', 'female', 'other'),
            location: joi_1.default.object({
                address: joi_1.default.string().trim().max(200),
                city: joi_1.default.string().trim().max(50),
                state: joi_1.default.string().trim().max(50),
                pincode: joi_1.default.string().pattern(/^\d{6}$/).message('Invalid pincode format'),
                coordinates: exports.commonSchemas.coordinates
            })
        }),
        preferences: joi_1.default.object({
            language: joi_1.default.string().valid('en', 'hi', 'te', 'ta', 'bn'),
            theme: joi_1.default.string().valid('light', 'dark'),
            notifications: joi_1.default.boolean(),
            emailNotifications: joi_1.default.boolean(),
            pushNotifications: joi_1.default.boolean(),
            smsNotifications: joi_1.default.boolean()
        })
    })
};
// Product validation schemas
exports.productSchemas = {
    getProducts: joi_1.default.object({
        category: exports.commonSchemas.objectId,
        store: exports.commonSchemas.objectId,
        minPrice: joi_1.default.number().min(0),
        maxPrice: joi_1.default.number().min(0),
        rating: joi_1.default.number().min(1).max(5),
        inStock: joi_1.default.boolean(),
        featured: joi_1.default.boolean(),
        search: joi_1.default.string().trim().max(100),
        sortBy: joi_1.default.string().valid('price_low', 'price_high', 'rating', 'newest', 'popular'),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sort: joi_1.default.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name')
    })
};
// Cart validation schemas
exports.cartSchemas = {
    addToCart: joi_1.default.object({
        productId: exports.commonSchemas.objectId().required(),
        quantity: exports.commonSchemas.quantity.required(),
        variant: joi_1.default.object({
            type: joi_1.default.string().required(),
            value: joi_1.default.string().required()
        })
    }),
    updateCartItem: joi_1.default.object({
        quantity: exports.commonSchemas.quantity.required()
    }),
    applyCoupon: joi_1.default.object({
        couponCode: joi_1.default.string().trim().uppercase().required()
    })
};
// Order validation schemas
exports.orderSchemas = {
    createOrder: joi_1.default.object({
        deliveryAddress: joi_1.default.object({
            name: joi_1.default.string().trim().max(50).required(),
            phone: exports.commonSchemas.phoneNumber.required(),
            addressLine1: joi_1.default.string().trim().max(200).required(),
            addressLine2: joi_1.default.string().trim().max(200),
            city: joi_1.default.string().trim().max(50).required(),
            state: joi_1.default.string().trim().max(50).required(),
            pincode: joi_1.default.string().pattern(/^\d{6}$/).required(),
            landmark: joi_1.default.string().trim().max(100),
            addressType: joi_1.default.string().valid('home', 'work', 'other')
        }).required(),
        paymentMethod: joi_1.default.string().valid('wallet', 'card', 'upi', 'cod').required(),
        specialInstructions: joi_1.default.string().trim().max(500),
        couponCode: joi_1.default.string().trim().uppercase()
    })
};
// Review validation schemas
exports.reviewSchemas = {
    createReview: joi_1.default.object({
        targetType: joi_1.default.string().valid('Product', 'Store', 'Video').required(),
        targetId: exports.commonSchemas.objectId().required(),
        rating: exports.commonSchemas.rating.required(),
        title: joi_1.default.string().trim().max(100),
        content: joi_1.default.string().trim().min(10).max(2000).required(),
        pros: joi_1.default.array().items(joi_1.default.string().trim().max(200)),
        cons: joi_1.default.array().items(joi_1.default.string().trim().max(200)),
        tags: joi_1.default.array().items(joi_1.default.string().trim().lowercase()),
        isAnonymous: joi_1.default.boolean().default(false)
    }),
    replyToReview: joi_1.default.object({
        content: joi_1.default.string().trim().min(10).max(1000).required()
    })
};
// Notification validation schemas
exports.notificationSchemas = {
    markAsRead: joi_1.default.object({
        notificationIds: joi_1.default.array().items(exports.commonSchemas.objectId)
    })
};
// Wishlist validation schemas
exports.wishlistSchemas = {
    createWishlist: joi_1.default.object({
        name: joi_1.default.string().trim().max(100).required(),
        description: joi_1.default.string().trim().max(500),
        category: joi_1.default.string().valid('personal', 'gift', 'business', 'event', 'custom').default('personal'),
        isPublic: joi_1.default.boolean().default(false)
    }),
    addToWishlist: joi_1.default.object({
        itemType: joi_1.default.string().valid('Product', 'Store', 'Video').required(),
        itemId: exports.commonSchemas.objectId().required(),
        priority: joi_1.default.string().valid('low', 'medium', 'high').default('medium'),
        notes: joi_1.default.string().trim().max(300),
        targetPrice: exports.commonSchemas.price,
        notifyOnPriceChange: joi_1.default.boolean().default(true),
        notifyOnAvailability: joi_1.default.boolean().default(true),
        tags: joi_1.default.array().items(joi_1.default.string().trim().lowercase())
    })
};
// Video validation schemas
exports.videoSchemas = {
    getVideos: joi_1.default.object({
        category: joi_1.default.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
        creator: exports.commonSchemas.objectId,
        hasProducts: joi_1.default.boolean(),
        search: joi_1.default.string().trim().max(100),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sort: joi_1.default.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name')
    })
};
// Alias for validate (commonly used name)
exports.validateBody = exports.validate;
