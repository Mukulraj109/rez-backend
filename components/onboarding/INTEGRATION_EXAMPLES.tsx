/**
 * Onboarding Components Integration Examples
 * Complete examples showing how to use onboarding components together
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import {
  WizardStepIndicator,
  BusinessInfoForm,
  StoreDetailsForm,
  BankDetailsForm,
  DocumentUploader,
  DocumentCard,
  ValidationErrorDisplay,
  ProgressTracker,
  AutoSaveIndicator,
} from './index';
import {
  BusinessInfoStep,
  StoreDetailsStep,
  BankDetailsStep,
  DocumentUpload,
  DocumentType,
} from '@/types/onboarding';

// =============================================================================
// Example 1: Complete Multi-Step Onboarding Flow
// =============================================================================

export const CompleteOnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfoStep>>();
  const [storeDetails, setStoreDetails] = useState<Partial<StoreDetailsStep>>();
  const [bankDetails, setBankDetails] = useState<Partial<BankDetailsStep>>();
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stepTitles = [
    'Business Information',
    'Store Details',
    'Bank Details',
    'Documents',
    'Review & Submit',
  ];

  const overallProgress = (completedSteps.length / 5) * 100;

  const handleAutoSave = async (data: any, step: number) => {
    setAutoSaveStatus('saving');
    setErrors({});

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to state
      if (step === 1) setBusinessInfo(data);
      if (step === 2) setStoreDetails(data);
      if (step === 3) setBankDetails(data);

      setAutoSaveStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      setAutoSaveStatus('error');
    }
  };

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Tracker */}
      <ProgressTracker
        currentStep={currentStep}
        totalSteps={5}
        overallProgress={overallProgress}
        completedSteps={completedSteps}
        variant="detailed"
        size="medium"
      />

      {/* Step Indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        totalSteps={5}
        stepTitles={stepTitles}
        completedSteps={completedSteps}
        variant="horizontal"
        showLabels={true}
      />

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <ValidationErrorDisplay errors={errors} />
      )}

      {/* Step Content */}
      <ScrollView style={styles.content}>
        {currentStep === 1 && (
          <BusinessInfoForm
            initialData={businessInfo}
            onSubmit={(data) => {
              setBusinessInfo(data);
              handleNext();
            }}
            onValidate={(data) => handleAutoSave(data, 1)}
          />
        )}

        {currentStep === 2 && (
          <StoreDetailsForm
            initialData={storeDetails}
            onSubmit={(data) => {
              setStoreDetails(data);
              handleNext();
            }}
            onValidate={(data) => handleAutoSave(data, 2)}
          />
        )}

        {currentStep === 3 && (
          <BankDetailsForm
            initialData={bankDetails}
            onSubmit={(data) => {
              setBankDetails(data);
              handleNext();
            }}
            onValidate={(data) => handleAutoSave(data, 3)}
          />
        )}
      </ScrollView>

      {/* Auto-Save Indicator */}
      <AutoSaveIndicator
        status={autoSaveStatus}
        lastSavedAt={lastSavedAt}
        position="bottom"
        showTimestamp={true}
        autoHide={true}
      />
    </SafeAreaView>
  );
};

// =============================================================================
// Example 2: Document Upload Screen
// =============================================================================

export const DocumentUploadScreen = () => {
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const documentTypes: DocumentType[] = [
    {
      id: 'pan',
      type: 'pan_card',
      label: 'PAN Card',
      description: 'Upload a clear photo of your PAN card',
      isRequired: true,
      maxSize: 5,
      acceptedFormats: ['image/*', 'application/pdf'],
    },
    {
      id: 'aadhar',
      type: 'aadhar',
      label: 'Aadhar Card',
      description: 'Upload both sides of your Aadhar card',
      isRequired: true,
      maxSize: 5,
      acceptedFormats: ['image/*', 'application/pdf'],
    },
    {
      id: 'gst',
      type: 'gst_certificate',
      label: 'GST Certificate',
      description: 'Upload GST registration certificate (if applicable)',
      isRequired: false,
      maxSize: 10,
      acceptedFormats: ['image/*', 'application/pdf'],
    },
    {
      id: 'bank',
      type: 'bank_statement',
      label: 'Bank Statement',
      description: 'Upload recent bank statement (last 3 months)',
      isRequired: true,
      maxSize: 10,
      acceptedFormats: ['image/*', 'application/pdf'],
    },
  ];

  const handleUploadComplete = (document: DocumentUpload) => {
    setDocuments([...documents, document]);
    // Remove error for this document type if exists
    const newErrors = { ...errors };
    delete newErrors[document.type];
    setErrors(newErrors);
  };

  const handleDelete = (type: string) => {
    setDocuments(documents.filter((d) => d.type !== type));
  };

  const uploadedCount = documents.length;
  const requiredCount = documentTypes.filter((dt) => dt.isRequired).length;
  const progress = (uploadedCount / documentTypes.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <ProgressTracker
        currentStep={4}
        totalSteps={5}
        overallProgress={progress}
        completedSteps={[1, 2, 3]}
        variant="default"
      />

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <ValidationErrorDisplay
          errors={errors}
          title="Please upload the following required documents:"
        />
      )}

      <ScrollView style={styles.content}>
        {documentTypes.map((docType) => {
          const existingDoc = documents.find((d) => d.type === docType.type);

          return (
            <View key={docType.id}>
              {existingDoc ? (
                <DocumentCard
                  document={existingDoc}
                  onDelete={() => handleDelete(docType.type)}
                  onPreview={() => Alert.alert('Preview', 'Opening document...')}
                  showActions={true}
                />
              ) : (
                <DocumentUploader
                  documentType={docType}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={(error) => {
                    setErrors({ ...errors, [docType.type]: error });
                  }}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

// =============================================================================
// Example 3: Progress Tracker Variants
// =============================================================================

export const ProgressTrackerVariants = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        {/* Default Variant */}
        <ProgressTracker
          currentStep={3}
          totalSteps={5}
          overallProgress={60}
          completedSteps={[1, 2]}
          variant="default"
          size="medium"
        />

        {/* Minimal Variant */}
        <ProgressTracker
          currentStep={3}
          totalSteps={5}
          overallProgress={60}
          completedSteps={[1, 2]}
          variant="minimal"
          size="small"
        />

        {/* Detailed Variant */}
        <ProgressTracker
          currentStep={3}
          totalSteps={5}
          overallProgress={60}
          completedSteps={[1, 2]}
          variant="detailed"
          size="large"
        />
      </View>
    </ScrollView>
  );
};

// =============================================================================
// Example 4: Step Indicator Variants
// =============================================================================

export const StepIndicatorVariants = () => {
  const stepTitles = ['Business', 'Store', 'Bank', 'Documents', 'Review'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        {/* Horizontal Variant */}
        <WizardStepIndicator
          currentStep={2}
          totalSteps={5}
          stepTitles={stepTitles}
          completedSteps={[1]}
          variant="horizontal"
          showLabels={true}
        />

        {/* Vertical Variant */}
        <WizardStepIndicator
          currentStep={2}
          totalSteps={5}
          stepTitles={stepTitles}
          completedSteps={[1]}
          variant="vertical"
          showLabels={true}
        />

        {/* Compact Mode */}
        <WizardStepIndicator
          currentStep={2}
          totalSteps={5}
          stepTitles={stepTitles}
          completedSteps={[1]}
          variant="horizontal"
          showLabels={false}
          compact={true}
        />
      </View>
    </ScrollView>
  );
};

// =============================================================================
// Example 5: Auto-Save with Forms
// =============================================================================

export const AutoSaveExample = () => {
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfoStep>>();

  const handleValidate = async (data: Partial<BusinessInfoStep>) => {
    setAutoSaveStatus('saving');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setBusinessInfo(data);
      setAutoSaveStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      setAutoSaveStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <BusinessInfoForm
          initialData={businessInfo}
          onSubmit={(data) => console.log('Submitted:', data)}
          onValidate={handleValidate}
        />
      </ScrollView>

      <AutoSaveIndicator
        status={autoSaveStatus}
        lastSavedAt={lastSavedAt}
        position="bottom"
        showTimestamp={true}
        autoHide={true}
        autoHideDuration={3000}
      />
    </SafeAreaView>
  );
};

// =============================================================================
// Example 6: Validation Error Display
// =============================================================================

export const ValidationErrorExample = () => {
  const errors = {
    'businessName': 'Business name is required',
    'ownerEmail': 'Invalid email format',
    'storeAddress.zipCode': 'ZIP code must be 6 digits',
  };

  const warnings = {
    'website': 'Adding a website URL is recommended',
    'socialMediaLinks.instagram': 'Instagram presence helps with marketing',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Default Display */}
      <ValidationErrorDisplay
        errors={errors}
        warnings={warnings}
      />

      {/* Scrollable */}
      <ValidationErrorDisplay
        errors={errors}
        scrollable={true}
      />

      {/* Compact Mode */}
      <ValidationErrorDisplay
        errors={errors}
        compact={true}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    gap: 24,
  },
});
