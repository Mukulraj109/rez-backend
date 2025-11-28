/**
 * Review & Submit Screen (Step 5)
 * Final review of all onboarding information before submission
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { onboardingService } from '../../services/api/onboarding';
import { OnboardingStatus } from '../../types/onboarding';

interface SectionData {
  title: string;
  icon: string;
  data: Array<{ label: string; value: string }>;
  editRoute?: string;
}

export default function ReviewSubmitScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingStatus | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToDataProcessing, setAgreedToDataProcessing] = useState(false);
  const [communicationConsent, setCommunicationConsent] = useState(false);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const data = await onboardingService.getOnboardingStatus();
      setOnboardingData(data);
    } catch (error: any) {
      console.error('Failed to load onboarding data:', error);
      Alert.alert('Error', 'Failed to load your information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSections = (): SectionData[] => {
    if (!onboardingData) return [];

    const sections: SectionData[] = [];

    // Business Information
    if (onboardingData.data.businessInfo) {
      const { businessInfo } = onboardingData.data;
      sections.push({
        title: 'Business Information',
        icon: 'business-outline',
        data: [
          { label: 'Business Name', value: businessInfo.businessName },
          { label: 'Owner Name', value: businessInfo.ownerName },
          { label: 'Email', value: businessInfo.ownerEmail },
          { label: 'Phone', value: businessInfo.ownerPhone },
          { label: 'Business Type', value: businessInfo.businessType.replace('_', ' ') },
          { label: 'Category', value: businessInfo.businessCategory },
          { label: 'Years in Business', value: String(businessInfo.yearsInBusiness) },
        ],
      });
    }

    // Store Details
    if (onboardingData.data.storeDetails) {
      const { storeDetails } = onboardingData.data;
      sections.push({
        title: 'Store Details',
        icon: 'storefront-outline',
        data: [
          { label: 'Store Name', value: storeDetails.storeName },
          { label: 'Store Type', value: storeDetails.storeType },
          {
            label: 'Address',
            value: `${storeDetails.storeAddress.street}, ${storeDetails.storeAddress.city}, ${storeDetails.storeAddress.state} ${storeDetails.storeAddress.zipCode}`
          },
          { label: 'Phone', value: storeDetails.storePhone },
          {
            label: 'Delivery Available',
            value: storeDetails.deliveryAvailable ? 'Yes' : 'No'
          },
        ],
      });
    }

    // Bank Details
    if (onboardingData.data.bankDetails) {
      const { bankDetails } = onboardingData.data;
      sections.push({
        title: 'Bank Details',
        icon: 'card-outline',
        data: [
          { label: 'Account Holder', value: bankDetails.accountHolderName },
          { label: 'Bank Name', value: bankDetails.bankName },
          { label: 'Branch', value: bankDetails.branchName },
          { label: 'IFSC Code', value: bankDetails.ifscCode },
          { label: 'Account Type', value: bankDetails.accountType },
          { label: 'PAN Number', value: bankDetails.panNumber },
          ...(bankDetails.gstRegistered && bankDetails.gstNumber
            ? [{ label: 'GST Number', value: bankDetails.gstNumber }]
            : []),
        ],
      });
    }

    // Documents
    if (onboardingData.data.documents) {
      const { documents } = onboardingData.data;
      sections.push({
        title: 'Uploaded Documents',
        icon: 'document-text-outline',
        data: documents.documents.map(doc => ({
          label: doc.type.replace('_', ' ').toUpperCase(),
          value: doc.verificationStatus || 'Pending verification',
        })),
      });
    }

    return sections;
  };

  const handleEdit = (section: SectionData) => {
    // Navigate back to appropriate step for editing
    Alert.alert(
      'Edit Information',
      'You will be redirected to edit this section. Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // Navigate to the appropriate screen based on section
            if (section.title === 'Business Information') {
              router.push('/onboarding/business-info' as any);
            } else if (section.title === 'Store Details') {
              router.push('/onboarding/store-details' as any);
            } else if (section.title === 'Bank Details') {
              router.push('/onboarding/bank-details' as any);
            } else if (section.title === 'Uploaded Documents') {
              router.push('/onboarding/documents');
            }
          },
        },
      ]
    );
  };

  const validateSubmission = (): boolean => {
    if (!agreedToTerms) {
      Alert.alert('Required', 'Please agree to Terms & Conditions');
      return false;
    }
    if (!agreedToPrivacy) {
      Alert.alert('Required', 'Please agree to Privacy Policy');
      return false;
    }
    if (!agreedToDataProcessing) {
      Alert.alert('Required', 'Please agree to Data Processing');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateSubmission()) return;

    Alert.alert(
      'Submit Application',
      'Are you sure you want to submit your onboarding application? You will not be able to make changes after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: submitOnboarding,
        },
      ]
    );
  };

  const submitOnboarding = async () => {
    if (!onboardingData) return;

    try {
      setSubmitting(true);

      const result = await onboardingService.submitCompleteOnboarding(
        onboardingData.data.businessInfo!,
        onboardingData.data.storeDetails!,
        onboardingData.data.bankDetails!,
        onboardingData.data.documents!,
        {
          agreedToTerms,
          agreedToPrivacy,
          agreedToDataProcessing,
          communicationConsent,
        }
      );

      // Navigate to pending approval screen
      router.replace('/onboarding/pending-approval');
    } catch (error: any) {
      console.error('Failed to submit onboarding:', error);
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit your application. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderSection = (section: SectionData) => (
    <View key={section.title} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIcon}>
            <Ionicons name={section.icon as any} size={20} color="#3B82F6" />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleEdit(section)}
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={18} color="#3B82F6" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionContent}>
        {section.data.map((item, index) => (
          <View key={index} style={styles.dataRow}>
            <Text style={styles.dataLabel}>{item.label}</Text>
            <Text style={styles.dataValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCheckbox = (
    label: string,
    value: boolean,
    onPress: () => void,
    linkText?: string,
    onLinkPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
      <View style={styles.checkboxLabelContainer}>
        <Text style={styles.checkboxLabel}>{label}</Text>
        {linkText && onLinkPress && (
          <TouchableOpacity onPress={onLinkPress}>
            <Text style={styles.checkboxLink}>{linkText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your information...</Text>
      </View>
    );
  }

  const sections = formatSections();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepText}>Step 5 of 5</Text>
          <Text style={styles.title}>Review & Submit</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Please review all your information before submitting
          </Text>

          {/* Sections */}
          {sections.map(section => renderSection(section))}

          {/* Terms & Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Legal Agreements</Text>

            {renderCheckbox(
              'I agree to the',
              agreedToTerms,
              () => setAgreedToTerms(!agreedToTerms),
              'Terms & Conditions',
              () => Alert.alert('Terms & Conditions', 'Terms & Conditions would open here')
            )}

            {renderCheckbox(
              'I agree to the',
              agreedToPrivacy,
              () => setAgreedToPrivacy(!agreedToPrivacy),
              'Privacy Policy',
              () => Alert.alert('Privacy Policy', 'Privacy Policy would open here')
            )}

            {renderCheckbox(
              'I agree to the',
              agreedToDataProcessing,
              () => setAgreedToDataProcessing(!agreedToDataProcessing),
              'Data Processing Agreement',
              () => Alert.alert('Data Processing', 'Data Processing Agreement would open here')
            )}

            {renderCheckbox(
              'I consent to receive communications about my account and services',
              communicationConsent,
              () => setCommunicationConsent(!communicationConsent)
            )}
          </View>

          <View style={styles.disclaimerBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <Text style={styles.disclaimerText}>
              Your information is secure and will only be used for verification purposes
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backFooterButton}
          onPress={handleBack}
          disabled={submitting}
        >
          <Text style={styles.backFooterButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!agreedToTerms || !agreedToPrivacy || !agreedToDataProcessing || submitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={
            !agreedToTerms || !agreedToPrivacy || !agreedToDataProcessing || submitting
          }
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Application</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  sectionContent: {
    gap: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  termsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginRight: 4,
  },
  checkboxLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backFooterButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
