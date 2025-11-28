import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../../types/notifications';
import { useThemedStyles } from '../ui/ThemeProvider';
import { NotificationTypeIcon } from './NotificationTypeIcon';

interface NotificationCardProps {
  notification: Notification;
  onPress?: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
  testID?: string;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkRead,
  onDelete,
  testID,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isUnread = notification.status === 'unread';

  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: isUnread ? `${theme.colors.primary}05` : theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: isUnread ? `${theme.colors.primary}30` : theme.colors.border,
      borderLeftWidth: 4,
      borderLeftColor: isUnread ? theme.colors.primary : 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    } as ViewStyle,
    content: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    } as ViewStyle,
    iconSection: {
      position: 'relative',
    } as ViewStyle,
    unreadDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    } as ViewStyle,
    infoSection: {
      flex: 1,
      gap: theme.spacing.xs,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    } as ViewStyle,
    title: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
    },
    priorityBadge: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,
    priorityText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semiBold,
      textTransform: 'uppercase' as const,
    },
    message: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.xs,
    } as ViewStyle,
    timestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    } as ViewStyle,
    actionButton: {
      padding: 4,
    } as ViewStyle,
    actionLabel: {
      marginTop: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      alignSelf: 'flex-start',
    } as ViewStyle,
    actionLabelText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: '#FFFFFF',
    },
  }));

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#FEE2E215', text: '#DC2626' };
      case 'high':
        return { bg: '#FEF3C715', text: '#D97706' };
      case 'medium':
        return { bg: '#DBEAFE15', text: '#2563EB' };
      case 'low':
      default:
        return { bg: '#F3F4F615', text: '#6B7280' };
    }
  };

  const priorityColor = getPriorityColor(notification.priority);

  // Handle mark as read with animation
  const handleMarkRead = () => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onMarkRead?.();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  // Handle delete with animation
  const handleDelete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete?.();
    });
  };

  const cardContent = (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.content}>
        <View style={styles.iconSection}>
          <NotificationTypeIcon
            type={notification.type}
            size={40}
            color={priorityColor.text}
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {notification.title}
            </Text>
            {notification.priority !== 'low' && (
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: priorityColor.bg },
                ]}
              >
                <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                  {notification.priority}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {notification.message}
          </Text>

          {notification.actionLabel && (
            <TouchableOpacity
              style={styles.actionLabel}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionLabelText}>
                {notification.actionLabel}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {formatTimestamp(notification.createdAt)}
        </Text>
        <View style={styles.actions}>
          {isUnread && onMarkRead && (
            <TouchableOpacity
              onPress={handleMarkRead}
              style={styles.actionButton}
              testID={`${testID}-mark-read`}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.actionButton}
              testID={`${testID}-delete`}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  if (onPress && !notification.actionLabel) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        testID={testID}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card} testID={testID}>
      {cardContent}
    </View>
  );
};
