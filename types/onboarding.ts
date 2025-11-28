/**
 * Onboarding Types
 * Comprehensive type definitions for the 5-step merchant onboarding process
 */

// ============================================================================
// Step Types & Data
// ============================================================================

/**
 * Step 1: Business Information
 */
export interface BusinessInfoStep {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessType: 'sole_proprietor' | 'partnership' | 'pvt_ltd' | 'llp' | 'other';
  businessCategory: string;
  businessSubcategory?: string;
  yearsInBusiness: number;
  businessDescription?: string;
  website?: string;
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

/**
 * Step 2: Store Details
 */
export interface StoreDetailsStep {
  storeName: string;
  storeType: 'online' | 'offline' | 'both';
  storeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  storePhone: string;
  storeEmail?: string;
  storeHours?: {
    monday?: { open: string; close: string; closed?: boolean };
    tuesday?: { open: string; close: string; closed?: boolean };
    wednesday?: { open: string; close: string; closed?: boolean };
    thursday?: { open: string; close: string; closed?: boolean };
    friday?: { open: string; close: string; closed?: boolean };
    saturday?: { open: string; close: string; closed?: boolean };
    sunday?: { open: string; close: string; closed?: boolean };
  };
  deliveryAvailable?: boolean;
  deliveryRadius?: number; // in km
  homeDeliveryCharges?: number;
  pickupAvailable?: boolean;
  storeImages?: {
    storefront?: string;
    interior?: string;
    logo?: string;
  };
}

/**
 * Step 3: Bank Details & Account Information
 */
export interface BankDetailsStep {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  bankName: string;
  bankCode?: string;
  branchName: string;
  ifscCode: string;
  accountType: 'savings' | 'current' | 'business';
  panNumber: string;
  gstNumber?: string;
  gstRegistered: boolean;
  aadharNumber?: string;
  taxFilingFrequency?: 'quarterly' | 'monthly' | 'annually';
  estimatedMonthlyRevenue?: number;
}

/**
 * Step 4: Documents Upload
 */
export interface DocumentType {
  id: string;
  type: 'pan_card' | 'aadhar' | 'gst_certificate' | 'bank_statement' | 'business_license' | 'utility_bill' | 'other';
  label: string;
  description: string;
  isRequired: boolean;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  expiryRequired?: boolean;
  expiryDate?: string;
}

export interface DocumentUpload {
  type: 'pan_card' | 'aadhar' | 'gst_certificate' | 'bank_statement' | 'business_license' | 'utility_bill' | 'other';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  expiryDate?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  uploadProgress?: number;
}

export interface DocumentsStep {
  documents: DocumentUpload[];
  additionalDocuments?: DocumentUpload[];
}

/**
 * Step 5: Review & Submit
 */
export interface ReviewSubmitStep {
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  agreedToDataProcessing: boolean;
  communicationConsent: boolean;
  submissionNotes?: string;
}

// ============================================================================
// Overall Onboarding Status & Progress
// ============================================================================

export interface OnboardingStep {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrentStep: boolean;
  isSkipped?: boolean;
  completedAt?: string;
  validationErrors?: Record<string, string>;
}

export interface OnboardingStatus {
  merchantId: string;
  currentStep: number;
  totalSteps: number;
  overallProgress: number; // 0-100
  completedSteps: OnboardingStep[];
  isSubmitted: boolean;
  submissionDate?: string;
  status: 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'on_hold';
  rejectionReason?: string;
  reviewNotes?: string;
  startedAt: string;
  lastUpdatedAt: string;
  expiresAt?: string;
  data: {
    businessInfo?: BusinessInfoStep;
    storeDetails?: StoreDetailsStep;
    bankDetails?: BankDetailsStep;
    documents?: DocumentsStep;
    reviewSubmit?: ReviewSubmitStep;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetOnboardingStatusRequest {
  merchantId?: string;
}

export interface GetOnboardingStatusResponse {
  success: boolean;
  message: string;
  data: OnboardingStatus;
}

export interface CompleteStepRequest {
  stepNumber: number;
  stepData: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep;
}

export interface CompleteStepResponse {
  success: boolean;
  message: string;
  data: {
    currentStep: number;
    overallProgress: number;
    isStepCompleted: boolean;
    validationErrors?: Record<string, string>;
  };
}

export interface SubmitStepRequest {
  stepNumber: number;
  stepData: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep;
  validateOnly?: boolean;
}

export interface SubmitStepResponse {
  success: boolean;
  message: string;
  data: {
    currentStep: number;
    overallProgress: number;
    nextStep?: number;
    isCompleted: boolean;
    validationErrors?: Record<string, string>;
  };
}

export interface PreviousStepRequest {
  stepNumber: number;
}

export interface PreviousStepResponse {
  success: boolean;
  message: string;
  data: {
    previousStep: number;
    stepData?: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep;
  };
}

export interface SubmitOnboardingRequest {
  finalData: {
    businessInfo: BusinessInfoStep;
    storeDetails: StoreDetailsStep;
    bankDetails: BankDetailsStep;
    documents: DocumentsStep;
    reviewSubmit: ReviewSubmitStep;
  };
}

export interface SubmitOnboardingResponse {
  success: boolean;
  message: string;
  data: {
    merchantId: string;
    submissionId: string;
    status: 'pending_review' | 'in_progress';
    submissionDate: string;
    estimatedReviewDate?: string;
    nextSteps?: string[];
  };
}

export interface DocumentUploadRequest {
  type: DocumentType['type'];
  fileUri: string;
  expiryDate?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: {
    documentId: string;
    type: string;
    fileUrl: string;
    uploadedAt: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    uploadProgress: number;
  };
}

export interface GetDocumentsResponse {
  success: boolean;
  message: string;
  data: {
    documents: DocumentUpload[];
    requiredDocuments: DocumentType[];
    uploadedCount: number;
    pendingCount: number;
    allRequiredUploaded: boolean;
  };
}

export interface DeleteDocumentRequest {
  documentIndex: number;
}

export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
  data: {
    remainingDocuments: DocumentUpload[];
    deletedAt: string;
  };
}

// ============================================================================
// Validation & Helper Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface AutoSaveData {
  stepNumber: number;
  data: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep;
  savedAt: string;
  autoSaveInterval?: number; // milliseconds
}

export interface OnboardingProgress {
  step1: {
    completed: boolean;
    completedAt?: string;
  };
  step2: {
    completed: boolean;
    completedAt?: string;
  };
  step3: {
    completed: boolean;
    completedAt?: string;
  };
  step4: {
    completed: boolean;
    completedAt?: string;
  };
  step5: {
    completed: boolean;
    completedAt?: string;
  };
  overallProgress: number;
}

export interface DocumentValidationError {
  type: string;
  error: string;
  suggestion?: string;
}

export interface BankValidationResult {
  ifscValid: boolean;
  ifscDetails?: {
    bankName: string;
    branchName: string;
    address: string;
    city: string;
    state: string;
  };
  accountNumberValid: boolean;
  panValid: boolean;
  gstValid: boolean;
}

// ============================================================================
// Filter & Pagination Types
// ============================================================================

export interface OnboardingFilters {
  status?: 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'on_hold';
  currentStep?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'progress';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

export interface PaginatedOnboardingResponse {
  success: boolean;
  data: {
    items: OnboardingStatus[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}
