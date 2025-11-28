/**
 * Onboarding Helper Functions
 * Utility functions for managing onboarding flow, validation, and progress tracking
 */

import { router } from 'expo-router';
import type {
  OnboardingStatus,
  OnboardingStep,
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
  ValidationResult,
  OnboardingProgress,
} from '@/types/onboarding';
import {
  ONBOARDING_STEPS,
  NAVIGATION_ROUTES,
  STEP_REQUIREMENTS,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  ONBOARDING_STATUS,
} from '@/constants/onboarding';

// ============================================================================
// Navigation & Routing
// ============================================================================

/**
 * Get route for a specific onboarding step
 */
export function getStepRoute(stepNumber: number): string {
  const step = ONBOARDING_STEPS.find((s) => s.stepNumber === stepNumber);
  return step?.route || NAVIGATION_ROUTES.WELCOME;
}

/**
 * Navigate to specific onboarding step
 */
export function navigateToStep(stepNumber: number): void {
  const route = getStepRoute(stepNumber);
  router.push(route as any);
}

/**
 * Navigate to next step
 */
export function navigateToNextStep(currentStep: number): void {
  const nextStep = currentStep + 1;
  if (nextStep <= ONBOARDING_STEPS.length) {
    navigateToStep(nextStep);
  }
}

/**
 * Navigate to previous step
 */
export function navigateToPreviousStep(currentStep: number): void {
  const previousStep = currentStep - 1;
  if (previousStep >= 1) {
    navigateToStep(previousStep);
  }
}

/**
 * Determine where to redirect user based on onboarding status
 */
export function getRedirectRoute(status: OnboardingStatus | null): string {
  if (!status) {
    // No onboarding status - start from welcome
    return NAVIGATION_ROUTES.WELCOME;
  }

  switch (status.status) {
    case ONBOARDING_STATUS.APPROVED:
      // Approved - go to dashboard
      return NAVIGATION_ROUTES.DASHBOARD;

    case ONBOARDING_STATUS.PENDING_REVIEW:
      // Submitted and waiting for approval
      return NAVIGATION_ROUTES.PENDING_APPROVAL;

    case ONBOARDING_STATUS.IN_PROGRESS:
      // Continue from current step
      return getStepRoute(status.currentStep);

    case ONBOARDING_STATUS.REJECTED:
      // Rejected - allow re-submission from current step
      return getStepRoute(status.currentStep);

    case ONBOARDING_STATUS.ON_HOLD:
      // On hold - show pending approval screen
      return NAVIGATION_ROUTES.PENDING_APPROVAL;

    default:
      return NAVIGATION_ROUTES.WELCOME;
  }
}

// ============================================================================
// Progress Calculation
// ============================================================================

/**
 * Calculate overall onboarding progress percentage
 */
export function calculateProgress(status: OnboardingStatus): number {
  if (!status) return 0;

  const totalSteps = ONBOARDING_STEPS.length;
  const completedSteps = status.completedSteps.filter((s) => s.isCompleted).length;

  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Get detailed progress for each step
 */
export function getDetailedProgress(status: OnboardingStatus): OnboardingProgress {
  const progress: OnboardingProgress = {
    step1: { completed: false },
    step2: { completed: false },
    step3: { completed: false },
    step4: { completed: false },
    step5: { completed: false },
    overallProgress: 0,
  };

  if (!status || !status.completedSteps) return progress;

  status.completedSteps.forEach((step) => {
    const key = `step${step.stepNumber}` as keyof Omit<OnboardingProgress, 'overallProgress'>;
    if (key in progress) {
      progress[key] = {
        completed: step.isCompleted,
        completedAt: step.completedAt,
      };
    }
  });

  progress.overallProgress = calculateProgress(status);

  return progress;
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(status: OnboardingStatus, stepNumber: number): boolean {
  if (!status || !status.completedSteps) return false;

  const step = status.completedSteps.find((s) => s.stepNumber === stepNumber);
  return step?.isCompleted || false;
}

/**
 * Get current onboarding step
 */
export function getCurrentStep(status: OnboardingStatus): number {
  if (!status) return 1;

  // If submitted, show review/pending
  if (status.isSubmitted) {
    return ONBOARDING_STEPS.length;
  }

  return status.currentStep || 1;
}

// ============================================================================
// Status Checks
// ============================================================================

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(status: OnboardingStatus | null): boolean {
  if (!status) return false;

  return (
    status.status === ONBOARDING_STATUS.APPROVED ||
    status.status === ONBOARDING_STATUS.PENDING_REVIEW
  );
}

/**
 * Check if onboarding is in progress
 */
export function isOnboardingInProgress(status: OnboardingStatus | null): boolean {
  if (!status) return false;

  return status.status === ONBOARDING_STATUS.IN_PROGRESS;
}

/**
 * Check if onboarding is pending approval
 */
export function isPendingApproval(status: OnboardingStatus | null): boolean {
  if (!status) return false;

  return (
    status.status === ONBOARDING_STATUS.PENDING_REVIEW ||
    status.status === ONBOARDING_STATUS.ON_HOLD
  );
}

/**
 * Check if user can proceed to next step
 */
export function canProceedToNextStep(
  status: OnboardingStatus,
  currentStepNumber: number
): boolean {
  // Check if current step is completed
  const currentStepCompleted = isStepCompleted(status, currentStepNumber);

  // Can't proceed if current step is not completed
  if (!currentStepCompleted) return false;

  // Can proceed if not at last step
  return currentStepNumber < ONBOARDING_STEPS.length;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return VALIDATION_RULES.email.pattern.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  return VALIDATION_RULES.phone.pattern.test(phone);
}

/**
 * Validate PAN number format
 */
export function validatePAN(pan: string): boolean {
  return VALIDATION_RULES.pan.pattern.test(pan.toUpperCase());
}

/**
 * Validate GST number format
 */
export function validateGST(gst: string): boolean {
  return VALIDATION_RULES.gst.pattern.test(gst.toUpperCase());
}

/**
 * Validate IFSC code format
 */
export function validateIFSC(ifsc: string): boolean {
  return VALIDATION_RULES.ifsc.pattern.test(ifsc.toUpperCase());
}

/**
 * Validate Aadhar number format
 */
export function validateAadhar(aadhar: string): boolean {
  return VALIDATION_RULES.aadhar.pattern.test(aadhar);
}

/**
 * Validate account number
 */
export function validateAccountNumber(accountNumber: string): boolean {
  const length = accountNumber.length;
  return (
    length >= VALIDATION_RULES.accountNumber.minLength &&
    length <= VALIDATION_RULES.accountNumber.maxLength &&
    /^\d+$/.test(accountNumber)
  );
}

/**
 * Validate Business Info Step
 */
export function validateBusinessInfo(data: Partial<BusinessInfoStep>): ValidationResult {
  const errors: Record<string, string> = {};

  // Required fields
  if (!data.businessName?.trim()) {
    errors.businessName = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.ownerName?.trim()) {
    errors.ownerName = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.ownerEmail?.trim()) {
    errors.ownerEmail = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validateEmail(data.ownerEmail)) {
    errors.ownerEmail = VALIDATION_RULES.email.message;
  }

  if (!data.ownerPhone?.trim()) {
    errors.ownerPhone = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validatePhone(data.ownerPhone)) {
    errors.ownerPhone = VALIDATION_RULES.phone.message;
  }

  if (!data.businessType) {
    errors.businessType = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.businessCategory) {
    errors.businessCategory = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (data.yearsInBusiness === undefined || data.yearsInBusiness < 0) {
    errors.yearsInBusiness = 'Please enter valid years in business';
  }

  // Optional website validation
  if (data.website && !VALIDATION_RULES.website.pattern.test(data.website)) {
    errors.website = VALIDATION_RULES.website.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Store Details Step
 */
export function validateStoreDetails(data: Partial<StoreDetailsStep>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.storeName?.trim()) {
    errors.storeName = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.storeType) {
    errors.storeType = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.storeAddress?.street?.trim()) {
    errors.storeAddressStreet = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.storeAddress?.city?.trim()) {
    errors.storeAddressCity = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.storeAddress?.state?.trim()) {
    errors.storeAddressState = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.storeAddress?.zipCode?.trim()) {
    errors.storeAddressZipCode = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!VALIDATION_RULES.pincode.pattern.test(data.storeAddress.zipCode)) {
    errors.storeAddressZipCode = VALIDATION_RULES.pincode.message;
  }

  if (!data.storePhone?.trim()) {
    errors.storePhone = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validatePhone(data.storePhone)) {
    errors.storePhone = VALIDATION_RULES.phone.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Bank Details Step
 */
export function validateBankDetails(data: Partial<BankDetailsStep>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.accountHolderName?.trim()) {
    errors.accountHolderName = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.accountNumber?.trim()) {
    errors.accountNumber = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validateAccountNumber(data.accountNumber)) {
    errors.accountNumber = VALIDATION_RULES.accountNumber.message;
  }

  if (!data.confirmAccountNumber?.trim()) {
    errors.confirmAccountNumber = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (data.accountNumber !== data.confirmAccountNumber) {
    errors.confirmAccountNumber = 'Account numbers do not match';
  }

  if (!data.bankName?.trim()) {
    errors.bankName = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (!data.ifscCode?.trim()) {
    errors.ifscCode = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validateIFSC(data.ifscCode)) {
    errors.ifscCode = VALIDATION_RULES.ifsc.message;
  }

  if (!data.panNumber?.trim()) {
    errors.panNumber = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validatePAN(data.panNumber)) {
    errors.panNumber = VALIDATION_RULES.pan.message;
  }

  if (!data.accountType) {
    errors.accountType = ERROR_MESSAGES.REQUIRED_FIELD;
  }

  // GST validation if registered
  if (data.gstRegistered && data.gstNumber) {
    if (!validateGST(data.gstNumber)) {
      errors.gstNumber = VALIDATION_RULES.gst.message;
    }
  }

  // Aadhar validation if provided
  if (data.aadharNumber && !validateAadhar(data.aadharNumber)) {
    errors.aadharNumber = VALIDATION_RULES.aadhar.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Documents Step
 */
export function validateDocuments(data: Partial<DocumentsStep>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.documents || data.documents.length === 0) {
    errors.documents = 'Please upload at least one document';
    return { isValid: false, errors };
  }

  // Check required documents
  const requiredTypes = ['pan_card', 'aadhar', 'bank_statement', 'business_license'];
  const uploadedTypes = data.documents.map((doc) => doc.type);

  requiredTypes.forEach((type) => {
    if (!uploadedTypes.includes(type as any)) {
      errors[type] = `${type.replace('_', ' ')} is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Review & Submit Step
 */
export function validateReviewSubmit(data: Partial<ReviewSubmitStep>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.agreedToTerms) {
    errors.agreedToTerms = 'You must agree to the terms and conditions';
  }

  if (!data.agreedToPrivacy) {
    errors.agreedToPrivacy = 'You must agree to the privacy policy';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step Data Management
// ============================================================================

/**
 * Get step data from onboarding status
 */
export function getStepData(
  status: OnboardingStatus,
  stepNumber: number
):
  | BusinessInfoStep
  | StoreDetailsStep
  | BankDetailsStep
  | DocumentsStep
  | ReviewSubmitStep
  | null {
  if (!status || !status.data) return null;

  switch (stepNumber) {
    case 1:
      return status.data.businessInfo || null;
    case 2:
      return status.data.storeDetails || null;
    case 3:
      return status.data.bankDetails || null;
    case 4:
      return status.data.documents || null;
    case 5:
      return status.data.reviewSubmit || null;
    default:
      return null;
  }
}

/**
 * Check if all required steps are completed
 */
export function areAllStepsCompleted(status: OnboardingStatus): boolean {
  if (!status || !status.completedSteps) return false;

  const requiredSteps = ONBOARDING_STEPS.filter((s) => s.stepNumber <= 5); // Exclude welcome step
  return requiredSteps.every((step) => isStepCompleted(status, step.stepNumber));
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format step title with number
 */
export function formatStepTitle(stepNumber: number): string {
  const step = ONBOARDING_STEPS.find((s) => s.stepNumber === stepNumber);
  return step ? `Step ${stepNumber}: ${step.title}` : `Step ${stepNumber}`;
}

/**
 * Get step icon
 */
export function getStepIcon(stepNumber: number): string {
  const step = ONBOARDING_STEPS.find((s) => s.stepNumber === stepNumber);
  return step?.icon || 'help';
}

/**
 * Get step description
 */
export function getStepDescription(stepNumber: number): string {
  const step = ONBOARDING_STEPS.find((s) => s.stepNumber === stepNumber);
  return step?.description || '';
}

/**
 * Format progress percentage
 */
export function formatProgressPercentage(progress: number): string {
  return `${Math.round(progress)}%`;
}

// ============================================================================
// Export all helpers
// ============================================================================

export const onboardingHelpers = {
  // Navigation
  getStepRoute,
  navigateToStep,
  navigateToNextStep,
  navigateToPreviousStep,
  getRedirectRoute,

  // Progress
  calculateProgress,
  getDetailedProgress,
  isStepCompleted,
  getCurrentStep,

  // Status
  isOnboardingComplete,
  isOnboardingInProgress,
  isPendingApproval,
  canProceedToNextStep,

  // Validation
  validateEmail,
  validatePhone,
  validatePAN,
  validateGST,
  validateIFSC,
  validateAadhar,
  validateAccountNumber,
  validateBusinessInfo,
  validateStoreDetails,
  validateBankDetails,
  validateDocuments,
  validateReviewSubmit,

  // Data
  getStepData,
  areAllStepsCompleted,

  // Formatting
  formatStepTitle,
  getStepIcon,
  getStepDescription,
  formatProgressPercentage,
};
