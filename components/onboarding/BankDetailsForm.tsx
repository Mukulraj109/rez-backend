/**
 * BankDetailsForm Component
 * Reusable bank details form for Step 3 of onboarding
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, Switch, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import FormInput from '@/components/forms/FormInput';
import FormSelect, { SelectOption } from '@/components/forms/FormSelect';
import { BankDetailsStep } from '@/types/onboarding';
import { Colors } from '@/constants/Colors';

export interface BankDetailsFormProps {
  initialData?: Partial<BankDetailsStep>;
  onSubmit: (data: BankDetailsStep) => void;
  onValidate?: (data: Partial<BankDetailsStep>) => void;
  isLoading?: boolean;
}

const ACCOUNT_TYPES: SelectOption[] = [
  { label: 'Savings Account', value: 'savings' },
  { label: 'Current Account', value: 'current' },
  { label: 'Business Account', value: 'business' },
];

const TAX_FILING_FREQUENCIES: SelectOption[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
];

const BankDetailsForm: React.FC<BankDetailsFormProps> = ({
  initialData,
  onSubmit,
  onValidate,
  isLoading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BankDetailsStep>({
    defaultValues: {
      accountHolderName: initialData?.accountHolderName || '',
      accountNumber: initialData?.accountNumber || '',
      confirmAccountNumber: initialData?.confirmAccountNumber || '',
      bankName: initialData?.bankName || '',
      branchName: initialData?.branchName || '',
      ifscCode: initialData?.ifscCode || '',
      accountType: initialData?.accountType || 'current',
      panNumber: initialData?.panNumber || '',
      gstNumber: initialData?.gstNumber || '',
      gstRegistered: initialData?.gstRegistered ?? false,
      aadharNumber: initialData?.aadharNumber || '',
      taxFilingFrequency: initialData?.taxFilingFrequency || 'quarterly',
      estimatedMonthlyRevenue: initialData?.estimatedMonthlyRevenue || 0,
    },
  });

  const gstRegistered = watch('gstRegistered');
  const accountNumber = watch('accountNumber');
  const ifscCode = watch('ifscCode');

  // Watch all fields for validation
  React.useEffect(() => {
    const subscription = watch((value) => {
      onValidate?.(value as Partial<BankDetailsStep>);
    });
    return () => subscription.unsubscribe();
  }, [watch, onValidate]);

  // Validate IFSC code format
  const validateIFSC = (value: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(value) || 'Invalid IFSC code format';
  };

  // Validate PAN format
  const validatePAN = (value: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(value) || 'Invalid PAN format';
  };

  // Validate GST format
  const validateGST = (value: string) => {
    if (!value) return true; // Optional if not registered
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(value) || 'Invalid GST number format';
  };

  // Validate Aadhar format
  const validateAadhar = (value: string) => {
    if (!value) return true; // Optional
    const aadharRegex = /^[0-9]{12}$/;
    return aadharRegex.test(value) || 'Aadhar must be 12 digits';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Security Notice */}
      <View style={[styles.securityNotice, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.securityText, { color: colors.textSecondary }]}>
          🔒 Your bank details are encrypted and securely stored. We never share this
          information with third parties.
        </Text>
      </View>

      {/* Bank Account Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bank Account Information
        </Text>

        <FormInput
          name="accountHolderName"
          control={control}
          label="Account Holder Name"
          placeholder="Enter name as per bank records"
          rules={{
            required: 'Account holder name is required',
            minLength: {
              value: 3,
              message: 'Name must be at least 3 characters',
            },
          }}
          icon="person"
          autoCapitalize="words"
          testID="account-holder-input"
        />

        <FormSelect
          name="accountType"
          control={control}
          label="Account Type"
          placeholder="Select account type"
          options={ACCOUNT_TYPES}
          rules={{ required: 'Account type is required' }}
          testID="account-type-select"
        />

        <FormInput
          name="accountNumber"
          control={control}
          label="Account Number"
          placeholder="Enter account number"
          keyboardType="numeric"
          rules={{
            required: 'Account number is required',
            minLength: {
              value: 9,
              message: 'Account number must be at least 9 digits',
            },
            maxLength: {
              value: 18,
              message: 'Account number cannot exceed 18 digits',
            },
          }}
          icon="card"
          secureTextEntry
          testID="account-number-input"
        />

        <FormInput
          name="confirmAccountNumber"
          control={control}
          label="Confirm Account Number"
          placeholder="Re-enter account number"
          keyboardType="numeric"
          rules={{
            required: 'Please confirm account number',
            validate: (value) =>
              value === accountNumber || 'Account numbers do not match',
          }}
          icon="card"
          secureTextEntry
          testID="confirm-account-number-input"
        />

        <FormInput
          name="bankName"
          control={control}
          label="Bank Name"
          placeholder="Enter bank name"
          rules={{ required: 'Bank name is required' }}
          icon="business"
          autoCapitalize="words"
          testID="bank-name-input"
        />

        <FormInput
          name="branchName"
          control={control}
          label="Branch Name"
          placeholder="Enter branch name"
          rules={{ required: 'Branch name is required' }}
          icon="location"
          autoCapitalize="words"
          testID="branch-name-input"
        />

        <FormInput
          name="ifscCode"
          control={control}
          label="IFSC Code"
          placeholder="Enter IFSC code"
          autoCapitalize="characters"
          rules={{
            required: 'IFSC code is required',
            validate: validateIFSC,
          }}
          icon="code"
          maxLength={11}
          helperText="11-character code (e.g., SBIN0001234)"
          testID="ifsc-code-input"
        />
      </View>

      {/* Tax Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Tax Information
        </Text>

        <FormInput
          name="panNumber"
          control={control}
          label="PAN Number"
          placeholder="Enter PAN number"
          autoCapitalize="characters"
          rules={{
            required: 'PAN number is required',
            validate: validatePAN,
          }}
          icon="document-text"
          maxLength={10}
          helperText="10-character PAN (e.g., ABCDE1234F)"
          testID="pan-number-input"
        />

        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              GST Registered
            </Text>
            <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
              Is your business registered for GST?
            </Text>
          </View>
          <Switch
            value={gstRegistered}
            onValueChange={(value) => setValue('gstRegistered', value)}
            trackColor={{ false: colors.borderMedium, true: colors.primary }}
            thumbColor="#FFFFFF"
            testID="gst-registered-switch"
          />
        </View>

        {gstRegistered && (
          <>
            <FormInput
              name="gstNumber"
              control={control}
              label="GST Number"
              placeholder="Enter GST number"
              autoCapitalize="characters"
              rules={{
                required: gstRegistered ? 'GST number is required' : false,
                validate: validateGST,
              }}
              icon="document"
              maxLength={15}
              helperText="15-character GSTIN"
              testID="gst-number-input"
            />

            <FormSelect
              name="taxFilingFrequency"
              control={control}
              label="Tax Filing Frequency"
              placeholder="Select filing frequency"
              options={TAX_FILING_FREQUENCIES}
              rules={{ required: 'Tax filing frequency is required' }}
              testID="tax-filing-select"
            />
          </>
        )}

        <FormInput
          name="aadharNumber"
          control={control}
          label="Aadhar Number (Optional)"
          placeholder="Enter 12-digit Aadhar number"
          keyboardType="numeric"
          rules={{ validate: validateAadhar }}
          icon="card"
          maxLength={12}
          secureTextEntry
          testID="aadhar-number-input"
        />
      </View>

      {/* Business Revenue */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Business Revenue
        </Text>

        <FormInput
          name="estimatedMonthlyRevenue"
          control={control}
          label="Estimated Monthly Revenue (₹)"
          placeholder="Enter estimated monthly revenue"
          keyboardType="numeric"
          rules={{
            min: { value: 0, message: 'Cannot be negative' },
          }}
          icon="cash"
          helperText="This helps us provide better service and analytics"
          testID="monthly-revenue-input"
        />
      </View>

      {/* Verification Note */}
      <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          ℹ️ All bank and tax details will be verified before account activation. Please
          ensure all information is accurate and matches your official documents.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  securityNotice: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default BankDetailsForm;
