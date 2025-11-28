/**
 * FormSelect Component
 * Reusable select/dropdown component with validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  FlatList,
  Platform,
} from 'react-native';
import { Controller, FieldValues, Path, Control, RegisterOptions } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

export interface FormSelectProps<T extends FieldValues = any> {
  // React Hook Form mode
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions;
  
  // Controlled mode (without react-hook-form)
  value?: any;
  onValueChange?: (value: any) => void;
  error?: string;
  
  // Common props
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  description?: string;
  helperText?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  multiSelect?: boolean;
  onSelect?: (value: any) => void;
  containerStyle?: ViewStyle;
  optionContainerStyle?: ViewStyle;
  testID?: string;
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  renderValue?: (value: any) => string;
  required?: boolean;
}

const FormSelect = React.forwardRef<View, FormSelectProps<any>>(
  (
    {
      name,
      control,
      value: controlledValue,
      onValueChange,
      error: externalError,
      label,
      placeholder = 'Select an option...',
      options,
      rules,
      description,
      helperText,
      disabled = false,
      searchable = false,
      clearable = false,
      multiSelect = false,
      onSelect,
      containerStyle,
      optionContainerStyle,
      testID,
      renderOption,
      renderValue,
      required,
    },
    ref
  ) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const getDisplayValue = (value: any): string => {
      if (!value) return placeholder;

      if (renderValue) {
        return renderValue(value);
      }

      if (Array.isArray(value)) {
        return value
          .map((v) => options.find((opt) => opt.value === v)?.label || v)
          .join(', ');
      }

      return options.find((opt) => opt.value === value)?.label || String(value);
    };

    const filteredOptions = searchQuery
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(opt.value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Render function for the select UI
    const renderSelect = (value: any, onChange: (value: any) => void, error?: { message?: string } | string) => {
      const errorMessage = typeof error === 'string' ? error : error?.message || externalError;
      const hasError = !!errorMessage;
      
      return (
          <View style={[styles.container, containerStyle]} ref={ref}>
            {label && (
              <Text style={styles.label}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
              </Text>
            )}

            {description && <Text style={styles.description}>{description}</Text>}

            <TouchableOpacity
              onPress={() => !disabled && setIsModalVisible(true)}
              disabled={disabled}
              activeOpacity={0.7}
              style={[
                styles.selectButton,
                {
                  borderColor: hasError
                    ? '#EF4444'
                    : isFocused
                      ? '#3B82F6'
                      : '#E5E7EB',
                  backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
                },
              ]}
              testID={testID}
            >
              <View style={styles.selectContent}>
                <Text
                  style={[
                    styles.selectText,
                    {
                      color: value ? '#111827' : '#9CA3AF',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getDisplayValue(value)}
                </Text>
              </View>

              <View style={styles.iconContainer}>
                {clearable && value && (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(multiSelect ? [] : null);
                      onSelect?.(multiSelect ? [] : null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={hasError ? '#EF4444' : '#9CA3AF'}
                      style={{ marginRight: 8 }}
                    />
                  </TouchableOpacity>
                )}
                <Ionicons
                  name={isModalVisible ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={hasError ? '#EF4444' : isFocused ? '#3B82F6' : '#9CA3AF'}
                />
              </View>
            </TouchableOpacity>

            {helperText && !hasError && (
              <Text style={styles.helperText}>{helperText}</Text>
            )}

            {hasError && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color="#EF4444"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Modal */}
            <Modal
              visible={isModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsModalVisible(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setIsModalVisible(false)}
                style={styles.modalBackdrop}
              >
                <View style={styles.modalContent}>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
                    <TouchableOpacity
                      onPress={() => setIsModalVisible(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={24} color="#111827" />
                    </TouchableOpacity>
                  </View>

                  {/* Search */}
                  {searchable && (
                    <View
                      style={[
                        styles.searchContainer,
                        { borderColor: isFocused ? '#3B82F6' : '#E5E7EB' },
                      ]}
                    >
                      <Ionicons
                        name="search"
                        size={20}
                        color={isFocused ? '#3B82F6' : '#9CA3AF'}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                      />
                    </View>
                  )}

                  {/* Options List */}
                  <FlatList
                    data={filteredOptions}
                    keyExtractor={(item) => String(item.value)}
                    scrollEnabled
                    style={styles.optionsList}
                    renderItem={({ item }) => {
                      const isSelected = Array.isArray(value)
                        ? value.includes(item.value)
                        : value === item.value;

                      return (
                        <TouchableOpacity
                          onPress={() => {
                            if (multiSelect) {
                              const newValue = isSelected
                                ? (value || []).filter((v: any) => v !== item.value)
                                : [...(value || []), item.value];
                              onChange(newValue);
                              onSelect?.(newValue);
                            } else {
                              onChange(item.value);
                              onSelect?.(item.value);
                              setIsModalVisible(false);
                              setSearchQuery('');
                            }
                          }}
                          disabled={item.disabled}
                          activeOpacity={0.7}
                          style={[
                            styles.optionItem,
                            optionContainerStyle,
                            {
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              opacity: item.disabled ? 0.5 : 1,
                            },
                          ]}
                        >
                          {renderOption ? (
                            renderOption(item, isSelected)
                          ) : (
                            <View style={styles.optionContent}>
                              {multiSelect && (
                                <Ionicons
                                  name={isSelected ? 'checkbox' : 'checkbox-outline'}
                                  size={20}
                                  color={isSelected ? '#3B82F6' : '#9CA3AF'}
                                  style={{ marginRight: 12 }}
                                />
                              )}
                              <View style={styles.optionTextContainer}>
                                <Text
                                  style={[
                                    styles.optionLabel,
                                    {
                                      color: isSelected ? '#3B82F6' : '#111827',
                                      fontWeight: isSelected ? '600' : '500',
                                    },
                                  ]}
                                >
                                  {item.label}
                                </Text>
                                {item.description && (
                                  <Text style={styles.optionDescription}>
                                    {item.description}
                                  </Text>
                                )}
                              </View>
                              {!multiSelect && isSelected && (
                                <Ionicons
                                  name="checkmark"
                                  size={20}
                                  color="#3B82F6"
                                  style={{ marginLeft: 'auto' }}
                                />
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />

                  {filteredOptions.length === 0 && (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="search-outline"
                        size={40}
                        color="#D1D5DB"
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={styles.emptyText}>No options found</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
      );
    };

    // Use Controller if control is provided (react-hook-form mode)
    if (control && name) {
      return (
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({ field: { value, onChange }, fieldState: { error } }) =>
            renderSelect(value, onChange, error)
          }
        />
      );
    }

    // Otherwise use controlled mode (manual state management)
    const handleChange = (newValue: any) => {
      onValueChange?.(newValue);
      onSelect?.(newValue);
    };

    return renderSelect(controlledValue || null, handleChange, externalError);
  }
);

FormSelect.displayName = 'FormSelect';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  selectContent: {
    flex: 1,
    marginRight: 12,
  },
  selectText: {
    fontSize: 16,
    color: '#111827',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Platform.select({ ios: 20, android: 10 }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  optionsList: {
    maxHeight: 350,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default FormSelect;
