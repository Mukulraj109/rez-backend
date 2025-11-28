import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  useNotification,
  useMarkAsRead,
  useDeleteNotification,
} from '@/hooks/queries/useNotifications';
import { NotificationType, NotificationStatus } from '@/types/notifications';

const getNotificationIcon = (type: NotificationType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case NotificationType.ORDER:
      return 'cart';
    case NotificationType.PRODUCT:
      return 'cube';
    case NotificationType.CASHBACK:
      return 'cash';
    case NotificationType.TEAM:
      return 'people';
    case NotificationType.PAYMENT:
      return 'card';
    case NotificationType.SYSTEM:
      return 'settings';
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.ORDER:
      return '#3B82F6';
    case NotificationType.PRODUCT:
      return '#8B5CF6';
    case NotificationType.CASHBACK:
      return '#10B981';
    case NotificationType.TEAM:
      return '#F59E0B';
    case NotificationType.PAYMENT:
      return '#EC4899';
    case NotificationType.SYSTEM:
      return '#6B7280';
    default:
      return '#3B82F6';
  }
};

const getActionLabel = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.ORDER:
      return 'View Order';
    case NotificationType.PRODUCT:
      return 'View Product';
    case NotificationType.TEAM:
      return 'View Team';
    case NotificationType.SYSTEM:
      return 'Learn More';
    case NotificationType.CASHBACK:
      return 'View Cashback';
    case NotificationType.PAYMENT:
      return 'View Payment';
    default:
      return 'View Details';
  }
};

export default function NotificationDetailScreen() {
  const { notificationId } = useLocalSearchParams<{ notificationId: string }>();

  const { data: notification, isLoading, error } = useNotification(notificationId);
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // Mark as read when screen opens
  useEffect(() => {
    if (notification && notification.status === NotificationStatus.UNREAD) {
      markAsReadMutation.mutate(notificationId);
    }
  }, [notification?.id]);

  const handleAction = () => {
    if (!notification) return;

    // Navigate based on notification type
    if (notification.relatedEntityId) {
      switch (notification.type) {
        case NotificationType.ORDER:
          router.push(`/orders/${notification.relatedEntityId}`);
          break;
        case NotificationType.PRODUCT:
          router.push(`/products/${notification.relatedEntityId}`);
          break;
        case NotificationType.TEAM:
          router.push(`/team/${notification.relatedEntityId}`);
          break;
        case NotificationType.CASHBACK:
          router.push(`/cashback/${notification.relatedEntityId}`);
          break;
        default:
          if (notification.actionUrl) {
            // Handle custom action URL
            console.log('Navigate to:', notification.actionUrl);
          }
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteNotificationMutation.mutate(notificationId, {
              onSuccess: () => {
                router.back();
              },
            });
          },
        },
      ]
    );
  };

  const handleToggleRead = () => {
    if (notification?.status === NotificationStatus.UNREAD) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notification...</Text>
      </View>
    );
  }

  if (error || !notification) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Failed to load notification</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'This notification could not be found.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const iconColor = getNotificationColor(notification.type);
  const isUnread = notification.status === NotificationStatus.UNREAD;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Icon Header */}
        <View style={styles.iconHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={getNotificationIcon(notification.type)} size={48} color={iconColor} />
          </View>
        </View>

        {/* Title and Message */}
        <View style={styles.contentSection}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message}>{notification.message}</Text>

          {notification.description && (
            <Text style={styles.description}>{notification.description}</Text>
          )}
        </View>

        {/* Timestamp */}
        <View style={styles.timestampSection}>
          <View style={styles.timestampRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.timestampLabel}>Received</Text>
            <Text style={styles.timestampValue}>
              {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          {notification.readAt && (
            <View style={styles.timestampRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={styles.timestampLabel}>Read</Text>
              <Text style={styles.timestampValue}>
                {format(new Date(notification.readAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(notification.relatedEntityId || notification.actionUrl) && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleAction}>
            <Text style={styles.primaryButtonText}>
              {notification.actionLabel || getActionLabel(notification.type)}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleToggleRead}
            disabled={!isUnread}
          >
            <Ionicons
              name={isUnread ? 'checkmark' : 'checkmark-done'}
              size={20}
              color={isUnread ? '#3B82F6' : '#9CA3AF'}
            />
            <Text style={[styles.secondaryButtonText, !isUnread && styles.disabledText]}>
              {isUnread ? 'Mark as Read' : 'Already Read'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDelete}
            disabled={deleteNotificationMutation.isPending}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>
              {deleteNotificationMutation.isPending ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Metadata */}
        {notification.templateVariables && Object.keys(notification.templateVariables).length > 0 && (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataTitle}>Additional Details</Text>
            {Object.entries(notification.templateVariables).map(([key, value]) => (
              <View key={key} style={styles.metadataRow}>
                <Text style={styles.metadataKey}>{key}:</Text>
                <Text style={styles.metadataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  iconHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timestampSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timestampLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  timestampValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 6,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  metadataSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metadataKey: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    width: 120,
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
