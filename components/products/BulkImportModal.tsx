/**
 * BulkImportModal Component
 * File upload modal for bulk variant import with progress tracking
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImportResult {
  success: number;
  failed: number;
  total: number;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult>;
  templateUrl?: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose,
  onImport,
  templateUrl = '/templates/variant-import-template.csv',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setResult(null);
      }
    };

    input.click();
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      setProgress(10);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const importResult = await onImport(selectedFile);

      clearInterval(progressInterval);
      setProgress(100);
      setResult(importResult);
      setImporting(false);
    } catch (error) {
      console.error('Import failed:', error);
      setImporting(false);
      setResult({
        success: 0,
        failed: 0,
        total: 0,
        errors: [{
          row: 0,
          field: 'general',
          message: error instanceof Error ? error.message : 'Import failed',
        }],
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    setImporting(false);
    onClose();
  };

  const handleDownloadTemplate = () => {
    // Create download link
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'variant-import-template.csv';
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={styles.backdrop}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Bulk Import Variants</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {!importing && !result && (
              <>
                {/* Instructions */}
                <View style={styles.instructions}>
                  <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
                  <View style={styles.instructionsText}>
                    <Text style={styles.instructionsTitle}>How to import</Text>
                    <Text style={styles.instructionsSubtitle}>
                      1. Download the template file{'\n'}
                      2. Fill in your variant data{'\n'}
                      3. Upload the completed file
                    </Text>
                  </View>
                </View>

                {/* Template Download */}
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={handleDownloadTemplate}
                >
                  <Ionicons name="download-outline" size={20} color="#3B82F6" />
                  <Text style={styles.templateButtonText}>Download Template</Text>
                </TouchableOpacity>

                {/* File Upload */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>Upload File</Text>
                  {selectedFile ? (
                    <View style={styles.fileInfo}>
                      <View style={styles.fileIcon}>
                        <Ionicons name="document-text" size={24} color="#3B82F6" />
                      </View>
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName}>{selectedFile.name}</Text>
                        <Text style={styles.fileSize}>
                          {formatFileSize(selectedFile.size)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedFile(null)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadArea}
                      onPress={handleFileSelect}
                    >
                      <Ionicons name="cloud-upload-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.uploadText}>Click to select file</Text>
                      <Text style={styles.uploadSubtext}>
                        Supports CSV, XLS, XLSX
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Import Button */}
                <TouchableOpacity
                  style={[
                    styles.importButton,
                    !selectedFile && styles.importButtonDisabled,
                  ]}
                  onPress={handleImport}
                  disabled={!selectedFile}
                >
                  <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                  <Text style={styles.importButtonText}>Import Variants</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Progress */}
            {importing && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.progressText}>Importing variants...</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentage}>{progress}%</Text>
              </View>
            )}

            {/* Results */}
            {result && (
              <View style={styles.resultContainer}>
                {result.success > 0 ? (
                  <>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                    </View>
                    <Text style={styles.resultTitle}>Import Successful!</Text>
                    <View style={styles.resultStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{result.success}</Text>
                        <Text style={styles.statLabel}>Imported</Text>
                      </View>
                      {result.failed > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, styles.statValueFailed]}>
                            {result.failed}
                          </Text>
                          <Text style={styles.statLabel}>Failed</Text>
                        </View>
                      )}
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{result.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.errorIcon}>
                      <Ionicons name="close-circle" size={64} color="#EF4444" />
                    </View>
                    <Text style={styles.resultTitle}>Import Failed</Text>
                    <Text style={styles.resultSubtitle}>
                      {result.errors?.length || 0} error(s) found
                    </Text>
                  </>
                )}

                {result.errors && result.errors.length > 0 && (
                  <View style={styles.errorsPreview}>
                    <Text style={styles.errorsTitle}>
                      Errors ({result.errors.length})
                    </Text>
                    {result.errors.slice(0, 3).map((error, index) => (
                      <View key={index} style={styles.errorItem}>
                        <Ionicons name="warning-outline" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>
                          Row {error.row}: {error.message}
                        </Text>
                      </View>
                    ))}
                    {result.errors.length > 3 && (
                      <Text style={styles.moreErrors}>
                        +{result.errors.length - 3} more errors
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleClose}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    padding: 16,
  },
  instructions: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  instructionsText: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  instructionsSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeButton: {
    padding: 4,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 16,
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statValueFailed: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorsPreview: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
  },
  moreErrors: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BulkImportModal;
