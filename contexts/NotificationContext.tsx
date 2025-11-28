import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/api/socket';
import { useAuth } from './AuthContext';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { Notification, NotificationType } from '@/types/notifications';

interface NotificationContextType {
  unreadCount: number;
  unreadByType: Record<string, number>;
  latestNotification: Notification | null;
  showNotificationToast: (notification: Notification) => void;
  clearLatestNotification: () => void;
  refreshUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, merchant } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({});
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  // Listen for real-time notification events
  useEffect(() => {
    if (!isAuthenticated || !merchant) {
      return;
    }

    console.log('📡 Setting up notification socket listeners...');

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      console.log('🔔 New notification received:', notification);

      // Update unread count
      setUnreadCount((prev) => prev + 1);

      // Update unread by type
      setUnreadByType((prev) => ({
        ...prev,
        [notification.type]: (prev[notification.type] || 0) + 1,
      }));

      // Set as latest notification for toast
      setLatestNotification(notification);

      // Invalidate notification queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    };

    // Listen for notification read events
    const handleNotificationRead = (data: { notificationId: string }) => {
      console.log('✅ Notification marked as read:', data.notificationId);

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    };

    // Listen for notification deleted events
    const handleNotificationDeleted = (data: { notificationId: string }) => {
      console.log('🗑️ Notification deleted:', data.notificationId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    };

    // Listen for unread count updates
    const handleUnreadCountUpdate = (data: { count: number; byType: Record<string, number> }) => {
      console.log('📊 Unread count updated:', data);
      setUnreadCount(data.count);
      setUnreadByType(data.byType);
    };

    // Subscribe to socket events
    socketService.on('notification:new', handleNewNotification);
    socketService.on('notification:read', handleNotificationRead);
    socketService.on('notification:deleted', handleNotificationDeleted);
    socketService.on('notification:unread-count', handleUnreadCountUpdate);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up notification socket listeners...');
      socketService.off('notification:new', handleNewNotification);
      socketService.off('notification:read', handleNotificationRead);
      socketService.off('notification:deleted', handleNotificationDeleted);
      socketService.off('notification:unread-count', handleUnreadCountUpdate);
    };
  }, [isAuthenticated, merchant, queryClient]);

  // Fetch initial unread count when authenticated
  useEffect(() => {
    if (isAuthenticated && merchant) {
      refreshUnreadCount();
    }
  }, [isAuthenticated, merchant]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const cachedData = queryClient.getQueryData(queryKeys.notifications.unread());
      if (cachedData && typeof cachedData === 'object' && 'unreadCount' in cachedData) {
        const data = cachedData as { unreadCount: number; byType: Record<string, number> };
        setUnreadCount(data.unreadCount);
        setUnreadByType(data.byType);
      }
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  }, [queryClient]);

  const showNotificationToast = useCallback((notification: Notification) => {
    setLatestNotification(notification);
  }, []);

  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  const value: NotificationContextType = {
    unreadCount,
    unreadByType,
    latestNotification,
    showNotificationToast,
    clearLatestNotification,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
