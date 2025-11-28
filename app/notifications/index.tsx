import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import {
  useInfiniteNotifications,
  useMarkAsRead,
  useDeleteNotification,
  useMarkAllAsRead,
} from '@/hooks/queries/useNotifications';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Notification, NotificationType, NotificationStatus } from '@/types/notifications';

type TabType = 'all' | 'unread' | 'order' | 'product' | 'team' | 'system';

const TABS: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'notifications' },
  { key: 'unread', label: 'Unread', icon: 'ellipse' },
  { key: 'order', label: 'Orders', icon: 'cart' },
  { key: 'product', label: 'Products', icon: 'cube' },
  { key: 'team', label: 'Team', icon: 'people' },
  { key: 'system', label: 'System', icon: 'settings' },
];

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
    case NotificationType.REVIEW:
      return 'star';
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
    case NotificationType.REVIEW:
      return '#F59E0B';
    default:
      return '#3B82F6';
  }
};

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { unreadCount, unreadByType, refreshUnreadCount } = useNotificationContext();

  // Build filters based on active tab
  const getFilters = () => {
    if (activeTab === 'all') return {};
    if (activeTab === 'unread') return { unreadOnly: true };
    return { type: activeTab as NotificationType };
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteNotifications(getFilters());

  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Flatten all pages of notifications
  const notifications = data?.pages.flatMap((page) => page.items) || [];

  const handleRefresh = useCallback(() => {
    refetch();
    refreshUnreadCount();
  }, [refetch, refreshUnreadCount]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === NotificationStatus.UNREAD) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to detail screen
    router.push(`/notifications/${notification.id}`);
  };

  const handleMarkAsRead = (notificationId: string, event: any) => {
    event.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: string, event: any) => {
    event.stopPropagation();
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotificationMutation.mutate(notificationId),
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    const filters = activeTab === 'all' ? undefined : activeTab === 'unread' ? undefined : { type: activeTab as NotificationType };
    markAllAsReadMutation.mutate(filters);
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = item.status === NotificationStatus.UNREAD;
    const iconColor = getNotificationColor(item.type);
    const relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={getNotificationIcon(item.type)} size={24} color={iconColor} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          <Text style={styles.timestamp}>{relativeTime}</Text>
        </View>

        <View style={styles.actions}>
          {isUnread && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => handleMarkAsRead(item.id, e)}
            >
              <Ionicons name="checkmark" size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => handleDelete(item.id, e)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'unread'
          ? "You're all caught up!"
          : 'New notifications will appear here'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <FlatList
        data={TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const isActive = activeTab === item.key;
          let badge = 0;

          if (item.key === 'all') {
            badge = unreadCount;
          } else if (item.key === 'unread') {
            badge = unreadCount;
          } else if (item.key !== 'all' && item.key !== 'unread') {
            badge = unreadByType[item.key] || 0;
          }

          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isActive ? '#3B82F6' : '#6B7280'}
              />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {item.label}
              </Text>
              {badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      />

      {notifications.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <Ionicons name="checkmark-done" size={18} color="#3B82F6" />
            <Text style={styles.bulkActionText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#DBEAFE',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabLabel: {
    color: '#3B82F6',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bulkActionText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
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
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
