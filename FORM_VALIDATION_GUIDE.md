# Form Validation System Guide

Complete guide for using React Hook Form + Zod validation system in the merchant app.

## Table of Contents
1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Validation Helpers](#validation-helpers)
4. [Validation Schemas](#validation-schemas)
5. [Form Components](#form-components)
6. [Custom Hooks](#custom-hooks)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## Overview

This form validation system provides:
- **Zod Schemas**: Type-safe validation schemas for all forms
- **React Hook Form Integration**: Lightweight form state management
- **Reusable Components**: FormInput, FormSelect with built-in validation
- **Custom Hooks**: useForm wrapper with additional utilities
- **Validation Helpers**: Specialized validators for Indian business data

### Architecture
```
┌─────────────────────────────────────────────┐
│         Form Components                      │
│    (FormInput, FormSelect)                  │
└──────────────┬──────────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────────┐
│       useForm Hook (Custom)                  │
│  (wraps React Hook Form)                    │
└──────────────┬──────────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────────┐
│    React Hook Form + Zod                     │
│  (form state & validation)                  │
└──────────────┬──────────────────────────────┘
               │ validates with
               ▼
┌─────────────────────────────────────────────┐
│   Validation Schemas (Zod)                   │
│  (with custom validators)                   │
└──────────────┬──────────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────────┐
│  Validation Helpers                          │
│ (GST, PAN, IFSC, Phone, Email, etc.)       │
└─────────────────────────────────────────────┘
```

---

## Installation & Setup

### Dependencies (Already Installed)
```json
{
  "react-hook-form": "^7.66.0",
  "zod": "^4.1.12",
  "@hookform/resolvers": "^5.2.2"
}
```

### File Structure
```
merchant-app/
├── utils/
│   └── validation/
│       ├── helpers.ts      # Validation utility functions
│       └── schemas.ts      # Zod validation schemas
├── components/
│   └── forms/
│       ├── FormInput.tsx   # Controlled input component
│       ├── FormSelect.tsx  # Dropdown/select component
│       └── FormExamples.tsx # Usage examples
└── hooks/
    └── useForm.ts          # Custom form hook
```

---

## Validation Helpers

File: `utils/validation/helpers.ts`

### Indian Business Validators

#### GST Validation
```typescript
import { validateGST, validateGSTWithChecksum } from '@/utils/validation/helpers';

// Basic validation
const isValid = validateGST('27AAPPU0205R1Z5'); // true

// Enhanced validation with checksum
const isValidWithChecksum = validateGSTWithChecksum('27AAPPU0205R1Z5'); // true
```

#### PAN Validation
```typescript
import { validatePAN } from '@/utils/validation/helpers';

const isValid = validatePAN('AAAPB5055K'); // true
```

#### IFSC Code Validation
```typescript
import { validateIFSC } from '@/utils/validation/helpers';

const isValid = validateIFSC('SBIN0001234'); // true
```

#### Phone Number Validation
```typescript
import { validatePhoneNumber } from '@/utils/validation/helpers';

// 10-digit format
const isValid1 = validatePhoneNumber('9876543210'); // true

// With country code
const isValid2 = validatePhoneNumber('+919876543210'); // true

// With formatting
const isValid3 = validatePhoneNumber('+91 98765 43210'); // true
```

#### Email Validation
```typescript
import { validateEmail } from '@/utils/validation/helpers';

const isValid = validateEmail('user@example.com'); // true
```

#### Pincode Validation
```typescript
import { validatePincode } from '@/utils/validation/helpers';

const isValid = validatePincode('560001'); // true
```

#### Aadhaar Validation
```typescript
import { validateAadhaar } from '@/utils/validation/helpers';

const isValid = validateAadhaar('123456789012'); // true
```

#### Bank Account Validation
```typescript
import { validateBankAccount } from '@/utils/validation/helpers';

const isValid = validateBankAccount('12345678901234'); // true
```

#### UPI Validation
```typescript
import { validateUPI } from '@/utils/validation/helpers';

const isValid = validateUPI('username@bankname'); // true
```

#### Password Strength
```typescript
import { validatePasswordStrength } from '@/utils/validation/helpers';

const result = validatePasswordStrength('MyP@ssw0rd');
// Returns:
// {
//   isValid: true,
//   strength: 'strong',
//   feedback: []
// }
```

### Formatting Helpers

#### Format Phone Number
```typescript
import { formatPhoneNumber } from '@/utils/validation/helpers';

const formatted = formatPhoneNumber('9876543210'); // "987 654 3210"
```

#### Format GST
```typescript
import { formatGST } from '@/utils/validation/helpers';

const formatted = formatGST('27AAPPU0205R1Z5');
// "27 AAPPU 0205 R 1 Z 5"
```

#### Format PAN
```typescript
import { formatPAN } from '@/utils/validation/helpers';

const formatted = formatPAN('AAAPB5055K'); // "AAAPB 5055 K"
```

#### Format Bank Account (Masked)
```typescript
import { formatBankAccountMasked } from '@/utils/validation/helpers';

const masked = formatBankAccountMasked('1234567890'); // "****7890"
```

---

## Validation Schemas

File: `utils/validation/schemas.ts`

### Available Schemas

#### Login Schema
```typescript
import { loginSchema, LoginFormData } from '@/utils/validation/schemas';

// TypeScript type
type LoginData = LoginFormData;

// Zod schema
const schema = loginSchema;
```

Fields:
- `email`: string (required, valid email)
- `password`: string (required, min 6 chars)
- `rememberMe`: boolean (optional, default: false)

#### Register Schema
```typescript
import { registerSchema, RegisterFormData } from '@/utils/validation/schemas';

type RegisterData = RegisterFormData;
```

Fields:
- `firstName`: string (required, 2-50 chars)
- `lastName`: string (required, 2-50 chars)
- `email`: string (required, valid email)
- `phone`: string (required, valid Indian phone)
- `password`: string (required, 8+ chars, strong)
- `confirmPassword`: string (required, must match)
- `acceptTerms`: boolean (required, must be true)

#### Product Creation Schema
```typescript
import { createProductSchema, CreateProductFormData } from '@/utils/validation/schemas';

type ProductData = CreateProductFormData;
```

Fields:
- `name`: string (required, 3-100 chars)
- `description`: string (required, 10-1000 chars)
- `category`: string (required)
- `subcategory`: string (optional)
- `price`: number (required, > 0)
- `discountPrice`: number (optional, < price)
- `sku`: string (required, 3-50 chars)
- `stock`: integer (required, >= 0)
- `images`: string[] (required, 1-10 URLs)
- `gst`: number (optional, 0-100)
- `isActive`: boolean (optional, default: true)

#### Business Info Schema
```typescript
import { businessInfoSchema, BusinessInfoFormData } from '@/utils/validation/schemas';

type BusinessData = BusinessInfoFormData;
```

Fields:
- `businessName`: string (required)
- `businessType`: enum ('proprietorship' | 'partnership' | 'pvt_ltd' | 'llp' | 'sole_trader')
- `gst`: string (required, valid GST)
- `pan`: string (required, valid PAN)
- `businessDescription`: string (optional, 10-500 chars)
- `yearsInBusiness`: number (required, 0-150)
- `website`: URL (optional)
- `businessEmail`: string (required)
- `businessPhone`: string (required, valid phone)

#### Bank Details Schema
```typescript
import { bankDetailsSchema, BankDetailsFormData } from '@/utils/validation/schemas';

type BankData = BankDetailsFormData;
```

Fields:
- `accountHolderName`: string (required)
- `accountNumber`: string (required, valid account)
- `confirmAccountNumber`: string (required, must match)
- `ifscCode`: string (required, valid IFSC)
- `bankName`: string (required)
- `accountType`: enum ('savings' | 'current')
- `upiId`: string (optional, valid UPI)

#### Invite Member Schema
```typescript
import { inviteMemberSchema, InviteMemberFormData } from '@/utils/validation/schemas';

type InviteData = InviteMemberFormData;
```

Fields:
- `email`: string (required, valid email)
- `firstName`: string (required, 2+ chars)
- `lastName`: string (required, 2+ chars)
- `role`: enum ('admin' | 'manager' | 'staff' | 'viewer')
- `permissions`: string[] (optional)
- `message`: string (optional, max 500 chars)

---

## Form Components

### FormInput Component

**File**: `components/forms/FormInput.tsx`

Controlled input component with built-in validation, error display, and icons.

#### Basic Usage
```typescript
import FormInput from '@/components/forms/FormInput';
import { useForm } from '@/hooks/useForm';

const MyForm = () => {
  const { control } = useForm({
    schema: mySchema,
  });

  return (
    <FormInput
      name="email"
      control={control}
      label="Email Address"
      placeholder="your@email.com"
      keyboardType="email-address"
    />
  );
};
```

#### Props
```typescript
interface FormInputProps {
  // Required
  name: string;
  control: Control;

  // Labels & Help
  label?: string;
  placeholder?: string;
  description?: string;
  helperText?: string;

  // Input Config
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'tel' | 'postal-code';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';

  // Validation
  rules?: RegisterOptions;

  // Icons
  icon?: string;          // Left icon (Ionicons)
  rightIcon?: string;     // Right icon (Ionicons)
  onRightIconPress?: () => void;

  // State
  disabled?: boolean;
  editable?: boolean;

  // Callbacks
  onBlur?: () => void;
  onFocus?: () => void;

  // Styling
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;

  // Features
  showCharCount?: boolean;

  // Testing
  testID?: string;
}
```

#### Examples

**Email Input**
```typescript
<FormInput
  name="email"
  control={control}
  label="Email"
  placeholder="user@example.com"
  keyboardType="email-address"
  icon="mail"
/>
```

**Password Input**
```typescript
<FormInput
  name="password"
  control={control}
  label="Password"
  placeholder="Enter password"
  secureTextEntry
  icon="lock-closed"
  rules={{ required: 'Password is required' }}
/>
```

**Phone Input**
```typescript
<FormInput
  name="phone"
  control={control}
  label="Phone Number"
  placeholder="+91 98765 43210"
  keyboardType="phone-pad"
  icon="call"
/>
```

**Textarea Input**
```typescript
<FormInput
  name="description"
  control={control}
  label="Description"
  placeholder="Enter description..."
  multiline
  numberOfLines={4}
  maxLength={500}
  showCharCount
/>
```

---

### FormSelect Component

**File**: `components/forms/FormSelect.tsx`

Dropdown/select component with search, multi-select, and custom rendering.

#### Basic Usage
```typescript
import FormSelect from '@/components/forms/FormSelect';
import { useForm } from '@/hooks/useForm';

const MyForm = () => {
  const { control } = useForm({
    schema: mySchema,
  });

  const options = [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
  ];

  return (
    <FormSelect
      name="category"
      control={control}
      label="Category"
      options={options}
    />
  );
};
```

#### Props
```typescript
interface FormSelectProps {
  // Required
  name: string;
  control: Control;
  options: SelectOption[];

  // Labels & Help
  label?: string;
  placeholder?: string;
  description?: string;
  helperText?: string;

  // Validation
  rules?: RegisterOptions;

  // Features
  searchable?: boolean;
  clearable?: boolean;
  multiSelect?: boolean;

  // Callbacks
  onSelect?: (value: any) => void;

  // Styling
  containerStyle?: ViewStyle;
  optionContainerStyle?: ViewStyle;

  // Rendering
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  renderValue?: (value: any) => string;

  // State
  disabled?: boolean;

  // Testing
  testID?: string;
}

interface SelectOption {
  label: string;
  value: string | number;
  description?: string;
  disabled?: boolean;
}
```

#### Examples

**Single Select**
```typescript
const businessTypes = [
  { label: 'Proprietorship', value: 'proprietorship' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'Pvt Ltd', value: 'pvt_ltd' },
];

<FormSelect
  name="businessType"
  control={control}
  label="Business Type"
  options={businessTypes}
/>
```

**Searchable Select**
```typescript
const categories = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Home & Kitchen', value: 'home' },
];

<FormSelect
  name="category"
  control={control}
  label="Product Category"
  options={categories}
  searchable
  clearable
/>
```

**Multi-Select**
```typescript
<FormSelect
  name="permissions"
  control={control}
  label="Permissions"
  options={[
    { label: 'View', value: 'view' },
    { label: 'Edit', value: 'edit' },
    { label: 'Delete', value: 'delete' },
  ]}
  multiSelect
/>
```

---

## Custom Hooks

### useForm Hook

**File**: `hooks/useForm.ts`

Wrapper around React Hook Form with additional utilities.

#### Basic Usage
```typescript
import { useForm } from '@/hooks/useForm';
import { loginSchema, LoginFormData } from '@/utils/validation/schemas';

const LoginScreen = () => {
  const form = useForm<LoginFormData>({
    schema: loginSchema,
    onSubmit: async (data) => {
      // Handle form submission
      await loginUser(data);
    },
    onError: (errors) => {
      // Handle validation errors
      console.error(errors);
    },
  });

  const { control, handleSubmit, isValid } = form;

  return (
    <View>
      <FormInput name="email" control={control} label="Email" />
      <FormInput name="password" control={control} label="Password" />

      <Button
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
        title="Login"
      />
    </View>
  );
};
```

#### Configuration
```typescript
interface UseFormConfig {
  schema?: ZodSchema;           // Validation schema
  onSubmit?: (data: T) => void | Promise<void>;  // Success handler
  onError?: (errors: any) => void;               // Error handler
  mode?: 'onChange' | 'onBlur' | 'onSubmit';     // Validation mode
  defaultValues?: T;            // Initial values
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
}
```

#### Returned Methods
```typescript
// Form methods
control                // React Hook Form control
handleSubmit           // Submit handler wrapper
watch                  // Watch field values
setValue               // Set field value
getValues              // Get all values
reset                  // Reset form
clearErrors            // Clear all errors
setError               // Set field error

// Custom utilities
isValid                // Is form valid
isDirty                // Has form changed
isSubmitting           // Is form submitting
submitForm             // Submit handler
resetForm              // Reset handler
getFieldError          // Get field error message
hasFieldError          // Check if field has error
clearFieldError        // Clear specific field error
setFieldError          // Set specific field error
```

#### Example with All Features
```typescript
const form = useForm<RegisterFormData>({
  schema: registerSchema,
  mode: 'onBlur',
  defaultValues: {
    acceptTerms: false,
  },
  onSubmit: async (data) => {
    try {
      await registerUser(data);
      form.resetForm();
    } catch (error) {
      form.setFieldError('email', 'Email already exists');
    }
  },
  onError: (errors) => {
    console.error('Validation errors:', errors);
  },
});

// Usage
const { control, isValid, getFieldError, hasFieldError } = form;

return (
  <View>
    <FormInput
      name="email"
      control={control}
      label="Email"
    />

    {hasFieldError('email') && (
      <Text>{getFieldError('email')}</Text>
    )}

    <Button
      disabled={!isValid}
      onPress={handleSubmit(form.submitForm)}
      title="Register"
    />
  </View>
);
```

---

## Usage Examples

### Complete Login Form
```typescript
import { View } from 'react-native';
import FormInput from '@/components/forms/FormInput';
import { useForm } from '@/hooks/useForm';
import { loginSchema, LoginFormData } from '@/utils/validation/schemas';

export const LoginScreen = () => {
  const form = useForm<LoginFormData>({
    schema: loginSchema,
    mode: 'onBlur',
    onSubmit: async (data) => {
      // Call API
      const response = await loginUser(data);
      // Navigate
    },
  });

  const { control, handleSubmit, isValid, isSubmitting } = form;

  return (
    <ScrollView>
      <FormInput
        name="email"
        control={control}
        label="Email Address"
        placeholder="your@email.com"
        keyboardType="email-address"
        icon="mail"
      />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        icon="lock-closed"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid || isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

### Complete Business Onboarding Form
```typescript
import { businessInfoSchema, BusinessInfoFormData } from '@/utils/validation/schemas';

export const BusinessOnboardingScreen = () => {
  const form = useForm<BusinessInfoFormData>({
    schema: businessInfoSchema,
    mode: 'onChange',
    onSubmit: async (data) => {
      await saveBusiness(data);
    },
  });

  const { control, handleSubmit, isValid } = form;

  return (
    <ScrollView>
      <FormInput
        name="businessName"
        control={control}
        label="Business Name"
        placeholder="Your Business Name"
        icon="briefcase"
      />

      <FormSelect
        name="businessType"
        control={control}
        label="Business Type"
        options={[
          { label: 'Proprietorship', value: 'proprietorship' },
          { label: 'Partnership', value: 'partnership' },
          { label: 'Pvt Ltd', value: 'pvt_ltd' },
        ]}
        searchable
      />

      <FormInput
        name="gst"
        control={control}
        label="GST Number"
        placeholder="27AAPPU0205R1Z5"
        icon="document"
        maxLength={15}
      />

      <FormInput
        name="pan"
        control={control}
        label="PAN"
        placeholder="AAAPB5055K"
        autoCapitalize="characters"
      />

      <TouchableOpacity
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

---

## Best Practices

### 1. **Use TypeScript with Zod Schemas**
```typescript
// Good - Type-safe
import { RegisterFormData, registerSchema } from '@/utils/validation/schemas';

const form = useForm<RegisterFormData>({
  schema: registerSchema,
});
```

### 2. **Validate on Blur for Better UX**
```typescript
const form = useForm({
  schema: mySchema,
  mode: 'onBlur', // Not onChange
});
```

### 3. **Handle Server-Side Errors**
```typescript
const form = useForm<LoginFormData>({
  onSubmit: async (data) => {
    try {
      await loginUser(data);
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        form.setFieldError('password', 'Invalid password');
      }
    }
  },
});
```

### 4. **Create Reusable Form Screens**
```typescript
interface FormScreenProps {
  onSuccess?: (data: any) => void;
  initialValues?: any;
}

export const BusinessFormScreen: React.FC<FormScreenProps> = ({
  onSuccess,
  initialValues,
}) => {
  // ...
};
```

### 5. **Show Loading State**
```typescript
const { isSubmitting } = form;

<TouchableOpacity disabled={isSubmitting}>
  <Text>
    {isSubmitting ? (
      <>
        <ActivityIndicator /> Saving...
      </>
    ) : (
      'Save'
    )}
  </Text>
</TouchableOpacity>
```

### 6. **Field-Level Validation Display**
```typescript
<View>
  <FormInput
    name="email"
    control={control}
    label="Email"
  />

  {hasFieldError('email') && (
    <Text style={styles.errorText}>
      {getFieldError('email')}
    </Text>
  )}
</View>
```

### 7. **Pre-fill Forms**
```typescript
const form = useForm<UserData>({
  schema: userSchema,
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
});
```

### 8. **Custom Validation Rules**
```typescript
const customSchema = z.object({
  password: z.string().refine(
    (pwd) => validatePasswordStrength(pwd).isValid,
    'Password not strong enough'
  ),
});
```

---

## Common Issues & Solutions

### Issue: Form not validating
**Solution**: Ensure schema is passed to useForm
```typescript
// Wrong
const form = useForm();

// Correct
const form = useForm({ schema: mySchema });
```

### Issue: Field errors not showing
**Solution**: Check field name matches schema
```typescript
// Schema
const schema = z.object({ email: z.string().email() });

// Component - must match
<FormInput name="email" control={control} />
```

### Issue: Validation running too often
**Solution**: Use `onBlur` mode instead of `onChange`
```typescript
const form = useForm({
  schema: mySchema,
  mode: 'onBlur', // Better performance
});
```

---

## API Reference

See individual file headers for complete API documentation:
- `utils/validation/helpers.ts` - Validation helpers
- `utils/validation/schemas.ts` - Zod schemas
- `components/forms/FormInput.tsx` - Input component
- `components/forms/FormSelect.tsx` - Select component
- `hooks/useForm.ts` - Form hook

---

## Support

For issues or questions:
1. Check FormExamples.tsx for usage patterns
2. Review type definitions in schema files
3. Refer to React Hook Form docs: https://react-hook-form.com
4. Refer to Zod docs: https://zod.dev
