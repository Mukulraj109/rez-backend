import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type PresetRange = '7d' | '30d' | '90d' | '1y' | 'custom';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: PresetRange[];
  maxDate?: Date;
  minDate?: Date;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  presets = ['7d', '30d', '90d', '1y', 'custom'],
  maxDate = new Date(),
  minDate,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [showModal, setShowModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange | null>(null);

  // Get preset configuration
  const getPresetConfig = (preset: PresetRange) => {
    switch (preset) {
      case '7d':
        return { label: 'Last 7 Days', days: 7 };
      case '30d':
        return { label: 'Last 30 Days', days: 30 };
      case '90d':
        return { label: 'Last 90 Days', days: 90 };
      case '1y':
        return { label: 'Last Year', days: 365 };
      case 'custom':
        return { label: 'Custom Range', days: null };
    }
  };

  // Calculate date range from preset
  const getDateRangeFromPreset = (preset: PresetRange): DateRange | null => {
    if (preset === 'custom') return null;

    const config = getPresetConfig(preset);
    const endDate = new Date(maxDate);
    const startDate = new Date(maxDate);

    if (config.days) {
      startDate.setDate(startDate.getDate() - config.days);
    }

    return { startDate, endDate };
  };

  // Handle preset selection
  const handlePresetSelect = (preset: PresetRange) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setShowModal(true);
    } else {
      const range = getDateRangeFromPreset(preset);
      if (range) {
        onChange(range);
        setShowModal(false);
      }
    }
  };

  // Format date range for display
  const formatDateRange = () => {
    const { startDate, endDate } = value;
    const start = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  // Check if current range matches a preset
  const getCurrentPreset = (): PresetRange | null => {
    for (const preset of presets) {
      if (preset === 'custom') continue;
      const range = getDateRangeFromPreset(preset);
      if (range) {
        const isSameStart =
          range.startDate.toDateString() === value.startDate.toDateString();
        const isSameEnd = range.endDate.toDateString() === value.endDate.toDateString();
        if (isSameStart && isSameEnd) {
          return preset;
        }
      }
    }
    return 'custom';
  };

  const currentPreset = selectedPreset || getCurrentPreset();

  return (
    <View style={styles.container}>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        <View style={styles.triggerText}>
          <Text style={[styles.triggerLabel, { color: theme.textSecondary }]}>
            Date Range
          </Text>
          <Text style={[styles.triggerValue, { color: theme.text }]}>
            {formatDateRange()}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Date Range
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Preset Options */}
            <View style={styles.presetContainer}>
              {presets.map((preset) => {
                const config = getPresetConfig(preset);
                const isSelected = currentPreset === preset;

                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        {
                          color: isSelected ? '#fff' : theme.text,
                        },
                      ]}
                    >
                      {config.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Filters */}
            <View
              style={[
                styles.quickFilters,
                {
                  borderTopColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.quickFiltersTitle, { color: theme.textSecondary }]}>
                Quick Filters
              </Text>
              <View style={styles.quickFiltersRow}>
                <TouchableOpacity
                  style={[
                    styles.quickFilterChip,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    const today = new Date(maxDate);
                    const yesterday = new Date(maxDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    onChange({ startDate: yesterday, endDate: today });
                    setShowModal(false);
                  }}
                >
                  <Text style={[styles.quickFilterText, { color: theme.text }]}>
                    Yesterday
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickFilterChip,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    const today = new Date(maxDate);
                    onChange({ startDate: today, endDate: today });
                    setShowModal(false);
                  }}
                >
                  <Text style={[styles.quickFilterText, { color: theme.text }]}>
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickFilterChip,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    const endDate = new Date(maxDate);
                    const startDate = new Date(maxDate);
                    startDate.setDate(1); // First day of month
                    onChange({ startDate, endDate });
                    setShowModal(false);
                  }}
                >
                  <Text style={[styles.quickFilterText, { color: theme.text }]}>
                    This Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={[
                styles.applyButton,
                {
                  backgroundColor: theme.primary,
                },
              ]}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerText: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  triggerValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  presetContainer: {
    padding: 20,
    gap: 12,
  },
  presetButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  quickFilters: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  quickFiltersTitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickFilterText: {
    fontSize: 13,
  },
  applyButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
