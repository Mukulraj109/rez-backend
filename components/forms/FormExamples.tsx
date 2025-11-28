/**
 * Form Examples
 * Comprehensive examples of how to use FormInput, FormSelect, and validation schemas
 */

import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { useForm } from '../../hooks/useForm';
import {
  loginSchema,
  registerSchema,
  createProductSchema,
  businessInfoSchema,
  bankDetailsSchema,
  inviteMemberSchema,
  LoginFormData,
  RegisterFormData,
  CreateProductFormData,
  BusinessInfoFormData,
  BankDetailsFormData,
  InviteMemberFormData,
} from '../../utils/validation/schemas';
import { validatePasswordStrength } from '../../utils/validation/helpers';

// ===========================
// LOGIN FORM EXAMPLE
// ===========================

export const LoginFormExample: React.FC = () => {
  const form = useForm<LoginFormData>({
    schema: loginSchema,
    onSubmit: async (data) => {
      Alert.alert('Login', JSON.stringify(data));
    },
  });

  const { control, handleSubmit, isValid } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="your@email.com"
        keyboardType="email-address"
        icon="mail"
        rules={{ required: 'Email is required' }}
      />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        icon="lock-closed"
        rules={{ required: 'Password is required' }}
      />

      <FormSelect
        name="rememberMe"
        control={control}
        label="Remember Me"
        options={[
          { label: 'Yes, remember me', value: true },
          { label: 'No, ask next time', value: false },
        ]}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

// ===========================
// REGISTRATION FORM EXAMPLE
// ===========================

export const RegisterFormExample: React.FC = () => {
  const form = useForm<RegisterFormData>({
    schema: registerSchema,
    onSubmit: async (data) => {
      Alert.alert('Registration', 'Account created successfully!');
    },
  });

  const { control, handleSubmit, watch, isValid } = form;
  const password = watch('password');
  const passwordStrength = password ? validatePasswordStrength(password) : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            name="firstName"
            control={control}
            label="First Name"
            placeholder="John"
            icon="person"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            name="lastName"
            control={control}
            label="Last Name"
            placeholder="Doe"
            icon="person"
          />
        </View>
      </View>

      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="john@example.com"
        keyboardType="email-address"
        icon="mail"
      />

      <FormInput
        name="phone"
        control={control}
        label="Phone"
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        icon="call"
      />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="Min 8 characters"
        secureTextEntry
        icon="lock-closed"
        helperText={
          passwordStrength
            ? `Strength: ${passwordStrength.strength}`
            : 'Create a strong password'
        }
      />

      {passwordStrength && passwordStrength.feedback.length > 0 && (
        <View style={styles.feedbackContainer}>
          {passwordStrength.feedback.map((item, index) => (
            <Text key={index} style={styles.feedbackText}>
              • {item}
            </Text>
          ))}
        </View>
      )}

      <FormInput
        name="confirmPassword"
        control={control}
        label="Confirm Password"
        placeholder="Re-enter your password"
        secureTextEntry
        icon="lock-closed"
      />

      <FormSelect
        name="acceptTerms"
        control={control}
        label="Accept Terms"
        options={[
          { label: 'I accept terms and conditions', value: true },
          { label: 'I do not accept', value: false },
        ]}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ===========================
// PRODUCT CREATION FORM EXAMPLE
// ===========================

export const CreateProductFormExample: React.FC = () => {
  const form = useForm<CreateProductFormData>({
    schema: createProductSchema,
    defaultValues: {
      stock: 0,
      gst: 18,
      isActive: true,
    },
    onSubmit: async (data) => {
      Alert.alert('Product Created', data.name);
    },
  });

  const { control, handleSubmit, isValid } = form;

  const categories = [
    { label: 'Electronics', value: 'electronics' },
    { label: 'Fashion', value: 'fashion' },
    { label: 'Home & Kitchen', value: 'home' },
    { label: 'Books', value: 'books' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Add New Product</Text>

      <FormInput
        name="name"
        control={control}
        label="Product Name"
        placeholder="Enter product name"
        icon="cube"
      />

      <FormInput
        name="description"
        control={control}
        label="Description"
        placeholder="Describe your product..."
        multiline
        numberOfLines={4}
        maxLength={500}
        showCharCount
      />

      <FormSelect
        name="category"
        control={control}
        label="Category"
        placeholder="Select category"
        options={categories}
        searchable
      />

      <FormInput
        name="sku"
        control={control}
        label="SKU"
        placeholder="e.g., PROD-001"
      />

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            name="price"
            control={control}
            label="Price"
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            name="discountPrice"
            control={control}
            label="Discount Price"
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            name="stock"
            control={control}
            label="Stock"
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            name="gst"
            control={control}
            label="GST %"
            placeholder="18"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <FormSelect
        name="isActive"
        control={control}
        label="Status"
        options={[
          { label: 'Active', value: true },
          { label: 'Inactive', value: false },
        ]}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Create Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ===========================
// BUSINESS INFO FORM EXAMPLE
// ===========================

export const BusinessInfoFormExample: React.FC = () => {
  const form = useForm<BusinessInfoFormData>({
    schema: businessInfoSchema,
    onSubmit: async (data) => {
      Alert.alert('Business Info', data.businessName);
    },
  });

  const { control, handleSubmit, isValid } = form;

  const businessTypes = [
    { label: 'Proprietorship', value: 'proprietorship' },
    { label: 'Partnership', value: 'partnership' },
    { label: 'Private Limited', value: 'pvt_ltd' },
    { label: 'LLP', value: 'llp' },
    { label: 'Sole Trader', value: 'sole_trader' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Business Information</Text>

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
        placeholder="Select business type"
        options={businessTypes}
      />

      <FormInput
        name="gst"
        control={control}
        label="GST Number"
        placeholder="e.g., 27AAPPU0205R1Z5"
        icon="document"
        maxLength={15}
      />

      <FormInput
        name="pan"
        control={control}
        label="PAN"
        placeholder="e.g., AAAPB5055K"
        icon="document"
        maxLength={10}
        autoCapitalize="characters"
      />

      <FormInput
        name="yearsInBusiness"
        control={control}
        label="Years in Business"
        placeholder="0"
        keyboardType="number-pad"
      />

      <FormInput
        name="website"
        control={control}
        label="Website (Optional)"
        placeholder="https://example.com"
        keyboardType="url"
        icon="globe"
      />

      <FormInput
        name="businessEmail"
        control={control}
        label="Business Email"
        placeholder="business@example.com"
        keyboardType="email-address"
        icon="mail"
      />

      <FormInput
        name="businessPhone"
        control={control}
        label="Business Phone"
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        icon="call"
      />

      <FormInput
        name="businessDescription"
        control={control}
        label="Description (Optional)"
        placeholder="Tell us about your business..."
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Save Business Info</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ===========================
// BANK DETAILS FORM EXAMPLE
// ===========================

export const BankDetailsFormExample: React.FC = () => {
  const form = useForm<BankDetailsFormData>({
    schema: bankDetailsSchema,
    onSubmit: async (data) => {
      Alert.alert('Bank Details', 'Saved successfully');
    },
  });

  const { control, handleSubmit, isValid } = form;

  const accountTypes = [
    { label: 'Savings Account', value: 'savings' },
    { label: 'Current Account', value: 'current' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Bank Details</Text>

      <FormInput
        name="accountHolderName"
        control={control}
        label="Account Holder Name"
        placeholder="Full name as in bank account"
        icon="person"
      />

      <FormInput
        name="accountNumber"
        control={control}
        label="Account Number"
        placeholder="Enter account number"
        keyboardType="number-pad"
        icon="wallet"
      />

      <FormInput
        name="confirmAccountNumber"
        control={control}
        label="Confirm Account Number"
        placeholder="Re-enter account number"
        keyboardType="number-pad"
        icon="wallet"
      />

      <FormInput
        name="ifscCode"
        control={control}
        label="IFSC Code"
        placeholder="e.g., SBIN0001234"
        autoCapitalize="characters"
        maxLength={11}
        icon="document"
      />

      <FormInput
        name="bankName"
        control={control}
        label="Bank Name"
        placeholder="State Bank of India"
        icon="building"
      />

      <FormSelect
        name="accountType"
        control={control}
        label="Account Type"
        options={accountTypes}
      />

      <FormInput
        name="upiId"
        control={control}
        label="UPI ID (Optional)"
        placeholder="username@bankname"
        icon="cash"
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Save Bank Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ===========================
// INVITE MEMBER FORM EXAMPLE
// ===========================

export const InviteMemberFormExample: React.FC = () => {
  const form = useForm<InviteMemberFormData>({
    schema: inviteMemberSchema,
    onSubmit: async (data) => {
      Alert.alert('Invitation', `Sent to ${data.email}`);
    },
  });

  const { control, handleSubmit, isValid } = form;

  const roles = [
    { label: 'Administrator', value: 'admin', description: 'Full access' },
    { label: 'Manager', value: 'manager', description: 'Manage content' },
    { label: 'Staff', value: 'staff', description: 'Limited access' },
    { label: 'Viewer', value: 'viewer', description: 'Read-only access' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Invite Team Member</Text>

      <FormInput
        name="email"
        control={control}
        label="Email Address"
        placeholder="member@example.com"
        keyboardType="email-address"
        icon="mail"
      />

      <FormInput
        name="firstName"
        control={control}
        label="First Name"
        placeholder="John"
        icon="person"
      />

      <FormInput
        name="lastName"
        control={control}
        label="Last Name"
        placeholder="Doe"
        icon="person"
      />

      <FormSelect
        name="role"
        control={control}
        label="Role"
        placeholder="Select role"
        options={roles}
      />

      <FormInput
        name="message"
        control={control}
        label="Message (Optional)"
        placeholder="Add a personal message..."
        multiline
        numberOfLines={3}
        maxLength={500}
        showCharCount
      />

      <TouchableOpacity
        style={[styles.button, { opacity: isValid ? 1 : 0.5 }]}
        onPress={handleSubmit(form.submitForm)}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Send Invitation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ===========================
// Styles
// ===========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  feedbackText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
});

export default LoginFormExample;
