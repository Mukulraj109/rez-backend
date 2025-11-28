import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { TeamMemberStatus } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';
import { StatusIndicator } from '../ui/DesignSystemComponents';

interface MemberStatusBadgeProps {
  status: TeamMemberStatus | 'pending';
  size?: 'small' | 'medium';
  showIndicator?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({
  status,
  size = 'medium',
  showIndicator = true,
  style,
  testID,
}) => {
  const styles = useThemedStyles((theme) => {
    // Status-specific colors
    const statusColors = {
      active: {
        backgroundColor: `${theme.colors.success}20`,
        color: theme.colors.success,
        indicatorStatus: 'success' as const,
      },
      inactive: {
        backgroundColor: `${theme.colors.gray[500]}20`,
        color: theme.colors.gray[500],
        indicatorStatus: 'neutral' as const,
      },
      suspended: {
        backgroundColor: `${theme.colors.error}20`,
        color: theme.colors.error,
        indicatorStatus: 'error' as const,
      },
      pending: {
        backgroundColor: `${theme.colors.warning[500]}20`,
        color: theme.colors.warning[500],
        indicatorStatus: 'warning' as const,
      },
    };

    // Size configurations
    const sizes = {
      small: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        fontSize: theme.typography.fontSize.xs,
        borderRadius: theme.borderRadius.sm,
        indicatorSize: 6,
      },
      medium: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        fontSize: theme.typography.fontSize.sm,
        borderRadius: theme.borderRadius.base,
        indicatorSize: 8,
      },
    };

    const statusConfig = statusColors[status];
    const sizeConfig = sizes[size];

    return {
      badge: {
        backgroundColor: statusConfig.backgroundColor,
        borderRadius: sizeConfig.borderRadius,
        paddingHorizontal: sizeConfig.paddingHorizontal,
        paddingVertical: sizeConfig.paddingVertical,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
      } as ViewStyle,
      text: {
        color: statusConfig.color,
        fontSize: sizeConfig.fontSize,
        fontWeight: theme.typography.fontWeight.medium,
        textTransform: 'capitalize',
      } as TextStyle,
      indicatorSize: sizeConfig.indicatorSize,
      indicatorStatus: statusConfig.indicatorStatus,
    };
  });

  return (
    <View style={[styles.badge, style]} testID={testID}>
      {showIndicator && (
        <StatusIndicator
          status={styles.indicatorStatus}
          size={styles.indicatorSize}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={styles.text}>{status}</Text>
    </View>
  );
};
