# Onboarding Components - Quick Reference Card

## Import
```tsx
import {
  WizardStepIndicator,
  BusinessInfoForm,
  StoreDetailsForm,
  BankDetailsForm,
  DocumentUploader,
  DocumentCard,
  ValidationErrorDisplay,
  ProgressTracker,
  AutoSaveIndicator,
} from '@/components/onboarding';
```

## Quick Usage

### 1. WizardStepIndicator
```tsx
<WizardStepIndicator
  currentStep={2}
  totalSteps={5}
  stepTitles={['Business', 'Store', 'Bank', 'Documents', 'Review']}
  completedSteps={[1]}
  variant="horizontal" // or "vertical"
/>
```

### 2. BusinessInfoForm
```tsx
<BusinessInfoForm
  initialData={data}
  onSubmit={(data) => handleSubmit(data)}
  onValidate={(data) => handleAutoSave(data)}
/>
```

### 3. StoreDetailsForm
```tsx
<StoreDetailsForm
  initialData={data}
  onSubmit={(data) => handleSubmit(data)}
  onValidate={(data) => handleAutoSave(data)}
/>
```

### 4. BankDetailsForm
```tsx
<BankDetailsForm
  initialData={data}
  onSubmit={(data) => handleSubmit(data)}
  onValidate={(data) => handleAutoSave(data)}
/>
```

### 5. DocumentUploader
```tsx
<DocumentUploader
  documentType={{
    type: 'pan_card',
    label: 'PAN Card',
    description: 'Upload PAN',
    isRequired: true,
    maxSize: 5,
  }}
  onUploadComplete={(doc) => handleUpload(doc)}
  onUploadError={(error) => handleError(error)}
/>
```

### 6. DocumentCard
```tsx
<DocumentCard
  document={uploadedDocument}
  onDelete={() => handleDelete()}
  onPreview={() => handlePreview()}
/>
```

### 7. ValidationErrorDisplay
```tsx
<ValidationErrorDisplay
  errors={{
    field1: 'Error message',
    field2: 'Another error',
  }}
  warnings={{
    field3: 'Warning message',
  }}
/>
```

### 8. ProgressTracker
```tsx
<ProgressTracker
  currentStep={3}
  totalSteps={5}
  overallProgress={60}
  completedSteps={[1, 2]}
  variant="detailed" // "default" | "minimal" | "detailed"
  size="medium"      // "small" | "medium" | "large"
/>
```

### 9. AutoSaveIndicator
```tsx
<AutoSaveIndicator
  status="saved" // "idle" | "saving" | "saved" | "error"
  lastSavedAt="2025-01-15T10:30:00Z"
  position="bottom" // "top" | "bottom"
  showTimestamp={true}
  autoHide={true}
/>
```

---

## Common Patterns

### Complete Step Screen
```tsx
const Step1Screen = () => {
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  return (
    <View>
      <ProgressTracker currentStep={1} totalSteps={5} overallProgress={20} />
      <WizardStepIndicator currentStep={1} totalSteps={5} stepTitles={...} />
      <ValidationErrorDisplay errors={errors} />

      <BusinessInfoForm
        onSubmit={(data) => submitStep(data)}
        onValidate={(data) => autoSave(data)}
      />

      <AutoSaveIndicator status={autoSaveStatus} />
    </View>
  );
};
```

### Document Upload Flow
```tsx
const DocumentsScreen = () => {
  const [documents, setDocuments] = useState([]);

  return (
    <ScrollView>
      {documentTypes.map((type) => {
        const existing = documents.find(d => d.type === type.type);

        return existing ? (
          <DocumentCard
            document={existing}
            onDelete={() => removeDoc(type.type)}
          />
        ) : (
          <DocumentUploader
            documentType={type}
            onUploadComplete={(doc) => addDoc(doc)}
          />
        );
      })}
    </ScrollView>
  );
};
```

---

## Validation Formats

### IFSC Code
```
Pattern: ABCD0123456
Format: 4 letters + 0 + 6 alphanumeric
Example: SBIN0001234
```

### PAN Number
```
Pattern: ABCDE1234F
Format: 5 letters + 4 digits + 1 letter
Example: ABCDE1234F
```

### GST Number
```
Pattern: 22ABCDE1234F1Z5
Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
Length: 15 characters
```

### Aadhar
```
Pattern: 123456789012
Format: 12 digits
Length: 12
```

### ZIP Code
```
Pattern: 400001
Format: 6 digits
Length: 6
```

---

## Color Coding

### Progress States
- 0-24%: Gray (Muted)
- 25-49%: Yellow (Warning)
- 50-74%: Blue (Primary)
- 75-100%: Green (Success)

### Verification Status
- Pending: Yellow
- Verified: Green
- Rejected: Red

### Error States
- Error: Red (#EF4444)
- Warning: Yellow (#F59E0B)
- Success: Green (#10B981)

---

## Component Sizes

### Touch Targets
- Minimum: 44x44 px
- Buttons: 48px height
- Icons: 20-24px (default), 16px (compact)

### Text Sizes
- Title: 18px
- Body: 16px
- Helper: 12-14px
- Tiny: 11px

---

## Best Practices

### Forms
✅ DO: Use onValidate for auto-save
✅ DO: Show validation errors inline
✅ DO: Pre-fill with initialData
❌ DON'T: Submit without validation

### Documents
✅ DO: Check file size before upload
✅ DO: Show upload progress
✅ DO: Handle permissions gracefully
❌ DON'T: Upload without validation

### Progress
✅ DO: Update in real-time
✅ DO: Show percentage and steps
✅ DO: Mark completed steps
❌ DON'T: Allow skipping required steps

### Auto-Save
✅ DO: Debounce auto-save calls
✅ DO: Show status to user
✅ DO: Handle errors gracefully
❌ DON'T: Save on every keystroke

---

## Testing IDs

All form inputs have testID props:
```tsx
testID="business-name-input"
testID="business-type-select"
testID="store-phone-input"
testID="account-number-input"
testID="pan-number-input"
// etc.
```

Use for testing:
```tsx
const { getByTestId } = render(<Component />);
const input = getByTestId('business-name-input');
fireEvent.changeText(input, 'Test Business');
```

---

## Props Cheatsheet

| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| WizardStepIndicator | currentStep, totalSteps, stepTitles | completedSteps, variant, showLabels, compact |
| BusinessInfoForm | onSubmit | initialData, onValidate, isLoading |
| StoreDetailsForm | onSubmit | initialData, onValidate, isLoading |
| BankDetailsForm | onSubmit | initialData, onValidate, isLoading |
| DocumentUploader | documentType, onUploadComplete | onUploadError, existingDocument, disabled |
| DocumentCard | document, onDelete | onPreview, showActions, compact |
| ValidationErrorDisplay | errors | warnings, title, scrollable, compact |
| ProgressTracker | currentStep, totalSteps, overallProgress | completedSteps, showPercentage, variant, size |
| AutoSaveIndicator | status | lastSavedAt, errorMessage, position, showTimestamp, autoHide |

---

## File Locations

```
components/onboarding/
├── WizardStepIndicator.tsx
├── BusinessInfoForm.tsx
├── StoreDetailsForm.tsx
├── BankDetailsForm.tsx
├── DocumentUploader.tsx
├── DocumentCard.tsx
├── ValidationErrorDisplay.tsx
├── ProgressTracker.tsx
├── AutoSaveIndicator.tsx
├── index.ts
├── README.md
├── INTEGRATION_EXAMPLES.tsx
└── QUICK_REFERENCE.md (this file)
```

---

**Quick Start**: See `INTEGRATION_EXAMPLES.tsx` for complete working examples!
