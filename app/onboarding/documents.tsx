/**
 * Documents Upload Screen (Step 4)
 * Allows merchants to upload required documents with progress tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { onboardingService } from '../../services/api/onboarding';
import { DocumentUpload } from '../../types/onboarding';

interface DocumentTypeConfig {
  type: 'pan_card' | 'aadhar' | 'gst_certificate' | 'bank_statement' | 'business_license' | 'utility_bill' | 'other';
  label: string;
  description: string;
  isRequired: boolean;
  icon: string;
}

const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    type: 'pan_card',
    label: 'PAN Card',
    description: 'Business or individual PAN card',
    isRequired: true,
    icon: 'card-outline',
  },
  {
    type: 'aadhar',
    label: 'Aadhar Card',
    description: 'Owner\'s Aadhar card (front & back)',
    isRequired: true,
    icon: 'id-card-outline',
  },
  {
    type: 'gst_certificate',
    label: 'GST Certificate',
    description: 'GST registration certificate',
    isRequired: false,
    icon: 'document-text-outline',
  },
  {
    type: 'bank_statement',
    label: 'Bank Statement',
    description: 'Last 3 months bank statement',
    isRequired: false,
    icon: 'receipt-outline',
  },
  {
    type: 'business_license',
    label: 'Business License',
    description: 'Trade license or registration',
    isRequired: false,
    icon: 'briefcase-outline',
  },
  {
    type: 'utility_bill',
    label: 'Utility Bill',
    description: 'Address proof (electricity/water)',
    isRequired: false,
    icon: 'home-outline',
  },
  {
    type: 'other',
    label: 'Other Documents',
    description: 'Any additional documents',
    isRequired: false,
    icon: 'folder-outline',
  },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadExistingDocuments();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload documents.'
        );
      }
    }
  };

  const loadExistingDocuments = async () => {
    try {
      setLoading(true);
      const result = await onboardingService.getDocuments();
      setDocuments(result.documents || []);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async (
    documentType: DocumentTypeConfig['type']
  ) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const uploadDocument = async (
    type: DocumentTypeConfig['type'],
    fileUri: string
  ) => {
    try {
      setUploadingTypes(prev => new Set(prev).add(type));
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));

      const result = await onboardingService.uploadDocument(
        type,
        fileUri,
        undefined,
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [type]: progress }));
        }
      );

      // Update documents list
      const existingIndex = documents.findIndex(doc => doc.type === type);
      const newDocument: DocumentUpload = {
        type,
        fileUrl: result.fileUrl,
        fileName: result.documentId,
        uploadedAt: result.uploadedAt,
        verificationStatus: result.verificationStatus,
        uploadProgress: 100,
      };

      if (existingIndex >= 0) {
        const updatedDocs = [...documents];
        updatedDocs[existingIndex] = newDocument;
        setDocuments(updatedDocs);
      } else {
        setDocuments([...documents, newDocument]);
      }

      Alert.alert('Success', `${type.replace('_', ' ')} uploaded successfully!`);
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
    } finally {
      setUploadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[type];
        return newProgress;
      });
    }
  };

  const deleteDocument = async (documentType: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const index = documents.findIndex(doc => doc.type === documentType);
              if (index >= 0) {
                await onboardingService.deleteDocument(index);
                setDocuments(documents.filter((_, i) => i !== index));
                Alert.alert('Success', 'Document deleted successfully');
              }
            } catch (error: any) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const getDocumentStatus = (type: string) => {
    return documents.find(doc => doc.type === type);
  };

  const isRequiredDocumentsUploaded = () => {
    const requiredTypes = DOCUMENT_TYPES.filter(dt => dt.isRequired).map(dt => dt.type);
    const uploadedTypes = documents.map(doc => doc.type);
    return requiredTypes.every(type => uploadedTypes.includes(type));
  };

  const handleNext = async () => {
    if (!isRequiredDocumentsUploaded()) {
      Alert.alert(
        'Required Documents',
        'Please upload all required documents (PAN Card and Aadhar Card) before proceeding.'
      );
      return;
    }

    try {
      setLoading(true);

      // Submit step 4 data
      await onboardingService.submitStep(4, {
        documents,
      });

      // Navigate to review screen
      router.push('/onboarding/review-submit');
    } catch (error: any) {
      console.error('Failed to save documents:', error);
      Alert.alert('Error', error.message || 'Failed to save documents');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderDocumentCard = (docType: DocumentTypeConfig) => {
    const uploadedDoc = getDocumentStatus(docType.type);
    const isUploading = uploadingTypes.has(docType.type);
    const progress = uploadProgress[docType.type] || 0;

    return (
      <View key={docType.type} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Ionicons name={docType.icon as any} size={24} color="#3B82F6" />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentLabel}>
              {docType.label}
              {docType.isRequired && <Text style={styles.requiredBadge}> *Required</Text>}
            </Text>
            <Text style={styles.documentDescription}>{docType.description}</Text>
          </View>
        </View>

        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        ) : uploadedDoc ? (
          <View style={styles.uploadedContainer}>
            <View style={styles.uploadedInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.uploadedText}>Uploaded</Text>
              {uploadedDoc.verificationStatus && (
                <Text
                  style={[
                    styles.verificationBadge,
                    uploadedDoc.verificationStatus === 'verified' && styles.verifiedBadge,
                    uploadedDoc.verificationStatus === 'rejected' && styles.rejectedBadge,
                  ]}
                >
                  {uploadedDoc.verificationStatus}
                </Text>
              )}
            </View>
            <View style={styles.uploadedActions}>
              <TouchableOpacity
                onPress={() => pickDocument(docType.type)}
                style={styles.iconButton}
              >
                <Ionicons name="refresh-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteDocument(docType.type)}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickDocument(docType.type)}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepText}>Step 4 of 5</Text>
          <Text style={styles.title}>Upload Documents</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: '80%' }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Please upload the following documents to verify your business
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              All documents will be securely stored and used only for verification purposes
            </Text>
          </View>

          {loading && documents.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : (
            <View style={styles.documentsContainer}>
              {DOCUMENT_TYPES.map(docType => renderDocumentCard(docType))}
            </View>
          )}

          <View style={styles.uploadStatsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{documents.length}</Text>
              <Text style={styles.statLabel}>Uploaded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {DOCUMENT_TYPES.filter(dt => dt.isRequired).length}
              </Text>
              <Text style={styles.statLabel}>Required</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{DOCUMENT_TYPES.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backFooterButton}
          onPress={handleBack}
          disabled={loading}
        >
          <Text style={styles.backFooterButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isRequiredDocumentsUploaded() || loading) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isRequiredDocumentsUploaded() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    backgroundColor: '#3B82F6',
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
    marginBottom: 16,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  documentsContainer: {
    gap: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  documentDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  uploadingContainer: {
    paddingTop: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  uploadedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  verificationBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  uploadedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  uploadStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
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
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
