# Onboarding Context & State Management Guide

## Overview

The onboarding system provides a complete state management solution for the 5-step merchant onboarding wizard with auto-save, validation, and persistence features.

## Files Created

### 1. `contexts/OnboardingContext.tsx`
React Context for managing onboarding state across the entire wizard.

**Key Features:**
- Centralized state for all 5 steps
- Auto-save every 30 seconds
- AsyncStorage persistence for recovery
- Step validation before proceeding
- Progress tracking
- Integration with `onboardingService`

**State Structure:**
```typescript
interface OnboardingState {
  isLoading: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  error: string | null;
  currentStep: number;
  totalSteps: number;
  overallProgress: number;
  validationErrors: Record<string, string>;

  // Step data
  businessInfo: Partial<BusinessInfoStep>;
  storeDetails: Partial<StoreDetailsStep>;
  bankDetails: Partial<BankDetailsStep>;
  documents: Partial<DocumentsStep>;
  reviewSubmit: Partial<ReviewSubmitStep>;

  // Status
  isSubmitted: boolean;
  submissionDate?: string;
  lastSavedAt?: string;
}
```

**Main Methods:**
- `updateStepData(step, data)` - Update data for a specific step
- `getStepData(step)` - Get data for a specific step
- `nextStep()` - Validate and move to next step
- `previousStep()` - Go back to previous step
- `goToStep(step)` - Jump to a specific step
- `validateCurrentStep()` - Validate current step data
- `saveProgress()` - Manually save current progress
- `submitOnboarding()` - Submit complete onboarding
- `resetOnboarding()` - Reset to initial state
- `refreshStatus()` - Refresh from backend

### 2. `hooks/useOnboarding.ts`
Custom hook providing type-safe access to OnboardingContext with convenience methods.

**Main Hook:**
```typescript
const {
  // State
  isLoading,
  isSaving,
  isAutoSaving,
  error,
  currentStep,
  totalSteps,
  overallProgress,

  // Data
  businessInfo,
  storeDetails,
  bankDetails,
  documents,
  reviewSubmit,

  // Methods
  updateStepData,
  nextStep,
  previousStep,
  saveProgress,
  submitOnboarding,

  // Helpers
  canGoBack,
  canGoNext,
  hasValidationErrors,
  timeSinceLastSave,
} = useOnboarding();
```

**Step-Specific Hooks:**
```typescript
// For each individual step
const { data, updateData, validationErrors } = useBusinessInfoStep();
const { data, updateData, validationErrors } = useStoreDetailsStep();
const { data, updateData, validationErrors } = useBankDetailsStep();
const { data, updateData, validationErrors } = useDocumentsStep();
const { data, updateData, allData, submitOnboarding } = useReviewSubmitStep();
```

**Progress Hook:**
```typescript
const {
  currentStep,
  totalSteps,
  overallProgress,
  completedStepsCount,
  timeSinceLastSave,
  isAutoSaving,
} = useOnboardingProgress();
```

### 3. `app/onboarding/_layout.tsx`
Layout wrapper that provides OnboardingProvider to all onboarding screens.

**Features:**
- Wraps all onboarding routes with OnboardingProvider
- Stack navigation for steps
- Themed header styling
- Step titles in headers

## Usage Examples

### Basic Setup

1. **Wrap your app with OnboardingProvider** (already done in `app/onboarding/_layout.tsx`):
```tsx
import { OnboardingProvider } from '../../contexts/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      {/* Your onboarding screens */}
    </OnboardingProvider>
  );
}
```

2. **Use the hook in your screens:**
```tsx
import { useBusinessInfoStep } from '../../hooks/useOnboarding';

export default function Step1Screen() {
  const { data, updateData, validationErrors, hasFieldError } = useBusinessInfoStep();

  const handleInputChange = (field: string, value: string) => {
    updateData({ [field]: value });
  };

  return (
    <View>
      <TextInput
        value={data.businessName || ''}
        onChangeText={(value) => handleInputChange('businessName', value)}
        placeholder="Business Name"
      />
      {hasFieldError('businessName') && (
        <Text style={styles.error}>{validationErrors.businessName}</Text>
      )}
    </View>
  );
}
```

### Navigation Between Steps

```tsx
import { useOnboarding } from '../../hooks/useOnboarding';

export default function StepScreen() {
  const {
    nextStep,
    previousStep,
    canGoBack,
    canGoNext,
    validateCurrentStep
  } = useOnboarding();

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      await nextStep();
    }
  };

  return (
    <View>
      {canGoBack && (
        <Button title="Previous" onPress={previousStep} />
      )}
      {canGoNext && (
        <Button title="Next" onPress={handleNext} />
      )}
    </View>
  );
}
```

### Auto-Save Indicator

```tsx
import { useOnboardingProgress } from '../../hooks/useOnboarding';

export default function AutoSaveIndicator() {
  const { isAutoSaving, timeSinceLastSave } = useOnboardingProgress();

  return (
    <View>
      {isAutoSaving ? (
        <Text>Saving...</Text>
      ) : (
        <Text>Last saved: {timeSinceLastSave}</Text>
      )}
    </View>
  );
}
```

### Progress Tracking

```tsx
import { useOnboardingProgress } from '../../hooks/useOnboarding';

export default function ProgressBar() {
  const {
    currentStep,
    totalSteps,
    overallProgress,
    completedStepsCount
  } = useOnboardingProgress();

  return (
    <View>
      <Text>Step {currentStep} of {totalSteps}</Text>
      <ProgressBar progress={overallProgress} />
      <Text>{completedStepsCount} steps completed</Text>
    </View>
  );
}
```

### Validation

```tsx
import { useOnboarding } from '../../hooks/useOnboarding';

export default function FormField() {
  const {
    getFieldError,
    hasFieldError,
    hasValidationErrors
  } = useOnboarding();

  return (
    <View>
      <TextInput />
      {hasFieldError('email') && (
        <Text style={styles.error}>{getFieldError('email')}</Text>
      )}

      {hasValidationErrors && (
        <Text>Please fix errors before proceeding</Text>
      )}
    </View>
  );
}
```

### Final Submission

```tsx
import { useReviewSubmitStep } from '../../hooks/useOnboarding';

export default function Step5Screen() {
  const {
    allData,
    submitOnboarding,
    canSubmit,
    isLoading
  } = useReviewSubmitStep();

  const handleSubmit = async () => {
    try {
      await submitOnboarding();
      // Navigate to success screen
      router.push('/onboarding/success');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit onboarding');
    }
  };

  return (
    <View>
      {/* Display review of all data */}
      <Text>Business: {allData.businessInfo.businessName}</Text>
      <Text>Store: {allData.storeDetails.storeName}</Text>

      <Button
        title="Submit"
        onPress={handleSubmit}
        disabled={!canSubmit || isLoading}
      />
    </View>
  );
}
```

## Auto-Save Functionality

The context automatically saves progress every 30 seconds:

1. **Auto-save triggers:**
   - Every 30 seconds while editing
   - Uses `onboardingService.completeStep()`
   - Saves to AsyncStorage for offline recovery

2. **Manual save:**
   ```tsx
   const { saveProgress } = useOnboarding();

   await saveProgress(); // Manual save
   ```

3. **Auto-save cleanup:**
   - Stops when onboarding is submitted
   - Cleans up on component unmount
   - Clears AsyncStorage after successful submission

## Persistence & Recovery

The context persists state to AsyncStorage:

1. **Storage key:** `'onboarding_state'`

2. **What's stored:**
   - All step data
   - Current step position
   - Progress percentage
   - Submission status

3. **Recovery:**
   - On app restart, checks backend first
   - Falls back to AsyncStorage if offline
   - Restores exact state including validation errors

## Validation Flow

1. **Field-level validation:**
   - Real-time as user types
   - Uses `onboardingService` validators

2. **Step-level validation:**
   - Before moving to next step
   - Before final submission
   - Displays errors in UI

3. **Validation methods:**
   ```typescript
   // In onboardingService
   validateBusinessInfo(data)
   validateStoreDetails(data)
   validateBankDetailsStep(data)
   validateDocuments(data)
   validateReviewSubmit(data)
   ```

## Error Handling

```tsx
const { error, clearError } = useOnboarding();

if (error) {
  return (
    <View>
      <Text>{error}</Text>
      <Button title="Dismiss" onPress={clearError} />
    </View>
  );
}
```

## Best Practices

1. **Use step-specific hooks** for cleaner code:
   ```tsx
   // Instead of
   const { businessInfo, updateStepData } = useOnboarding();
   updateStepData(1, { businessName: 'Test' });

   // Use
   const { data, updateData } = useBusinessInfoStep();
   updateData({ businessName: 'Test' });
   ```

2. **Show auto-save indicator** to users:
   ```tsx
   const { isAutoSaving, timeSinceLastSave } = useOnboardingProgress();
   ```

3. **Validate before navigation:**
   ```tsx
   const isValid = await validateCurrentStep();
   if (isValid) {
     await nextStep();
   }
   ```

4. **Handle errors gracefully:**
   ```tsx
   const { error, clearError } = useOnboarding();

   useEffect(() => {
     if (error) {
       Alert.alert('Error', error, [
         { text: 'OK', onPress: clearError }
       ]);
     }
   }, [error]);
   ```

## Integration with Backend

The context integrates with `onboardingService`:

```typescript
// Auto-save
onboardingService.completeStep(stepNumber, stepData)

// Step navigation
onboardingService.submitStep(stepNumber, stepData)

// Previous step
onboardingService.goToPreviousStep(stepNumber)

// Final submission
onboardingService.submitCompleteOnboarding(...)

// Status refresh
onboardingService.getOnboardingStatus()
```

## Next Steps

The placeholder step screens (step1.tsx - step5.tsx) need to be implemented with:

1. **Step 1:** Business info form fields
2. **Step 2:** Store details with address picker
3. **Step 3:** Bank details with validation
4. **Step 4:** Document upload with progress
5. **Step 5:** Review summary with submit button

Each screen already imports the appropriate step-specific hook and is ready for implementation.

## Troubleshooting

### Auto-save not working
- Check console logs for `💾 Auto-saving...` messages
- Verify `onboardingService` is properly configured
- Check network connectivity

### Validation errors not clearing
- Call `clearError()` when user fixes issues
- Errors auto-clear on step navigation

### State not persisting
- Check AsyncStorage permissions
- Verify storage key: `'onboarding_state'`
- Check browser console for storage errors

### Progress not updating
- Ensure `submitStep()` is called when moving forward
- Check backend response includes `overallProgress`

## API Reference

See the inline TypeScript documentation in:
- `contexts/OnboardingContext.tsx`
- `hooks/useOnboarding.ts`
- `types/onboarding.ts`
- `services/api/onboarding.ts`
