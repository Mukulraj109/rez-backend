import React from 'react';
import { View, Text, Switch, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Permission } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';

interface PermissionToggleProps {
  permission: Permission;
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
  disabled?: boolean;
  description?: string;
  style?: ViewStyle;
  testID?: string;
}

export const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permission,
  enabled,
  onChange,
  disabled = false,
  description,
  style,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: enabled ? theme.colors.primary : theme.colors.border,
      opacity: disabled ? 0.6 : 1,
    } as ViewStyle,
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginRight: theme.spacing.base,
    } as ViewStyle,
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.base,
      backgroundColor: enabled
        ? `${theme.colors.primary}20`
        : theme.colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    textContainer: {
      flex: 1,
      gap: 2,
    } as ViewStyle,
    permissionName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    permissionDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  }));

  // Get permission category and name
  const getPermissionDetails = (perm: Permission) => {
    const [category, action] = perm.split(':');
    const formattedCategory = category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const formattedAction = action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      category: formattedCategory,
      action: formattedAction,
      name: `${formattedCategory}: ${formattedAction}`,
    };
  };

  // Get icon for permission category
  const getPermissionIcon = (perm: Permission): keyof typeof Ionicons.glyphMap => {
    const category = perm.split(':')[0];
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      products: 'cube-outline',
      orders: 'receipt-outline',
      team: 'people-outline',
      analytics: 'stats-chart-outline',
      settings: 'settings-outline',
      billing: 'card-outline',
      customers: 'person-outline',
      promotions: 'pricetag-outline',
      reviews: 'star-outline',
      notifications: 'notifications-outline',
      reports: 'document-text-outline',
      inventory: 'list-outline',
      categories: 'apps-outline',
      profile: 'person-circle-outline',
      logs: 'time-outline',
      api: 'code-slash-outline',
    };
    return iconMap[category] || 'key-outline';
  };

  const details = getPermissionDetails(permission);
  const icon = getPermissionIcon(permission);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={18}
            color={enabled ? '#7C3AED' : '#6B7280'}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.permissionName}>{details.name}</Text>
          {description && (
            <Text style={styles.permissionDescription} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <Switch
        value={enabled}
        onValueChange={onChange}
        disabled={disabled || !onChange}
        trackColor={{
          false: '#D1D5DB',
          true: '#7C3AED',
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D1D5DB"
        testID={`${testID}-switch`}
      />
    </View>
  );
};
