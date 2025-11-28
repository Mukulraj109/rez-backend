import { useQuery, useMutation, useInfiniteQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { notificationsService } from '@/services/api/notifications';
import { queryKeys } from './queryKeys';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationPreferences,
  GetNotificationsRequest,
} from '@/types/notifications';

/**
 * Hook to fetch paginated notifications
 */
export function useNotifications(
  filters?: GetNotificationsRequest,
  options?: UseQueryOptions<Notification[]>
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const notifications = await notificationsService.getNotifications(filters);
      return notifications;
    },
    staleTime: 30 * 1000, // 30 seconds - notifications need frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch infinite list of notifications (for scroll pagination)
 */
export function useInfiniteNotifications(
  filters?: Omit<GetNotificationsRequest, 'page'>,
  options?: any
) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const notifications = await notificationsService.getNotifications({
        ...filters,
        page: pageParam,
        limit: filters?.limit || 20,
      });
      return {
        items: notifications,
        nextPage: notifications.length >= (filters?.limit || 20) ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch single notification by ID
 */
export function useNotification(
  notificationId: string,
  options?: UseQueryOptions<Notification>
) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(notificationId),
    queryFn: async () => {
      const notification = await notificationsService.getNotification(notificationId);
      return notification;
    },
    enabled: !!notificationId,
    staleTime: 1 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadCount(options?: UseQueryOptions<{ unreadCount: number; byType: Record<string, number> }>) {
  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const data = await notificationsService.getUnreadCount();
      return data;
    },
    staleTime: 30 * 1000, // Refresh frequently
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...options,
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences(options?: UseQueryOptions<NotificationPreferences>) {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: async () => {
      const preferences = await notificationsService.getNotificationPreferences();
      return preferences;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch notification statistics
 */
export function useNotificationStats(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.notifications.stats(),
    queryFn: async () => {
      const stats = await notificationsService.getNotificationStats();
      return stats;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Mutation to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationsService.markNotificationAsRead(notificationId);
      return notificationId;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousData = queryClient.getQueryData(queryKeys.notifications.all);

      // Update all notification lists
      queryClient.setQueriesData({ queryKey: queryKeys.notifications.all }, (old: any) => {
        if (Array.isArray(old)) {
          return old.map((n: Notification) =>
            n.id === notificationId ? { ...n, status: NotificationStatus.READ, readAt: new Date().toISOString() } : n
          );
        }
        return old;
      });

      // Update unread count
      queryClient.setQueryData(queryKeys.notifications.unread(), (old: any) => {
        if (old) {
          return {
            ...old,
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        }
        return old;
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    },
  });
}

/**
 * Mutation to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filters?: { type?: NotificationType }) => {
      const count = await notificationsService.markAllNotificationsAsRead(filters);
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    },
  });
}

/**
 * Mutation to delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationsService.deleteNotification(notificationId);
      return notificationId;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousData = queryClient.getQueryData(queryKeys.notifications.all);

      // Remove from all notification lists
      queryClient.setQueriesData({ queryKey: queryKeys.notifications.all }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((n: Notification) => n.id !== notificationId);
        }
        return old;
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    },
  });
}

/**
 * Mutation to delete multiple notifications
 */
export function useDeleteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const count = await notificationsService.deleteNotifications(notificationIds);
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    },
  });
}

/**
 * Mutation to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const updated = await notificationsService.updateNotificationPreferences(preferences);
      return updated;
    },
    onMutate: async (newPreferences) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preferences() });

      const previousPreferences = queryClient.getQueryData(queryKeys.notifications.preferences());

      queryClient.setQueryData(queryKeys.notifications.preferences(), (old: any) => ({
        ...old,
        ...newPreferences,
      }));

      return { previousPreferences };
    },
    onError: (err, variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.notifications.preferences(), context.previousPreferences);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
}

/**
 * Mutation to clear all notifications
 */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type?: NotificationType) => {
      const count = await notificationsService.clearAllNotifications(type);
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() });
    },
  });
}

/**
 * Hook to fetch notifications by type
 */
export function useNotificationsByType(
  type: NotificationType,
  options?: UseQueryOptions<Notification[]>
) {
  return useQuery({
    queryKey: queryKeys.notifications.byType(type),
    queryFn: async () => {
      const notifications = await notificationsService.getNotifications({ type });
      return notifications;
    },
    enabled: !!type,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch unread notifications only
 */
export function useUnreadNotifications(options?: UseQueryOptions<Notification[]>) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadList(),
    queryFn: async () => {
      const notifications = await notificationsService.getNotifications({ unreadOnly: true });
      return notifications;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...options,
  });
}
