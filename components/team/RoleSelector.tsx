import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MerchantRole } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';
import { RoleBadge } from './RoleBadge';

interface RoleSelectorProps {
  value: Exclude<MerchantRole, 'owner'>; // Cannot select owner role
  onChange: (role: Exclude<MerchantRole, 'owner'>) => void;
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
  testID?: string;
}

interface RoleOption {
  role: Exclude<MerchantRole, 'owner'>;
  label: string;
  description: string;
  permissionCount: number;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'admin',
    label: 'Admin',
    description: 'Full access to manage store, team, and settings',
    permissionCount: 65,
    color: '#3B82F6',
  },
  {
    role: 'manager',
    label: 'Manager',
    description: 'Manage products, orders, and customer interactions',
    permissionCount: 45,
    color: '#10B981',
  },
  {
    role: 'staff',
    label: 'Staff',
    description: 'View and update orders, limited product access',
    permissionCount: 20,
    color: '#6B7280',
  },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  style,
  testID,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const styles = useThemedStyles((theme) => ({
    container: {
      gap: theme.spacing.xs,
    } as ViewStyle,
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: error ? theme.colors.error : theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      minHeight: 48,
    } as ViewStyle,
    selectorDisabled: {
      backgroundColor: theme.colors.backgroundSecondary,
      opacity: 0.6,
    } as ViewStyle,
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    } as ViewStyle,
    selectedText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      fontWeight: theme.typography.fontWeight.medium,
    },
    placeholder: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textMuted,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    } as ViewStyle,
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      paddingTop: theme.spacing.base,
      maxHeight: '80%',
    } as ViewStyle,
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.base,
      paddingBottom: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    } as ViewStyle,
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
    },
    optionsList: {
      padding: theme.spacing.base,
    } as ViewStyle,
    optionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    } as ViewStyle,
    optionCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    } as ViewStyle,
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    } as ViewStyle,
    optionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
    },
    optionDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      lineHeight: 20,
    },
    optionFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    } as ViewStyle,
    permissionCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textMuted,
    },
    checkIcon: {
      marginLeft: 'auto',
    },
  }));

  const selectedRole = ROLE_OPTIONS.find((opt) => opt.role === value);

  const handleSelect = (role: Exclude<MerchantRole, 'owner'>) => {
    onChange(role);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Role</Text>

      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
      >
        <View style={styles.selectorContent}>
          {selectedRole ? (
            <>
              <RoleBadge role={selectedRole.role} size="small" showIcon />
              <Text style={styles.selectedText}>{selectedRole.label}</Text>
            </>
          ) : (
            <Text style={styles.placeholder}>Select a role</Text>
          )}
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? '#9CA3AF' : '#6B7280'}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                testID={`${testID}-close`}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {ROLE_OPTIONS.map((option) => {
                const isSelected = option.role === value;

                return (
                  <TouchableOpacity
                    key={option.role}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelect(option.role)}
                    activeOpacity={0.7}
                    testID={`${testID}-option-${option.role}`}
                  >
                    <View style={styles.optionHeader}>
                      <RoleBadge role={option.role} size="medium" showIcon />
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#7C3AED"
                          style={styles.checkIcon}
                        />
                      )}
                    </View>

                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>

                    <View style={styles.optionFooter}>
                      <Ionicons name="key-outline" size={14} color="#6B7280" />
                      <Text style={styles.permissionCount}>
                        {option.permissionCount} permissions
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
