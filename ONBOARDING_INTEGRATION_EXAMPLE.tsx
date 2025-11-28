/**
 * Onboarding Integration Example Component
 *
 * This file demonstrates how to integrate the onboarding service
 * into a React component with a complete 5-step wizard flow.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { onboardingService } from '@/services/api/onboarding';
import type {
  OnboardingStatus,
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentsStep,
  ReviewSubmitStep,
} from '@/types/onboarding';

/**
 * Main Onboarding Component
 * Handles the complete 5-step onboarding wizard
 */
export const OnboardingWizard: React.FC = () => {
  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form Data
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfoStep>>({});
  const [storeDetails, setStoreDetails] = useState<Partial<StoreDetailsStep>>({});
  const [bankDetails, setBankDetails] = useState<Partial<BankDetailsStep>>({});
  const [documents, setDocuments] = useState<DocumentsStep>({ documents: [] });
  const [reviewSubmit, setReviewSubmit] = useState<Partial<ReviewSubmitStep>>({});

  // Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * Initialize onboarding state on component mount
   */
  useEffect(() => {
    initializeOnboarding();
  }, []);

  /**
   * Auto-save current step data
   */
  useEffect(() => {
    if (currentStep === 1 && Object.keys(businessInfo).length > 0) {
      onboardingService.startAutoSave(1, businessInfo as BusinessInfoStep);
    } else if (currentStep === 2 && Object.keys(storeDetails).length > 0) {
      onboardingService.startAutoSave(2, storeDetails as StoreDetailsStep);
    } else if (currentStep === 3 && Object.keys(bankDetails).length > 0) {
      onboardingService.startAutoSave(3, bankDetails as BankDetailsStep);
    }

    return () => {
      onboardingService.stopAutoSave();
    };
  }, [currentStep, businessInfo, storeDetails, bankDetails]);

  /**
   * Load existing onboarding data
   */
  async function initializeOnboarding() {
    try {
      setLoading(true);
      const status = await onboardingService.getOnboardingStatus();

      setCurrentStep(status.currentStep);
      if (status.data.businessInfo) setBusinessInfo(status.data.businessInfo);
      if (status.data.storeDetails) setStoreDetails(status.data.storeDetails);
      if (status.data.bankDetails) setBankDetails(status.data.bankDetails);
      if (status.data.documents) setDocuments(status.data.documents);
      if (status.data.reviewSubmit) setReviewSubmit(status.data.reviewSubmit);
    } catch (err) {
      console.error('Failed to initialize onboarding:', err);
      // Allow user to continue anyway
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Step 1: Business Info Submission
   */
  async function handleBusinessInfoSubmit() {
    try {
      setError(null);
      setFormErrors({});

      // Validate
      const validation = onboardingService.validateBusinessInfo(
        businessInfo as BusinessInfoStep
      );

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        return;
      }

      // Submit
      setLoading(true);
      const result = await onboardingService.submitStep(
        1,
        businessInfo as BusinessInfoStep
      );

      Alert.alert('Success', 'Business information saved successfully');
      setCurrentStep(result.currentStep);
    } catch (err: any) {
      setError(err.message || 'Failed to submit business information');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Step 2: Store Details Submission
   */
  async function handleStoreDetailsSubmit() {
    try {
      setError(null);
      setFormErrors({});

      const validation = onboardingService.validateStoreDetails(
        storeDetails as StoreDetailsStep
      );

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        return;
      }

      setLoading(true);
      const result = await onboardingService.submitStep(
        2,
        storeDetails as StoreDetailsStep
      );

      Alert.alert('Success', 'Store details saved successfully');
      setCurrentStep(result.currentStep);
    } catch (err: any) {
      setError(err.message || 'Failed to submit store details');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Step 3: Bank Details Submission
   */
  async function handleBankDetailsSubmit() {
    try {
      setError(null);
      setFormErrors({});

      // Validate individual fields
      const gstValidation = onboardingService.validateGSTNumber(
        bankDetails.gstNumber || ''
      );
      const panValidation = onboardingService.validatePANNumber(
        bankDetails.panNumber || ''
      );
      const ifscValidation = onboardingService.validateIFSCCode(
        bankDetails.ifscCode || ''
      );
      const accountValidation = onboardingService.validateAccountNumber(
        bankDetails.accountNumber || '',
        bankDetails.confirmAccountNumber || ''
      );

      // Combine errors
      const errors = {
        ...gstValidation.errors,
        ...panValidation.errors,
        ...ifscValidation.errors,
        ...accountValidation.errors,
      };

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setLoading(true);
      const result = await onboardingService.submitStep(
        3,
        bankDetails as BankDetailsStep
      );

      Alert.alert('Success', 'Bank details saved successfully');
      setCurrentStep(result.currentStep);
    } catch (err: any) {
      setError(err.message || 'Failed to submit bank details');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Document Upload
   */
  async function handleDocumentUpload(fileUri: string, type: string) {
    try {
      setError(null);
      setUploadProgress(0);
      setLoading(true);

      const result = await onboardingService.uploadDocument(
        type as any,
        fileUri,
        undefined,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Add document to list
      const newDocuments: DocumentsStep = {
        ...documents,
        documents: [
          ...documents.documents,
          {
            type: type as any,
            fileUrl: result.fileUrl,
            uploadedAt: result.uploadedAt,
            verificationStatus: result.verificationStatus,
          },
        ],
      };

      setDocuments(newDocuments);
      Alert.alert('Success', `${type} document uploaded successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  /**
   * Handle Document Deletion
   */
  async function handleDeleteDocument(index: number) {
    try {
      setLoading(true);
      await onboardingService.deleteDocument(index);

      // Remove from local state
      const newDocuments = documents.documents.filter((_, i) => i !== index);
      setDocuments({ ...documents, documents: newDocuments });

      Alert.alert('Success', 'Document deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Final Submission
   */
  async function handleFinalSubmit() {
    try {
      setError(null);

      // Validate final step
      const validation = onboardingService.validateReviewSubmit(
        reviewSubmit as ReviewSubmitStep
      );

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        return;
      }

      setLoading(true);

      const result = await onboardingService.submitCompleteOnboarding(
        businessInfo as BusinessInfoStep,
        storeDetails as StoreDetailsStep,
        bankDetails as BankDetailsStep,
        documents,
        reviewSubmit as ReviewSubmitStep
      );

      Alert.alert(
        'Success',
        `Onboarding submitted! Your submission ID: ${result.submissionId}`
      );

      // Navigate to success screen
      // navigation.navigate('OnboardingSuccess', { submissionId: result.submissionId });
    } catch (err: any) {
      setError(err.message || 'Failed to submit onboarding');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle Previous Step Navigation
   */
  async function handlePreviousStep() {
    try {
      setLoading(true);
      const result = await onboardingService.goToPreviousStep(currentStep);
      setCurrentStep(result.previousStep);
    } catch (err: any) {
      setError(err.message || 'Failed to go to previous step');
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Step {currentStep} of 5: {getStepTitle(currentStep)}
        </Text>
        <View style={{ height: 6, backgroundColor: '#E8E8E8', borderRadius: 3 }}>
          <View
            style={{
              height: '100%',
              width: `${(currentStep / 5) * 100}%`,
              backgroundColor: '#007AFF',
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={{ backgroundColor: '#FEE', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ color: '#C00' }}>{error}</Text>
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {currentStep === 1 && <Step1BusinessInfo data={businessInfo} setData={setBusinessInfo} errors={formErrors} />}
        {currentStep === 2 && <Step2StoreDetails data={storeDetails} setData={setStoreDetails} errors={formErrors} />}
        {currentStep === 3 && <Step3BankDetails data={bankDetails} setData={setBankDetails} errors={formErrors} />}
        {currentStep === 4 && (
          <Step4Documents
            documents={documents}
            uploadProgress={uploadProgress}
            onUpload={handleDocumentUpload}
            onDelete={handleDeleteDocument}
          />
        )}
        {currentStep === 5 && (
          <Step5ReviewSubmit
            data={reviewSubmit}
            setData={setReviewSubmit}
            errors={formErrors}
          />
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={{ flex: 1, padding: 12, backgroundColor: '#E8E8E8', borderRadius: 8 }}
            onPress={handlePreviousStep}
            disabled={loading}
          >
            <Text style={{ textAlign: 'center', color: '#333' }}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => {
            if (currentStep === 1) handleBusinessInfoSubmit();
            else if (currentStep === 2) handleStoreDetailsSubmit();
            else if (currentStep === 3) handleBankDetailsSubmit();
            else if (currentStep === 4) setCurrentStep(5);
            else if (currentStep === 5) handleFinalSubmit();
          }}
          disabled={loading}
        >
          <Text style={{ textAlign: 'center', color: '#FFF', fontWeight: 'bold' }}>
            {currentStep === 5 ? 'Submit' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Helper Functions
 */

function getStepTitle(step: number): string {
  const titles = [
    'Business Information',
    'Store Details',
    'Bank Details',
    'Documents',
    'Review & Submit',
  ];
  return titles[step - 1] || '';
}

/**
 * Step Components
 */

const Step1BusinessInfo: React.FC<{
  data: Partial<BusinessInfoStep>;
  setData: (data: Partial<BusinessInfoStep>) => void;
  errors: Record<string, string>;
}> = ({ data, setData, errors }) => (
  <View>
    <FormInput
      label="Business Name"
      value={data.businessName || ''}
      onChange={(value) => setData({ ...data, businessName: value })}
      error={errors.businessName}
    />
    <FormInput
      label="Owner Name"
      value={data.ownerName || ''}
      onChange={(value) => setData({ ...data, ownerName: value })}
      error={errors.ownerName}
    />
    <FormInput
      label="Email"
      value={data.ownerEmail || ''}
      onChange={(value) => setData({ ...data, ownerEmail: value })}
      error={errors.ownerEmail}
    />
    <FormInput
      label="Phone"
      value={data.ownerPhone || ''}
      onChange={(value) => setData({ ...data, ownerPhone: value })}
      error={errors.ownerPhone}
    />
  </View>
);

const Step2StoreDetails: React.FC<{
  data: Partial<StoreDetailsStep>;
  setData: (data: Partial<StoreDetailsStep>) => void;
  errors: Record<string, string>;
}> = ({ data, setData, errors }) => (
  <View>
    <FormInput
      label="Store Name"
      value={data.storeName || ''}
      onChange={(value) => setData({ ...data, storeName: value })}
      error={errors.storeName}
    />
    <FormInput
      label="Street Address"
      value={data.storeAddress?.street || ''}
      onChange={(value) =>
        setData({
          ...data,
          storeAddress: { ...data.storeAddress!, street: value },
        })
      }
      error={errors.street}
    />
    <FormInput
      label="City"
      value={data.storeAddress?.city || ''}
      onChange={(value) =>
        setData({
          ...data,
          storeAddress: { ...data.storeAddress!, city: value },
        })
      }
      error={errors.city}
    />
  </View>
);

const Step3BankDetails: React.FC<{
  data: Partial<BankDetailsStep>;
  setData: (data: Partial<BankDetailsStep>) => void;
  errors: Record<string, string>;
}> = ({ data, setData, errors }) => (
  <View>
    <FormInput
      label="Account Holder Name"
      value={data.accountHolderName || ''}
      onChange={(value) => setData({ ...data, accountHolderName: value })}
      error={errors.accountHolderName}
    />
    <FormInput
      label="Account Number"
      value={data.accountNumber || ''}
      onChange={(value) => setData({ ...data, accountNumber: value })}
      error={errors.accountNumber}
    />
    <FormInput
      label="IFSC Code"
      value={data.ifscCode || ''}
      onChange={(value) => setData({ ...data, ifscCode: value })}
      error={errors.ifscCode}
    />
    <FormInput
      label="PAN Number"
      value={data.panNumber || ''}
      onChange={(value) => setData({ ...data, panNumber: value })}
      error={errors.panNumber}
    />
  </View>
);

const Step4Documents: React.FC<{
  documents: DocumentsStep;
  uploadProgress: number;
  onUpload: (fileUri: string, type: string) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}> = ({ documents, uploadProgress, onUpload, onDelete }) => (
  <View>
    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
      Uploaded Documents
    </Text>
    {documents.documents.map((doc, index) => (
      <View key={index} style={{ padding: 12, backgroundColor: '#F5F5F5', marginBottom: 8, borderRadius: 8 }}>
        <Text style={{ fontWeight: '600' }}>{doc.type}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>
          Status: {doc.verificationStatus || 'pending'}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(index)}
          style={{ marginTop: 8, padding: 8, backgroundColor: '#FEE', borderRadius: 4 }}
        >
          <Text style={{ color: '#C00', textAlign: 'center' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    ))}

    {uploadProgress > 0 && (
      <View style={{ marginTop: 12 }}>
        <Text>Upload Progress: {uploadProgress}%</Text>
        <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, marginTop: 4 }}>
          <View
            style={{
              height: '100%',
              width: `${uploadProgress}%`,
              backgroundColor: '#007AFF',
              borderRadius: 2,
            }}
          />
        </View>
      </View>
    )}
  </View>
);

const Step5ReviewSubmit: React.FC<{
  data: Partial<ReviewSubmitStep>;
  setData: (data: Partial<ReviewSubmitStep>) => void;
  errors: Record<string, string>;
}> = ({ data, setData, errors }) => (
  <View>
    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
      Review and Accept Terms
    </Text>

    <CheckboxField
      label="I agree to the Terms and Conditions"
      value={data.agreedToTerms || false}
      onChange={(value) => setData({ ...data, agreedToTerms: value })}
      error={errors.agreedToTerms}
    />

    <CheckboxField
      label="I agree to the Privacy Policy"
      value={data.agreedToPrivacy || false}
      onChange={(value) => setData({ ...data, agreedToPrivacy: value })}
      error={errors.agreedToPrivacy}
    />

    <CheckboxField
      label="I agree to the Data Processing Policy"
      value={data.agreedToDataProcessing || false}
      onChange={(value) => setData({ ...data, agreedToDataProcessing: value })}
      error={errors.agreedToDataProcessing}
    />
  </View>
);

/**
 * UI Components
 */

const FormInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontWeight: '600', marginBottom: 4 }}>{label}</Text>
    <TextInput
      style={{
        borderWidth: 1,
        borderColor: error ? '#C00' : '#DDD',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
      }}
      value={value}
      onChangeText={onChange}
    />
    {error && <Text style={{ color: '#C00', fontSize: 12, marginTop: 4 }}>{error}</Text>}
  </View>
);

const CheckboxField: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => (
  <View style={{ marginBottom: 12 }}>
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      onPress={() => onChange(!value)}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: error ? '#C00' : '#DDD',
          borderRadius: 4,
          backgroundColor: value ? '#007AFF' : 'transparent',
        }}
      />
      <Text style={{ color: error ? '#C00' : '#333' }}>{label}</Text>
    </TouchableOpacity>
    {error && <Text style={{ color: '#C00', fontSize: 12, marginTop: 4 }}>{error}</Text>}
  </View>
);

export default OnboardingWizard;
