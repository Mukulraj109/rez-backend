/**
 * useOnboarding Hook
 * Custom hook to access and interact with OnboardingContext
 *
 * Features:
 * - Type-safe access to onboarding state
 * - Convenience methods for common operations
 * - Step-specific data accessors
 * - Validation helpers
 * - Progress tracking utilities
 */

import { useCallback, useMemo } from 'react';
import { useOnboardingContext } from '../contexts/OnboardingContext';
import {
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
} from '../types/onboarding';

export interface UseOnboardingReturn {
  // State
  isLoading: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  error: string | null;
  currentStep: number;
  totalSteps: number;
  overallProgress: number;
  validationErrors: Record<string, string>;
  isSubmitted: boolean;
  submissionDate?: string;
  lastSavedAt?: string;

  // Step data
  businessInfo: Partial<BusinessInfoStep>;
  storeDetails: Partial<StoreDetailsStep>;
  bankDetails: Partial<BankDetailsStep>;
  documents: Partial<DocumentsStep>;
  reviewSubmit: Partial<ReviewSubmitStep>;

  // Data methods
  updateStepData: (step: number, data: Partial<any>) => void;
  updateBusinessInfo: (data: Partial<BusinessInfoStep>) => void;
  updateStoreDetails: (data: Partial<StoreDetailsStep>) => void;
  updateBankDetails: (data: Partial<BankDetailsStep>) => void;
  updateDocuments: (data: Partial<DocumentsStep>) => void;
  updateReviewSubmit: (data: Partial<ReviewSubmitStep>) => void;
  getStepData: (step: number) => Partial<any>;
  getCurrentStepData: () => Partial<any>;

  // Navigation methods
  nextStep: () => Promise<void>;
  previousStep: () => void;
  goToStep: (step: number) => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Validation methods
  validateCurrentStep: () => Promise<boolean>;
  hasValidationErrors: boolean;
  getFieldError: (fieldName: string) => string | undefined;
  hasFieldError: (fieldName: string) => boolean;

  // Save methods
  saveProgress: () => Promise<void>;

  // Submit methods
  submitOnboarding: () => Promise<void>;
  canSubmit: boolean;

  // Utility methods
  clearError: () => void;
  resetOnboarding: () => Promise<void>;
  refreshStatus: () => Promise<void>;

  // Progress tracking
  getStepProgress: (step: number) => number;
  getCurrentStepProgress: () => number;
  isStepComplete: (step: number) => boolean;
  completedStepsCount: number;

  // Auto-save indicator
  isAutoSaveActive: boolean;
  timeSinceLastSave?: string;
}

/**
 * Custom hook to use onboarding context with convenience methods
 */
export function useOnboarding(): UseOnboardingReturn {
  const context = useOnboardingContext();
  const { state } = context;

  // ============================================================================
  // Step-specific update methods
  // ============================================================================

  const updateBusinessInfo = useCallback((data: Partial<BusinessInfoStep>) => {
    context.updateStepData(1, data);
  }, [context]);

  const updateStoreDetails = useCallback((data: Partial<StoreDetailsStep>) => {
    context.updateStepData(2, data);
  }, [context]);

  const updateBankDetails = useCallback((data: Partial<BankDetailsStep>) => {
    context.updateStepData(3, data);
  }, [context]);

  const updateDocuments = useCallback((data: Partial<DocumentsStep>) => {
    context.updateStepData(4, data);
  }, [context]);

  const updateReviewSubmit = useCallback((data: Partial<ReviewSubmitStep>) => {
    context.updateStepData(5, data);
  }, [context]);

  // ============================================================================
  // Data accessor methods
  // ============================================================================

  const getCurrentStepData = useCallback(() => {
    return context.getStepData(state.currentStep);
  }, [context, state.currentStep]);

  // ============================================================================
  // Navigation helpers
  // ============================================================================

  const canGoBack = useMemo(() => state.currentStep > 1, [state.currentStep]);
  const canGoNext = useMemo(() => state.currentStep < state.totalSteps, [state.currentStep, state.totalSteps]);
  const isFirstStep = useMemo(() => state.currentStep === 1, [state.currentStep]);
  const isLastStep = useMemo(() => state.currentStep === state.totalSteps, [state.currentStep, state.totalSteps]);

  // ============================================================================
  // Validation helpers
  // ============================================================================

  const hasValidationErrors = useMemo(
    () => Object.keys(state.validationErrors).length > 0,
    [state.validationErrors]
  );

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return state.validationErrors[fieldName];
  }, [state.validationErrors]);

  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!state.validationErrors[fieldName];
  }, [state.validationErrors]);

  // ============================================================================
  // Submit helpers
  // ============================================================================

  const canSubmit = useMemo(() => {
    // Can submit if on last step and not already submitted
    return state.currentStep === state.totalSteps && !state.isSubmitted;
  }, [state.currentStep, state.totalSteps, state.isSubmitted]);

  // ============================================================================
  // Progress tracking
  // ============================================================================

  const getStepProgress = useCallback((step: number): number => {
    // Calculate progress for a specific step based on filled fields
    const stepData = context.getStepData(step);
    const keys = Object.keys(stepData);
    const filledKeys = keys.filter(key => {
      const value = stepData[key];
      return value !== null && value !== undefined && value !== '';
    });

    if (keys.length === 0) return 0;
    return Math.round((filledKeys.length / keys.length) * 100);
  }, [context]);

  const getCurrentStepProgress = useCallback(() => {
    return getStepProgress(state.currentStep);
  }, [getStepProgress, state.currentStep]);

  const isStepComplete = useCallback((step: number): boolean => {
    return getStepProgress(step) === 100;
  }, [getStepProgress]);

  const completedStepsCount = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= state.totalSteps; i++) {
      if (isStepComplete(i)) count++;
    }
    return count;
  }, [isStepComplete, state.totalSteps]);

  // ============================================================================
  // Auto-save indicator
  // ============================================================================

  const isAutoSaveActive = useMemo(() => {
    return state.isAutoSaving;
  }, [state.isAutoSaving]);

  const timeSinceLastSave = useMemo(() => {
    if (!state.lastSavedAt) return undefined;

    const lastSaved = new Date(state.lastSavedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  }, [state.lastSavedAt]);

  // ============================================================================
  // Return value
  // ============================================================================

  return {
    // State
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    isAutoSaving: state.isAutoSaving,
    error: state.error,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    overallProgress: state.overallProgress,
    validationErrors: state.validationErrors,
    isSubmitted: state.isSubmitted,
    submissionDate: state.submissionDate,
    lastSavedAt: state.lastSavedAt,

    // Step data
    businessInfo: state.businessInfo,
    storeDetails: state.storeDetails,
    bankDetails: state.bankDetails,
    documents: state.documents,
    reviewSubmit: state.reviewSubmit,

    // Data methods
    updateStepData: context.updateStepData,
    updateBusinessInfo,
    updateStoreDetails,
    updateBankDetails,
    updateDocuments,
    updateReviewSubmit,
    getStepData: context.getStepData,
    getCurrentStepData,

    // Navigation methods
    nextStep: context.nextStep,
    previousStep: context.previousStep,
    goToStep: context.goToStep,
    canGoBack,
    canGoNext,
    isFirstStep,
    isLastStep,

    // Validation methods
    validateCurrentStep: context.validateCurrentStep,
    hasValidationErrors,
    getFieldError,
    hasFieldError,

    // Save methods
    saveProgress: context.saveProgress,

    // Submit methods
    submitOnboarding: context.submitOnboarding,
    canSubmit,

    // Utility methods
    clearError: context.clearError,
    resetOnboarding: context.resetOnboarding,
    refreshStatus: context.refreshStatus,

    // Progress tracking
    getStepProgress,
    getCurrentStepProgress,
    isStepComplete,
    completedStepsCount,

    // Auto-save indicator
    isAutoSaveActive,
    timeSinceLastSave,
  };
}

/**
 * Hook to access only business info step data and methods
 */
export function useBusinessInfoStep() {
  const {
    businessInfo,
    updateBusinessInfo,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  } = useOnboarding();

  return {
    data: businessInfo,
    updateData: updateBusinessInfo,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  };
}

/**
 * Hook to access only store details step data and methods
 */
export function useStoreDetailsStep() {
  const {
    storeDetails,
    updateStoreDetails,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  } = useOnboarding();

  return {
    data: storeDetails,
    updateData: updateStoreDetails,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  };
}

/**
 * Hook to access only bank details step data and methods
 */
export function useBankDetailsStep() {
  const {
    bankDetails,
    updateBankDetails,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  } = useOnboarding();

  return {
    data: bankDetails,
    updateData: updateBankDetails,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  };
}

/**
 * Hook to access only documents step data and methods
 */
export function useDocumentsStep() {
  const {
    documents,
    updateDocuments,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  } = useOnboarding();

  return {
    data: documents,
    updateData: updateDocuments,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
  };
}

/**
 * Hook to access only review & submit step data and methods
 */
export function useReviewSubmitStep() {
  const {
    reviewSubmit,
    updateReviewSubmit,
    businessInfo,
    storeDetails,
    bankDetails,
    documents,
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
    submitOnboarding,
    canSubmit,
  } = useOnboarding();

  return {
    data: reviewSubmit,
    updateData: updateReviewSubmit,
    allData: {
      businessInfo,
      storeDetails,
      bankDetails,
      documents,
      reviewSubmit,
    },
    validationErrors,
    getFieldError,
    hasFieldError,
    isLoading,
    isSaving,
    submitOnboarding,
    canSubmit,
  };
}

/**
 * Hook to access onboarding progress indicators
 */
export function useOnboardingProgress() {
  const {
    currentStep,
    totalSteps,
    overallProgress,
    completedStepsCount,
    getStepProgress,
    getCurrentStepProgress,
    isStepComplete,
    lastSavedAt,
    timeSinceLastSave,
    isAutoSaving,
  } = useOnboarding();

  return {
    currentStep,
    totalSteps,
    overallProgress,
    completedStepsCount,
    getStepProgress,
    getCurrentStepProgress,
    isStepComplete,
    lastSavedAt,
    timeSinceLastSave,
    isAutoSaving,
  };
}

export default useOnboarding;
