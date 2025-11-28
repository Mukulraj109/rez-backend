import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuditSeverity } from '../../types/audit';
import { useThemedStyles } from '../ui/ThemeProvider';

interface SeverityBadgeProps {
  severity: AuditSeverity;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
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
        textTransform: 'capitalize' as const,
      },
      iconSize: config.iconSize,
    };
  });

  // Get severity configuration
  const getSeverityConfig = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          color: '#DC2626', // Dark Red
          backgroundColor: '#DC262615',
          icon: 'alert-circle' as const,
          label: 'Critical',
        };
      case 'error':
        return {
          color: '#EF4444', // Red
          backgroundColor: '#EF444415',
          icon: 'close-circle' as const,
          label: 'Error',
        };
      case 'warning':
        return {
          color: '#F59E0B', // Yellow/Orange
          backgroundColor: '#F59E0B15',
          icon: 'warning' as const,
          label: 'Warning',
        };
      case 'info':
        return {
          color: '#6B7280', // Gray
          backgroundColor: '#6B728015',
          icon: 'information-circle' as const,
          label: 'Info',
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#6B728015',
          icon: 'ellipse' as const,
          label: severity,
        };
    }
  };

  const config = getSeverityConfig(severity);

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
      {showIcon && (
        <Ionicons name={config.icon} size={styles.iconSize} color={config.color} />
      )}
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};
