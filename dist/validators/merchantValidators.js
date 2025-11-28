"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTeamMemberSchema = exports.inviteTeamMemberSchema = exports.bankDetailsSchema = exports.updateMerchantProfileSchema = exports.merchantLoginSchema = exports.merchantRegistrationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Merchant registration validation
exports.merchantRegistrationSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .max(255)
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    }),
    businessName: joi_1.default.string()
        .trim()
        .min(2)
        .max(200)
        .required()
        .messages({
        'string.min': 'Business name must be at least 2 characters',
        'any.required': 'Business name is required'
    }),
    phoneNumber: joi_1.default.string()
        .pattern(phoneRegex)
        .required()
        .messages({
        'string.pattern.base': 'Please provide a valid phone number'
    }),
    businessType: joi_1.default.string()
        .valid('retail', 'restaurant', 'service', 'grocery', 'fashion', 'electronics', 'other')
        .required(),
    acceptTerms: joi_1.default.boolean()
        .valid(true)
        .required()
        .messages({
        'any.only': 'You must accept the terms and conditions'
    })
});
// Merchant login validation
exports.merchantLoginSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .required(),
    password: joi_1.default.string()
        .required()
});
// Update merchant profile validation
exports.updateMerchantProfileSchema = joi_1.default.object({
    businessName: joi_1.default.string().trim().min(2).max(200).optional(),
    businessDescription: joi_1.default.string().trim().max(2000).optional(),
    phoneNumber: joi_1.default.string().pattern(phoneRegex).optional(),
    website: joi_1.default.string().uri().max(500).optional(),
    logo: joi_1.default.string().uri().max(500).optional(),
    coverImage: joi_1.default.string().uri().max(500).optional(),
    businessAddress: joi_1.default.object({
        street: joi_1.default.string().trim().max(200).required(),
        city: joi_1.default.string().trim().max(100).required(),
        state: joi_1.default.string().trim().max(100).required(),
        country: joi_1.default.string().trim().max(100).required(),
        postalCode: joi_1.default.string().trim().max(20).required(),
        coordinates: joi_1.default.object({
            latitude: joi_1.default.number().min(-90).max(90).optional(),
            longitude: joi_1.default.number().min(-180).max(180).optional()
        }).optional()
    }).optional(),
    businessHours: joi_1.default.object({
        monday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        tuesday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        wednesday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        thursday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        friday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        saturday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional(),
        sunday: joi_1.default.object({ open: joi_1.default.string(), close: joi_1.default.string(), closed: joi_1.default.boolean() }).optional()
    }).optional(),
    socialMedia: joi_1.default.object({
        facebook: joi_1.default.string().uri().optional(),
        instagram: joi_1.default.string().uri().optional(),
        twitter: joi_1.default.string().uri().optional(),
        linkedin: joi_1.default.string().uri().optional()
    }).optional()
}).min(1);
// Bank details validation (encrypted sensitive data)
exports.bankDetailsSchema = joi_1.default.object({
    accountHolderName: joi_1.default.string()
        .trim()
        .min(2)
        .max(200)
        .required(),
    accountNumber: joi_1.default.string()
        .trim()
        .pattern(/^[0-9]{9,18}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid account number format'
    }),
    confirmAccountNumber: joi_1.default.string()
        .valid(joi_1.default.ref('accountNumber'))
        .required()
        .messages({
        'any.only': 'Account numbers do not match'
    }),
    ifscCode: joi_1.default.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid IFSC code format'
    }),
    bankName: joi_1.default.string()
        .trim()
        .max(200)
        .required(),
    accountType: joi_1.default.string()
        .valid('savings', 'current', 'business')
        .required()
});
// Team member invitation validation
exports.inviteTeamMemberSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .required(),
    name: joi_1.default.string()
        .trim()
        .min(2)
        .max(100)
        .required(),
    role: joi_1.default.string()
        .valid('admin', 'manager', 'staff', 'viewer')
        .required(),
    permissions: joi_1.default.array()
        .items(joi_1.default.string().valid('products_view', 'products_edit', 'products_delete', 'orders_view', 'orders_edit', 'customers_view', 'customers_edit', 'analytics_view', 'settings_view', 'settings_edit', 'team_manage'))
        .optional()
});
// Update team member validation
exports.updateTeamMemberSchema = joi_1.default.object({
    role: joi_1.default.string().valid('admin', 'manager', 'staff', 'viewer').optional(),
    permissions: joi_1.default.array().items(joi_1.default.string()).optional(),
    isActive: joi_1.default.boolean().optional()
}).min(1);
