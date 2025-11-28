/**
 * Zod Validation Schemas
 * Centralized validation schemas for all merchant app forms
 */

import { z } from 'zod';
import {
  validateGST,
  validatePAN,
  validateIFSC,
  validatePhoneNumber,
  validateEmail,
  validatePincode,
  validateAadhaar,
  validateBankAccount,
  validateUPI,
  validatePasswordStrength,
  validateBusinessName,
} from './helpers';

// ===========================
// AUTH SCHEMAS
// ===========================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(validatePhoneNumber, 'Invalid Indian phone number'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (pwd) => validatePasswordStrength(pwd).isValid,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  acceptTerms: z.boolean().refine((val) => val, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export const setNewPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (pwd) => validatePasswordStrength(pwd).isValid,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SetNewPasswordFormData = z.infer<typeof setNewPasswordSchema>;

// ===========================
// PRODUCT SCHEMAS
// ===========================

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must not exceed 100 characters'),
  description: z
    .string()
    .min(1, 'Product description is required')
    .min(10, 'Product description must be at least 10 characters')
    .max(1000, 'Product description must not exceed 1000 characters'),
  category: z
    .string()
    .min(1, 'Product category is required'),
  subcategory: z
    .string()
    .optional()
    .default(''),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(999999.99, 'Price exceeds maximum limit'),
  discountPrice: z
    .number()
    .min(0, 'Discount price cannot be negative')
    .optional()
    .default(0),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must not exceed 50 characters'),
  stock: z
    .number()
    .min(0, 'Stock cannot be negative')
    .int('Stock must be a whole number'),
  lowStockThreshold: z
    .number()
    .min(0, 'Low stock threshold cannot be negative')
    .int('Low stock threshold must be a whole number')
    .optional()
    .default(10),
  images: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one product image is required')
    .max(10, 'Maximum 10 images allowed'),
  isActive: z.boolean().optional().default(true),
  gst: z
    .number()
    .min(0, 'GST cannot be negative')
    .max(100, 'GST cannot exceed 100%')
    .optional()
    .default(0),
}).refine((data) => !data.discountPrice || data.discountPrice < data.price, {
  message: 'Discount price must be less than original price',
  path: ['discountPrice'],
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;

export const editProductSchema = createProductSchema.extend({
  id: z.string().min(1, 'Product ID is required'),
});

export type EditProductFormData = z.infer<typeof editProductSchema>;

// ===========================
// ONBOARDING SCHEMAS
// ===========================

export const businessInfoSchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .refine(validateBusinessName, 'Invalid business name format'),
  businessType: z
    .enum(['proprietorship', 'partnership', 'pvt_ltd', 'llp', 'sole_trader'], {
      errorMap: () => ({ message: 'Invalid business type' }),
    }),
  gst: z
    .string()
    .min(1, 'GST is required')
    .refine(validateGST, 'Invalid GST number format'),
  pan: z
    .string()
    .min(1, 'PAN is required')
    .refine(validatePAN, 'Invalid PAN format'),
  businessDescription: z
    .string()
    .min(10, 'Business description must be at least 10 characters')
    .max(500, 'Business description must not exceed 500 characters')
    .optional()
    .default(''),
  yearsInBusiness: z
    .number()
    .min(0, 'Years in business cannot be negative')
    .max(150, 'Invalid years in business'),
  website: z
    .string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),
  businessEmail: z
    .string()
    .email('Invalid business email'),
  businessPhone: z
    .string()
    .refine(validatePhoneNumber, 'Invalid phone number'),
});

export type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

export const bankDetailsSchema = z.object({
  accountHolderName: z
    .string()
    .min(1, 'Account holder name is required')
    .min(3, 'Name must be at least 3 characters'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .refine(validateBankAccount, 'Invalid account number'),
  confirmAccountNumber: z
    .string()
    .min(1, 'Please confirm account number'),
  ifscCode: z
    .string()
    .min(1, 'IFSC code is required')
    .refine(validateIFSC, 'Invalid IFSC code'),
  bankName: z
    .string()
    .min(1, 'Bank name is required'),
  accountType: z.enum(['savings', 'current'], {
    errorMap: () => ({ message: 'Please select a valid account type' }),
  }),
  upiId: z
    .string()
    .optional()
    .refine((val) => !val || validateUPI(val), 'Invalid UPI ID format'),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: 'Account numbers do not match',
  path: ['confirmAccountNumber'],
});

export type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;

export const businessAddressSchema = z.object({
  street: z
    .string()
    .min(1, 'Street address is required')
    .min(5, 'Please enter a valid street address'),
  city: z
    .string()
    .min(1, 'City is required'),
  state: z
    .string()
    .min(1, 'State is required'),
  pincode: z
    .string()
    .refine(validatePincode, 'Invalid Indian pincode'),
  country: z
    .string()
    .default('India'),
  landmark: z
    .string()
    .optional()
    .default(''),
  isShippingAddress: z.boolean().optional().default(false),
});

export type BusinessAddressFormData = z.infer<typeof businessAddressSchema>;

export const ownerInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email format'),
  phone: z
    .string()
    .refine(validatePhoneNumber, 'Invalid phone number'),
  aadhaar: z
    .string()
    .refine(validateAadhaar, 'Invalid Aadhaar number'),
  pan: z
    .string()
    .refine(validatePAN, 'Invalid PAN format'),
  dob: z
    .string()
    .refine((date) => {
      const d = new Date(date);
      const age = new Date().getFullYear() - d.getFullYear();
      return age >= 18;
    }, 'You must be at least 18 years old'),
});

export type OwnerInfoFormData = z.infer<typeof ownerInfoSchema>;

// ===========================
// TEAM SCHEMAS
// ===========================

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'staff', 'viewer'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  permissions: z
    .array(z.string())
    .optional()
    .default([]),
  message: z
    .string()
    .max(500, 'Message must not exceed 500 characters')
    .optional()
    .default(''),
});

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

// ===========================
// COMBINED ONBOARDING SCHEMA
// ===========================

export const completeOnboardingSchema = z.object({
  businessInfo: businessInfoSchema,
  bankDetails: bankDetailsSchema,
  businessAddress: businessAddressSchema,
  ownerInfo: ownerInfoSchema,
});

export type CompleteOnboardingFormData = z.infer<typeof completeOnboardingSchema>;

// ===========================
// PROFILE UPDATE SCHEMAS
// ===========================

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email format'),
  phone: z
    .string()
    .refine(validatePhoneNumber, 'Invalid phone number'),
  profileImage: z
    .string()
    .url('Invalid image URL')
    .optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Parse form errors from Zod validation
 */
export const parseValidationErrors = (
  errors: Record<string, { _errors?: string[] } | any>
): Record<string, string> => {
  const parsed: Record<string, string> = {};

  Object.entries(errors).forEach(([key, error]) => {
    if (error._errors && error._errors.length > 0) {
      parsed[key] = error._errors[0];
    } else if (error.message) {
      parsed[key] = error.message;
    }
  });

  return parsed;
};

/**
 * Get all validation schemas as a map
 */
export const validationSchemas = {
  login: loginSchema,
  register: registerSchema,
  passwordReset: passwordResetSchema,
  setNewPassword: setNewPasswordSchema,
  createProduct: createProductSchema,
  editProduct: editProductSchema,
  businessInfo: businessInfoSchema,
  bankDetails: bankDetailsSchema,
  businessAddress: businessAddressSchema,
  ownerInfo: ownerInfoSchema,
  inviteMember: inviteMemberSchema,
  completeOnboarding: completeOnboardingSchema,
  updateProfile: updateProfileSchema,
} as const;

export type SchemaName = keyof typeof validationSchemas;
