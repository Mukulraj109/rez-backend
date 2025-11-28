import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../ui/ThemeProvider';

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';

interface ActionTypeBadgeProps {
  actionType: ActionType;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const ActionTypeBadge: React.FC<ActionTypeBadgeProps> = ({
  actionType,
  size = 'medium',
  testID,
}) => {
  const styles = useThemedStyles((theme) => {
    const sizeConfig = {
      small: {
        padding: 4,
        paddingHorizontal: 6,
        fontSize: theme.typography.fontSize.xs,
        iconSize: 10,
      },
      medium: {
        padding: 6,
        paddingHorizontal: 8,
        fontSize: theme.typography.fontSize.sm,
        iconSize: 12,
      },
      large: {
        padding: 8,
        paddingHorizontal: 12,
        fontSize: theme.typography.fontSize.base,
        iconSize: 14,
      },
    };

    const config = sizeConfig[size];

    return {
      badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: config.padding,
        paddingHorizontal: config.paddingHorizontal,
        borderRadius: theme.borderRadius.md,
        gap: 4,
      } as ViewStyle,
      text: {
        fontSize: config.fontSize,
        fontWeight: theme.typography.fontWeight.semiBold,
      },
      iconSize: config.iconSize,
    };
  });

  // Get action type configuration
  const getActionConfig = (type: ActionType) => {
    switch (type) {
      case 'CREATE':
        return {
          color: '#10B981', // Green
          backgroundColor: '#10B98115',
          icon: 'add-circle' as const,
          label: 'Created',
        };
      case 'READ':
        return {
          color: '#3B82F6', // Blue
          backgroundColor: '#3B82F615',
          icon: 'eye' as const,
          label: 'Viewed',
        };
      case 'UPDATE':
        return {
          color: '#F59E0B', // Yellow
          backgroundColor: '#F59E0B15',
          icon: 'pencil' as const,
          label: 'Updated',
        };
      case 'DELETE':
        return {
          color: '#EF4444', // Red
          backgroundColor: '#EF444415',
          icon: 'trash' as const,
          label: 'Deleted',
        };
      case 'LOGIN':
        return {
          color: '#7C3AED', // Purple
          backgroundColor: '#7C3AED15',
          icon: 'log-in' as const,
          label: 'Login',
        };
      case 'LOGOUT':
        return {
          color: '#6B7280', // Gray
          backgroundColor: '#6B728015',
          icon: 'log-out' as const,
          label: 'Logout',
        };
      case 'EXPORT':
        return {
          color: '#F97316', // Orange
          backgroundColor: '#F9731615',
          icon: 'download' as const,
          label: 'Exported',
        };
      case 'IMPORT':
        return {
          color: '#14B8A6', // Teal
          backgroundColor: '#14B8A615',
          icon: 'cloud-upload' as const,
          label: 'Imported',
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#6B728015',
          icon: 'ellipse' as const,
          label: type,
        };
    }
  };

  const config = getActionConfig(actionType);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
        },
      ]}
      testID={testID}
    >
      <Ionicons name={config.icon} size={styles.iconSize} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};
