/**
 * Bank Details Screen - Onboarding Step 3/5
 * Collects bank account information and tax details (encrypted and secure)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../../components/forms/FormInput';
import { onboardingService } from '../../services/api/onboarding';
import { BankDetailsStep } from '../../types/onboarding';
import { Colors } from '../../constants/Colors';

// Define validation schema matching BankDetailsStep
const bankDetailsSchema = z.object({
  accountHolderName: z
    .string()
    .min(1, 'Account holder name is required')
    .min(3, 'Name must be at least 3 characters'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .regex(/^\d{9,18}$/, 'Account number must be 9-18 digits'),
  confirmAccountNumber: z
    .string()
    .min(1, 'Please confirm account number'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankCode: z.string().optional(),
  branchName: z.string().min(1, 'Branch name is required'),
  ifscCode: z
    .string()
    .min(1, 'IFSC code is required')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  accountType: z.enum(['savings', 'current', 'business'], {
    errorMap: () => ({ message: 'Please select an account type' }),
  }),
  panNumber: z
    .string()
    .min(1, 'PAN number is required')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  gstRegistered: z.boolean().default(false),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format')
    .optional()
    .or(z.literal('')),
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/, 'Aadhar number must be 12 digits')
    .optional()
    .or(z.literal('')),
  taxFilingFrequency: z.enum(['quarterly', 'monthly', 'annually']).optional(),
  estimatedMonthlyRevenue: z.number().min(0, 'Revenue cannot be negative').optional(),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: 'Account numbers do not match',
  path: ['confirmAccountNumber'],
}).refine((data) => !data.gstRegistered || (data.gstNumber && data.gstNumber.length > 0), {
  message: 'GST number is required when GST registered',
  path: ['gstNumber'],
});

type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;

const accountTypes = [
  { value: 'savings', label: 'Savings', icon: 'wallet-outline' },
  { value: 'current', label: 'Current', icon: 'briefcase-outline' },
  { value: 'business', label: 'Business', icon: 'business-outline' },
];

const taxFilingOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export default function BankDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<string>('savings');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [validatingIFSC, setValidatingIFSC] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<any>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      bankName: '',
      bankCode: '',
      branchName: '',
      ifscCode: '',
      accountType: 'savings',
      panNumber: '',
      gstRegistered: false,
      gstNumber: '',
      aadharNumber: '',
      taxFilingFrequency: 'quarterly',
      estimatedMonthlyRevenue: 0,
    },
  });

  const watchIFSC = watch('ifscCode');

  // Load existing data if available
  useEffect(() => {
    loadExistingData();
  }, []);

  // Validate IFSC code when it changes
  useEffect(() => {
    if (watchIFSC && watchIFSC.length === 11) {
      validateIFSCCode(watchIFSC);
    }
  }, [watchIFSC]);

  const loadExistingData = async () => {
    try {
      const status = await onboardingService.getOnboardingStatus();
      if (status.data.bankDetails) {
        const bankDetails = status.data.bankDetails;
        Object.keys(bankDetails).forEach((key) => {
          if (key !== 'confirmAccountNumber') {
            setValue(key as keyof BankDetailsFormData, (bankDetails as any)[key]);
          }
        });
        setValue('confirmAccountNumber', bankDetails.accountNumber);
        setSelectedAccountType(bankDetails.accountType);
        setGstRegistered(bankDetails.gstRegistered);
      }
    } catch (error) {
      console.error('Error loading bank details:', error);
    }
  };

  const validateIFSCCode = async (ifsc: string) => {
    try {
      setValidatingIFSC(true);
      const validation = onboardingService.validateIFSCCode(ifsc);
      if (validation.isValid) {
        // In real app, you would fetch bank details from an API
        setIfscDetails({
          bankName: 'Bank Name',
          branchName: 'Branch Name',
        });
      } else {
        setIfscDetails(null);
      }
    } catch (error) {
      console.error('IFSC validation error:', error);
    } finally {
      setValidatingIFSC(false);
    }
  };

  const onSubmit = async (data: BankDetailsFormData) => {
    try {
      setLoading(true);

      // Validate bank details
      const validation = await onboardingService.validateBankDetails(
        data.accountNumber,
        data.ifscCode,
        data.panNumber,
        data.gstNumber
      );

      if (!validation.ifscValid || !validation.accountNumberValid || !validation.panValid) {
        Alert.alert('Validation Error', 'Please check your bank details and try again');
        setLoading(false);
        return;
      }

      // Convert form data to BankDetailsStep
      const stepData: BankDetailsStep = {
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        confirmAccountNumber: data.confirmAccountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        branchName: data.branchName,
        ifscCode: data.ifscCode.toUpperCase(),
        accountType: data.accountType,
        panNumber: data.panNumber.toUpperCase(),
        gstNumber: data.gstNumber ? data.gstNumber.toUpperCase() : undefined,
        gstRegistered: data.gstRegistered,
        aadharNumber: data.aadharNumber,
        taxFilingFrequency: data.taxFilingFrequency,
        estimatedMonthlyRevenue: data.estimatedMonthlyRevenue,
      };

      // Submit step to API
      await onboardingService.submitStep(3, stepData);

      Alert.alert(
        'Success',
        'Bank details saved successfully! Proceed to document upload.',
        [{ text: 'Continue', onPress: () => router.push('/onboarding/documents') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepBar}>
        <View style={[styles.stepProgress, { width: '60%' }]} />
      </View>
      <Text style={styles.stepText}>Step 3 of 5</Text>
    </View>
  );

  const renderAccountTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.label}>Account Type *</Text>
      <View style={styles.optionsRow}>
        {accountTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              selectedAccountType === type.value && styles.typeCardSelected,
            ]}
            onPress={() => {
              setSelectedAccountType(type.value);
              setValue('accountType', type.value as any);
            }}
          >
            <Ionicons
              name={type.icon as any}
              size={24}
              color={
                selectedAccountType === type.value
                  ? Colors.light.primary
                  : Colors.light.textSecondary
              }
            />
            <Text
              style={[
                styles.typeText,
                selectedAccountType === type.value && styles.typeTextSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.accountType && (
        <Text style={styles.errorText}>{errors.accountType.message}</Text>
      )}
    </View>
  );

  const renderSecurityNotice = () => (
    <View style={styles.securityNotice}>
      <Ionicons name="shield-checkmark" size={24} color={Colors.light.success} />
      <View style={styles.securityTextContainer}>
        <Text style={styles.securityTitle}>Your data is secure</Text>
        <Text style={styles.securityDescription}>
          All sensitive information is encrypted and stored securely
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Details</Text>
        <View style={styles.placeholder} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderSecurityNotice()}

        <Text style={styles.pageTitle}>Bank Account Information</Text>
        <Text style={styles.pageDescription}>
          Provide your bank details for receiving payments
        </Text>

        <FormInput
          name="accountHolderName"
          control={control}
          label="Account Holder Name *"
          placeholder="As per bank records"
          icon="person-outline"
          autoCapitalize="words"
        />

        {renderAccountTypeSelector()}

        <FormInput
          name="accountNumber"
          control={control}
          label="Account Number *"
          placeholder="Enter account number"
          keyboardType="numeric"
          icon="card-outline"
          secureTextEntry
          helperText="9-18 digits"
        />

        <FormInput
          name="confirmAccountNumber"
          control={control}
          label="Confirm Account Number *"
          placeholder="Re-enter account number"
          keyboardType="numeric"
          icon="card-outline"
          secureTextEntry
        />

        <FormInput
          name="ifscCode"
          control={control}
          label="IFSC Code *"
          placeholder="SBIN0001234"
          icon="business-outline"
          autoCapitalize="characters"
          maxLength={11}
          helperText="11 character code (e.g., SBIN0001234)"
          rightIcon={validatingIFSC ? undefined : ifscDetails ? 'checkmark-circle' : undefined}
        />

        {ifscDetails && (
          <View style={styles.ifscDetails}>
            <Ionicons name="information-circle" size={20} color={Colors.light.info} />
            <View style={styles.ifscDetailsText}>
              <Text style={styles.ifscDetailsLabel}>Bank: {ifscDetails.bankName}</Text>
              <Text style={styles.ifscDetailsLabel}>Branch: {ifscDetails.branchName}</Text>
            </View>
          </View>
        )}

        <FormInput
          name="bankName"
          control={control}
          label="Bank Name *"
          placeholder="State Bank of India"
          icon="business-outline"
          autoCapitalize="words"
        />

        <FormInput
          name="branchName"
          control={control}
          label="Branch Name *"
          placeholder="Main Branch"
          icon="locate-outline"
          autoCapitalize="words"
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Tax Information</Text>

        <FormInput
          name="panNumber"
          control={control}
          label="PAN Number *"
          placeholder="ABCDE1234F"
          icon="document-text-outline"
          autoCapitalize="characters"
          maxLength={10}
          helperText="10 character PAN (e.g., ABCDE1234F)"
        />

        <View style={styles.gstSwitch}>
          <View style={styles.switchLabel}>
            <Ionicons name="receipt-outline" size={24} color={Colors.light.primary} />
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>GST Registered</Text>
              <Text style={styles.switchDescription}>
                Is your business registered under GST?
              </Text>
            </View>
          </View>
          <Switch
            value={gstRegistered}
            onValueChange={(value) => {
              setGstRegistered(value);
              setValue('gstRegistered', value);
            }}
            trackColor={{ false: Colors.light.borderMedium, true: Colors.light.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {gstRegistered && (
          <FormInput
            name="gstNumber"
            control={control}
            label="GST Number *"
            placeholder="22ABCDE1234F1Z5"
            icon="document-outline"
            autoCapitalize="characters"
            maxLength={15}
            helperText="15 character GSTIN"
          />
        )}

        <FormInput
          name="aadharNumber"
          control={control}
          label="Aadhar Number (Optional)"
          placeholder="123456789012"
          keyboardType="numeric"
          icon="card-outline"
          maxLength={12}
          secureTextEntry
          helperText="12 digit Aadhar number"
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Additional Information</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Tax Filing Frequency</Text>
          <View style={styles.optionsRow}>
            {taxFilingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  watch('taxFilingFrequency') === option.value && styles.optionChipSelected,
                ]}
                onPress={() => setValue('taxFilingFrequency', option.value as any)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    watch('taxFilingFrequency') === option.value && styles.optionChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormInput
          name="estimatedMonthlyRevenue"
          control={control}
          label="Estimated Monthly Revenue (Optional)"
          placeholder="100000"
          keyboardType="numeric"
          icon="trending-up-outline"
          helperText="Approximate monthly revenue in INR"
        />

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  stepIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
  },
  stepBar: {
    height: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stepProgress: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.light.success}15`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.light.success}30`,
  },
  securityTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginVertical: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.borderMedium,
    backgroundColor: Colors.light.background,
  },
  typeCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}10`,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
    marginTop: 6,
  },
  typeTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  ifscDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.light.info}10`,
    padding: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  ifscDetailsText: {
    marginLeft: 8,
    flex: 1,
  },
  ifscDetailsLabel: {
    fontSize: 13,
    color: Colors.light.text,
    marginBottom: 2,
  },
  gstSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.borderMedium,
    backgroundColor: Colors.light.background,
  },
  optionChipSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}10`,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
  },
  optionChipTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 6,
  },
  spacer: {
    height: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
