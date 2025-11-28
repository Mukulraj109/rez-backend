import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useDashboardRealTime } from '@/hooks/useRealTimeUpdates';

const { width, height } = Dimensions.get('window');

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionType?: 'order' | 'product' | 'cashback' | 'system';
  actionId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'orders' | 'products' | 'cashback' | 'system' | 'marketing' | 'security';
}

interface NotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isVisible,
  onClose,
}) => {
  const realTime = useDashboardRealTime();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const slideAnim = new Animated.Value(width);

  const categories = [
    { key: 'all', label: 'All', icon: 'notifications' },
    { key: 'orders', label: 'Orders', icon: 'receipt' },
    { key: 'products', label: 'Products', icon: 'cube' },
    { key: 'cashback', label: 'Cashback', icon: 'card' },
    { key: 'system', label: 'System', icon: 'settings' },
    { key: 'security', label: 'Security', icon: 'shield' },
  ];

  // Mock notifications - in real app, these would come from backend
  const mockNotifications: NotificationItem[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Low Stock Alert',
      message: '5 products are running low on stock and need restocking',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      isRead: false,
      actionType: 'product',
      priority: 'high',
      category: 'products',
    },
    {
      id: '2',
      type: 'info',
      title: 'New Order Received',
      message: 'Order #12345 from John Doe for ₹150.00',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      isRead: false,
      actionType: 'order',
      actionId: '12345',
      priority: 'medium',
      category: 'orders',
    },
    {
      id: '3',
      type: 'error',
      title: 'High-Risk Cashback',
      message: 'Cashback request #67890 flagged for manual review',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      isRead: true,
      actionType: 'cashback',
      actionId: '67890',
      priority: 'urgent',
      category: 'cashback',
    },
    {
      id: '4',
      type: 'success',
      title: 'Weekly Report Generated',
      message: 'Your weekly performance report is ready for download',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isRead: true,
      priority: 'low',
      category: 'system',
    },
    {
      id: '5',
      type: 'warning',
      title: 'Payment Failed',
      message: 'Order #12344 payment failed - customer needs to retry',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      isRead: false,
      actionType: 'order',
      actionId: '12344',
      priority: 'high',
      category: 'orders',
    },
  ];

  useEffect(() => {
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  // Handle real-time notifications
  useEffect(() => {
    if (realTime.notifications.length > 0) {
      const newNotifications = realTime.notifications.map((notification, index) => ({
        id: `realtime_${Date.now()}_${index}`,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        isRead: false,
        priority: 'medium' as const,
        category: 'system' as const,
      }));

      setNotifications(prev => [...newNotifications, ...prev]);
      setUnreadCount(prev => prev + newNotifications.length);
    }
  }, [realTime.notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return Colors.light.success;
      case 'warning': return Colors.light.warning;
      case 'error': return Colors.light.error;
      case 'info': return Colors.light.info;
      default: return Colors.light.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return Colors.light.error;
      case 'high': return Colors.light.warning;
      case 'medium': return Colors.light.info;
      case 'low': return Colors.light.textSecondary;
      default: return Colors.light.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => 
    selectedCategory === 'all' || notification.category === selectedCategory
  );

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.actionType && notification.actionId) {
      // Navigate to specific page
      onClose();
      // Add navigation logic here
    }
  };

  const CategoryTab = ({ category }: { category: typeof categories[0] }) => {
    const categoryNotifications = notifications.filter(n => 
      category.key === 'all' || n.category === category.key
    );
    const unreadInCategory = categoryNotifications.filter(n => !n.isRead).length;

    return (
      <TouchableOpacity
        style={[
          styles.categoryTab,
          selectedCategory === category.key && styles.activeCategoryTab,
        ]}
        onPress={() => setSelectedCategory(category.key)}
      >
        <View style={styles.categoryTabContent}>
          <Ionicons
            name={category.icon as any}
            size={16}
            color={
              selectedCategory === category.key
                ? Colors.light.primary
                : Colors.light.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.categoryTabText,
              selectedCategory === category.key && styles.activeCategoryTabText,
            ]}
          >
            {category.label}
          </ThemedText>
          {unreadInCategory > 0 && (
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryBadgeText}>
                {unreadInCategory > 99 ? '99+' : unreadInCategory}
              </ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const NotificationItem = ({ notification }: { notification: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIconContainer}>
            <Ionicons
              name={getNotificationIcon(notification.type)}
              size={20}
              color={getNotificationColor(notification.type)}
            />
            <View
              style={[
                styles.priorityIndicator,
                { backgroundColor: getPriorityColor(notification.priority) },
              ]}
            />
          </View>
          
          <View style={styles.notificationText}>
            <ThemedText type="defaultSemiBold" style={styles.notificationTitle}>
              {notification.title}
            </ThemedText>
            <ThemedText style={styles.notificationMessage}>
              {notification.message}
            </ThemedText>
            <ThemedText style={styles.notificationTimestamp}>
              {formatTimestamp(notification.timestamp)}
            </ThemedText>
          </View>

          <View style={styles.notificationActions}>
            {!notification.isRead && (
              <View style={styles.unreadDot} />
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
            >
              <Ionicons name="close" size={16} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ThemedView style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <ThemedText type="title" style={styles.title}>
                  Notifications
                </ThemedText>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <ThemedText style={styles.unreadBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                    <ThemedText style={styles.markAllButtonText}>Mark all read</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {categories.map((category) => (
                <CategoryTab key={category.key} category={category} />
              ))}
            </ScrollView>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
              {filteredNotifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off" size={48} color={Colors.light.textMuted} />
                  <ThemedText style={styles.emptyStateTitle}>No notifications</ThemedText>
                  <ThemedText style={styles.emptyStateMessage}>
                    {selectedCategory === 'all'
                      ? 'You\'re all caught up!'
                      : `No ${selectedCategory} notifications at the moment.`
                    }
                  </ThemedText>
                </View>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </ScrollView>

            {/* Real-time status */}
            <View style={styles.footer}>
              <View style={styles.realtimeStatus}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: realTime.isConnected ? Colors.light.success : Colors.light.error }
                ]} />
                <ThemedText style={styles.statusText}>
                  {realTime.isConnected ? 'Real-time updates active' : 'Offline mode'}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
  },
  overlayTouch: {
    flex: 1,
  },
  container: {
    width: Math.min(400, width * 0.9),
    height: height,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.light.text,
  },
  unreadBadge: {
    backgroundColor: Colors.light.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
  },
  markAllButtonText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  categoryTabs: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeCategoryTab: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTabText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  activeCategoryTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: Colors.light.error,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  unreadNotification: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  priorityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.background,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    color: Colors.light.text,
    marginBottom: 4,
    fontSize: 14,
  },
  notificationMessage: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTimestamp: {
    color: Colors.light.textMuted,
    fontSize: 11,
  },
  notificationActions: {
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
});