# Onboarding API Service Guide

Complete documentation for the merchant onboarding API service implementation for the merchant app.

## Overview

The Onboarding Service provides a comprehensive API client for managing the 5-step merchant onboarding wizard process. It handles:

- Step-by-step form management
- Data validation with GST/PAN/IFSC helpers
- Document upload with progress tracking
- Auto-save capability
- Complete onboarding submission

## File Structure

```
services/api/onboarding.ts    # Main API service
types/onboarding.ts            # Type definitions
```

## Installation & Setup

### Import the Service

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

## Onboarding Steps

### Step 1: Business Information

**Purpose:** Collect basic business and owner details

**Required Fields:**
- `businessName` - Name of the business
- `ownerName` - Name of business owner
- `ownerEmail` - Contact email
- `ownerPhone` - Contact phone (10 digits)
- `businessType` - Type of business (sole_proprietor, partnership, pvt_ltd, llp, other)
- `businessCategory` - Business category
- `yearsInBusiness` - Years operating (0+)

**Optional Fields:**
- `businessSubcategory` - Sub-category if applicable
- `businessDescription` - Details about business
- `website` - Business website URL
- `socialMediaLinks` - Links to social media profiles

**Example:**
```typescript
const businessInfo: BusinessInfoStep = {
  businessName: 'ABC Store',
  ownerName: 'John Doe',
  ownerEmail: 'john@example.com',
  ownerPhone: '9876543210',
  businessType: 'sole_proprietor',
  businessCategory: 'Retail',
  yearsInBusiness: 5,
  website: 'https://abc-store.com',
};

await onboardingService.submitStep(1, businessInfo);
```

### Step 2: Store Details

**Purpose:** Collect physical store location and operational details

**Required Fields:**
- `storeName` - Name of the store
- `storeType` - online | offline | both
- `storeAddress.street` - Street address
- `storeAddress.city` - City
- `storeAddress.state` - State/Province
- `storeAddress.zipCode` - Postal code (5-6 digits)
- `storeAddress.country` - Country
- `storePhone` - Store phone (10 digits)

**Optional Fields:**
- `storeEmail` - Store email
- `storeHours` - Operating hours for each day
- `deliveryAvailable` - Whether delivery is available
- `deliveryRadius` - Delivery radius in km
- `homeDeliveryCharges` - Delivery charges
- `pickupAvailable` - Whether pickup is available
- `storeImages` - Store photos (storefront, interior, logo)

**Example:**
```typescript
const storeDetails: StoreDetailsStep = {
  storeName: 'ABC Store Main Branch',
  storeType: 'offline',
  storeAddress: {
    street: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400001',
    country: 'India',
    latitude: 19.0760,
    longitude: 72.8777,
  },
  storePhone: '9876543210',
  storeEmail: 'store@abc.com',
  deliveryAvailable: true,
  deliveryRadius: 5,
  homeDeliveryCharges: 50,
};

await onboardingService.submitStep(2, storeDetails);
```

### Step 3: Bank Details

**Purpose:** Collect financial and bank account information

**Required Fields:**
- `accountHolderName` - Bank account holder name
- `accountNumber` - Bank account number (9-18 digits)
- `confirmAccountNumber` - Confirmation of account number
- `bankName` - Name of the bank
- `branchName` - Bank branch name
- `ifscCode` - IFSC code (11 characters: 4 letters + 0 + 6 characters)
- `accountType` - savings | current | business
- `panNumber` - PAN number (10 characters: 5 letters + 4 digits + 1 letter)
- `gstRegistered` - Whether GST is registered

**Optional Fields:**
- `bankCode` - Bank code
- `gstNumber` - GST registration number (15 characters)
- `aadharNumber` - Aadhar number
- `taxFilingFrequency` - quarterly | monthly | annually
- `estimatedMonthlyRevenue` - Expected monthly revenue

**Example:**
```typescript
const bankDetails: BankDetailsStep = {
  accountHolderName: 'John Doe',
  accountNumber: '123456789012',
  confirmAccountNumber: '123456789012',
  bankName: 'State Bank of India',
  branchName: 'Mumbai Main Branch',
  ifscCode: 'SBIN0001234',
  accountType: 'business',
  panNumber: 'ABCDE1234F',
  gstRegistered: true,
  gstNumber: '27AABCD1234E1Z0',
  estimatedMonthlyRevenue: 100000,
};

await onboardingService.submitStep(3, bankDetails);
```

### Step 4: Documents Upload

**Purpose:** Upload required documents for verification

**Supported Document Types:**
- `pan_card` - PAN card
- `aadhar` - Aadhar ID
- `gst_certificate` - GST certificate
- `bank_statement` - Bank statement
- `business_license` - Business license
- `utility_bill` - Utility bill as address proof
- `other` - Other documents

**Example:**
```typescript
const documents: DocumentsStep = {
  documents: [
    {
      type: 'pan_card',
      uploadProgress: 100,
    },
    {
      type: 'aadhar',
      uploadProgress: 100,
    },
    {
      type: 'gst_certificate',
      uploadProgress: 100,
    },
  ],
};

await onboardingService.submitStep(4, documents);
```

**Upload Documents:**
```typescript
// Single document with progress tracking
const fileUri = 'file:///path/to/document.pdf';
const result = await onboardingService.uploadDocument(
  'pan_card',
  fileUri,
  undefined, // expiryDate (optional)
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

// Result contains:
// - documentId
// - type
// - fileUrl
// - uploadedAt
// - verificationStatus
// - uploadProgress
```

**Get All Documents:**
```typescript
const documentsData = await onboardingService.getDocuments();

console.log(documentsData);
// {
//   documents: [...],
//   requiredDocuments: [...],
//   uploadedCount: 3,
//   pendingCount: 1,
//   allRequiredUploaded: false
// }
```

**Delete a Document:**
```typescript
const result = await onboardingService.deleteDocument(0); // Index of document

console.log(result.remainingDocuments);
```

### Step 5: Review & Submit

**Purpose:** Final review and agreement to terms

**Required Fields:**
- `agreedToTerms` - Agreed to T&C
- `agreedToPrivacy` - Agreed to privacy policy
- `agreedToDataProcessing` - Agreed to data processing
- `communicationConsent` - Consented to communications (optional)

**Optional Fields:**
- `submissionNotes` - Any additional notes

**Example:**
```typescript
const reviewSubmit: ReviewSubmitStep = {
  agreedToTerms: true,
  agreedToPrivacy: true,
  agreedToDataProcessing: true,
  communicationConsent: true,
};

await onboardingService.submitStep(5, reviewSubmit);
```

## API Methods

### Get Onboarding Status

Fetch the current onboarding status and progress.

```typescript
const status = await onboardingService.getOnboardingStatus();

console.log(status);
// {
//   merchantId: 'merchant_123',
//   currentStep: 2,
//   totalSteps: 5,
//   overallProgress: 40,
//   completedSteps: [...],
//   isSubmitted: false,
//   status: 'in_progress',
//   data: {
//     businessInfo: {...},
//     storeDetails: {...},
//     ...
//   }
// }
```

### Submit Step

Save and validate a step before moving to the next.

```typescript
const result = await onboardingService.submitStep(1, businessInfo);

console.log(result);
// {
//   currentStep: 2,
//   overallProgress: 20,
//   isStepCompleted: true,
//   validationErrors: {} // Empty if valid
// }
```

### Complete Step

Save a step without validation (for auto-save).

```typescript
const result = await onboardingService.completeStep(1, businessInfo);

console.log(result);
// {
//   currentStep: 1,
//   overallProgress: 20,
//   isStepCompleted: true
// }
```

### Go to Previous Step

Navigate back to a previous step.

```typescript
const result = await onboardingService.goToPreviousStep(2);

console.log(result);
// {
//   previousStep: 1,
//   stepData: {...} // Previous step data
// }
```

### Submit Complete Onboarding

Final submission of all steps.

```typescript
const result = await onboardingService.submitCompleteOnboarding(
  businessInfo,
  storeDetails,
  bankDetails,
  documents,
  reviewSubmit
);

console.log(result);
// {
//   merchantId: 'merchant_123',
//   submissionId: 'sub_123',
//   status: 'pending_review',
//   submissionDate: '2024-01-15T10:30:00Z',
//   estimatedReviewDate: '2024-01-22T10:30:00Z'
// }
```

## Validation Methods

### Validate GST Number

```typescript
const result = onboardingService.validateGSTNumber('27AABCD1234E1Z0');

if (result.isValid) {
  console.log('Valid GST number');
} else {
  console.log(result.errors);
}
```

**Format:** 15 characters
- 2-digit state code
- 5-letter PAN first part
- 4-digit PAN middle part
- 1-letter PAN last part
- 1-digit entity number
- 1-letter check digit

### Validate PAN Number

```typescript
const result = onboardingService.validatePANNumber('ABCDE1234F');

if (result.isValid) {
  console.log('Valid PAN number');
} else {
  console.log(result.errors);
}
```

**Format:** 10 characters
- 5 uppercase letters
- 4 digits
- 1 uppercase letter

### Validate IFSC Code

```typescript
const result = onboardingService.validateIFSCCode('SBIN0001234');

if (result.isValid) {
  console.log('Valid IFSC code');
} else {
  console.log(result.errors);
}
```

**Format:** 11 characters
- 4 uppercase letters (bank code)
- 1 zero
- 6 alphanumeric characters (branch code)

### Validate Account Number

```typescript
const result = onboardingService.validateAccountNumber(
  '123456789012',
  '123456789012'
);

if (result.isValid) {
  console.log('Valid account number');
} else {
  console.log(result.errors);
}
```

**Requirements:**
- 9-18 digits
- Confirmation must match
- Only numeric characters

### Validate Bank Details

```typescript
const bankValidation = await onboardingService.validateBankDetails(
  '123456789012',
  'SBIN0001234',
  'ABCDE1234F',
  '27AABCD1234E1Z0'
);

console.log(bankValidation);
// {
//   ifscValid: true,
//   accountNumberValid: true,
//   panValid: true,
//   gstValid: true,
//   ifscDetails: {...} // Bank details if available
// }
```

### Validate Steps

Each step has a dedicated validation method:

```typescript
// Step 1
const v1 = onboardingService.validateBusinessInfo(businessInfo);

// Step 2
const v2 = onboardingService.validateStoreDetails(storeDetails);

// Step 3
const v3 = onboardingService.validateBankDetailsStep(bankDetails);

// Step 4
const v4 = onboardingService.validateDocuments(documents);

// Step 5
const v5 = onboardingService.validateReviewSubmit(reviewSubmit);
```

## Auto-Save Feature

Automatically save step data at regular intervals.

```typescript
// Start auto-save (default: 30 seconds)
onboardingService.startAutoSave(1, businessInfo);

// Start with custom interval (every 15 seconds)
onboardingService.startAutoSave(1, businessInfo, 15000);

// Stop auto-save
onboardingService.stopAutoSave();
```

## Complete Example Flow

```typescript
import { onboardingService } from '@/services/api/onboarding';
import type {
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
} from '@/types/onboarding';

// Step 1: Collect Business Info
async function handleStep1(formData: any) {
  const businessInfo: BusinessInfoStep = {
    businessName: formData.businessName,
    ownerName: formData.ownerName,
    ownerEmail: formData.ownerEmail,
    ownerPhone: formData.ownerPhone,
    businessType: formData.businessType,
    businessCategory: formData.businessCategory,
    yearsInBusiness: formData.yearsInBusiness,
  };

  // Validate
  const validation = onboardingService.validateBusinessInfo(businessInfo);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }

  // Submit
  try {
    const result = await onboardingService.submitStep(1, businessInfo);
    setCurrentStep(2);
  } catch (error) {
    setError(error.message);
  }
}

// Step 2: Collect Store Details
async function handleStep2(formData: any) {
  const storeDetails: StoreDetailsStep = {
    storeName: formData.storeName,
    storeType: formData.storeType,
    storeAddress: {
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: 'India',
    },
    storePhone: formData.storePhone,
    deliveryAvailable: formData.deliveryAvailable,
  };

  const validation = onboardingService.validateStoreDetails(storeDetails);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }

  try {
    await onboardingService.submitStep(2, storeDetails);
    setCurrentStep(3);
  } catch (error) {
    setError(error.message);
  }
}

// Step 3: Bank Details
async function handleStep3(formData: any) {
  const bankDetails: BankDetailsStep = {
    accountHolderName: formData.accountHolderName,
    accountNumber: formData.accountNumber,
    confirmAccountNumber: formData.confirmAccountNumber,
    bankName: formData.bankName,
    branchName: formData.branchName,
    ifscCode: formData.ifscCode,
    accountType: formData.accountType,
    panNumber: formData.panNumber,
    gstRegistered: formData.gstRegistered,
    gstNumber: formData.gstNumber,
  };

  const validation = onboardingService.validateBankDetailsStep(bankDetails);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }

  try {
    await onboardingService.submitStep(3, bankDetails);
    setCurrentStep(4);
  } catch (error) {
    setError(error.message);
  }
}

// Step 4: Documents Upload
async function handleDocumentUpload(fileUri: string, type: string) {
  try {
    setUploadProgress(0);

    const result = await onboardingService.uploadDocument(
      type as any,
      fileUri,
      undefined,
      (progress) => {
        setUploadProgress(progress);
      }
    );

    console.log('Document uploaded:', result);
    // Update documents list
    setDocuments([...documents, { type, fileUrl: result.fileUrl }]);
  } catch (error) {
    setError(error.message);
  }
}

// Step 5: Final Review & Submit
async function handleFinalSubmit(allData: any) {
  const reviewSubmit: ReviewSubmitStep = {
    agreedToTerms: true,
    agreedToPrivacy: true,
    agreedToDataProcessing: true,
    communicationConsent: true,
  };

  const validation = onboardingService.validateReviewSubmit(reviewSubmit);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }

  try {
    const result = await onboardingService.submitCompleteOnboarding(
      allData.businessInfo,
      allData.storeDetails,
      allData.bankDetails,
      allData.documents,
      reviewSubmit
    );

    console.log('Onboarding submitted:', result);
    setIsSubmitted(true);
  } catch (error) {
    setError(error.message);
  }
}
```

## Error Handling

All methods throw errors with descriptive messages:

```typescript
try {
  await onboardingService.submitStep(1, businessInfo);
} catch (error) {
  console.error('Error:', error.message);
  // Handle specific error types
  if (error.message.includes('validation')) {
    // Validation error
  } else if (error.message.includes('network')) {
    // Network error
  } else if (error.message.includes('HTTP')) {
    // Server error
  }
}
```

## Type Definitions

All types are exported from `types/onboarding.ts`:

```typescript
export interface OnboardingStatus { ... }
export interface BusinessInfoStep { ... }
export interface StoreDetailsStep { ... }
export interface BankDetailsStep { ... }
export interface DocumentsStep { ... }
export interface ReviewSubmitStep { ... }
export interface ValidationResult { ... }
export interface BankValidationResult { ... }
// ... and more
```

## Best Practices

1. **Validate Early**: Always validate data before submission
2. **Use Auto-Save**: Enable auto-save while user is filling forms
3. **Handle Errors**: Always wrap API calls in try-catch
4. **Show Progress**: Display upload progress for documents
5. **Clear Feedback**: Show validation errors to users
6. **Confirm Submission**: Ask for confirmation before final submission

## Troubleshooting

**Issue:** Upload fails
- Check file format and size limits
- Verify network connectivity
- Ensure token is valid

**Issue:** Validation errors
- Check field formats (IFSC, PAN, GST)
- Ensure all required fields are filled
- Verify phone number format

**Issue:** API errors (401, 403)
- Re-authenticate user
- Check token expiration
- Clear cached data

## Support

For issues or questions, refer to:
- Backend API documentation
- Type definitions in `types/onboarding.ts`
- Example implementations in components
