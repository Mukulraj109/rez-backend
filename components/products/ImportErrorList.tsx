/**
 * ImportErrorList Component
 * Display import errors with details and export capability
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ImportError {
  row: number;
  field: string;
  value?: string;
  message: string;
  severity?: 'error' | 'warning';
}

interface ImportErrorListProps {
  errors: ImportError[];
  onExportErrors?: () => void;
  maxHeight?: number;
}

const ImportErrorList: React.FC<ImportErrorListProps> = ({
  errors,
  onExportErrors,
  maxHeight = 400,
}) => {
  const errorCount = errors.filter(e => e.severity !== 'warning').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const getSeverityColor = (severity?: 'error' | 'warning') => {
    switch (severity) {
      case 'warning':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          icon: '#F59E0B',
        };
      case 'error':
      default:
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          icon: '#EF4444',
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning-outline" size={20} color="#EF4444" />
          <Text style={styles.headerTitle}>Import Errors</Text>
        </View>
        <View style={styles.headerStats}>
          {errorCount > 0 && (
            <View style={styles.statBadge}>
              <Text style={styles.errorStat}>{errorCount} Errors</Text>
            </View>
          )}
          {warningCount > 0 && (
            <View style={[styles.statBadge, styles.warningBadge]}>
              <Text style={styles.warningStat}>{warningCount} Warnings</Text>
            </View>
          )}
        </View>
      </View>

      {/* Export Button */}
      {onExportErrors && errors.length > 0 && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={onExportErrors}
        >
          <Ionicons name="download-outline" size={18} color="#3B82F6" />
          <Text style={styles.exportButtonText}>Export Error Report</Text>
        </TouchableOpacity>
      )}

      {/* Error List */}
      <ScrollView style={[styles.errorList, { maxHeight }]}>
        {errors.length > 0 ? (
          errors.map((error, index) => {
            const colors = getSeverityColor(error.severity);

            return (
              <View
                key={index}
                style={[
                  styles.errorItem,
                  { backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.errorHeader}>
                  <View style={styles.errorHeaderLeft}>
                    <Ionicons
                      name={
                        error.severity === 'warning'
                          ? 'warning-outline'
                          : 'close-circle-outline'
                      }
                      size={16}
                      color={colors.icon}
                    />
                    <Text style={[styles.errorRow, { color: colors.text }]}>
                      Row {error.row}
                    </Text>
                    <View style={styles.fieldBadge}>
                      <Text style={styles.fieldBadgeText}>{error.field}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          error.severity === 'warning' ? '#FEF3C7' : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color:
                            error.severity === 'warning' ? '#92400E' : '#991B1B',
                        },
                      ]}
                    >
                      {error.severity === 'warning' ? 'Warning' : 'Error'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.errorMessage, { color: colors.text }]}>
                  {error.message}
                </Text>

                {error.value && (
                  <View style={styles.valueContainer}>
                    <Text style={styles.valueLabel}>Value:</Text>
                    <Text style={styles.valueText} numberOfLines={1}>
                      {error.value}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyText}>No errors found</Text>
            <Text style={styles.emptySubtext}>
              All rows were imported successfully
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Summary */}
      {errors.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Total Issues:</Text>
            <Text style={styles.footerValue}>{errors.length}</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Errors:</Text>
            <Text style={[styles.footerValue, styles.footerError]}>
              {errorCount}
            </Text>
          </View>
          {warningCount > 0 && (
            <>
              <View style={styles.footerDivider} />
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Warnings:</Text>
                <Text style={[styles.footerValue, styles.footerWarning]}>
                  {warningCount}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningBadge: {
    backgroundColor: '#FEF3C7',
  },
  errorStat: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  warningStat: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  errorList: {
    padding: 12,
  },
  errorItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  errorRow: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fieldBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  valueText: {
    flex: 1,
    fontSize: 11,
    color: '#374151',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  footerError: {
    color: '#EF4444',
  },
  footerWarning: {
    color: '#F59E0B',
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
});

export default ImportErrorList;
