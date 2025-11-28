/**
 * Onboarding API Service
 * Handles all onboarding-related API calls for the 5-step merchant onboarding wizard
 *
 * Features:
 * - Step-by-step form management
 * - Auto-save capability
 * - Document upload with progress tracking
 * - Validation helpers (GST, PAN, IFSC)
 * - Comprehensive error handling
 */

import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';
import {
  OnboardingStatus,
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
  CompleteStepRequest,
  CompleteStepResponse,
  SubmitStepRequest,
  SubmitStepResponse,
  PreviousStepRequest,
  PreviousStepResponse,
  SubmitOnboardingRequest,
  SubmitOnboardingResponse,
  DocumentUploadRequest,
  DocumentUploadResponse,
  GetDocumentsResponse,
  DeleteDocumentRequest,
  DeleteDocumentResponse,
  GetOnboardingStatusResponse,
  ValidationResult,
  BankValidationResult,
} from '../../types/onboarding';

/**
 * OnboardingService handles all merchant onboarding processes
 */
class OnboardingService {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private autoSaveDelay: number = 30000; // 30 seconds

  /**
   * Get current onboarding status
   */
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    try {
      console.log('📋 Fetching onboarding status...');

      const response = await fetch(getApiUrl('merchant/onboarding/status'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as GetOnboardingStatusResponse;

      if (data.success && data.data) {
        console.log('✅ Onboarding status fetched:', data.data.currentStep);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get onboarding status');
      }
    } catch (error: any) {
      console.error('❌ Get onboarding status error:', error);
      throw new Error(error.message || 'Failed to get onboarding status');
    }
  }

  /**
   * Submit a step (saves data and validates before moving to next step)
   */
  async submitStep(
    stepNumber: number,
    stepData: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep,
    validateOnly: boolean = false
  ): Promise<SubmitStepResponse['data']> {
    try {
      console.log(`📝 Submitting step ${stepNumber}...`);

      const response = await fetch(getApiUrl(`merchant/onboarding/step/${stepNumber}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          stepNumber,
          stepData,
          validateOnly,
        } as SubmitStepRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as SubmitStepResponse;

      if (data.success && data.data) {
        console.log(`✅ Step ${stepNumber} submitted successfully`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to submit step');
      }
    } catch (error: any) {
      console.error(`❌ Submit step ${stepNumber} error:`, error);
      throw new Error(error.message || `Failed to submit step ${stepNumber}`);
    }
  }

  /**
   * Complete a step (saves data without validating)
   */
  async completeStep(
    stepNumber: number,
    stepData: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep
  ): Promise<CompleteStepResponse['data']> {
    try {
      console.log(`✔️ Marking step ${stepNumber} as complete...`);

      const response = await fetch(getApiUrl(`merchant/onboarding/step/${stepNumber}/complete`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          stepNumber,
          stepData,
        } as CompleteStepRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as CompleteStepResponse;

      if (data.success && data.data) {
        console.log(`✅ Step ${stepNumber} marked as complete`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to complete step');
      }
    } catch (error: any) {
      console.error(`❌ Complete step ${stepNumber} error:`, error);
      throw new Error(error.message || `Failed to complete step ${stepNumber}`);
    }
  }

  /**
   * Go to previous step
   */
  async goToPreviousStep(stepNumber: number): Promise<PreviousStepResponse['data']> {
    try {
      console.log(`⬅️ Going to previous step from ${stepNumber}...`);

      const response = await fetch(getApiUrl(`merchant/onboarding/step/${stepNumber}/previous`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ stepNumber } as PreviousStepRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as PreviousStepResponse;

      if (data.success && data.data) {
        console.log(`✅ Moved to previous step`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to go to previous step');
      }
    } catch (error: any) {
      console.error(`❌ Go to previous step error:`, error);
      throw new Error(error.message || 'Failed to go to previous step');
    }
  }

  /**
   * Submit the complete onboarding (all 5 steps)
   */
  async submitCompleteOnboarding(
    businessInfo: BusinessInfoStep,
    storeDetails: StoreDetailsStep,
    bankDetails: BankDetailsStep,
    documents: DocumentsStep,
    reviewSubmit: ReviewSubmitStep
  ): Promise<SubmitOnboardingResponse['data']> {
    try {
      console.log('🚀 Submitting complete onboarding...');

      const response = await fetch(getApiUrl('merchant/onboarding/submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          finalData: {
            businessInfo,
            storeDetails,
            bankDetails,
            documents,
            reviewSubmit,
          },
        } as SubmitOnboardingRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as SubmitOnboardingResponse;

      if (data.success && data.data) {
        console.log('✅ Onboarding submitted successfully');
        // Clear auto-save after successful submission
        this.stopAutoSave();
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to submit onboarding');
      }
    } catch (error: any) {
      console.error('❌ Submit onboarding error:', error);
      throw new Error(error.message || 'Failed to submit onboarding');
    }
  }

  /**
   * Upload a document
   */
  async uploadDocument(
    type: 'pan_card' | 'aadhar' | 'gst_certificate' | 'bank_statement' | 'business_license' | 'utility_bill' | 'other',
    fileUri: string,
    expiryDate?: string,
    onProgress?: (progress: number) => void
  ): Promise<DocumentUploadResponse['data']> {
    try {
      console.log(`📤 Uploading ${type} document...`);

      // Create FormData for file upload
      const formData = new FormData();

      const fileToUpload = {
        uri: fileUri,
        type: this.getDocumentMimeType(type),
        name: `${type}_${Date.now()}.${this.getDocumentExtension(type)}`,
      };

      formData.append('document', fileToUpload as any);
      formData.append('type', type);

      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }

      // Use fetch with progress tracking
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(Math.round(progress));
          }
        });
      }

      return new Promise((resolve, reject) => {
        xhr.onload = async () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText) as DocumentUploadResponse;
              if (data.success && data.data) {
                console.log(`✅ ${type} document uploaded successfully`);
                resolve(data.data);
              } else {
                reject(new Error(data.message || 'Failed to upload document'));
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during document upload'));
        };

        xhr.onabort = () => {
          reject(new Error('Document upload aborted'));
        };

        xhr.open('POST', getApiUrl('merchant/onboarding/documents/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${storageService.getAuthToken().then(token => token || '')}`);

        xhr.send(formData);
      });
    } catch (error: any) {
      console.error(`❌ Upload ${type} document error:`, error);
      throw new Error(error.message || `Failed to upload ${type} document`);
    }
  }

  /**
   * Get all uploaded documents
   */
  async getDocuments(): Promise<GetDocumentsResponse['data']> {
    try {
      console.log('📄 Fetching documents...');

      const response = await fetch(getApiUrl('merchant/onboarding/documents'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as GetDocumentsResponse;

      if (data.success && data.data) {
        console.log('✅ Documents fetched:', data.data.documents.length);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get documents');
      }
    } catch (error: any) {
      console.error('❌ Get documents error:', error);
      throw new Error(error.message || 'Failed to get documents');
    }
  }

  /**
   * Delete a document by index
   */
  async deleteDocument(documentIndex: number): Promise<DeleteDocumentResponse['data']> {
    try {
      console.log(`🗑️ Deleting document at index ${documentIndex}...`);

      const response = await fetch(getApiUrl(`merchant/onboarding/documents/${documentIndex}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ documentIndex } as DeleteDocumentRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as DeleteDocumentResponse;

      if (data.success && data.data) {
        console.log('✅ Document deleted successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to delete document');
      }
    } catch (error: any) {
      console.error('❌ Delete document error:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  }

  /**
   * Validate GST Number
   */
  validateGSTNumber(gstNumber: string): ValidationResult {
    console.log('🔍 Validating GST number...');

    // GST number format: 2-digit state code + 10-digit PAN + 1-digit entity number + 1-digit checksum
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstNumber) {
      return {
        isValid: false,
        errors: { gstNumber: 'GST number is required' },
      };
    }

    const cleanGST = gstNumber.toUpperCase().trim();

    if (!gstRegex.test(cleanGST)) {
      return {
        isValid: false,
        errors: { gstNumber: 'Invalid GST number format' },
        warnings: { gstNumber: 'GST should be 15 characters (numeric and uppercase letters)' },
      };
    }

    console.log('✅ GST number is valid');
    return {
      isValid: true,
      errors: {},
    };
  }

  /**
   * Validate PAN Number
   */
  validatePANNumber(panNumber: string): ValidationResult {
    console.log('🔍 Validating PAN number...');

    // PAN format: 5 letters + 4 digits + 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panNumber) {
      return {
        isValid: false,
        errors: { panNumber: 'PAN number is required' },
      };
    }

    const cleanPAN = panNumber.toUpperCase().trim();

    if (!panRegex.test(cleanPAN)) {
      return {
        isValid: false,
        errors: { panNumber: 'Invalid PAN number format' },
        warnings: { panNumber: 'PAN should be 10 characters (5 letters + 4 digits + 1 letter)' },
      };
    }

    console.log('✅ PAN number is valid');
    return {
      isValid: true,
      errors: {},
    };
  }

  /**
   * Validate IFSC Code
   */
  validateIFSCCode(ifscCode: string): ValidationResult {
    console.log('🔍 Validating IFSC code...');

    // IFSC format: 4 letters (bank code) + 0 + 6 characters (branch code)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscCode) {
      return {
        isValid: false,
        errors: { ifscCode: 'IFSC code is required' },
      };
    }

    const cleanIFSC = ifscCode.toUpperCase().trim();

    if (!ifscRegex.test(cleanIFSC)) {
      return {
        isValid: false,
        errors: { ifscCode: 'Invalid IFSC code format' },
        warnings: { ifscCode: 'IFSC should be 11 characters (4 letters + 0 + 6 characters)' },
      };
    }

    console.log('✅ IFSC code is valid');
    return {
      isValid: true,
      errors: {},
    };
  }

  /**
   * Validate Account Number
   */
  validateAccountNumber(accountNumber: string, confirmAccountNumber: string): ValidationResult {
    console.log('🔍 Validating account number...');

    const errors: Record<string, string> = {};

    if (!accountNumber || accountNumber.trim().length === 0) {
      errors.accountNumber = 'Account number is required';
    } else if (accountNumber.length < 9 || accountNumber.length > 18) {
      errors.accountNumber = 'Account number should be 9-18 digits';
    } else if (!/^\d+$/.test(accountNumber)) {
      errors.accountNumber = 'Account number should contain only digits';
    }

    if (!confirmAccountNumber || confirmAccountNumber.trim().length === 0) {
      errors.confirmAccountNumber = 'Please confirm account number';
    } else if (accountNumber !== confirmAccountNumber) {
      errors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Account number validation failed:', errors);
      return {
        isValid: false,
        errors,
      };
    }

    console.log('✅ Account number is valid');
    return {
      isValid: true,
      errors: {},
    };
  }

  /**
   * Validate Bank Details
   */
  async validateBankDetails(
    accountNumber: string,
    ifscCode: string,
    panNumber: string,
    gstNumber?: string
  ): Promise<BankValidationResult> {
    console.log('🏦 Validating bank details...');

    const result: BankValidationResult = {
      ifscValid: this.validateIFSCCode(ifscCode).isValid,
      accountNumberValid: this.validateAccountNumber(accountNumber, accountNumber).isValid,
      panValid: this.validatePANNumber(panNumber).isValid,
      gstValid: gstNumber ? this.validateGSTNumber(gstNumber).isValid : true,
    };

    console.log('✅ Bank details validation result:', result);
    return result;
  }

  /**
   * Start auto-saving data
   */
  startAutoSave(
    stepNumber: number,
    stepData: BusinessInfoStep | StoreDetailsStep | BankDetailsStep | DocumentsStep | ReviewSubmitStep,
    interval?: number
  ): void {
    console.log(`⏱️ Starting auto-save for step ${stepNumber}...`);

    if (this.autoSaveInterval) {
      this.stopAutoSave();
    }

    if (interval) {
      this.autoSaveDelay = interval;
    }

    this.autoSaveInterval = setInterval(async () => {
      try {
        await this.completeStep(stepNumber, stepData);
        console.log(`✅ Auto-saved step ${stepNumber}`);
      } catch (error) {
        console.warn(`⚠️ Auto-save failed for step ${stepNumber}:`, error);
      }
    }, this.autoSaveDelay);
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏹️ Auto-save stopped');
    }
  }

  /**
   * Validate Business Info Step
   */
  validateBusinessInfo(data: BusinessInfoStep): ValidationResult {
    console.log('🔍 Validating business info...');
    const errors: Record<string, string> = {};

    if (!data.businessName || data.businessName.trim().length === 0) {
      errors.businessName = 'Business name is required';
    }

    if (!data.ownerName || data.ownerName.trim().length === 0) {
      errors.ownerName = 'Owner name is required';
    }

    if (!data.ownerEmail || data.ownerEmail.trim().length === 0) {
      errors.ownerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail)) {
      errors.ownerEmail = 'Invalid email format';
    }

    if (!data.ownerPhone || data.ownerPhone.trim().length === 0) {
      errors.ownerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(data.ownerPhone.replace(/\D/g, ''))) {
      errors.ownerPhone = 'Phone number should be 10 digits';
    }

    if (!data.businessType) {
      errors.businessType = 'Business type is required';
    }

    if (!data.businessCategory) {
      errors.businessCategory = 'Business category is required';
    }

    if (data.yearsInBusiness < 0) {
      errors.yearsInBusiness = 'Years in business cannot be negative';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Business info validation failed:', errors);
      return { isValid: false, errors };
    }

    console.log('✅ Business info is valid');
    return { isValid: true, errors: {} };
  }

  /**
   * Validate Store Details Step
   */
  validateStoreDetails(data: StoreDetailsStep): ValidationResult {
    console.log('🔍 Validating store details...');
    const errors: Record<string, string> = {};

    if (!data.storeName || data.storeName.trim().length === 0) {
      errors.storeName = 'Store name is required';
    }

    if (!data.storeType) {
      errors.storeType = 'Store type is required';
    }

    if (!data.storeAddress.street) {
      errors.street = 'Street address is required';
    }

    if (!data.storeAddress.city) {
      errors.city = 'City is required';
    }

    if (!data.storeAddress.state) {
      errors.state = 'State is required';
    }

    if (!data.storeAddress.zipCode) {
      errors.zipCode = 'Zip code is required';
    } else if (!/^\d{5,6}$/.test(data.storeAddress.zipCode.replace(/\D/g, ''))) {
      errors.zipCode = 'Zip code should be 5-6 digits';
    }

    if (!data.storePhone) {
      errors.storePhone = 'Store phone is required';
    } else if (!/^\d{10}$/.test(data.storePhone.replace(/\D/g, ''))) {
      errors.storePhone = 'Phone number should be 10 digits';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Store details validation failed:', errors);
      return { isValid: false, errors };
    }

    console.log('✅ Store details are valid');
    return { isValid: true, errors: {} };
  }

  /**
   * Validate Bank Details Step
   */
  validateBankDetailsStep(data: BankDetailsStep): ValidationResult {
    console.log('🔍 Validating bank details...');
    const errors: Record<string, string> = {};

    if (!data.accountHolderName || data.accountHolderName.trim().length === 0) {
      errors.accountHolderName = 'Account holder name is required';
    }

    if (!data.accountNumber || data.accountNumber.trim().length === 0) {
      errors.accountNumber = 'Account number is required';
    }

    if (!data.bankName || data.bankName.trim().length === 0) {
      errors.bankName = 'Bank name is required';
    }

    if (!data.branchName || data.branchName.trim().length === 0) {
      errors.branchName = 'Branch name is required';
    }

    const ifscValidation = this.validateIFSCCode(data.ifscCode);
    if (!ifscValidation.isValid) {
      errors.ifscCode = ifscValidation.errors.ifscCode;
    }

    const panValidation = this.validatePANNumber(data.panNumber);
    if (!panValidation.isValid) {
      errors.panNumber = panValidation.errors.panNumber;
    }

    if (data.gstRegistered && data.gstNumber) {
      const gstValidation = this.validateGSTNumber(data.gstNumber);
      if (!gstValidation.isValid) {
        errors.gstNumber = gstValidation.errors.gstNumber;
      }
    }

    if (!data.accountType) {
      errors.accountType = 'Account type is required';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Bank details validation failed:', errors);
      return { isValid: false, errors };
    }

    console.log('✅ Bank details are valid');
    return { isValid: true, errors: {} };
  }

  /**
   * Validate Documents Step
   */
  validateDocuments(data: DocumentsStep): ValidationResult {
    console.log('🔍 Validating documents...');
    const errors: Record<string, string> = {};

    if (!data.documents || data.documents.length === 0) {
      errors.documents = 'At least one document is required';
    } else {
      // Check if all required documents are uploaded
      const requiredTypes = ['pan_card', 'aadhar'];
      const uploadedTypes = data.documents.map((d) => d.type);

      requiredTypes.forEach((type) => {
        if (!uploadedTypes.includes(type as any)) {
          errors[type] = `${type.replace('_', ' ')} document is required`;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Documents validation failed:', errors);
      return { isValid: false, errors };
    }

    console.log('✅ Documents are valid');
    return { isValid: true, errors: {} };
  }

  /**
   * Validate Review & Submit Step
   */
  validateReviewSubmit(data: ReviewSubmitStep): ValidationResult {
    console.log('🔍 Validating review & submit...');
    const errors: Record<string, string> = {};

    if (!data.agreedToTerms) {
      errors.agreedToTerms = 'You must agree to terms and conditions';
    }

    if (!data.agreedToPrivacy) {
      errors.agreedToPrivacy = 'You must agree to privacy policy';
    }

    if (!data.agreedToDataProcessing) {
      errors.agreedToDataProcessing = 'You must agree to data processing';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Review & submit validation failed:', errors);
      return { isValid: false, errors };
    }

    console.log('✅ Review & submit is valid');
    return { isValid: true, errors: {} };
  }

  /**
   * Helper: Get document MIME type
   */
  private getDocumentMimeType(type: string): string {
    const mimeTypes: Record<string, string> = {
      pan_card: 'image/jpeg',
      aadhar: 'image/jpeg',
      gst_certificate: 'application/pdf',
      bank_statement: 'application/pdf',
      business_license: 'application/pdf',
      utility_bill: 'image/jpeg',
      other: 'application/octet-stream',
    };
    return mimeTypes[type] || 'application/octet-stream';
  }

  /**
   * Helper: Get document file extension
   */
  private getDocumentExtension(type: string): string {
    const extensions: Record<string, string> = {
      pan_card: 'jpg',
      aadhar: 'jpg',
      gst_certificate: 'pdf',
      bank_statement: 'pdf',
      business_license: 'pdf',
      utility_bill: 'jpg',
      other: 'bin',
    };
    return extensions[type] || 'bin';
  }

  /**
   * Helper: Get auth token from storage
   */
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }
}

// Create and export singleton instance
export const onboardingService = new OnboardingService();
export default onboardingService;
