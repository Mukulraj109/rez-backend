/**
 * useActivityTimeline Hook
 *
 * Custom hook for activity timeline functionality:
 * - Combines audit logs + notifications
 * - Real-time updates via Socket.IO
 * - Pagination and filtering
 * - Loading states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type {
  AuditLog,
  AuditResourceType,
  TimelineEntry,
} from '../types/audit';
import type { Notification } from '../types/notifications';
import { auditLogToTimelineEntry } from '../utils/audit/auditHelpers';
import { sortNotifications } from '../utils/notifications/notificationHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface UseActivityTimelineOptions {
  userId?: string;
  resourceType?: AuditResourceType;
  resourceId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseActivityTimelineReturn {
  entries: TimelineEntry[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  unreadCount: number;
}

// ============================================================================
// MOCK DATA (Replace with actual API calls)
// ============================================================================

const generateMockAuditLogs = (count: number = 10): AuditLog[] => {
  const actions = [
    'product.created',
    'product.updated',
    'order.created',
    'order.status_changed',
    'user.login',
    'payment.processed',
    'cashback.approved',
  ];

  const resourceTypes: AuditResourceType[] = [
    'product',
    'order',
    'user',
    'payment',
    'cashback',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${Date.now()}-${i}`,
    merchantId: 'merchant-1',
    merchantUserId: 'user-1',
    action: actions[Math.floor(Math.random() * actions.length)] as any,
    resourceType: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
    resourceId: `resource-${i}`,
    details: {
      changes: [
        {
          field: 'status',
          before: 'pending',
          after: 'active',
        },
      ],
    },
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    severity: ['info', 'warning', 'error', 'critical'][
      Math.floor(Math.random() * 4)
    ] as any,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'Admin',
    },
  }));
};

const generateMockNotifications = (count: number = 5): Notification[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `notif-${Date.now()}-${i}`,
    merchantId: 'merchant-1',
    type: ['order', 'product', 'cashback', 'team'][
      Math.floor(Math.random() * 4)
    ] as any,
    title: `Notification ${i + 1}`,
    message: `This is notification message ${i + 1}`,
    priority: ['low', 'medium', 'high', 'urgent'][
      Math.floor(Math.random() * 4)
    ] as any,
    status: Math.random() > 0.5 ? ('unread' as any) : ('read' as any),
    channels: ['in_app'] as any,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    deliveryStatus: 'delivered' as any,
  }));
};

// ============================================================================
// HOOK
// ============================================================================

export const useActivityTimeline = (
  options: UseActivityTimelineOptions = {}
): UseActivityTimelineReturn => {
  const {
    userId,
    resourceType,
    resourceId,
    limit = 50,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  // ========================================
  // STATE
  // ========================================
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // ========================================
  // REFS
  // ========================================
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // ========================================
  // SOCKET
  // ========================================
  const socket = useSocket();

  // ========================================
  // FETCH DATA
  // ========================================
  const fetchTimeline = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setError(null);

      try {
        // TODO: Replace with actual API calls
        // const auditLogsResponse = await fetch(`/api/audit-logs?page=${pageNum}&limit=${limit}`);
        // const notificationsResponse = await fetch(`/api/notifications?page=${pageNum}&limit=${limit}`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock data
        const auditLogs = generateMockAuditLogs(15);
        const notifications = generateMockNotifications(5);

        // Convert to timeline entries
        const auditEntries = auditLogs.map(auditLogToTimelineEntry);
        const notifEntries: TimelineEntry[] = notifications.map(notif => ({
          ...notif,
          action: `${notif.type}.notification` as any,
          resourceType: notif.type as any,
          resourceId: notif.relatedEntityId,
          timestamp: notif.createdAt,
          severity: 'info' as any,
        }));

        // Combine and sort
        const combined = [...auditEntries, ...notifEntries].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Apply filters
        let filtered = combined;
        if (userId) {
          filtered = filtered.filter(entry => entry.merchantUserId === userId);
        }
        if (resourceType) {
          filtered = filtered.filter(entry => entry.resourceType === resourceType);
        }
        if (resourceId) {
          filtered = filtered.filter(entry => entry.resourceId === resourceId);
        }

        // Update state
        setEntries(prev => (append ? [...prev, ...filtered] : filtered));
        setHasMore(filtered.length >= limit);

        // Count unread notifications
        const unread = notifications.filter(n => n.status === 'unread').length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        isLoadingRef.current = false;
      }
    },
    [userId, resourceType, resourceId, limit]
  );

  // ========================================
  // LOAD MORE
  // ========================================
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchTimeline(nextPage, true);
  }, [page, hasMore, loading, refreshing, fetchTimeline]);

  // ========================================
  // REFRESH
  // ========================================
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchTimeline(1, false);
  }, [fetchTimeline]);

  // ========================================
  // EFFECTS
  // ========================================

  // Initial load
  useEffect(() => {
    fetchTimeline(1, false);
  }, [fetchTimeline]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewAuditLog = (log: AuditLog) => {
      const entry = auditLogToTimelineEntry(log);
      setEntries(prev => [entry, ...prev]);
    };

    const handleNewNotification = (notification: Notification) => {
      const entry: TimelineEntry = {
        ...notification,
        action: `${notification.type}.notification` as any,
        resourceType: notification.type as any,
        resourceId: notification.relatedEntityId,
        timestamp: notification.createdAt,
        severity: 'info' as any,
      };
      setEntries(prev => [entry, ...prev]);
      if (notification.status === 'unread') {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleNotificationRead = (notificationId: string) => {
      setEntries(prev =>
        prev.map(entry =>
          entry.id === notificationId
            ? { ...entry, status: 'read' as any }
            : entry
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    socket.on('audit:new', handleNewAuditLog);
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);

    return () => {
      socket.off('audit:new', handleNewAuditLog);
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
    };
  }, [socket]);

  // ========================================
  // RETURN
  // ========================================
  return {
    entries,
    loading,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    unreadCount,
  };
};

export default useActivityTimeline;
