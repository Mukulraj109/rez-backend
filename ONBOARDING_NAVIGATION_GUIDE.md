# Onboarding Navigation Integration Guide

## Overview

This document describes the complete navigation configuration and integration for the merchant onboarding flow in the Rez Merchant App.

## Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Launch                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Check Auth      │
                  └────┬────────┬────┘
                       │        │
         Not Auth      │        │    Authenticated
                       │        │
                       ▼        ▼
              ┌────────────┐  ┌──────────────────┐
              │  Login/    │  │ Check Onboarding │
              │  Register  │  │     Status       │
              └────────────┘  └────┬─────────────┘
                       │            │
                       │            ▼
                       │     ┌─────────────────────────┐
                       │     │  Onboarding Status?     │
                       │     └──┬──────┬──────┬────────┘
                       │        │      │      │
                       │        │      │      │
                       ▼        ▼      ▼      ▼
              ┌────────────────────────────────────────────┐
              │  Not Started → /onboarding/welcome         │
              │  In Progress → /onboarding/{current_step}  │
              │  Pending     → /onboarding/pending-approval│
              │  Approved    → /(dashboard)                │
              │  Rejected    → /onboarding/pending-approval│
              └────────────────────────────────────────────┘
```

## File Structure

```
merchant-app/
├── app/
│   ├── _layout.tsx                    # Root layout (updated)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx               # Updated with redirect
│   ├── onboarding/
│   │   ├── _layout.tsx                # Onboarding layout (updated)
│   │   ├── index.tsx                  # Entry point (updated)
│   │   ├── welcome.tsx                # Step 0: Welcome
│   │   ├── business-info.tsx          # Step 1: Business Info
│   │   ├── store-details.tsx          # Step 2: Store Details
│   │   ├── bank-details.tsx           # Step 3: Bank Details
│   │   ├── documents.tsx              # Step 4: Documents
│   │   ├── review-submit.tsx          # Step 5: Review
│   │   └── pending-approval.tsx       # Pending approval screen
│   └── (dashboard)/
│       └── ...
├── constants/
│   └── onboarding.ts                  # New: Onboarding constants
├── utils/
│   └── onboardingHelpers.ts           # New: Helper functions
└── ...
```

## Files Created/Updated

### 1. Created: `constants/onboarding.ts`

**Purpose**: Central location for all onboarding-related constants

**Contents**:
- Business types and categories
- Document types and validation rules
- Operating hours options
- Store types and account types
- Validation rules (email, phone, PAN, GST, IFSC, etc.)
- Navigation routes
- Error and success messages
- Step requirements

**Key Exports**:
```typescript
export const BUSINESS_TYPES
export const BUSINESS_CATEGORIES
export const DOCUMENT_TYPES
export const ONBOARDING_STEPS
export const NAVIGATION_ROUTES
export const VALIDATION_RULES
export const STEP_REQUIREMENTS
```

### 2. Created: `utils/onboardingHelpers.ts`

**Purpose**: Utility functions for onboarding flow management

**Key Functions**:

#### Navigation Functions
```typescript
getStepRoute(stepNumber: number): string
navigateToStep(stepNumber: number): void
navigateToNextStep(currentStep: number): void
navigateToPreviousStep(currentStep: number): void
getRedirectRoute(status: OnboardingStatus | null): string
```

#### Progress Functions
```typescript
calculateProgress(status: OnboardingStatus): number
getDetailedProgress(status: OnboardingStatus): OnboardingProgress
isStepCompleted(status: OnboardingStatus, stepNumber: number): boolean
getCurrentStep(status: OnboardingStatus): number
```

#### Status Checks
```typescript
isOnboardingComplete(status: OnboardingStatus | null): boolean
isOnboardingInProgress(status: OnboardingStatus | null): boolean
isPendingApproval(status: OnboardingStatus | null): boolean
canProceedToNextStep(status: OnboardingStatus, currentStepNumber: number): boolean
```

#### Validation Functions
```typescript
validateEmail(email: string): boolean
validatePhone(phone: string): boolean
validatePAN(pan: string): boolean
validateGST(gst: string): boolean
validateIFSC(ifsc: string): boolean
validateBusinessInfo(data: Partial<BusinessInfoStep>): ValidationResult
validateStoreDetails(data: Partial<StoreDetailsStep>): ValidationResult
validateBankDetails(data: Partial<BankDetailsStep>): ValidationResult
validateDocuments(data: Partial<DocumentsStep>): ValidationResult
validateReviewSubmit(data: Partial<ReviewSubmitStep>): ValidationResult
```

### 3. Updated: `app/onboarding/index.tsx`

**Purpose**: Entry point that determines where to redirect user based on status

**Flow**:
1. Check if user is authenticated
2. If not authenticated → redirect to login
3. If authenticated → fetch onboarding status
4. Based on status → redirect to appropriate screen:
   - Not started → `/onboarding/welcome`
   - In progress → `/onboarding/{current_step}`
   - Pending review → `/onboarding/pending-approval`
   - Approved → `/(dashboard)`
   - Rejected → `/onboarding/pending-approval` (with resubmit option)

**Key Features**:
- Loading state while checking status
- Error handling for failed API calls
- Automatic redirect based on status
- Uses `getRedirectRoute()` helper

### 4. Updated: `app/(auth)/register.tsx`

**Purpose**: Redirect to onboarding after successful registration

**Changes**:
```typescript
// After successful registration
Alert.alert(
  'Success',
  'Account created successfully! Let\'s complete your merchant profile.',
  [
    {
      text: 'Continue',
      onPress: () => {
        router.replace('/onboarding');
      }
    }
  ]
);
```

### 5. Updated: `app/_layout.tsx`

**Purpose**: Add onboarding routes to root navigation

**Changes**:
```tsx
<Stack.Screen
  name="onboarding"
  options={{
    headerShown: false,
    gestureEnabled: false, // Prevent swipe back during onboarding
  }}
/>
```

### 6. Updated: `app/onboarding/_layout.tsx`

**Purpose**: Layout for all onboarding screens

**Key Features**:
- Wraps all screens with `OnboardingProvider`
- Configures header styles
- Disables swipe back gesture
- Defines all onboarding routes:
  - `index` - Entry point
  - `welcome` - Welcome screen
  - `business-info` - Step 1
  - `store-details` - Step 2
  - `bank-details` - Step 3
  - `documents` - Step 4
  - `review-submit` - Step 5
  - `pending-approval` - Pending screen

## Navigation Routes

### Route Definitions

```typescript
export const NAVIGATION_ROUTES = {
  WELCOME: '/onboarding/welcome',
  BUSINESS_INFO: '/onboarding/business-info',
  STORE_DETAILS: '/onboarding/store-details',
  BANK_DETAILS: '/onboarding/bank-details',
  DOCUMENTS: '/onboarding/documents',
  REVIEW: '/onboarding/review-submit',
  PENDING_APPROVAL: '/onboarding/pending-approval',
  DASHBOARD: '/(dashboard)',
  LOGIN: '/(auth)/login',
} as const;
```

### Route Parameters

All routes are parameterless and rely on the `OnboardingContext` for state management.

## Status-Based Routing

### Onboarding Status Types

```typescript
type OnboardingStatus =
  | 'in_progress'      // User is actively completing onboarding
  | 'pending_review'   // Submitted, waiting for admin approval
  | 'approved'         // Approved, can access dashboard
  | 'rejected'         // Rejected, needs to resubmit
  | 'on_hold'          // On hold, waiting for additional info
```

### Routing Logic

```typescript
function getRedirectRoute(status: OnboardingStatus | null): string {
  if (!status) return NAVIGATION_ROUTES.WELCOME;

  switch (status.status) {
    case 'approved':
      return NAVIGATION_ROUTES.DASHBOARD;

    case 'pending_review':
    case 'on_hold':
      return NAVIGATION_ROUTES.PENDING_APPROVAL;

    case 'in_progress':
      return getStepRoute(status.currentStep);

    case 'rejected':
      return NAVIGATION_ROUTES.PENDING_APPROVAL; // Shows resubmit option

    default:
      return NAVIGATION_ROUTES.WELCOME;
  }
}
```

## Step Configuration

### Step Definitions

```typescript
export const ONBOARDING_STEPS = [
  {
    stepNumber: 1,
    title: 'Welcome',
    route: '/onboarding/welcome',
    description: 'Get started with your merchant account',
  },
  {
    stepNumber: 2,
    title: 'Business Information',
    route: '/onboarding/business-info',
    description: 'Tell us about your business',
  },
  // ... more steps
];
```

### Step Navigation

```typescript
// Navigate to specific step
navigateToStep(2); // Goes to business info

// Navigate to next step
navigateToNextStep(currentStep);

// Navigate to previous step
navigateToPreviousStep(currentStep);

// Get step route
const route = getStepRoute(2); // '/onboarding/business-info'
```

## Integration with Existing Systems

### 1. AuthContext Integration

```typescript
// Check authentication before onboarding
const { isAuthenticated, merchant } = useAuth();

if (!isAuthenticated || !merchant) {
  router.replace(NAVIGATION_ROUTES.LOGIN);
}
```

### 2. OnboardingContext Integration

```typescript
// Access onboarding state
const { status, currentStep, isLoading } = useOnboarding();

// Check if can proceed
const canProceed = canProceedToNextStep(status, currentStep);
```

### 3. API Integration

```typescript
// Fetch status
const response = await onboardingService.getOnboardingStatus();

// Submit step
await onboardingService.submitStep(stepNumber, stepData);

// Final submission
await onboardingService.submitOnboarding(allData);
```

## Error Handling

### Common Scenarios

1. **No Authentication**
   ```typescript
   if (!isAuthenticated) {
     router.replace(NAVIGATION_ROUTES.LOGIN);
   }
   ```

2. **No Onboarding Status (404)**
   ```typescript
   if (error.includes('404') || error.includes('not found')) {
     router.replace(NAVIGATION_ROUTES.WELCOME);
   }
   ```

3. **API Error**
   ```typescript
   catch (error) {
     console.error('Onboarding error:', error);
     // Show error message, allow retry
   }
   ```

## Testing the Navigation

### Test Scenarios

1. **New User Registration**
   - Register new account
   - Should redirect to `/onboarding/welcome`

2. **Incomplete Onboarding**
   - Login with incomplete onboarding
   - Should redirect to current step

3. **Pending Approval**
   - Complete all steps
   - Should redirect to `/onboarding/pending-approval`

4. **Approved Merchant**
   - Login with approved status
   - Should redirect to `/(dashboard)`

5. **Rejected Application**
   - Login with rejected status
   - Should show pending-approval with resubmit option

### Manual Testing Steps

```bash
# 1. Start the app
npm start

# 2. Register a new account
# - Fill in registration form
# - Submit
# - Verify redirect to /onboarding/welcome

# 3. Complete first step
# - Fill business info
# - Click Next
# - Verify redirect to /onboarding/store-details

# 4. Close app and reopen
# - Login
# - Verify redirect to current step (store-details)

# 5. Complete all steps
# - Fill all forms
# - Submit final review
# - Verify redirect to /onboarding/pending-approval
```

## Best Practices

### 1. Always Use Helper Functions

```typescript
// ✅ Good
const route = getStepRoute(stepNumber);
router.replace(route);

// ❌ Bad
router.replace(`/onboarding/step${stepNumber}`);
```

### 2. Check Status Before Navigation

```typescript
// ✅ Good
if (canProceedToNextStep(status, currentStep)) {
  navigateToNextStep(currentStep);
}

// ❌ Bad
navigateToNextStep(currentStep); // May fail
```

### 3. Handle Loading States

```typescript
// ✅ Good
if (isLoading) {
  return <LoadingSpinner />;
}

// ❌ Bad
// Navigate while loading - may cause errors
```

### 4. Validate Before Navigation

```typescript
// ✅ Good
const validation = validateBusinessInfo(data);
if (validation.isValid) {
  await submitStep(data);
  navigateToNextStep(currentStep);
}

// ❌ Bad
await submitStep(data);
navigateToNextStep(currentStep); // May fail validation
```

## Troubleshooting

### Issue: Infinite Redirect Loop

**Cause**: Status check causing continuous redirects

**Solution**:
```typescript
// Add dependency array to useEffect
useEffect(() => {
  checkStatus();
}, []); // Only run once on mount
```

### Issue: Navigation Not Working

**Cause**: Route not defined in layout

**Solution**:
- Check `app/onboarding/_layout.tsx` has all routes
- Verify route names match constants

### Issue: Back Button Goes to Login

**Cause**: Using `router.push()` instead of `router.replace()`

**Solution**:
```typescript
// Use replace to prevent going back
router.replace('/onboarding/welcome');
```

## Next Steps

1. **Implement Step Screens**
   - Complete all step implementations
   - Add form validation
   - Integrate with backend API

2. **Add Progress Indicator**
   - Show progress bar on each step
   - Display step numbers
   - Indicate completed steps

3. **Implement Auto-save**
   - Save form data automatically
   - Restore on navigation
   - Prevent data loss

4. **Add Analytics**
   - Track step completion
   - Monitor drop-off rates
   - Measure time spent per step

## Summary

This implementation provides:

✅ Type-safe navigation with helper functions
✅ Status-based routing logic
✅ Centralized constants and validation
✅ Error handling and recovery
✅ Integration with existing auth system
✅ Proper flow control and step management

The onboarding navigation is now fully configured and ready for merchant registration and approval workflow.
