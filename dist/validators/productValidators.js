"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateSchema = exports.productIdSchema = exports.queryProductsSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
// Create product validation
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string()
        .trim()
        .min(3)
        .max(200)
        .required()
        .messages({
        'string.min': 'Product name must be at least 3 characters',
        'string.max': 'Product name cannot exceed 200 characters',
        'any.required': 'Product name is required'
    }),
    description: joi_1.default.string()
        .trim()
        .max(5000)
        .allow('')
        .optional(),
    price: joi_1.default.number()
        .positive()
        .precision(2)
        .max(99999999.99)
        .required()
        .messages({
        'number.positive': 'Price must be a positive number',
        'any.required': 'Price is required'
    }),
    compareAtPrice: joi_1.default.number()
        .positive()
        .precision(2)
        .max(99999999.99)
        .optional(),
    costPerItem: joi_1.default.number()
        .positive()
        .precision(2)
        .max(99999999.99)
        .optional(),
    sku: joi_1.default.string()
        .trim()
        .uppercase()
        .max(100)
        .optional(),
    barcode: joi_1.default.string()
        .trim()
        .max(100)
        .optional(),
    trackQuantity: joi_1.default.boolean()
        .default(true),
    quantity: joi_1.default.number()
        .integer()
        .min(0)
        .max(999999)
        .when('trackQuantity', {
        is: true,
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    }),
    category: joi_1.default.string()
        .pattern(objectIdPattern)
        .required()
        .messages({
        'string.pattern.base': 'Invalid category ID format',
        'any.required': 'Category is required'
    }),
    categoryType: joi_1.default.string()
        .valid('going_out', 'home_delivery', 'earn', 'play', 'general')
        .default('general')
        .optional(),
    subcategory: joi_1.default.string()
        .pattern(objectIdPattern)
        .optional(),
    brand: joi_1.default.string()
        .trim()
        .max(100)
        .optional(),
    tags: joi_1.default.array()
        .items(joi_1.default.string().trim().max(50))
        .max(20)
        .optional(),
    images: joi_1.default.array()
        .items(joi_1.default.object({
        url: joi_1.default.string().uri().required(),
        thumbnailUrl: joi_1.default.string().uri().optional(),
        altText: joi_1.default.string().trim().max(200).optional(),
        sortOrder: joi_1.default.number().integer().min(0).default(0),
        isMain: joi_1.default.boolean().default(false)
    }))
        .min(1)
        .max(10)
        .required()
        .messages({
        'array.min': 'At least one product image is required',
        'array.max': 'Maximum 10 images allowed'
    }),
    variants: joi_1.default.array()
        .items(joi_1.default.object({
        name: joi_1.default.string().trim().max(100).required(),
        options: joi_1.default.array().items(joi_1.default.string().trim().max(100)).min(1).required()
    }))
        .max(3)
        .optional(),
    weight: joi_1.default.number()
        .positive()
        .max(99999)
        .optional(),
    weightUnit: joi_1.default.string()
        .valid('kg', 'g', 'lb', 'oz')
        .default('kg'),
    dimensions: joi_1.default.object({
        length: joi_1.default.number().positive().max(9999).optional(),
        width: joi_1.default.number().positive().max(9999).optional(),
        height: joi_1.default.number().positive().max(9999).optional(),
        unit: joi_1.default.string().valid('cm', 'in', 'm').default('cm')
    }).optional(),
    status: joi_1.default.string()
        .valid('active', 'draft', 'archived')
        .default('active'),
    visibility: joi_1.default.string()
        .valid('visible', 'hidden')
        .default('visible'),
    seoTitle: joi_1.default.string()
        .trim()
        .max(70)
        .optional(),
    seoDescription: joi_1.default.string()
        .trim()
        .max(160)
        .optional(),
    customFields: joi_1.default.object()
        .pattern(joi_1.default.string(), joi_1.default.alternatives(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean()))
        .optional()
});
// Update product validation
exports.updateProductSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(3).max(200).optional(),
    description: joi_1.default.string().trim().max(5000).allow('').optional(),
    price: joi_1.default.number().positive().precision(2).max(99999999.99).optional(),
    compareAtPrice: joi_1.default.number().positive().precision(2).max(99999999.99).optional(),
    costPerItem: joi_1.default.number().positive().precision(2).max(99999999.99).optional(),
    sku: joi_1.default.string().trim().uppercase().max(100).optional(),
    barcode: joi_1.default.string().trim().max(100).optional(),
    trackQuantity: joi_1.default.boolean().optional(),
    quantity: joi_1.default.number().integer().min(0).max(999999).optional(),
    category: joi_1.default.string().pattern(objectIdPattern).optional(),
    subcategory: joi_1.default.string().pattern(objectIdPattern).optional(),
    brand: joi_1.default.string().trim().max(100).optional(),
    tags: joi_1.default.array().items(joi_1.default.string().trim().max(50)).max(20).optional(),
    images: joi_1.default.array()
        .items(joi_1.default.object({
        url: joi_1.default.string().uri().required(),
        thumbnailUrl: joi_1.default.string().uri().optional(),
        altText: joi_1.default.string().trim().max(200).optional(),
        sortOrder: joi_1.default.number().integer().min(0).default(0),
        isMain: joi_1.default.boolean().default(false)
    }))
        .min(1)
        .max(10)
        .optional(),
    variants: joi_1.default.array().items(joi_1.default.object({
        name: joi_1.default.string().trim().max(100).required(),
        options: joi_1.default.array().items(joi_1.default.string().trim().max(100)).min(1).required()
    })).max(3).optional(),
    weight: joi_1.default.number().positive().max(99999).optional(),
    weightUnit: joi_1.default.string().valid('kg', 'g', 'lb', 'oz').optional(),
    dimensions: joi_1.default.object({
        length: joi_1.default.number().positive().max(9999).optional(),
        width: joi_1.default.number().positive().max(9999).optional(),
        height: joi_1.default.number().positive().max(9999).optional(),
        unit: joi_1.default.string().valid('cm', 'in', 'm').optional()
    }).optional(),
    status: joi_1.default.string().valid('active', 'draft', 'archived').optional(),
    visibility: joi_1.default.string().valid('visible', 'hidden').optional(),
    seoTitle: joi_1.default.string().trim().max(70).optional(),
    seoDescription: joi_1.default.string().trim().max(160).optional(),
    customFields: joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.alternatives(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean())).optional()
}).min(1);
// Query products validation
exports.queryProductsSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    sort: joi_1.default.string().valid('name', '-name', 'price', '-price', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt').default('-createdAt'),
    search: joi_1.default.string().trim().max(200).optional(),
    category: joi_1.default.string().pattern(objectIdPattern).optional(),
    subcategory: joi_1.default.string().pattern(objectIdPattern).optional(),
    brand: joi_1.default.string().trim().max(100).optional(),
    minPrice: joi_1.default.number().positive().precision(2).optional(),
    maxPrice: joi_1.default.number().positive().precision(2).optional(),
    status: joi_1.default.string().valid('active', 'draft', 'archived').optional(),
    visibility: joi_1.default.string().valid('visible', 'hidden').optional(),
    inStock: joi_1.default.boolean().optional(),
    tags: joi_1.default.alternatives(joi_1.default.string().trim(), joi_1.default.array().items(joi_1.default.string().trim())).optional()
});
// Product ID validation
exports.productIdSchema = joi_1.default.object({
    id: joi_1.default.string()
        .pattern(objectIdPattern)
        .required()
        .messages({
        'string.pattern.base': 'Invalid product ID format',
        'any.required': 'Product ID is required'
    })
});
// Bulk update validation
exports.bulkUpdateSchema = joi_1.default.object({
    productIds: joi_1.default.array()
        .items(joi_1.default.string().pattern(objectIdPattern))
        .min(1)
        .max(100)
        .required()
        .messages({
        'array.min': 'At least one product ID is required',
        'array.max': 'Cannot update more than 100 products at once'
    }),
    updates: joi_1.default.object({
        status: joi_1.default.string().valid('active', 'draft', 'archived').optional(),
        visibility: joi_1.default.string().valid('visible', 'hidden').optional(),
        category: joi_1.default.string().pattern(objectIdPattern).optional(),
        tags: joi_1.default.array().items(joi_1.default.string().trim().max(50)).max(20).optional()
    }).min(1).required()
});
