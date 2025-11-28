"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.updateProfileSchema = exports.updateEmailSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.resendOTPSchema = exports.verifyOTPSchema = exports.loginSchema = exports.registrationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Phone number validation (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;
// Password strength requirements
const passwordSchema = joi_1.default.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
});
// OTP validation
const otpSchema = joi_1.default.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers'
});
// Registration validation
exports.registrationSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(phoneRegex)
        .required()
        .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'any.required': 'Phone number is required'
    }),
    countryCode: joi_1.default.string()
        .pattern(/^\+\d{1,3}$/)
        .default('+91')
        .messages({
        'string.pattern.base': 'Invalid country code format'
    }),
    deviceId: joi_1.default.string()
        .trim()
        .max(255)
        .optional(),
    fcmToken: joi_1.default.string()
        .trim()
        .max(500)
        .optional()
});
// Login validation
exports.loginSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(phoneRegex)
        .required()
        .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'any.required': 'Phone number is required'
    }),
    countryCode: joi_1.default.string()
        .pattern(/^\+\d{1,3}$/)
        .default('+91')
});
// OTP verification validation
exports.verifyOTPSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(phoneRegex)
        .required(),
    otp: otpSchema.required(),
    deviceId: joi_1.default.string()
        .trim()
        .max(255)
        .optional()
});
// Resend OTP validation
exports.resendOTPSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(phoneRegex)
        .required()
});
// Refresh token validation
exports.refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Refresh token is required'
    })
});
// Password change validation
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: passwordSchema.required(),
    newPassword: passwordSchema.required(),
    confirmPassword: joi_1.default.string()
        .valid(joi_1.default.ref('newPassword'))
        .required()
        .messages({
        'any.only': 'Passwords do not match'
    })
});
// Email update validation
exports.updateEmailSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .max(255)
        .required()
        .messages({
        'string.email': 'Please provide a valid email address'
    })
});
// Profile update validation
exports.updateProfileSchema = joi_1.default.object({
    name: joi_1.default.string()
        .trim()
        .min(2)
        .max(100)
        .optional(),
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .max(255)
        .optional(),
    dateOfBirth: joi_1.default.date()
        .max('now')
        .optional(),
    gender: joi_1.default.string()
        .valid('male', 'female', 'other', 'prefer_not_to_say')
        .optional(),
    profilePicture: joi_1.default.string()
        .uri()
        .optional()
});
// Logout validation
exports.logoutSchema = joi_1.default.object({
    deviceId: joi_1.default.string()
        .trim()
        .max(255)
        .optional(),
    allDevices: joi_1.default.boolean()
        .default(false)
});
