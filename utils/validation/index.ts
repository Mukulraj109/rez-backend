/**
 * Validation Module Exports
 * Central entry point for all validation utilities
 */

// Helpers
export {
  validateGST,
  validateGSTWithChecksum,
  validatePAN,
  validateIFSC,
  validatePhoneNumber,
  validateEmail,
  validatePincode,
  validateAadhaar,
  validateBankAccount,
  validateUPI,
  validateURL,
  validatePasswordStrength,
  validateBusinessName,
  sanitizeInput,
  formatPhoneNumber,
  formatGST,
  formatPAN,
  formatBankAccountMasked,
} from './helpers';

// Schemas
export {
  // Auth Schemas
  loginSchema,
  registerSchema,
  passwordResetSchema,
  setNewPasswordSchema,
  // Product Schemas
  createProductSchema,
  editProductSchema,
  // Onboarding Schemas
  businessInfoSchema,
  bankDetailsSchema,
  businessAddressSchema,
  ownerInfoSchema,
  completeOnboardingSchema,
  // Team Schemas
  inviteMemberSchema,
  // Profile Schemas
  updateProfileSchema,
  // Utility Functions
  parseValidationErrors,
  validationSchemas,
  // Types
  LoginFormData,
  RegisterFormData,
  PasswordResetFormData,
  SetNewPasswordFormData,
  CreateProductFormData,
  EditProductFormData,
  BusinessInfoFormData,
  BankDetailsFormData,
  BusinessAddressFormData,
  OwnerInfoFormData,
  CompleteOnboardingFormData,
  InviteMemberFormData,
  UpdateProfileFormData,
  SchemaName,
} from './schemas';

// Re-export common types
export type { ZodSchema, ZodError } from 'zod';
