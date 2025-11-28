/**
 * Notification Helpers
 *
 * 25+ helper functions for notification processing:
 * - Formatting (titles, messages, icons, colors)
 * - Filtering (unread, by type)
 * - Grouping (by date, by type)
 * - Badge counting
 * - Preferences (quiet hours, channels)
 * - Actions (notification actions, payloads)
 */

import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferences,
  NotificationStatus,
} from '../../types/notifications';

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format notification title
 */
export const formatNotificationTitle = (notification: Notification): string => {
  if (notification.title) return notification.title;

  // Generate title based on type
  const typeLabels: Record<NotificationType, string> = {
    [NotificationType.ORDER]: 'New Order',
    [NotificationType.PRODUCT]: 'Product Update',
    [NotificationType.CASHBACK]: 'Cashback Update',
    [NotificationType.TEAM]: 'Team Update',
    [NotificationType.SYSTEM]: 'System Notification',
    [NotificationType.PAYMENT]: 'Payment Update',
    [NotificationType.MARKETING]: 'Marketing Update',
    [NotificationType.REVIEW]: 'New Review',
    [NotificationType.INVENTORY]: 'Inventory Alert',
    [NotificationType.ANALYTICS]: 'Analytics Report',
  };

  return typeLabels[notification.type] || 'Notification';
};

/**
 * Format notification message
 */
export const formatNotificationMessage = (notification: Notification): string => {
  if (notification.message) return notification.message;
  return notification.description || 'You have a new notification';
};

/**
 * Get notification icon
 */
export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    [NotificationType.ORDER]: 'cart',
    [NotificationType.PRODUCT]: 'cube',
    [NotificationType.CASHBACK]: 'wallet',
    [NotificationType.TEAM]: 'people',
    [NotificationType.SYSTEM]: 'settings',
    [NotificationType.PAYMENT]: 'card',
    [NotificationType.MARKETING]: 'megaphone',
    [NotificationType.REVIEW]: 'star',
    [NotificationType.INVENTORY]: 'layers',
    [NotificationType.ANALYTICS]: 'stats-chart',
  };
  return iconMap[type] || 'notifications';
};

/**
 * Get notification color
 */
export const getNotificationColor = (type: NotificationType): string => {
  const colorMap: Record<NotificationType, string> = {
    [NotificationType.ORDER]: '#34C759',
    [NotificationType.PRODUCT]: '#007AFF',
    [NotificationType.CASHBACK]: '#FF9500',
    [NotificationType.TEAM]: '#5856D6',
    [NotificationType.SYSTEM]: '#666',
    [NotificationType.PAYMENT]: '#FF3B30',
    [NotificationType.MARKETING]: '#FF2D55',
    [NotificationType.REVIEW]: '#FF9500',
    [NotificationType.INVENTORY]: '#007AFF',
    [NotificationType.ANALYTICS]: '#34C759',
  };
  return colorMap[type] || '#007AFF';
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: NotificationPriority): string => {
  const priorityColors: Record<NotificationPriority, string> = {
    [NotificationPriority.LOW]: '#666',
    [NotificationPriority.MEDIUM]: '#007AFF',
    [NotificationPriority.HIGH]: '#FF9500',
    [NotificationPriority.URGENT]: '#FF3B30',
  };
  return priorityColors[priority];
};

/**
 * Format relative time for notification
 */
export const formatNotificationTime = (timestamp: string): string => {
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

// ============================================================================
// FILTERING HELPERS
// ============================================================================

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Filter notifications by criteria
 */
export const filterNotifications = (
  notifications: Notification[],
  filters: NotificationFilters
): Notification[] => {
  return notifications.filter(notification => {
    // Type filter
    if (filters.type && notification.type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status && notification.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority && notification.priority !== filters.priority) {
      return false;
    }

    // Unread filter
    if (filters.unreadOnly && notification.status !== NotificationStatus.UNREAD) {
      return false;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const notifDate = new Date(notification.createdAt);
      if (filters.startDate && notifDate < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && notifDate > new Date(filters.endDate)) {
        return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        notification.title,
        notification.message,
        notification.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Filter unread notifications
 */
export const filterUnread = (notifications: Notification[]): Notification[] => {
  return notifications.filter(n => n.status === NotificationStatus.UNREAD);
};

/**
 * Filter by type
 */
export const filterByType = (
  notifications: Notification[],
  type: NotificationType
): Notification[] => {
  return notifications.filter(n => n.type === type);
};

/**
 * Filter by priority
 */
export const filterByPriority = (
  notifications: Notification[],
  priority: NotificationPriority
): Notification[] => {
  return notifications.filter(n => n.priority === priority);
};

// ============================================================================
// GROUPING HELPERS
// ============================================================================

/**
 * Group notifications by date
 */
export const groupNotificationsByDate = (
  notifications: Notification[]
): Record<string, Notification[]> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  notifications.forEach(notification => {
    const notifDate = new Date(notification.createdAt);
    const notifDay = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    );

    if (notifDay.getTime() === today.getTime()) {
      groups['Today'].push(notification);
    } else if (notifDay.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(notification);
    } else if (notifDay >= weekAgo) {
      groups['This Week'].push(notification);
    } else {
      groups['Older'].push(notification);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
};

/**
 * Group notifications by type
 */
export const groupNotificationsByType = (
  notifications: Notification[]
): Record<NotificationType, Notification[]> => {
  const groups = {} as Record<NotificationType, Notification[]>;

  notifications.forEach(notification => {
    if (!groups[notification.type]) {
      groups[notification.type] = [];
    }
    groups[notification.type].push(notification);
  });

  return groups;
};

/**
 * Group notifications by priority
 */
export const groupNotificationsByPriority = (
  notifications: Notification[]
): Record<NotificationPriority, Notification[]> => {
  const groups = {} as Record<NotificationPriority, Notification[]>;

  notifications.forEach(notification => {
    if (!groups[notification.priority]) {
      groups[notification.priority] = [];
    }
    groups[notification.priority].push(notification);
  });

  return groups;
};

// ============================================================================
// BADGE COUNTING HELPERS
// ============================================================================

/**
 * Get unread count
 */
export const getUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
};

/**
 * Get unread count by type
 */
export const getUnreadCountByType = (
  notifications: Notification[],
  type: NotificationType
): number => {
  return notifications.filter(
    n => n.type === type && n.status === NotificationStatus.UNREAD
  ).length;
};

/**
 * Get unread count by priority
 */
export const getUnreadCountByPriority = (
  notifications: Notification[],
  priority: NotificationPriority
): number => {
  return notifications.filter(
    n => n.priority === priority && n.status === NotificationStatus.UNREAD
  ).length;
};

/**
 * Get urgent unread count
 */
export const getUrgentUnreadCount = (notifications: Notification[]): number => {
  return getUnreadCountByPriority(notifications, NotificationPriority.URGENT);
};

/**
 * Get counts by type
 */
export const getCountsByType = (
  notifications: Notification[]
): Record<NotificationType, { total: number; unread: number }> => {
  const counts = {} as Record<NotificationType, { total: number; unread: number }>;

  notifications.forEach(notification => {
    if (!counts[notification.type]) {
      counts[notification.type] = { total: 0, unread: 0 };
    }
    counts[notification.type].total++;
    if (notification.status === NotificationStatus.UNREAD) {
      counts[notification.type].unread++;
    }
  });

  return counts;
};

// ============================================================================
// PREFERENCES HELPERS
// ============================================================================

/**
 * Check if notification should be shown based on preferences
 */
export const shouldShowNotification = (
  notification: Notification,
  preferences: NotificationPreferences
): boolean => {
  // Global mute
  if (preferences.globalMute) {
    return false;
  }

  // Check quiet hours
  if (isQuietHours(preferences)) {
    // Allow urgent notifications during quiet hours
    if (notification.priority !== NotificationPriority.URGENT) {
      return false;
    }
    if (!preferences.doNotDisturb?.allowUrgent) {
      return false;
    }
  }

  // Check category preferences
  const categoryPref = preferences.categories?.[notification.type];
  if (categoryPref && !categoryPref.enabled) {
    return false;
  }

  return true;
};

/**
 * Check if current time is within quiet hours
 */
export const isQuietHours = (preferences: NotificationPreferences): boolean => {
  const quietHours = preferences.globalQuietHours || preferences.doNotDisturb;
  if (!quietHours || !quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 06:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
};

/**
 * Get enabled channels for notification type
 */
export const getEnabledChannels = (
  type: NotificationType,
  preferences: NotificationPreferences
): NotificationChannel[] => {
  const categoryPref = preferences.categories?.[type];
  if (!categoryPref) {
    return [NotificationChannel.IN_APP]; // Default to in-app only
  }

  const enabledChannels: NotificationChannel[] = [];

  if (categoryPref.channels.email?.enabled) {
    enabledChannels.push(NotificationChannel.EMAIL);
  }
  if (categoryPref.channels.sms?.enabled) {
    enabledChannels.push(NotificationChannel.SMS);
  }
  if (categoryPref.channels.inApp?.enabled) {
    enabledChannels.push(NotificationChannel.IN_APP);
  }
  if (categoryPref.channels.push?.enabled) {
    enabledChannels.push(NotificationChannel.PUSH);
  }

  return enabledChannels;
};

/**
 * Check if channel is enabled for notification type
 */
export const isChannelEnabled = (
  type: NotificationType,
  channel: NotificationChannel,
  preferences: NotificationPreferences
): boolean => {
  const enabledChannels = getEnabledChannels(type, preferences);
  return enabledChannels.includes(channel);
};

// ============================================================================
// ACTION HELPERS
// ============================================================================

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  data?: any;
}

/**
 * Get notification action
 */
export const getNotificationAction = (
  notification: Notification
): NotificationAction | null => {
  if (notification.actionUrl && notification.actionLabel) {
    return {
      label: notification.actionLabel,
      action: 'navigate',
      url: notification.actionUrl,
    };
  }

  // Default actions based on type
  switch (notification.type) {
    case NotificationType.ORDER:
      return {
        label: 'View Order',
        action: 'navigate',
        url: `/orders/${notification.relatedEntityId}`,
      };
    case NotificationType.PRODUCT:
      return {
        label: 'View Product',
        action: 'navigate',
        url: `/products/${notification.relatedEntityId}`,
      };
    case NotificationType.CASHBACK:
      return {
        label: 'View Cashback',
        action: 'navigate',
        url: `/cashback/${notification.relatedEntityId}`,
      };
    case NotificationType.REVIEW:
      return {
        label: 'View Review',
        action: 'navigate',
        url: `/reviews/${notification.relatedEntityId}`,
      };
    default:
      return null;
  }
};

/**
 * Build notification payload
 */
export const buildNotificationPayload = (
  type: NotificationType,
  data: any
): Partial<Notification> => {
  return {
    type,
    title: formatNotificationTitle({ type } as Notification),
    message: data.message || '',
    priority: data.priority || NotificationPriority.MEDIUM,
    status: NotificationStatus.UNREAD,
    channels: data.channels || [NotificationChannel.IN_APP],
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
    relatedEntityData: data.relatedEntityData,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    imageUrl: data.imageUrl,
  };
};

// ============================================================================
// SORTING HELPERS
// ============================================================================

/**
 * Sort notifications by date (newest first)
 */
export const sortByNewest = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Sort notifications by priority (urgent first)
 */
export const sortByPriority = (notifications: Notification[]): Notification[] => {
  const priorityOrder = {
    [NotificationPriority.URGENT]: 4,
    [NotificationPriority.HIGH]: 3,
    [NotificationPriority.MEDIUM]: 2,
    [NotificationPriority.LOW]: 1,
  };

  return [...notifications].sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  );
};

/**
 * Sort notifications (unread first, then by date)
 */
export const sortNotifications = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort((a, b) => {
    // Unread first
    if (a.status === NotificationStatus.UNREAD && b.status !== NotificationStatus.UNREAD) {
      return -1;
    }
    if (a.status !== NotificationStatus.UNREAD && b.status === NotificationStatus.UNREAD) {
      return 1;
    }

    // Then by priority
    const priorityOrder = {
      [NotificationPriority.URGENT]: 4,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 1,
    };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

/**
 * Get notification statistics
 */
export const getNotificationStats = (notifications: Notification[]) => {
  const total = notifications.length;
  const unread = getUnreadCount(notifications);
  const byType = getCountsByType(notifications);
  const urgent = getUrgentUnreadCount(notifications);

  return {
    total,
    unread,
    read: total - unread,
    urgent,
    byType,
  };
};

/**
 * Get delivery rate
 */
export const getDeliveryRate = (notifications: Notification[]): number => {
  const total = notifications.length;
  if (total === 0) return 0;

  const delivered = notifications.filter(
    n => n.deliveryStatus === 'delivered' || n.deliveryStatus === 'sent'
  ).length;

  return Math.round((delivered / total) * 100);
};
