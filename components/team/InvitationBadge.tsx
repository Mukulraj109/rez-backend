import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../ui/ThemeProvider';

type InvitationStatus = 'pending' | 'accepted' | 'expired';

interface InvitationBadgeProps {
  status: InvitationStatus;
  onResend?: () => void;
  isResending?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const InvitationBadge: React.FC<InvitationBadgeProps> = ({
  status,
  onResend,
  isResending = false,
  style,
  testID,
}) => {
  const styles = useThemedStyles((theme) => {
    // Status-specific colors
    const statusColors = {
      pending: {
        backgroundColor: `${theme.colors.warning[500]}20`,
        color: theme.colors.warning[500],
        icon: 'time-outline' as const,
      },
      accepted: {
        backgroundColor: `${theme.colors.success}20`,
        color: theme.colors.success,
        icon: 'checkmark-circle-outline' as const,
      },
      expired: {
        backgroundColor: `${theme.colors.error}20`,
        color: theme.colors.error,
        icon: 'alert-circle-outline' as const,
      },
    };

    const statusConfig = statusColors[status];

    return {
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      } as ViewStyle,
      badge: {
        backgroundColor: statusConfig.backgroundColor,
        borderRadius: theme.borderRadius.base,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
      } as ViewStyle,
      text: {
        color: statusConfig.color,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        textTransform: 'capitalize',
        marginLeft: 4,
      } as TextStyle,
      resendButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.base,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
      } as ViewStyle,
      resendText: {
        color: '#FFFFFF',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        marginLeft: 4,
      } as TextStyle,
      iconColor: statusConfig.color,
      icon: statusConfig.icon,
    };
  });

  const showResendButton = status === 'expired' && onResend;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.badge}>
        <Ionicons name={styles.icon} size={14} color={styles.iconColor} />
        <Text style={styles.text}>{status}</Text>
      </View>

      {showResendButton && (
        <TouchableOpacity
          style={styles.resendButton}
          onPress={onResend}
          disabled={isResending}
          activeOpacity={0.7}
          testID={`${testID}-resend-button`}
        >
          <Ionicons
            name={isResending ? 'hourglass-outline' : 'mail-outline'}
            size={14}
            color="#FFFFFF"
          />
          <Text style={styles.resendText}>
            {isResending ? 'Sending...' : 'Resend'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
