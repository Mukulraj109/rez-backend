/**
 * useNotificationBadge Hook
 *
 * Custom hook for notification badge count:
 * - Real-time count updates
 * - Persist count in AsyncStorage
 * - Socket.IO integration
 * - Badge visibility management
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../contexts/SocketContext';
import type { Notification, NotificationType } from '../types/notifications';

// ============================================================================
// TYPES
// ============================================================================

export interface UseNotificationBadgeOptions {
  merchantId?: string;
  autoSync?: boolean;
  syncInterval?: number;
  storageKey?: string;
}

export interface UseNotificationBadgeReturn {
  count: number;
  countByType: Record<NotificationType, number>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  increment: (type?: NotificationType) => void;
  decrement: (type?: NotificationType) => void;
  reset: () => void;
  resetType: (type: NotificationType) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STORAGE_KEY = '@merchant_notification_badge';
const DEFAULT_SYNC_INTERVAL = 60000; // 1 minute

// ============================================================================
// HOOK
// ============================================================================

export const useNotificationBadge = (
  options: UseNotificationBadgeOptions = {}
): UseNotificationBadgeReturn => {
  const {
    merchantId,
    autoSync = true,
    syncInterval = DEFAULT_SYNC_INTERVAL,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options;

  // ========================================
  // STATE
  // ========================================
  const [count, setCount] = useState(0);
  const [countByType, setCountByType] = useState<Record<NotificationType, number>>(
    {} as Record<NotificationType, number>
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ========================================
  // SOCKET
  // ========================================
  const socket = useSocket();

  // ========================================
  // STORAGE HELPERS
  // ========================================
  const saveToStorage = useCallback(
    async (totalCount: number, typeCount: Record<NotificationType, number>) => {
      try {
        const data = {
          count: totalCount,
          countByType: typeCount,
          timestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save badge count to storage:', err);
      }
    },
    [storageKey]
  );

  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          count: data.count || 0,
          countByType: data.countByType || {},
        };
      }
    } catch (err) {
      console.error('Failed to load badge count from storage:', err);
    }
    return { count: 0, countByType: {} };
  }, [storageKey]);

  // ========================================
  // FETCH COUNT FROM API
  // ========================================
  const fetchCount = useCallback(async () => {
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/notifications/stats?merchantId=${merchantId}`);
      // const data = await response.json();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockCount = Math.floor(Math.random() * 20);
      const mockCountByType = {
        order: Math.floor(Math.random() * 5),
        product: Math.floor(Math.random() * 3),
        cashback: Math.floor(Math.random() * 4),
        team: Math.floor(Math.random() * 2),
        system: Math.floor(Math.random() * 2),
        payment: Math.floor(Math.random() * 3),
        marketing: 0,
        review: Math.floor(Math.random() * 2),
        inventory: Math.floor(Math.random() * 3),
        analytics: 0,
      } as Record<NotificationType, number>;

      setCount(mockCount);
      setCountByType(mockCountByType);

      // Save to storage
      await saveToStorage(mockCount, mockCountByType);

      return { count: mockCount, countByType: mockCountByType };
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
      setError(err as Error);

      // Load from storage as fallback
      const stored = await loadFromStorage();
      setCount(stored.count);
      setCountByType(stored.countByType);

      return stored;
    } finally {
      setLoading(false);
    }
  }, [merchantId, saveToStorage, loadFromStorage]);

  // ========================================
  // REFRESH
  // ========================================
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchCount();
  }, [fetchCount]);

  // ========================================
  // INCREMENT
  // ========================================
  const increment = useCallback(
    (type?: NotificationType) => {
      setCount(prev => {
        const newCount = prev + 1;
        if (type) {
          setCountByType(prevByType => {
            const newCountByType = {
              ...prevByType,
              [type]: (prevByType[type] || 0) + 1,
            };
            saveToStorage(newCount, newCountByType);
            return newCountByType;
          });
        } else {
          saveToStorage(newCount, countByType);
        }
        return newCount;
      });
    },
    [countByType, saveToStorage]
  );

  // ========================================
  // DECREMENT
  // ========================================
  const decrement = useCallback(
    (type?: NotificationType) => {
      setCount(prev => {
        const newCount = Math.max(0, prev - 1);
        if (type) {
          setCountByType(prevByType => {
            const newCountByType = {
              ...prevByType,
              [type]: Math.max(0, (prevByType[type] || 0) - 1),
            };
            saveToStorage(newCount, newCountByType);
            return newCountByType;
          });
        } else {
          saveToStorage(newCount, countByType);
        }
        return newCount;
      });
    },
    [countByType, saveToStorage]
  );

  // ========================================
  // RESET
  // ========================================
  const reset = useCallback(() => {
    setCount(0);
    setCountByType({} as Record<NotificationType, number>);
    saveToStorage(0, {} as Record<NotificationType, number>);
  }, [saveToStorage]);

  // ========================================
  // RESET TYPE
  // ========================================
  const resetType = useCallback(
    (type: NotificationType) => {
      setCountByType(prev => {
        const newCountByType = { ...prev, [type]: 0 };
        const newCount = Object.values(newCountByType).reduce((sum, c) => sum + c, 0);
        setCount(newCount);
        saveToStorage(newCount, newCountByType);
        return newCountByType;
      });
    },
    [saveToStorage]
  );

  // ========================================
  // EFFECTS
  // ========================================

  // Initial load
  useEffect(() => {
    const init = async () => {
      // Load from storage first for instant display
      const stored = await loadFromStorage();
      setCount(stored.count);
      setCountByType(stored.countByType);

      // Then fetch from API
      await fetchCount();
    };

    init();
  }, [fetchCount, loadFromStorage]);

  // Auto-sync
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      fetchCount();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, syncInterval, fetchCount]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      if (notification.status === 'unread') {
        increment(notification.type);
      }
    };

    const handleNotificationRead = (data: { notificationId: string; type?: NotificationType }) => {
      decrement(data.type);
    };

    const handleAllNotificationsRead = (data: { type?: NotificationType }) => {
      if (data.type) {
        resetType(data.type);
      } else {
        reset();
      }
    };

    const handleBadgeUpdate = (data: { count: number; countByType?: Record<NotificationType, number> }) => {
      setCount(data.count);
      if (data.countByType) {
        setCountByType(data.countByType);
        saveToStorage(data.count, data.countByType);
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notification:all_read', handleAllNotificationsRead);
    socket.on('notification:badge_update', handleBadgeUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notification:all_read', handleAllNotificationsRead);
      socket.off('notification:badge_update', handleBadgeUpdate);
    };
  }, [socket, increment, decrement, reset, resetType, saveToStorage]);

  // ========================================
  // RETURN
  // ========================================
  return {
    count,
    countByType,
    loading,
    error,
    refresh,
    increment,
    decrement,
    reset,
    resetType,
  };
};

export default useNotificationBadge;
