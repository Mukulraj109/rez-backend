/**
 * ExportConfigModal Component
 * Export configuration modal with format and field selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExportField {
  key: string;
  label: string;
  enabled: boolean;
  required?: boolean;
}

interface ExportConfig {
  format: 'csv' | 'excel';
  fields: string[];
  filters?: {
    status?: string[];
    hasStock?: boolean;
  };
}

interface ExportConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  availableFields?: ExportField[];
}

const DEFAULT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Variant Name', enabled: true, required: true },
  { key: 'sku', label: 'SKU', enabled: true, required: true },
  { key: 'attributes', label: 'Attributes', enabled: true },
  { key: 'price', label: 'Price', enabled: true },
  { key: 'salePrice', label: 'Sale Price', enabled: true },
  { key: 'stock', label: 'Stock Quantity', enabled: true },
  { key: 'status', label: 'Status', enabled: true },
  { key: 'weight', label: 'Weight', enabled: false },
  { key: 'dimensions', label: 'Dimensions', enabled: false },
  { key: 'image', label: 'Image URL', enabled: false },
  { key: 'createdAt', label: 'Created Date', enabled: false },
  { key: 'updatedAt', label: 'Updated Date', enabled: false },
];

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  visible,
  onClose,
  onExport,
  availableFields = DEFAULT_FIELDS,
}) => {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [fields, setFields] = useState<ExportField[]>(availableFields);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterHasStock, setFilterHasStock] = useState<boolean | undefined>(undefined);

  const toggleField = (key: string) => {
    const field = fields.find(f => f.key === key);
    if (field?.required) return;

    setFields(prev =>
      prev.map(f =>
        f.key === key ? { ...f, enabled: !f.enabled } : f
      )
    );
  };

  const toggleAllFields = () => {
    const allEnabled = fields.every(f => f.enabled || f.required);
    setFields(prev =>
      prev.map(f =>
        f.required ? f : { ...f, enabled: !allEnabled }
      )
    );
  };

  const toggleStatus = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExport = () => {
    const config: ExportConfig = {
      format,
      fields: fields.filter(f => f.enabled).map(f => f.key),
      filters: {
        ...(filterStatus.length > 0 && { status: filterStatus }),
        ...(filterHasStock !== undefined && { hasStock: filterHasStock }),
      },
    };

    onExport(config);
    onClose();
  };

  const enabledCount = fields.filter(f => f.enabled).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Export Configuration</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Format Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Export Format</Text>
              <View style={styles.formatButtons}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    format === 'csv' && styles.formatButtonActive,
                  ]}
                  onPress={() => setFormat('csv')}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color={format === 'csv' ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.formatButtonText,
                      format === 'csv' && styles.formatButtonTextActive,
                    ]}
                  >
                    CSV
                  </Text>
                  <Text style={styles.formatButtonSubtext}>
                    Comma-separated values
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    format === 'excel' && styles.formatButtonActive,
                  ]}
                  onPress={() => setFormat('excel')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={24}
                    color={format === 'excel' ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.formatButtonText,
                      format === 'excel' && styles.formatButtonTextActive,
                    ]}
                  >
                    Excel
                  </Text>
                  <Text style={styles.formatButtonSubtext}>
                    Microsoft Excel file
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Fields to Export ({enabledCount}/{fields.length})
                </Text>
                <TouchableOpacity onPress={toggleAllFields}>
                  <Text style={styles.toggleAllText}>
                    {fields.every(f => f.enabled || f.required)
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldsList}>
                {fields.map(field => (
                  <TouchableOpacity
                    key={field.key}
                    style={[
                      styles.fieldItem,
                      field.enabled && styles.fieldItemActive,
                      field.required && styles.fieldItemRequired,
                    ]}
                    onPress={() => toggleField(field.key)}
                    disabled={field.required}
                  >
                    <View style={styles.fieldLeft}>
                      <Ionicons
                        name={field.enabled ? 'checkbox' : 'checkbox-outline'}
                        size={20}
                        color={
                          field.required
                            ? '#9CA3AF'
                            : field.enabled
                              ? '#3B82F6'
                              : '#D1D5DB'
                        }
                      />
                      <Text
                        style={[
                          styles.fieldLabel,
                          field.enabled && styles.fieldLabelActive,
                        ]}
                      >
                        {field.label}
                      </Text>
                    </View>
                    {field.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filters (Optional)</Text>

              {/* Status Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterStatus.includes('active') && styles.filterChipActive,
                    ]}
                    onPress={() => toggleStatus('active')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus.includes('active') && styles.filterChipTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterStatus.includes('inactive') && styles.filterChipActive,
                    ]}
                    onPress={() => toggleStatus('inactive')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus.includes('inactive') && styles.filterChipTextActive,
                      ]}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stock Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Stock Status</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterHasStock === true && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilterHasStock(filterHasStock === true ? undefined : true)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterHasStock === true && styles.filterChipTextActive,
                      ]}
                    >
                      In Stock
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterHasStock === false && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilterHasStock(filterHasStock === false ? undefined : false)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterHasStock === false && styles.filterChipTextActive,
                      ]}
                    >
                      Out of Stock
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.exportButton,
                enabledCount === 0 && styles.exportButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={enabledCount === 0}
            >
              <Ionicons name="download" size={20} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>
                Export as {format.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  toggleAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  formatButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  formatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  formatButtonTextActive: {
    color: '#3B82F6',
  },
  formatButtonSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  fieldsList: {
    gap: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  fieldItemRequired: {
    backgroundColor: '#F3F4F6',
    opacity: 0.8,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  fieldLabelActive: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  requiredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#3B82F6',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ExportConfigModal;
