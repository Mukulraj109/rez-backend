# Onboarding Service - Quick Reference

Fast reference guide for implementing the merchant onboarding flow.

## Import

```typescript
import { onboardingService } from '@/services/api/onboarding';
import type {
  OnboardingStatus,
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
} from '@/types/onboarding';
```

## Core Methods

### Get Status
```typescript
const status = await onboardingService.getOnboardingStatus();
// Returns: OnboardingStatus with current step, progress, and data
```

### Submit Step
```typescript
const result = await onboardingService.submitStep(stepNumber, stepData);
// Returns: { currentStep, overallProgress, isStepCompleted, validationErrors? }
```

### Complete Step (Auto-Save)
```typescript
const result = await onboardingService.completeStep(stepNumber, stepData);
// Returns: { currentStep, overallProgress, isStepCompleted }
```

### Go Back
```typescript
const result = await onboardingService.goToPreviousStep(stepNumber);
// Returns: { previousStep, stepData? }
```

### Final Submit
```typescript
const result = await onboardingService.submitCompleteOnboarding(
  businessInfo,
  storeDetails,
  bankDetails,
  documents,
  reviewSubmit
);
// Returns: { merchantId, submissionId, status, submissionDate }
```

## Document Methods

### Upload Document
```typescript
const result = await onboardingService.uploadDocument(
  'pan_card', // Document type
  'file:///path/to/file',
  '2025-12-31', // Optional expiry
  (progress) => console.log(progress) // Optional progress
);
// Returns: { documentId, type, fileUrl, uploadedAt, verificationStatus }
```

### Get All Documents
```typescript
const data = await onboardingService.getDocuments();
// Returns: { documents, requiredDocuments, uploadedCount, pendingCount, allRequiredUploaded }
```

### Delete Document
```typescript
const result = await onboardingService.deleteDocument(0); // Document index
// Returns: { remainingDocuments, deletedAt }
```

## Validation Methods

### GST Number
```typescript
const result = onboardingService.validateGSTNumber('27AABCD1234E1Z0');
// Returns: { isValid, errors, warnings? }
```

### PAN Number
```typescript
const result = onboardingService.validatePANNumber('ABCDE1234F');
// Returns: { isValid, errors, warnings? }
```

### IFSC Code
```typescript
const result = onboardingService.validateIFSCCode('SBIN0001234');
// Returns: { isValid, errors, warnings? }
```

### Account Number
```typescript
const result = onboardingService.validateAccountNumber('123456789012', '123456789012');
// Returns: { isValid, errors }
```

### Bank Details
```typescript
const result = await onboardingService.validateBankDetails(
  accountNumber,
  ifscCode,
  panNumber,
  gstNumber
);
// Returns: { ifscValid, accountNumberValid, panValid, gstValid, ifscDetails? }
```

### Full Step Validations
```typescript
onboardingService.validateBusinessInfo(data);
onboardingService.validateStoreDetails(data);
onboardingService.validateBankDetailsStep(data);
onboardingService.validateDocuments(data);
onboardingService.validateReviewSubmit(data);
// All return: { isValid, errors }
```

## Auto-Save

### Start
```typescript
onboardingService.startAutoSave(stepNumber, stepData);
// Default: 30 seconds
onboardingService.startAutoSave(stepNumber, stepData, 15000); // Custom: 15 seconds
```

### Stop
```typescript
onboardingService.stopAutoSave();
```

## Error Handling

```typescript
try {
  await onboardingService.submitStep(1, data);
} catch (error) {
  console.error('Error:', error.message);
  // error.message contains detailed error info
}
```

## Common Patterns

### Form Submission with Validation
```typescript
async function handleSubmit(formData: any) {
  // Validate
  const validation = onboardingService.validateBusinessInfo(formData);
  if (!validation.isValid) {
    showErrors(validation.errors);
    return;
  }

  // Submit
  try {
    const result = await onboardingService.submitStep(1, formData);
    navigateToNextStep();
  } catch (error) {
    showError(error.message);
  }
}
```

### Document Upload with Progress
```typescript
async function uploadFile(fileUri: string) {
  try {
    const result = await onboardingService.uploadDocument(
      'pan_card',
      fileUri,
      undefined,
      (progress) => {
        setProgressBar(progress);
      }
    );
    addDocumentToList(result);
  } catch (error) {
    showError(error.message);
  }
}
```

### Check & Restore State
```typescript
async function initializeOnboarding() {
  const status = await onboardingService.getOnboardingStatus();
  setCurrentStep(status.currentStep);
  setProgress(status.overallProgress);
  // Load existing data for current step
  const currentStepData = status.data[`step${status.currentStep}`];
}
```

## Step Data Structures

### Step 1: Business Info
```typescript
{
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string; // 10 digits
  businessType: 'sole_proprietor' | 'partnership' | 'pvt_ltd' | 'llp' | 'other';
  businessCategory: string;
  yearsInBusiness: number;
  businessSubcategory?: string;
  businessDescription?: string;
  website?: string;
  socialMediaLinks?: { facebook?, instagram?, linkedin?, twitter? };
}
```

### Step 2: Store Details
```typescript
{
  storeName: string;
  storeType: 'online' | 'offline' | 'both';
  storeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string; // 5-6 digits
    country: string;
    latitude?: number;
    longitude?: number;
  };
  storePhone: string; // 10 digits
  storeEmail?: string;
  storeHours?: { [day]: { open, close, closed? } };
  deliveryAvailable?: boolean;
  deliveryRadius?: number;
  homeDeliveryCharges?: number;
  pickupAvailable?: boolean;
  storeImages?: { storefront?, interior?, logo? };
}
```

### Step 3: Bank Details
```typescript
{
  accountHolderName: string;
  accountNumber: string; // 9-18 digits
  confirmAccountNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string; // Format: XXXX0XXXXXX
  accountType: 'savings' | 'current' | 'business';
  panNumber: string; // Format: XXXXXDDDDD
  gstRegistered: boolean;
  bankCode?: string;
  gstNumber?: string; // 15 chars if registered
  aadharNumber?: string;
  taxFilingFrequency?: 'quarterly' | 'monthly' | 'annually';
  estimatedMonthlyRevenue?: number;
}
```

### Step 4: Documents
```typescript
{
  documents: [
    {
      type: 'pan_card' | 'aadhar' | 'gst_certificate' | 'bank_statement' | 'business_license' | 'utility_bill' | 'other';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      uploadedAt?: string;
      expiryDate?: string;
      verificationStatus?: 'pending' | 'verified' | 'rejected';
      verificationNotes?: string;
      uploadProgress?: number;
    },
    // ... more documents
  ];
  additionalDocuments?: [...];
}
```

### Step 5: Review & Submit
```typescript
{
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  agreedToDataProcessing: boolean;
  communicationConsent?: boolean;
  submissionNotes?: string;
}
```

## Field Validation Rules

| Field | Format | Example |
|-------|--------|---------|
| Phone | 10 digits | 9876543210 |
| Zip Code | 5-6 digits | 400001 |
| Account Number | 9-18 digits | 123456789012 |
| PAN | 5 letters + 4 digits + 1 letter | ABCDE1234F |
| IFSC | 4 letters + 0 + 6 alphanumeric | SBIN0001234 |
| GST | State (2) + PAN (10) + Entity (1) + Check (1) | 27AABCD1234E1Z0 |

## Step Flow

```
Start
  ↓
Step 1: Business Info
  ↓
Step 2: Store Details
  ↓
Step 3: Bank Details
  ↓
Step 4: Documents Upload
  ↓
Step 5: Review & Submit
  ↓
Submit Complete Onboarding
  ↓
Pending Review
```

## Document Types

- `pan_card` - PAN Card (Image: JPG/PNG)
- `aadhar` - Aadhar ID (Image: JPG/PNG)
- `gst_certificate` - GST Certificate (PDF)
- `bank_statement` - Bank Statement (PDF)
- `business_license` - Business License (PDF)
- `utility_bill` - Utility Bill (Image: JPG/PNG)
- `other` - Other documents (Any format)

## Business Types

- `sole_proprietor` - Sole Proprietorship
- `partnership` - Partnership Firm
- `pvt_ltd` - Private Limited Company
- `llp` - Limited Liability Partnership
- `other` - Other types

## Status Values

- `in_progress` - Onboarding not complete
- `pending_review` - Awaiting admin review
- `approved` - Onboarding approved
- `rejected` - Onboarding rejected
- `on_hold` - Under review

## Response Formats

### Validation Result
```typescript
{
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}
```

### API Response
```typescript
{
  success: boolean;
  message: string;
  data: T;
  error?: string;
  timestamp?: string;
}
```

### Onboarding Status
```typescript
{
  merchantId: string;
  currentStep: number;
  totalSteps: number;
  overallProgress: number; // 0-100
  completedSteps: OnboardingStep[];
  isSubmitted: boolean;
  status: 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'on_hold';
  data: {
    businessInfo?: BusinessInfoStep;
    storeDetails?: StoreDetailsStep;
    bankDetails?: BankDetailsStep;
    documents?: DocumentsStep;
    reviewSubmit?: ReviewSubmitStep;
  };
}
```

## Testing Tips

1. **Validate Each Step**: Always validate before submission
2. **Test Error Cases**: Try invalid data to see error messages
3. **Test File Upload**: Verify document upload with different formats
4. **Test Auto-Save**: Enable and verify background saving
5. **Test Navigation**: Test going forward and backward
6. **Test Final Submit**: Ensure complete submission works

## Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid GST format" | Check 15-character format |
| "Account numbers don't match" | Ensure confirmation field matches |
| "IFSC invalid" | Must be exactly: 4 letters + 0 + 6 alphanumeric |
| "File upload failed" | Check file size and format |
| "Token expired" | Re-authenticate user |
| "Step incomplete" | Validate all required fields |
