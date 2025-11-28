import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FormInput from '@/components/forms/FormInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services';

interface ExportFilters {
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ExportField {
  id: string;
  label: string;
  selected: boolean;
}

interface ExportHistory {
  id: string;
  filename: string;
  date: string;
  format: 'csv' | 'excel';
  recordCount: number;
  status: 'completed' | 'failed' | 'processing';
}

export default function ProductExportScreen() {
  const { hasPermission } = useAuth();
  const { control } = useForm<ExportFilters>();

  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [showFieldSelection, setShowFieldSelection] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [fields, setFields] = useState<ExportField[]>([
    { id: 'name', label: 'Product Name', selected: true },
    { id: 'sku', label: 'SKU', selected: true },
    { id: 'description', label: 'Description', selected: true },
    { id: 'category', label: 'Category', selected: true },
    { id: 'price', label: 'Price', selected: true },
    { id: 'stock', label: 'Stock', selected: true },
    { id: 'status', label: 'Status', selected: true },
    { id: 'images', label: 'Images', selected: false },
    { id: 'tags', label: 'Tags', selected: false },
    { id: 'cashback', label: 'Cashback', selected: false },
    { id: 'weight', label: 'Weight', selected: false },
    { id: 'dimensions', label: 'Dimensions', selected: false },
    { id: 'brand', label: 'Brand', selected: false },
    { id: 'barcode', label: 'Barcode', selected: false },
    { id: 'createdAt', label: 'Created Date', selected: false },
    { id: 'updatedAt', label: 'Updated Date', selected: false },
  ]);

  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([
    {
      id: '1',
      filename: 'products_export_2025-11-17.csv',
      date: '2025-11-17 10:30',
      format: 'csv',
      recordCount: 1234,
      status: 'completed',
    },
    {
      id: '2',
      filename: 'products_export_2025-11-15.xlsx',
      date: '2025-11-15 14:20',
      format: 'excel',
      recordCount: 980,
      status: 'completed',
    },
  ]);

  // Check permission
  React.useEffect(() => {
    if (!hasPermission('products:export')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to export products.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  const toggleField = (fieldId: string) => {
    setFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, selected: !field.selected } : field
      )
    );
  };

  const selectAllFields = () => {
    setFields(prev => prev.map(field => ({ ...field, selected: true })));
  };

  const deselectAllFields = () => {
    setFields(prev => prev.map(field => ({ ...field, selected: false })));
  };

  const handleExport = async (filters: ExportFilters) => {
    const selectedFields = fields.filter(f => f.selected);

    if (selectedFields.length === 0) {
      Alert.alert('Error', 'Please select at least one field to export');
      return;
    }

    Alert.alert(
      'Confirm Export',
      `Export ${selectedFields.length} fields as ${exportFormat.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => performExport(filters),
        },
      ]
    );
  };

  const performExport = async (filters: ExportFilters) => {
    setLoading(true);

    try {
      // Prepare export request
      const exportRequest = {
        format: exportFormat,
        fields: fields.filter(f => f.selected).map(f => f.id),
        filters: {
          category: filters.category || undefined,
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      };

      console.log('Export request:', exportRequest);

      // In a real implementation, call the backend API
      // const result = await productsService.exportProducts(exportRequest.filters, exportRequest.format);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate download
      const filename = `products_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      const downloadUrl = `https://api.example.com/downloads/${filename}`;

      // Add to history
      const newHistoryItem: ExportHistory = {
        id: Date.now().toString(),
        filename,
        date: new Date().toLocaleString(),
        format: exportFormat,
        recordCount: 1234, // Mock count
        status: 'completed',
      };
      setExportHistory(prev => [newHistoryItem, ...prev]);

      // Download file
      if (Platform.OS === 'web') {
        // For web, create a download link
        Alert.alert(
          'Export Ready',
          'Your export is ready for download',
          [
            {
              text: 'Download',
              onPress: () => window.open(downloadUrl, '_blank'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        // For mobile, open the download URL
        Alert.alert(
          'Export Ready',
          'Your export is ready for download',
          [
            {
              text: 'Download',
              onPress: () => Linking.openURL(downloadUrl),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }

      Alert.alert('Success', `Export completed! ${filename}`);
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Error', error.message || 'Failed to export products');
    } finally {
      setLoading(false);
    }
  };

  const renderFormatSelection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Export Format</ThemedText>

      <View style={styles.formatOptions}>
        <TouchableOpacity
          style={[
            styles.formatOption,
            exportFormat === 'csv' && styles.formatOptionSelected,
          ]}
          onPress={() => setExportFormat('csv')}
        >
          <Ionicons
            name="document-text"
            size={32}
            color={exportFormat === 'csv' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={[
            styles.formatLabel,
            exportFormat === 'csv' && styles.formatLabelSelected,
          ]}>
            CSV
          </ThemedText>
          <ThemedText style={styles.formatDesc}>
            Comma-separated values
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.formatOption,
            exportFormat === 'excel' && styles.formatOptionSelected,
          ]}
          onPress={() => setExportFormat('excel')}
        >
          <Ionicons
            name="grid"
            size={32}
            color={exportFormat === 'excel' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={[
            styles.formatLabel,
            exportFormat === 'excel' && styles.formatLabelSelected,
          ]}>
            Excel
          </ThemedText>
          <ThemedText style={styles.formatDesc}>
            Microsoft Excel format
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Filters (Optional)</ThemedText>

      <FormInput
        name="category"
        control={control}
        label="Category"
        placeholder="All categories"
        icon="pricetag-outline"
      />

      <FormInput
        name="status"
        control={control}
        label="Status"
        placeholder="All statuses"
        icon="flag-outline"
      />

      <View style={styles.dateRange}>
        <View style={styles.dateField}>
          <FormInput
            name="dateFrom"
            control={control}
            label="Date From"
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
          />
        </View>

        <View style={styles.dateField}>
          <FormInput
            name="dateTo"
            control={control}
            label="Date To"
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
          />
        </View>
      </View>
    </View>
  );

  const renderFieldSelection = () => {
    if (!showFieldSelection) {
      return (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fieldToggle}
            onPress={() => setShowFieldSelection(true)}
          >
            <ThemedText style={styles.fieldToggleText}>
              Select Fields ({fields.filter(f => f.selected).length} selected)
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.fieldHeader}>
          <ThemedText style={styles.sectionTitle}>Select Fields</ThemedText>
          <TouchableOpacity onPress={() => setShowFieldSelection(false)}>
            <Ionicons name="chevron-up" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldActions}>
          <TouchableOpacity onPress={selectAllFields} style={styles.fieldAction}>
            <ThemedText style={styles.fieldActionText}>Select All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={deselectAllFields} style={styles.fieldAction}>
            <ThemedText style={styles.fieldActionText}>Deselect All</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldList}>
          {fields.map((field) => (
            <TouchableOpacity
              key={field.id}
              style={styles.fieldItem}
              onPress={() => toggleField(field.id)}
            >
              <Switch
                value={field.selected}
                onValueChange={() => toggleField(field.id)}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
              <ThemedText style={styles.fieldLabel}>{field.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderHistory = () => {
    if (!showHistory || exportHistory.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Export History</ThemedText>

        {exportHistory.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Ionicons
                name={item.format === 'csv' ? 'document-text' : 'grid'}
                size={24}
                color={Colors.light.primary}
              />
              <View style={styles.historyInfo}>
                <ThemedText style={styles.historyFilename}>{item.filename}</ThemedText>
                <ThemedText style={styles.historyDate}>{item.date}</ThemedText>
              </View>
              <View style={[
                styles.historyStatus,
                { backgroundColor: item.status === 'completed' ? Colors.light.success :
                                   item.status === 'processing' ? Colors.light.warning :
                                   Colors.light.destructive }
              ]}>
                <ThemedText style={styles.historyStatusText}>
                  {item.status}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={styles.historyCount}>
              {item.recordCount} records exported
            </ThemedText>

            {item.status === 'completed' && (
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download-outline" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.downloadButtonText}>Download Again</ThemedText>
              </TouchableOpacity>
            )}
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
        <ThemedText type="title" style={styles.title}>Export Products</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Format Selection */}
        {renderFormatSelection()}

        {/* Filters */}
        {renderFilters()}

        {/* Field Selection */}
        {renderFieldSelection()}

        {/* Export Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.exportButton, loading && styles.exportButtonDisabled]}
            onPress={control.handleSubmit(handleExport)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.light.background} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={Colors.light.background} />
                <ThemedText style={styles.exportButtonText}>Export Products</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* History Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <ThemedText style={styles.historyToggleText}>
              {showHistory ? 'Hide' : 'Show'} Export History
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
  placeholder: {
    width: 32,
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
  formatOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  formatOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
  },
  formatLabelSelected: {
    color: Colors.light.primary,
  },
  formatDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  dateRange: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  fieldToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  fieldToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fieldAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
  },
  fieldActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  fieldList: {
    gap: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  exportButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
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
    gap: 12,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyFilename: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
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
  historyCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
});
