# Form Validation Quick Start Guide

Get started with form validation in 5 minutes!

## Installation

All dependencies are already installed. Files created:
```
utils/validation/
  ├── helpers.ts         # Validation utilities
  ├── schemas.ts         # Zod schemas
  └── index.ts          # Central exports

components/forms/
  ├── FormInput.tsx      # Input component
  ├── FormSelect.tsx     # Select component
  ├── FormExamples.tsx   # Examples
  └── index.ts          # Exports

hooks/
  └── useForm.ts        # Custom form hook
```

---

## Quick Example: Login Form

### Step 1: Import
```typescript
import { useForm } from '@/hooks/useForm';
import { loginSchema, LoginFormData } from '@/utils/validation/schemas';
import FormInput from '@/components/forms/FormInput';
```

### Step 2: Create Form
```typescript
const LoginScreen = () => {
  const form = useForm<LoginFormData>({
    schema: loginSchema,
    onSubmit: async (data) => {
      // Handle login
      const response = await loginUser(data);
      if (response.success) {
        navigation.navigate('Home');
      }
    },
  });

  const { control, handleSubmit, isValid, isSubmitting } = form;

  return (
    <ScrollView>
      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="your@email.com"
        keyboardType="email-address"
        icon="mail"
      />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        icon="lock-closed"
      />

      <TouchableOpacity
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid || isSubmitting}
      >
        <Text>{isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

That's it! ✅

---

## Common Patterns

### Pattern 1: Email Input
```typescript
<FormInput
  name="email"
  control={control}
  label="Email Address"
  placeholder="user@example.com"
  keyboardType="email-address"
  icon="mail"
/>
```

### Pattern 2: Password Input
```typescript
<FormInput
  name="password"
  control={control}
  label="Password"
  placeholder="Enter password"
  secureTextEntry
  icon="lock-closed"
/>
```

### Pattern 3: Phone Input
```typescript
import { validatePhoneNumber } from '@/utils/validation/helpers';

<FormInput
  name="phone"
  control={control}
  label="Phone"
  placeholder="+91 98765 43210"
  keyboardType="phone-pad"
  icon="call"
/>
```

### Pattern 4: GST Input
```typescript
<FormInput
  name="gst"
  control={control}
  label="GST Number"
  placeholder="27AAPPU0205R1Z5"
  icon="document"
  maxLength={15}
  autoCapitalize="characters"
/>
```

### Pattern 5: Dropdown
```typescript
<FormSelect
  name="category"
  control={control}
  label="Product Category"
  placeholder="Select category"
  options={[
    { label: 'Electronics', value: 'electronics' },
    { label: 'Fashion', value: 'fashion' },
    { label: 'Home', value: 'home' },
  ]}
  searchable
  clearable
/>
```

### Pattern 6: Textarea
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

### Pattern 7: Multi-Select
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

## All Built-in Validators

```typescript
import {
  // Basic
  validateEmail,
  validatePhoneNumber,
  validateURL,
  validatePasswordStrength,

  // Indian Business
  validateGST,
  validateGSTWithChecksum,
  validatePAN,
  validateIFSC,
  validatePincode,
  validateAadhaar,

  // Banking
  validateBankAccount,
  validateUPI,

  // Formatting
  formatPhoneNumber,
  formatGST,
  formatPAN,
  formatBankAccountMasked,
} from '@/utils/validation/helpers';
```

---

## All Built-in Schemas

```typescript
import {
  // Auth
  loginSchema,
  registerSchema,
  passwordResetSchema,
  setNewPasswordSchema,

  // Products
  createProductSchema,
  editProductSchema,

  // Onboarding
  businessInfoSchema,
  bankDetailsSchema,
  businessAddressSchema,
  ownerInfoSchema,
  completeOnboardingSchema,

  // Team
  inviteMemberSchema,

  // Profile
  updateProfileSchema,
} from '@/utils/validation/schemas';
```

---

## Custom Validation Rules

Add custom rules to any field:

```typescript
const customSchema = z.object({
  email: z
    .string()
    .email('Invalid email'),

  password: z
    .string()
    .min(8, 'Too short')
    .refine(
      (pwd) => validatePasswordStrength(pwd).isValid,
      'Not strong enough'
    ),

  gst: z
    .string()
    .refine(
      validateGST,
      'Invalid GST format'
    ),
});

const form = useForm({
  schema: customSchema,
});
```

---

## Error Handling

### Display Field Errors
```typescript
<FormInput
  name="email"
  control={control}
  label="Email"
/>

// Errors are automatically displayed by FormInput
// But you can also access them manually:
{form.getFieldError('email') && (
  <Text style={styles.error}>
    {form.getFieldError('email')}
  </Text>
)}
```

### Set Server-Side Errors
```typescript
const form = useForm({
  onSubmit: async (data) => {
    try {
      await submitForm(data);
    } catch (error) {
      if (error.field === 'email') {
        form.setFieldError('email', 'Email already exists');
      }
    }
  },
});
```

---

## Form State

Access form state for UI logic:

```typescript
const {
  isValid,         // Is form valid
  isDirty,         // Has form changed
  isSubmitting,    // Is form submitting
} = form;

<TouchableOpacity disabled={!isValid || isSubmitting}>
  <Text>{isSubmitting ? 'Loading...' : 'Submit'}</Text>
</TouchableOpacity>
```

---

## Pre-fill Forms

```typescript
const form = useForm({
  schema: mySchema,
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
});
```

---

## Reset Forms

```typescript
// Clear all
form.resetForm();

// Reset to specific values
form.resetForm({
  firstName: 'Jane',
  email: '',
});
```

---

## Multi-Step Forms

```typescript
const form = useForm({
  schema: completeOnboardingSchema,
  mode: 'onChange',
});

const [step, setStep] = useState(0);

const goToNextStep = () => {
  // Validate current step before proceeding
  // (In production, use step-specific schemas)
  setStep(step + 1);
};

const goToPrevStep = () => {
  setStep(Math.max(0, step - 1));
};

return (
  <View>
    {step === 0 && <BusinessInfoForm form={form} />}
    {step === 1 && <BankDetailsForm form={form} />}
    {step === 2 && <ReviewForm form={form} />}

    <View style={styles.buttons}>
      {step > 0 && <Button onPress={goToPrevStep} title="Back" />}
      {step < 2 && <Button onPress={goToNextStep} title="Next" />}
      {step === 2 && (
        <Button
          onPress={handleSubmit(form.submitForm)}
          title="Submit"
        />
      )}
    </View>
  </View>
);
```

---

## Styling

All components have built-in styling. Customize:

```typescript
<FormInput
  name="email"
  control={control}
  containerStyle={{ marginBottom: 20 }}
  inputStyle={{ fontSize: 18 }}
/>

<FormSelect
  name="category"
  control={control}
  optionContainerStyle={{ paddingVertical: 16 }}
/>
```

---

## Icons

Use any Ionicons icon name:

```typescript
<FormInput
  name="email"
  icon="mail"          // Left icon
  rightIcon="close"    // Right icon
/>
```

Common icons:
- `mail` - Email
- `lock-closed` - Password
- `call` - Phone
- `document` - Document
- `briefcase` - Business
- `person` - User
- `wallet` - Wallet/Account
- `globe` - Website
- `cash` - Money/UPI
- `building` - Bank
- `cube` - Product

---

## Testing

All components have testID support:

```typescript
<FormInput
  name="email"
  control={control}
  testID="email-input"
/>

// In tests
const emailInput = screen.getByTestId('email-input');
expect(emailInput).toBeVisible();
```

---

## Performance Tips

1. **Use `mode: 'onBlur'`** for better performance
2. **Memoize form components** to prevent re-renders
3. **Split large forms** into multiple steps
4. **Use `watch`** only for fields you need

```typescript
const form = useForm({
  schema: mySchema,
  mode: 'onBlur', // Don't validate on every keystroke
});

// Only watch specific fields
const watchPassword = form.watch('password');
```

---

## See More Examples

Open `FormExamples.tsx` to see complete implementations of:
- Login Form
- Registration Form
- Product Creation
- Business Information
- Bank Details
- Invite Member

---

## Documentation

For complete documentation, see `FORM_VALIDATION_GUIDE.md`

---

## Common Issues

### Issue: "Unexpected token 'type'"
**Solution**: Ensure you're using TypeScript `.ts` or `.tsx` files

### Issue: "Field not validating"
**Solution**: Check field name matches exactly in schema

### Issue: "Control is not defined"
**Solution**: Get control from useForm hook
```typescript
const { control } = useForm({...});
```

### Issue: "Schema not found"
**Solution**: Import from correct path
```typescript
import { loginSchema } from '@/utils/validation/schemas';
```

---

## Next Steps

1. Copy patterns from above ✅
2. Create your form screens
3. Connect to your API
4. Deploy!

Happy coding! 🚀
