import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuditLogFilters, AuditSeverity, AuditResourceType } from '../../types/audit';
import { useThemedStyles } from '../ui/ThemeProvider';

interface AuditFiltersProps {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
  onReset: () => void;
  testID?: string;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      gap: theme.spacing.sm,
    } as ViewStyle,
    section: {
      gap: theme.spacing.xs,
    } as ViewStyle,
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    activeFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    } as ViewStyle,
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.full,
      paddingVertical: 6,
      paddingHorizontal: 10,
      gap: 4,
    } as ViewStyle,
    activeChip: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    } as ViewStyle,
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    activeChipText: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    removeButton: {
      marginLeft: 4,
    } as ViewStyle,
    quickFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    } as ViewStyle,
    quickFilterButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    } as ViewStyle,
    activeQuickFilter: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    } as ViewStyle,
    quickFilterText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    activeQuickFilterText: {
      color: '#FFFFFF',
      fontWeight: theme.typography.fontWeight.medium,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.backgroundSecondary,
      marginTop: theme.spacing.sm,
    } as ViewStyle,
    resetButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
  }));

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.severity) count++;
    if (filters.resourceType) count++;
    if (filters.action) count++;
    if (filters.dateRange) count++;
    if (filters.search) count++;
    return count;
  };

  // Handle severity filter toggle
  const toggleSeverity = (severity: AuditSeverity) => {
    const currentSeverities = Array.isArray(filters.severity)
      ? filters.severity
      : filters.severity
      ? [filters.severity]
      : [];

    const newSeverities = currentSeverities.includes(severity)
      ? currentSeverities.filter((s) => s !== severity)
      : [...currentSeverities, severity];

    onFilterChange({
      ...filters,
      severity: newSeverities.length > 0 ? newSeverities : undefined,
    });
  };

  // Handle resource type filter toggle
  const toggleResourceType = (resourceType: AuditResourceType) => {
    const currentTypes = Array.isArray(filters.resourceType)
      ? filters.resourceType
      : filters.resourceType
      ? [filters.resourceType]
      : [];

    const newTypes = currentTypes.includes(resourceType)
      ? currentTypes.filter((t) => t !== resourceType)
      : [...currentTypes, resourceType];

    onFilterChange({
      ...filters,
      resourceType: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  // Handle date range quick filter
  const setDateRange = (
    range: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days'
  ) => {
    onFilterChange({
      ...filters,
      dateRange: filters.dateRange === range ? undefined : range,
    });
  };

  // Check if severity is active
  const isSeverityActive = (severity: AuditSeverity) => {
    if (!filters.severity) return false;
    return Array.isArray(filters.severity)
      ? filters.severity.includes(severity)
      : filters.severity === severity;
  };

  // Check if resource type is active
  const isResourceTypeActive = (resourceType: AuditResourceType) => {
    if (!filters.resourceType) return false;
    return Array.isArray(filters.resourceType)
      ? filters.resourceType.includes(resourceType)
      : filters.resourceType === resourceType;
  };

  // Remove filter chip
  const removeFilter = (filterType: string) => {
    const newFilters = { ...filters };
    delete newFilters[filterType as keyof AuditLogFilters];
    onFilterChange(newFilters);
  };

  const activeFiltersCount = getActiveFiltersCount();
  const severityOptions: AuditSeverity[] = ['critical', 'error', 'warning', 'info'];
  const resourceTypeOptions: AuditResourceType[] = [
    'product',
    'order',
    'user',
    'payment',
    'settings',
  ];
  const dateRangeOptions = [
    { label: 'Today', value: 'today' as const },
    { label: 'Yesterday', value: 'yesterday' as const },
    { label: 'Last 7 Days', value: 'last_7_days' as const },
    { label: 'Last 30 Days', value: 'last_30_days' as const },
  ];

  return (
    <View style={styles.container} testID={testID}>
      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Active Filters ({activeFiltersCount})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeFilters}
          >
            {filters.severity && (
              <View style={[styles.chip, styles.activeChip]}>
                <Text style={[styles.chipText, styles.activeChipText]}>
                  Severity: {Array.isArray(filters.severity) ? filters.severity.join(', ') : filters.severity}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFilter('severity')}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={14} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            )}
            {filters.resourceType && (
              <View style={[styles.chip, styles.activeChip]}>
                <Text style={[styles.chipText, styles.activeChipText]}>
                  Type: {Array.isArray(filters.resourceType) ? filters.resourceType.join(', ') : filters.resourceType}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFilter('resourceType')}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={14} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            )}
            {filters.dateRange && (
              <View style={[styles.chip, styles.activeChip]}>
                <Text style={[styles.chipText, styles.activeChipText]}>
                  Date: {filters.dateRange.replace(/_/g, ' ')}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFilter('dateRange')}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={14} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Severity Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Severity</Text>
        <View style={styles.quickFilters}>
          {severityOptions.map((severity) => (
            <TouchableOpacity
              key={severity}
              style={[
                styles.quickFilterButton,
                isSeverityActive(severity) && styles.activeQuickFilter,
              ]}
              onPress={() => toggleSeverity(severity)}
            >
              <Text
                style={[
                  styles.quickFilterText,
                  isSeverityActive(severity) && styles.activeQuickFilterText,
                ]}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Resource Type Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resource Type</Text>
        <View style={styles.quickFilters}>
          {resourceTypeOptions.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.quickFilterButton,
                isResourceTypeActive(type) && styles.activeQuickFilter,
              ]}
              onPress={() => toggleResourceType(type)}
            >
              <Text
                style={[
                  styles.quickFilterText,
                  isResourceTypeActive(type) && styles.activeQuickFilterText,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Range Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.quickFilters}>
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.quickFilterButton,
                filters.dateRange === option.value && styles.activeQuickFilter,
              ]}
              onPress={() => setDateRange(option.value)}
            >
              <Text
                style={[
                  styles.quickFilterText,
                  filters.dateRange === option.value &&
                    styles.activeQuickFilterText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reset Button */}
      {activeFiltersCount > 0 && (
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Ionicons name="refresh" size={16} color="#6B7280" />
          <Text style={styles.resetButtonText}>Reset All Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
