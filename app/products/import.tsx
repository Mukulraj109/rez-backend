import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services';

interface ImportError {
  line: number;
  field: string;
  message: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: ImportError[];
  totalProcessed: number;
}

interface ImportHistory {
  id: string;
  filename: string;
  date: string;
  successful: number;
  failed: number;
  status: 'completed' | 'failed' | 'partial';
}

export default function ProductImportScreen() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([
    {
      id: '1',
      filename: 'products_batch_1.csv',
      date: '2025-11-15 14:30',
      successful: 245,
      failed: 5,
      status: 'partial',
    },
    {
      id: '2',
      filename: 'products_batch_2.xlsx',
      date: '2025-11-14 10:15',
      successful: 500,
      failed: 0,
      status: 'completed',
    },
  ]);

  // Check permission
  React.useEffect(() => {
    if (!hasPermission('products:bulk_import')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to import products.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  const handleDownloadTemplate = async () => {
    try {
      Alert.alert(
        'Download Template',
        'Choose template format:',
        [
          {
            text: 'CSV',
            onPress: () => downloadTemplate('csv'),
          },
          {
            text: 'Excel',
            onPress: () => downloadTemplate('excel'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Download template error:', error);
      Alert.alert('Error', 'Failed to download template');
    }
  };

  const downloadTemplate = async (format: 'csv' | 'excel') => {
    try {
      setLoading(true);

      // In a real implementation, this would call the backend API
      const templateUrl = `https://api.example.com/merchant/products/template?format=${format}`;

      if (Platform.OS === 'web') {
        window.open(templateUrl, '_blank');
      } else {
        await Linking.openURL(templateUrl);
      }

      Alert.alert('Success', 'Template download started');
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', error.message || 'Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setImportResult(null);
        Alert.alert('File Selected', `${file.name} is ready to import`);
      }
    } catch (error: any) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const validateFile = (file: DocumentPicker.DocumentPickerAsset): boolean => {
    // Check file size (max 50MB)
    if (file.size && file.size > 50 * 1024 * 1024) {
      Alert.alert('Error', 'File size must be less than 50MB');
      return false;
    }

    // Check file type
    const validTypes = ['.csv', '.xls', '.xlsx'];
    const hasValidExtension = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      Alert.alert('Error', 'Please select a CSV or Excel file');
      return false;
    }

    return true;
  };

  const handleImport = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    if (!validateFile(selectedFile)) {
      return;
    }

    Alert.alert(
      'Confirm Import',
      `Are you sure you want to import products from ${selectedFile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => performImport(),
        },
      ]
    );
  };

  const performImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // For web, we need to handle File differently
      if (Platform.OS === 'web' && selectedFile.uri.startsWith('blob:')) {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name);
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any);
      }

      // Simulate progress for demo
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // In a real implementation, call the backend API
      // const result = await productsService.importProducts(formData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      clearInterval(progressInterval);
      setImportProgress(100);

      // Simulate result
      const mockResult: ImportResult = {
        successful: 245,
        failed: 5,
        totalProcessed: 250,
        errors: [
          { line: 12, field: 'price', message: 'Invalid price format' },
          { line: 45, field: 'sku', message: 'SKU already exists' },
          { line: 78, field: 'category', message: 'Category not found' },
          { line: 120, field: 'name', message: 'Product name is required' },
          { line: 203, field: 'price', message: 'Price must be greater than 0' },
        ],
      };

      setImportResult(mockResult);

      // Add to history
      const newHistoryItem: ImportHistory = {
        id: Date.now().toString(),
        filename: selectedFile.name,
        date: new Date().toLocaleString(),
        successful: mockResult.successful,
        failed: mockResult.failed,
        status: mockResult.failed > 0 ? 'partial' : 'completed',
      };
      setImportHistory(prev => [newHistoryItem, ...prev]);

      if (mockResult.failed === 0) {
        Alert.alert('Success', `Successfully imported ${mockResult.successful} products!`);
      } else {
        Alert.alert(
          'Import Completed',
          `${mockResult.successful} products imported successfully. ${mockResult.failed} products failed. Please review the errors below.`
        );
      }
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert('Error', error.message || 'Failed to import products');

      setImportResult({
        successful: 0,
        failed: 0,
        totalProcessed: 0,
        errors: [{ line: 0, field: 'general', message: error.message || 'Import failed' }],
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const renderFileSelection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Select File</ThemedText>

      {selectedFile ? (
        <View style={styles.selectedFile}>
          <Ionicons name="document" size={40} color={Colors.light.primary} />
          <View style={styles.fileInfo}>
            <ThemedText style={styles.fileName}>{selectedFile.name}</ThemedText>
            <ThemedText style={styles.fileSize}>
              {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Unknown size'}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={() => setSelectedFile(null)}>
            <Ionicons name="close-circle" size={24} color={Colors.light.destructive} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadArea} onPress={handleSelectFile}>
          <Ionicons name="cloud-upload-outline" size={48} color={Colors.light.textSecondary} />
          <ThemedText style={styles.uploadText}>Tap to select file</ThemedText>
          <ThemedText style={styles.uploadHint}>
            CSV or Excel files only (Max 50MB)
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderProgress = () => {
    if (!isImporting && importProgress === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Import Progress</ThemedText>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${importProgress}%` }]} />
          </View>
          <ThemedText style={styles.progressText}>{importProgress}%</ThemedText>
        </View>

        {isImporting && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Processing products...</ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderResults = () => {
    if (!importResult) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Import Results</ThemedText>

        <View style={styles.resultsSummary}>
          <View style={styles.resultItem}>
            <ThemedText style={styles.resultLabel}>Total Processed</ThemedText>
            <ThemedText style={styles.resultValue}>{importResult.totalProcessed}</ThemedText>
          </View>

          <View style={styles.resultItem}>
            <ThemedText style={styles.resultLabel}>Successful</ThemedText>
            <ThemedText style={[styles.resultValue, { color: Colors.light.success }]}>
              {importResult.successful}
            </ThemedText>
          </View>

          <View style={styles.resultItem}>
            <ThemedText style={styles.resultLabel}>Failed</ThemedText>
            <ThemedText style={[styles.resultValue, { color: Colors.light.destructive }]}>
              {importResult.failed}
            </ThemedText>
          </View>
        </View>

        {importResult.errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <ThemedText style={styles.errorsTitle}>
              Errors ({importResult.errors.length})
            </ThemedText>

            {importResult.errors.map((error, index) => (
              <View key={index} style={styles.errorItem}>
                <View style={styles.errorHeader}>
                  <Ionicons name="warning" size={16} color={Colors.light.destructive} />
                  <ThemedText style={styles.errorLine}>Line {error.line}</ThemedText>
                  <ThemedText style={styles.errorField}>{error.field}</ThemedText>
                </View>
                <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHistory = () => {
    if (!showHistory || importHistory.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Import History</ThemedText>

        {importHistory.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <ThemedText style={styles.historyFilename}>{item.filename}</ThemedText>
              <View style={[
                styles.historyStatus,
                { backgroundColor: item.status === 'completed' ? Colors.light.success :
                                   item.status === 'partial' ? Colors.light.warning :
                                   Colors.light.destructive }
              ]}>
                <ThemedText style={styles.historyStatusText}>
                  {item.status}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={styles.historyDate}>{item.date}</ThemedText>

            <View style={styles.historyStats}>
              <ThemedText style={styles.historySuccess}>
                ✓ {item.successful} successful
              </ThemedText>
              {item.failed > 0 && (
                <ThemedText style={styles.historyFailed}>
                  ✗ {item.failed} failed
                </ThemedText>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Import Products</ThemedText>
        <TouchableOpacity onPress={handleDownloadTemplate}>
          <Ionicons name="download-outline" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.light.info} />
            <ThemedText style={styles.instructionsTitle}>Instructions</ThemedText>
          </View>

          <View style={styles.instructionsList}>
            <ThemedText style={styles.instructionItem}>
              1. Download the CSV/Excel template
            </ThemedText>
            <ThemedText style={styles.instructionItem}>
              2. Fill in your product data
            </ThemedText>
            <ThemedText style={styles.instructionItem}>
              3. Upload the completed file
            </ThemedText>
            <ThemedText style={styles.instructionItem}>
              4. Review validation results
            </ThemedText>
            <ThemedText style={styles.instructionItem}>
              5. Fix any errors and re-import if needed
            </ThemedText>
          </View>
        </View>

        {/* Download Template */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.templateButton}
            onPress={handleDownloadTemplate}
            disabled={loading}
          >
            <Ionicons name="download" size={20} color={Colors.light.background} />
            <ThemedText style={styles.templateButtonText}>
              Download Template
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* File Selection */}
        {renderFileSelection()}

        {/* Progress */}
        {renderProgress()}

        {/* Results */}
        {renderResults()}

        {/* Import Button */}
        {selectedFile && !isImporting && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.importButton, isImporting && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color={Colors.light.background} />
                  <ThemedText style={styles.importButtonText}>Start Import</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* History Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <ThemedText style={styles.historyToggleText}>
              {showHistory ? 'Hide' : 'Show'} Import History
            </ThemedText>
            <Ionicons
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.light.primary}
            />
          </TouchableOpacity>
        </View>

        {/* History */}
        {renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.light.background,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  templateButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  templateButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  fileSize: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    minWidth: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultsSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  resultItem: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  errorsContainer: {
    marginTop: 16,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  errorItem: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.destructive,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  errorLine: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.destructive,
  },
  errorField: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 24,
  },
  importButton: {
    backgroundColor: Colors.light.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  historyToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyItem: {
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyFilename: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.background,
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  historySuccess: {
    fontSize: 12,
    color: Colors.light.success,
  },
  historyFailed: {
    fontSize: 12,
    color: Colors.light.destructive,
  },
});
