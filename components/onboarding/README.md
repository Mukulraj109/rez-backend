# Onboarding Components

Comprehensive set of reusable components for the 5-step merchant onboarding process.

## Components Overview

### 1. WizardStepIndicator
Visual step indicator showing progress through the onboarding wizard.

**Features:**
- Horizontal and vertical layouts
- Progress bar with percentage
- Step titles and status indicators
- Completed/current/pending states
- Compact mode

**Usage:**
```tsx
import { WizardStepIndicator } from '@/components/onboarding';

<WizardStepIndicator
  currentStep={2}
  totalSteps={5}
  stepTitles={[
    'Business Info',
    'Store Details',
    'Bank Details',
    'Documents',
    'Review'
  ]}
  completedSteps={[1]}
  variant="horizontal"
  showLabels={true}
/>
```

**Props:**
- `currentStep`: number - Current active step (1-based)
- `totalSteps`: number - Total number of steps
- `stepTitles`: string[] - Array of step titles
- `completedSteps?`: number[] - Array of completed step numbers
- `variant?`: 'horizontal' | 'vertical' - Layout direction
- `showLabels?`: boolean - Show step labels
- `compact?`: boolean - Compact mode for small spaces

---

### 2. BusinessInfoForm
Reusable form for collecting business information (Step 1).

**Features:**
- All business fields with validation
- Owner information section
- Social media links
- Real-time validation
- Auto-save support

**Usage:**
```tsx
import { BusinessInfoForm } from '@/components/onboarding';

<BusinessInfoForm
  initialData={savedData}
  onSubmit={(data) => console.log(data)}
  onValidate={(data) => console.log('Validating:', data)}
  isLoading={false}
/>
```

**Props:**
- `initialData?`: Partial<BusinessInfoStep> - Pre-filled data
- `onSubmit`: (data: BusinessInfoStep) => void - Submit handler
- `onValidate?`: (data: Partial<BusinessInfoStep>) => void - Real-time validation
- `isLoading?`: boolean - Loading state

**Fields:**
- Business name, type, category, subcategory
- Years in business, description
- Owner name, email, phone
- Website and social media links

---

### 3. StoreDetailsForm
Reusable form for collecting store details (Step 2).

**Features:**
- Store information
- Complete address fields
- Indian states dropdown (searchable)
- Delivery and pickup options
- Operating hours note

**Usage:**
```tsx
import { StoreDetailsForm } from '@/components/onboarding';

<StoreDetailsForm
  initialData={savedData}
  onSubmit={(data) => console.log(data)}
  onValidate={(data) => console.log('Validating:', data)}
  isLoading={false}
/>
```

**Props:**
- `initialData?`: Partial<StoreDetailsStep> - Pre-filled data
- `onSubmit`: (data: StoreDetailsStep) => void - Submit handler
- `onValidate?`: (data: Partial<StoreDetailsStep>) => void - Real-time validation
- `isLoading?`: boolean - Loading state

**Fields:**
- Store name, type, phone, email
- Street, city, state, ZIP code
- Delivery available, radius, charges
- Pickup available

---

### 4. BankDetailsForm
Reusable form for collecting bank and tax details (Step 3).

**Features:**
- Secure bank account fields
- IFSC, PAN, GST validation
- Account number confirmation
- Tax filing frequency
- Revenue estimation

**Usage:**
```tsx
import { BankDetailsForm } from '@/components/onboarding';

<BankDetailsForm
  initialData={savedData}
  onSubmit={(data) => console.log(data)}
  onValidate={(data) => console.log('Validating:', data)}
  isLoading={false}
/>
```

**Props:**
- `initialData?`: Partial<BankDetailsStep> - Pre-filled data
- `onSubmit`: (data: BankDetailsStep) => void - Submit handler
- `onValidate?`: (data: Partial<BankDetailsStep>) => void - Real-time validation
- `isLoading?`: boolean - Loading state

**Fields:**
- Account holder name, number, type
- Bank name, branch, IFSC code
- PAN number (required)
- GST number (if registered)
- Aadhar number (optional)
- Estimated monthly revenue

**Validation:**
- IFSC: 11 characters (e.g., SBIN0001234)
- PAN: 10 characters (e.g., ABCDE1234F)
- GST: 15 characters (if registered)
- Aadhar: 12 digits (optional)

---

### 5. DocumentUploader
Document upload component with image picker integration.

**Features:**
- Multiple upload methods (camera, gallery, files)
- Upload progress tracking
- File size and type validation
- Preview support
- Secure document handling

**Usage:**
```tsx
import { DocumentUploader } from '@/components/onboarding';

const documentType = {
  id: 'pan',
  type: 'pan_card',
  label: 'PAN Card',
  description: 'Upload a clear image of your PAN card',
  isRequired: true,
  maxSize: 5,
  acceptedFormats: ['image/*', 'application/pdf'],
};

<DocumentUploader
  documentType={documentType}
  onUploadComplete={(doc) => console.log('Uploaded:', doc)}
  onUploadError={(error) => console.error(error)}
  existingDocument={savedDocument}
  disabled={false}
/>
```

**Props:**
- `documentType`: DocumentType - Document configuration
- `onUploadComplete`: (document: DocumentUpload) => void - Success handler
- `onUploadError?`: (error: string) => void - Error handler
- `existingDocument?`: DocumentUpload - Already uploaded document
- `disabled?`: boolean - Disable upload

---

### 6. DocumentCard
Display uploaded document with preview and actions.

**Features:**
- Image preview or icon
- Document metadata (size, date)
- Verification status
- Delete and preview actions
- Compact mode

**Usage:**
```tsx
import { DocumentCard } from '@/components/onboarding';

<DocumentCard
  document={{
    type: 'pan_card',
    fileUrl: 'https://...',
    fileName: 'pan.jpg',
    fileSize: 245000,
    uploadedAt: '2025-01-15T10:30:00Z',
    verificationStatus: 'pending',
  }}
  onDelete={() => console.log('Delete')}
  onPreview={() => console.log('Preview')}
  showActions={true}
  compact={false}
/>
```

**Props:**
- `document`: DocumentUpload - Document data
- `onDelete`: () => void - Delete handler
- `onPreview?`: () => void - Preview handler
- `showActions?`: boolean - Show action buttons
- `compact?`: boolean - Compact mode

**Verification Status:**
- `pending` - Yellow, pending review
- `verified` - Green, approved
- `rejected` - Red, rejected with notes

---

### 7. ValidationErrorDisplay
Display validation errors from form or API.

**Features:**
- Field-specific errors
- Warnings support
- Scrollable for many errors
- Compact mode
- Helpful field labels

**Usage:**
```tsx
import { ValidationErrorDisplay } from '@/components/onboarding';

<ValidationErrorDisplay
  errors={{
    'businessName': 'Business name is required',
    'ownerEmail': 'Invalid email format',
  }}
  warnings={{
    'website': 'Website URL is recommended',
  }}
  title="Please fix the following issues:"
  scrollable={false}
  compact={false}
/>
```

**Props:**
- `errors`: Record<string, string> - Error messages by field
- `warnings?`: Record<string, string> - Warning messages by field
- `title?`: string - Error section title
- `scrollable?`: boolean - Enable scrolling for long lists
- `compact?`: boolean - Compact display mode

---

### 8. ProgressTracker
Overall onboarding progress tracker with visual indicators.

**Features:**
- Multiple variants (default, minimal, detailed)
- Percentage and step count
- Color-coded progress
- Size options
- Stats display (detailed mode)

**Usage:**
```tsx
import { ProgressTracker } from '@/components/onboarding';

<ProgressTracker
  currentStep={3}
  totalSteps={5}
  overallProgress={60}
  completedSteps={[1, 2]}
  showPercentage={true}
  showStepCount={true}
  variant="detailed"
  size="medium"
/>
```

**Props:**
- `currentStep`: number - Current step
- `totalSteps`: number - Total steps
- `overallProgress`: number - Progress percentage (0-100)
- `completedSteps?`: number[] - Completed step numbers
- `showPercentage?`: boolean - Show percentage
- `showStepCount?`: boolean - Show step count
- `variant?`: 'default' | 'minimal' | 'detailed' - Display variant
- `size?`: 'small' | 'medium' | 'large' - Component size

**Variants:**
- `default` - Progress bar with step count and percentage
- `minimal` - Simple progress bar with percentage
- `detailed` - Full stats with completed/current/remaining steps

---

### 9. AutoSaveIndicator
Shows auto-save status with timestamp.

**Features:**
- Real-time status (idle, saving, saved, error)
- Last saved timestamp
- Auto-hide functionality
- Animated transitions
- Position options

**Usage:**
```tsx
import { AutoSaveIndicator } from '@/components/onboarding';

<AutoSaveIndicator
  status="saved"
  lastSavedAt="2025-01-15T10:30:00Z"
  errorMessage={undefined}
  position="bottom"
  showTimestamp={true}
  autoHide={true}
  autoHideDuration={3000}
/>
```

**Props:**
- `status`: 'idle' | 'saving' | 'saved' | 'error' - Current status
- `lastSavedAt?`: string - ISO timestamp of last save
- `errorMessage?`: string - Error message if status is error
- `position?`: 'top' | 'bottom' - Position on screen
- `showTimestamp?`: boolean - Show last saved time
- `autoHide?`: boolean - Auto-hide after success
- `autoHideDuration?`: number - Hide delay in ms (default 3000)

**Status States:**
- `idle` - Hidden
- `saving` - Animated upload icon, "Saving..."
- `saved` - Checkmark icon, "Saved", timestamp
- `error` - Error icon, "Save Failed", error message

---

## Integration Examples

### Complete Onboarding Screen

```tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  WizardStepIndicator,
  BusinessInfoForm,
  ProgressTracker,
  AutoSaveIndicator,
  ValidationErrorDisplay,
} from '@/components/onboarding';

const OnboardingScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  return (
    <View style={{ flex: 1 }}>
      <ProgressTracker
        currentStep={currentStep}
        totalSteps={5}
        overallProgress={20}
        completedSteps={[]}
        variant="detailed"
      />

      <WizardStepIndicator
        currentStep={currentStep}
        totalSteps={5}
        stepTitles={['Business', 'Store', 'Bank', 'Documents', 'Review']}
        variant="horizontal"
      />

      <ValidationErrorDisplay errors={errors} />

      <ScrollView>
        <BusinessInfoForm
          onSubmit={(data) => console.log(data)}
          onValidate={(data) => {
            setAutoSaveStatus('saving');
            // Auto-save logic
            setTimeout(() => setAutoSaveStatus('saved'), 1000);
          }}
        />
      </ScrollView>

      <AutoSaveIndicator
        status={autoSaveStatus}
        lastSavedAt={new Date().toISOString()}
        position="bottom"
      />
    </View>
  );
};
```

### Document Upload Screen

```tsx
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  DocumentUploader,
  DocumentCard,
} from '@/components/onboarding';

const DocumentsScreen = () => {
  const [documents, setDocuments] = useState([]);

  const documentTypes = [
    {
      id: 'pan',
      type: 'pan_card',
      label: 'PAN Card',
      description: 'Upload PAN card',
      isRequired: true,
      maxSize: 5,
    },
    {
      id: 'gst',
      type: 'gst_certificate',
      label: 'GST Certificate',
      description: 'Upload GST certificate',
      isRequired: false,
      maxSize: 10,
    },
  ];

  return (
    <ScrollView>
      {documentTypes.map((docType) => {
        const existing = documents.find((d) => d.type === docType.type);

        return existing ? (
          <DocumentCard
            key={docType.id}
            document={existing}
            onDelete={() => {
              setDocuments(documents.filter((d) => d.type !== docType.type));
            }}
          />
        ) : (
          <DocumentUploader
            key={docType.id}
            documentType={docType}
            onUploadComplete={(doc) => {
              setDocuments([...documents, doc]);
            }}
          />
        );
      })}
    </ScrollView>
  );
};
```

## Styling

All components use the app's color scheme from `@/constants/Colors` and automatically adapt to light/dark mode.

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Touch target sizes (min 44x44)
- Color contrast compliance

## Testing

Components include testID props for automated testing:

```tsx
<FormInput testID="business-name-input" />
<FormSelect testID="business-type-select" />
```

## Dependencies

Required packages:
- react-native
- react-hook-form
- expo-image-picker
- expo-document-picker
- @expo/vector-icons

## Notes

1. All forms use react-hook-form for validation
2. Document uploads require camera/library permissions
3. Auto-save indicators auto-hide after 3 seconds
4. Validation errors show helpful field labels
5. Progress tracking supports multiple display modes
