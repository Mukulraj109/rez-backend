/**
 * Audit Log Advanced Filters Modal
 * Comprehensive filtering for audit logs
 * Permissions required: logs:view
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { AuditLogFilters, AuditSeverity, AuditAction, AuditResourceType } from '@/types/audit';
import { useActionOptions, useResourceTypeOptions, useSeverityOptions } from '@/hooks/queries/useAudit';

type DateRangePreset = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';

export default function AuditFiltersScreen() {
  // Get filter options from service
  const actionOptions = useActionOptions();
  const resourceOptions = useResourceTypeOptions();
  const severityOptions = useSeverityOptions();

  // State
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_7_days');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());

  const [userSearch, setUserSearch] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  // Date range presets
  const datePresets: { label: string; value: DateRangePreset }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Last 90 days', value: 'last_90_days' },
    { label: 'Custom range', value: 'custom' },
  ];

  // Handlers
  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);

    if (preset === 'custom') {
      // User will select custom dates
      return;
    }

    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_7_days':
        start.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(now.getDate() - 90);
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const toggleAction = (action: string) => {
    const newSet = new Set(selectedActions);
    if (newSet.has(action)) {
      newSet.delete(action);
    } else {
      newSet.add(action);
    }
    setSelectedActions(newSet);
  };

  const toggleResourceType = (type: string) => {
    const newSet = new Set(selectedResourceTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedResourceTypes(newSet);
  };

  const toggleSeverity = (severity: string) => {
    const newSet = new Set(selectedSeverities);
    if (newSet.has(severity)) {
      newSet.delete(severity);
    } else {
      newSet.add(severity);
    }
    setSelectedSeverities(newSet);
  };

  const handleReset = () => {
    setDateRangePreset('last_7_days');
    setStartDate(null);
    setEndDate(null);
    setSelectedActions(new Set());
    setSelectedResourceTypes(new Set());
    setSelectedSeverities(new Set());
    setUserSearch('');
    setIpAddress('');
  };

  const handleApply = () => {
    // Build filter object
    const filters: AuditLogFilters = {
      page: 1,
      limit: 20,
    };

    // Add date range
    if (dateRangePreset !== 'custom') {
      filters.dateRange = dateRangePreset;
    } else if (startDate || endDate) {
      if (startDate) filters.startDate = startDate.toISOString();
      if (endDate) filters.endDate = endDate.toISOString();
    }

    // Add selected filters
    if (selectedActions.size > 0) {
      filters.action = Array.from(selectedActions) as AuditAction[];
    }
    if (selectedResourceTypes.size > 0) {
      filters.resourceType = Array.from(selectedResourceTypes) as AuditResourceType[];
    }
    if (selectedSeverities.size > 0) {
      filters.severity = Array.from(selectedSeverities) as AuditSeverity[];
    }
    if (userSearch.trim()) {
      filters.search = userSearch.trim();
    }
    if (ipAddress.trim()) {
      filters.ipAddress = ipAddress.trim();
    }

    // In production, pass filters back to list screen via navigation params or state management
    Alert.alert('Filters Applied', `Applied ${Object.keys(filters).length} filters`);

    // For now, just go back (in production, you'd pass filters to parent screen)
    router.back();
  };

  // Render sections
  const renderDateRangeSection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Date Range</ThemedText>

      <View style={styles.chipContainer}>
        {datePresets.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.chip,
              dateRangePreset === preset.value && styles.chipActive,
            ]}
            onPress={() => handleDatePresetChange(preset.value)}
          >
            <ThemedText
              style={[
                styles.chipText,
                dateRangePreset === preset.value && styles.chipTextActive,
              ]}
            >
              {preset.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {dateRangePreset === 'custom' && (
        <View style={styles.customDateContainer}>
          <ThemedText style={styles.customDateNote}>
            Custom date range: Install @react-native-community/datetimepicker to enable date pickers.
            For now, use the preset ranges above.
          </ThemedText>
          <View style={styles.dateInputGroup}>
            <ThemedText style={styles.dateLabel}>Start Date</ThemedText>
            <View style={[styles.dateInput, styles.dateInputDisabled]}>
              <Ionicons name="calendar-outline" size={20} color="#ccc" />
              <ThemedText style={styles.dateInputTextDisabled}>
                {startDate ? startDate.toLocaleDateString() : 'Select date (coming soon)'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.dateInputGroup}>
            <ThemedText style={styles.dateLabel}>End Date</ThemedText>
            <View style={[styles.dateInput, styles.dateInputDisabled]}>
              <Ionicons name="calendar-outline" size={20} color="#ccc" />
              <ThemedText style={styles.dateInputTextDisabled}>
                {endDate ? endDate.toLocaleDateString() : 'Select date (coming soon)'}
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderActionTypesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Action Types</ThemedText>
        {selectedActions.size > 0 && (
          <ThemedText style={styles.selectionCount}>
            {selectedActions.size} selected
          </ThemedText>
        )}
      </View>

      <View style={styles.checkboxContainer}>
        {actionOptions.slice(0, 12).map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.checkboxItem}
            onPress={() => toggleAction(option.value)}
          >
            <View style={[
              styles.checkbox,
              selectedActions.has(option.value) && styles.checkboxChecked,
            ]}>
              {selectedActions.has(option.value) && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <ThemedText style={styles.checkboxLabel}>{option.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {actionOptions.length > 12 && (
        <ThemedText style={styles.moreText}>
          +{actionOptions.length - 12} more action types available
        </ThemedText>
      )}
    </View>
  );

  const renderResourceTypesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Resource Types</ThemedText>
        {selectedResourceTypes.size > 0 && (
          <ThemedText style={styles.selectionCount}>
            {selectedResourceTypes.size} selected
          </ThemedText>
        )}
      </View>

      <View style={styles.chipContainer}>
        {resourceOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.chip,
              selectedResourceTypes.has(option.value) && styles.chipActive,
            ]}
            onPress={() => toggleResourceType(option.value)}
          >
            <ThemedText
              style={[
                styles.chipText,
                selectedResourceTypes.has(option.value) && styles.chipTextActive,
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSeveritySection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Severity Levels</ThemedText>
        {selectedSeverities.size > 0 && (
          <ThemedText style={styles.selectionCount}>
            {selectedSeverities.size} selected
          </ThemedText>
        )}
      </View>

      <View style={styles.severityContainer}>
        {severityOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.severityChip,
              selectedSeverities.has(option.value) && {
                backgroundColor: option.color,
                borderColor: option.color,
              },
            ]}
            onPress={() => toggleSeverity(option.value)}
          >
            <ThemedText
              style={[
                styles.severityChipText,
                selectedSeverities.has(option.value) && styles.severityChipTextActive,
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUserFilterSection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>User Filter</ThemedText>
      <View style={styles.inputContainer}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search by user name or email..."
          value={userSearch}
          onChangeText={setUserSearch}
          placeholderTextColor="#999"
        />
        {userSearch.length > 0 && (
          <TouchableOpacity onPress={() => setUserSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderIpAddressSection = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>IP Address Filter</ThemedText>
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Enter IP address..."
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        {ipAddress.length > 0 && (
          <TouchableOpacity onPress={() => setIpAddress('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedActions.size > 0) count++;
    if (selectedResourceTypes.size > 0) count++;
    if (selectedSeverities.size > 0) count++;
    if (userSearch.trim()) count++;
    if (ipAddress.trim()) count++;
    if (dateRangePreset !== 'last_7_days') count++;
    return count;
  }, [selectedActions, selectedResourceTypes, selectedSeverities, userSearch, ipAddress, dateRangePreset]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderDateRangeSection()}
        {renderActionTypesSection()}
        {renderResourceTypesSection()}
        {renderSeveritySection()}
        {renderUserFilterSection()}
        {renderIpAddressSection()}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.light.primary} />
          <ThemedText style={styles.infoText}>
            Filters are combined with AND logic. Logs must match all selected criteria.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={20} color="#666" />
          <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <ThemedText style={styles.applyButtonText}>
            Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </ThemedText>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  selectionCount: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  customDateContainer: {
    gap: 12,
  },
  customDateNote: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 6,
  },
  dateInputGroup: {
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  dateInputDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e5e5e5',
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  dateInputTextDisabled: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
  },
  moreText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  severityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  severityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  severityChipTextActive: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
