# Onboarding Context - Quick Start Guide

## Installation Complete ✅

All onboarding context and state management files have been created and are ready to use.

## Files Created

1. **`contexts/OnboardingContext.tsx`** - Main context with state management
2. **`hooks/useOnboarding.ts`** - Custom hooks for easy access
3. **`app/onboarding/_layout.tsx`** - Layout wrapper with provider

## Quick Usage

### 1. Basic Hook Usage

```tsx
import { useOnboarding } from '@/hooks/useOnboarding';

export default function MyScreen() {
  const {
    // State
    currentStep,
    isLoading,
    isSaving,

    // Data
    businessInfo,

    // Methods
    updateStepData,
    nextStep,
    previousStep,

    // Helpers
    canGoNext,
    hasValidationErrors,
  } = useOnboarding();

  return (
    <View>
      <Text>Step {currentStep} of 5</Text>
      <Button
        title="Next"
        onPress={nextStep}
        disabled={!canGoNext || hasValidationErrors}
      />
    </View>
  );
}
```

### 2. Step-Specific Hooks

```tsx
// Business Info (Step 1)
import { useBusinessInfoStep } from '@/hooks/useOnboarding';

const { data, updateData, validationErrors } = useBusinessInfoStep();

// Store Details (Step 2)
import { useStoreDetailsStep } from '@/hooks/useOnboarding';

const { data, updateData, validationErrors } = useStoreDetailsStep();

// Bank Details (Step 3)
import { useBankDetailsStep } from '@/hooks/useOnboarding';

const { data, updateData, validationErrors } = useBankDetailsStep();

// Documents (Step 4)
import { useDocumentsStep } from '@/hooks/useOnboarding';

const { data, updateData, validationErrors } = useDocumentsStep();

// Review & Submit (Step 5)
import { useReviewSubmitStep } from '@/hooks/useOnboarding';

const {
  data,
  updateData,
  allData,          // All step data for review
  submitOnboarding, // Final submission
  canSubmit
} = useReviewSubmitStep();
```

### 3. Progress Tracking

```tsx
import { useOnboardingProgress } from '@/hooks/useOnboarding';

const {
  currentStep,
  totalSteps,
  overallProgress,
  completedStepsCount,
  timeSinceLastSave,
  isAutoSaving,
} = useOnboardingProgress();

// Display progress
<Text>Step {currentStep} of {totalSteps}</Text>
<ProgressBar value={overallProgress} />
<Text>{isAutoSaving ? 'Saving...' : `Saved ${timeSinceLastSave}`}</Text>
```

## Key Features

### ✅ Auto-Save
Automatically saves every 30 seconds to backend and AsyncStorage.

### ✅ Validation
Validates each step before allowing navigation to next step.

### ✅ Persistence
Saves to AsyncStorage, recovers on app restart.

### ✅ Progress Tracking
Tracks overall progress and per-step completion.

### ✅ Error Handling
Displays validation errors and handles network issues.

### ✅ Type Safety
All hooks are fully typed with TypeScript.

## Common Patterns

### Update Step Data
```tsx
const { updateData } = useBusinessInfoStep();

updateData({
  businessName: 'My Business',
  ownerName: 'John Doe',
});
```

### Navigate Steps
```tsx
const { nextStep, previousStep } = useOnboarding();

// Go forward (with validation)
await nextStep();

// Go backward
previousStep();
```

### Validate Current Step
```tsx
const { validateCurrentStep } = useOnboarding();

const isValid = await validateCurrentStep();
if (isValid) {
  // Proceed
}
```

### Show Validation Errors
```tsx
const { getFieldError, hasFieldError } = useOnboarding();

<TextInput />
{hasFieldError('email') && (
  <Text style={styles.error}>{getFieldError('email')}</Text>
)}
```

### Save Progress Manually
```tsx
const { saveProgress } = useOnboarding();

await saveProgress();
```

### Submit Onboarding
```tsx
const { submitOnboarding, canSubmit } = useReviewSubmitStep();

<Button
  title="Submit"
  onPress={submitOnboarding}
  disabled={!canSubmit}
/>
```

## State Structure

```typescript
{
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  error: string | null;

  // Navigation
  currentStep: number;        // 1-5
  totalSteps: number;         // 5
  overallProgress: number;    // 0-100

  // Validation
  validationErrors: Record<string, string>;

  // Step data
  businessInfo: { ... };
  storeDetails: { ... };
  bankDetails: { ... };
  documents: { ... };
  reviewSubmit: { ... };

  // Status
  isSubmitted: boolean;
  submissionDate?: string;
  lastSavedAt?: string;
}
```

## Available Hooks

1. **`useOnboarding()`** - Main hook with all features
2. **`useBusinessInfoStep()`** - Step 1 specific
3. **`useStoreDetailsStep()`** - Step 2 specific
4. **`useBankDetailsStep()`** - Step 3 specific
5. **`useDocumentsStep()`** - Step 4 specific
6. **`useReviewSubmitStep()`** - Step 5 specific
7. **`useOnboardingProgress()`** - Progress tracking

## Integration

### With OnboardingService
The context automatically integrates with:
- `onboardingService.getOnboardingStatus()`
- `onboardingService.submitStep()`
- `onboardingService.completeStep()` (auto-save)
- `onboardingService.submitCompleteOnboarding()`
- All validation methods

### With AsyncStorage
- Storage key: `'onboarding_state'`
- Auto-saves on interval
- Recovers on app restart
- Clears after submission

## Next Steps

The context is ready! Now implement the UI for each step:

1. **`app/onboarding/step1.tsx`** - Business info form
2. **`app/onboarding/step2.tsx`** - Store details form
3. **`app/onboarding/step3.tsx`** - Bank details form
4. **`app/onboarding/step4.tsx`** - Document upload
5. **`app/onboarding/step5.tsx`** - Review and submit

Each placeholder already imports the correct hook and is ready for UI implementation.

## Documentation

- **Full Guide:** `ONBOARDING_CONTEXT_GUIDE.md`
- **Implementation Summary:** `ONBOARDING_IMPLEMENTATION_SUMMARY.md`
- **This Quick Start:** `ONBOARDING_CONTEXT_QUICK_START.md`

## Support

For questions or issues:
1. Check console logs (extensive logging implemented)
2. Review TypeScript types in `types/onboarding.ts`
3. Check service implementation in `services/api/onboarding.ts`
4. See usage examples in guide docs
