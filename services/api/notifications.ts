/**
 * Notifications API Service
 * Handles all notification-related API calls for the merchant app
 *
 * Features:
 * - Fetch and manage notifications
 * - Mark notifications as read
 * - Delete notifications
 * - Manage notification preferences (email/SMS)
 * - Support for 11+ email templates
 * - SendGrid and Twilio integration
 *
 * Backend Endpoints:
 * - GET    /api/merchant/notifications
 * - PUT    /api/merchant/notifications/settings
 * - POST   /api/merchant/notifications/:id/mark-read
 * - POST   /api/merchant/notifications/mark-all-read
 * - DELETE /api/merchant/notifications/:id
 * - GET    /api/merchant/notifications/preferences
 * - PUT    /api/merchant/notifications/preferences
 */

import { apiClient, ApiResponse, PaginatedResponse } from './index';
import { storageService } from '../storage';
import {
  Notification,
  NotificationWithDelivery,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferences,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadRequest,
  MarkAllNotificationsReadResponse,
  DeleteNotificationRequest,
  DeleteNotificationResponse,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse,
  GetNotificationStatsResponse,
  NotificationStats,
  OrderNotification,
  CashbackNotification,
  ProductNotification,
  TeamNotification,
  PaymentNotification,
} from '../../types/notifications';
import { getApiUrl } from '../../config/api';

/**
 * NotificationsService handles all notification operations
 */
class NotificationsService {
  private cacheKey = 'notifications_cache';
  private preferencesKey = 'notification_preferences_cache';
  private statsKey = 'notification_stats_cache';
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all notifications for current merchant
   * Supports filtering, pagination, and sorting
   */
  async getNotifications(request?: GetNotificationsRequest): Promise<Notification[]> {
    try {
      console.log('📬 Fetching notifications...', request);

      const params = this.buildNotificationParams(request);
      const url = `${getApiUrl('merchant/notifications')}${params}`;

      const response = await apiClient.getPaginated<Notification>(url);

      if (response.success && response.data?.items) {
        console.log('✅ Notifications fetched:', response.data.items.length);

        // Cache the notifications
        await this.cacheNotifications(response.data.items);

        return response.data.items;
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error: any) {
      console.error('❌ Get notifications error:', error);

      // Try to return cached notifications on error
      const cached = await this.getCachedNotifications();
      if (cached.length > 0) {
        console.log('📦 Returning cached notifications');
        return cached;
      }

      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get notifications with detailed delivery information
   */
  async getNotificationsWithDelivery(
    request?: GetNotificationsRequest
  ): Promise<NotificationWithDelivery[]> {
    try {
      console.log('📬 Fetching notifications with delivery details...', request);

      const params = this.buildNotificationParams(request);
      const url = `${getApiUrl('merchant/notifications')}${params}&includeDelivery=true`;

      const response = await apiClient.getPaginated<NotificationWithDelivery>(url);

      if (response.success && response.data?.items) {
        console.log('✅ Notifications with delivery details fetched:', response.data.items.length);
        return response.data.items;
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error: any) {
      console.error('❌ Get notifications with delivery error:', error);
      throw new Error(error.message || 'Failed to fetch notifications with delivery details');
    }
  }

  /**
   * Get unread notifications count and summary
   */
  async getUnreadCount(): Promise<{ unreadCount: number; byType: Record<string, number> }> {
    try {
      console.log('📬 Fetching unread notification count...');

      const response = await apiClient.get<{
        unreadCount: number;
        byType: Record<string, number>;
      }>('/api/merchant/notifications/unread');

      if (response.success && response.data) {
        console.log('✅ Unread count fetched:', response.data.unreadCount);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch unread count');
      }
    } catch (error: any) {
      console.error('❌ Get unread count error:', error);
      throw new Error(error.message || 'Failed to fetch unread count');
    }
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification> {
    try {
      console.log(`📬 Fetching notification ${notificationId}...`);

      const response = await apiClient.get<Notification>(
        `/api/merchant/notifications/${notificationId}`
      );

      if (response.success && response.data) {
        console.log('✅ Notification fetched:', notificationId);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch notification');
      }
    } catch (error: any) {
      console.error('❌ Get notification error:', error);
      throw new Error(error.message || 'Failed to fetch notification');
    }
  }

  /**
   * Mark single notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      console.log(`📖 Marking notification ${notificationId} as read...`);

      const request: MarkNotificationReadRequest = { notificationId };
      const response = await apiClient.post<MarkNotificationReadResponse['data']>(
        `/api/merchant/notifications/${notificationId}/mark-read`,
        request
      );

      if (response.success) {
        console.log('✅ Notification marked as read:', notificationId);

        // Invalidate cache
        await this.invalidateNotificationCache();
      } else {
        throw new Error(response.message || 'Failed to mark notification as read');
      }
    } catch (error: any) {
      console.error('❌ Mark as read error:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsAsRead(notificationIds: string[]): Promise<number> {
    try {
      console.log(`📖 Marking ${notificationIds.length} notifications as read...`);

      const response = await apiClient.post<{ markedCount: number }>(
        '/api/merchant/notifications/mark-multiple-read',
        { notificationIds }
      );

      if (response.success && response.data) {
        console.log('✅ Notifications marked as read:', response.data.markedCount);

        // Invalidate cache
        await this.invalidateNotificationCache();

        return response.data.markedCount;
      } else {
        throw new Error(response.message || 'Failed to mark notifications as read');
      }
    } catch (error: any) {
      console.error('❌ Mark multiple as read error:', error);
      throw new Error(error.message || 'Failed to mark notifications as read');
    }
  }

  /**
   * Mark all notifications as read (with optional filters)
   */
  async markAllNotificationsAsRead(request?: MarkAllNotificationsReadRequest): Promise<number> {
    try {
      console.log('📖 Marking all notifications as read...', request);

      const response = await apiClient.post<{ markedCount: number }>(
        '/api/merchant/notifications/mark-all-read',
        request || {}
      );

      if (response.success && response.data) {
        console.log('✅ All notifications marked as read:', response.data.markedCount);

        // Invalidate cache
        await this.invalidateNotificationCache();

        return response.data.markedCount;
      } else {
        throw new Error(response.message || 'Failed to mark all notifications as read');
      }
    } catch (error: any) {
      console.error('❌ Mark all as read error:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete single notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting notification ${notificationId}...`);

      const response = await apiClient.delete<DeleteNotificationResponse['data']>(
        `/api/merchant/notifications/${notificationId}`
      );

      if (response.success) {
        console.log('✅ Notification deleted:', notificationId);

        // Invalidate cache
        await this.invalidateNotificationCache();
      } else {
        throw new Error(response.message || 'Failed to delete notification');
      }
    } catch (error: any) {
      console.error('❌ Delete notification error:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<number> {
    try {
      console.log(`🗑️ Deleting ${notificationIds.length} notifications...`);

      const response = await apiClient.post<{ deletedCount: number }>(
        '/api/merchant/notifications/delete-multiple',
        { notificationIds }
      );

      if (response.success && response.data) {
        console.log('✅ Notifications deleted:', response.data.deletedCount);

        // Invalidate cache
        await this.invalidateNotificationCache();

        return response.data.deletedCount;
      } else {
        throw new Error(response.message || 'Failed to delete notifications');
      }
    } catch (error: any) {
      console.error('❌ Delete multiple error:', error);
      throw new Error(error.message || 'Failed to delete notifications');
    }
  }

  /**
   * Archive notification (soft delete)
   */
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      console.log(`📦 Archiving notification ${notificationId}...`);

      const response = await apiClient.put(
        `/api/merchant/notifications/${notificationId}/archive`,
        {}
      );

      if (response.success) {
        console.log('✅ Notification archived:', notificationId);

        // Invalidate cache
        await this.invalidateNotificationCache();
      } else {
        throw new Error(response.message || 'Failed to archive notification');
      }
    } catch (error: any) {
      console.error('❌ Archive notification error:', error);
      throw new Error(error.message || 'Failed to archive notification');
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      console.log('⚙️ Fetching notification preferences...');

      // Check cache first
      const cached = await this.getCachedPreferences();
      if (cached) {
        console.log('📦 Using cached preferences');
        return cached;
      }

      const response = await apiClient.get<NotificationPreferences>(
        '/api/merchant/notifications/preferences'
      );

      if (response.success && response.data) {
        console.log('✅ Notification preferences fetched');

        // Cache the preferences
        await this.cachePreferences(response.data);

        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch preferences');
      }
    } catch (error: any) {
      console.error('❌ Get preferences error:', error);

      // Try to return cached preferences on error
      const cached = await this.getCachedPreferences();
      if (cached) {
        console.log('📦 Returning cached preferences');
        return cached;
      }

      throw new Error(error.message || 'Failed to fetch notification preferences');
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    request: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    try {
      console.log('⚙️ Updating notification preferences...', request);

      const response = await apiClient.put<NotificationPreferences>(
        '/api/merchant/notifications/preferences',
        request
      );

      if (response.success && response.data) {
        console.log('✅ Notification preferences updated');

        // Update cache
        await this.cachePreferences(response.data);

        // Invalidate stats cache
        await this.invalidateStatsCache();

        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update preferences');
      }
    } catch (error: any) {
      console.error('❌ Update preferences error:', error);
      throw new Error(error.message || 'Failed to update notification preferences');
    }
  }

  /**
   * Update specific notification channel preferences
   */
  async updateChannelPreference(
    channel: NotificationChannel,
    settings: Record<string, any>
  ): Promise<NotificationPreferences> {
    try {
      console.log(`⚙️ Updating ${channel} channel preferences...`, settings);

      const request: UpdateNotificationPreferencesRequest = {} as any;

      if (channel === NotificationChannel.EMAIL) {
        (request as any).email = settings;
      } else if (channel === NotificationChannel.SMS) {
        (request as any).sms = settings;
      }

      return await this.updateNotificationPreferences(request);
    } catch (error: any) {
      console.error(`❌ Update ${channel} preference error:`, error);
      throw new Error(error.message || `Failed to update ${channel} preferences`);
    }
  }

  /**
   * Update notification category preferences
   */
  async updateCategoryPreference(
    type: NotificationType,
    settings: Record<string, any>
  ): Promise<NotificationPreferences> {
    try {
      console.log(`⚙️ Updating ${type} category preferences...`, settings);

      const request: UpdateNotificationPreferencesRequest = {
        categories: {
          [type]: settings,
        },
      };

      return await this.updateNotificationPreferences(request);
    } catch (error: any) {
      console.error(`❌ Update ${type} preference error:`, error);
      throw new Error(error.message || `Failed to update ${type} preferences`);
    }
  }

  /**
   * Enable/disable all notifications
   */
  async setGlobalMute(mute: boolean): Promise<NotificationPreferences> {
    try {
      console.log(`🔇 Setting global mute to ${mute}...`);

      return await this.updateNotificationPreferences({ globalMute: mute });
    } catch (error: any) {
      console.error('❌ Set global mute error:', error);
      throw new Error(error.message || 'Failed to set global mute');
    }
  }

  /**
   * Update do-not-disturb settings
   */
  async updateDoNotDisturb(settings: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    allowUrgent: boolean;
  }): Promise<NotificationPreferences> {
    try {
      console.log('🔇 Updating do-not-disturb settings...', settings);

      return await this.updateNotificationPreferences({ doNotDisturb: settings });
    } catch (error: any) {
      console.error('❌ Update DND error:', error);
      throw new Error(error.message || 'Failed to update do-not-disturb settings');
    }
  }

  /**
   * Subscribe to email notifications
   */
  async subscribeToEmail(email: string): Promise<void> {
    try {
      console.log(`📧 Subscribing to email notifications: ${email}...`);

      const response = await apiClient.post(
        '/api/merchant/notifications/subscribe-email',
        { email }
      );

      if (response.success) {
        console.log('✅ Subscribed to email notifications');

        // Invalidate preferences cache
        await this.invalidatePreferencesCache();
      } else {
        throw new Error(response.message || 'Failed to subscribe to email');
      }
    } catch (error: any) {
      console.error('❌ Subscribe email error:', error);
      throw new Error(error.message || 'Failed to subscribe to email notifications');
    }
  }

  /**
   * Subscribe to SMS notifications
   */
  async subscribeToSms(phone: string): Promise<void> {
    try {
      console.log(`📱 Subscribing to SMS notifications: ${phone}...`);

      const response = await apiClient.post(
        '/api/merchant/notifications/subscribe-sms',
        { phone }
      );

      if (response.success) {
        console.log('✅ Subscribed to SMS notifications');

        // Invalidate preferences cache
        await this.invalidatePreferencesCache();
      } else {
        throw new Error(response.message || 'Failed to subscribe to SMS');
      }
    } catch (error: any) {
      console.error('❌ Subscribe SMS error:', error);
      throw new Error(error.message || 'Failed to subscribe to SMS notifications');
    }
  }

  /**
   * Unsubscribe from email notifications
   */
  async unsubscribeFromEmail(): Promise<void> {
    try {
      console.log('📧 Unsubscribing from email notifications...');

      const response = await apiClient.post('/api/merchant/notifications/unsubscribe-email', {});

      if (response.success) {
        console.log('✅ Unsubscribed from email notifications');

        // Invalidate preferences cache
        await this.invalidatePreferencesCache();
      } else {
        throw new Error(response.message || 'Failed to unsubscribe from email');
      }
    } catch (error: any) {
      console.error('❌ Unsubscribe email error:', error);
      throw new Error(error.message || 'Failed to unsubscribe from email notifications');
    }
  }

  /**
   * Unsubscribe from SMS notifications
   */
  async unsubscribeFromSms(): Promise<void> {
    try {
      console.log('📱 Unsubscribing from SMS notifications...');

      const response = await apiClient.post('/api/merchant/notifications/unsubscribe-sms', {});

      if (response.success) {
        console.log('✅ Unsubscribed from SMS notifications');

        // Invalidate preferences cache
        await this.invalidatePreferencesCache();
      } else {
        throw new Error(response.message || 'Failed to unsubscribe from SMS');
      }
    } catch (error: any) {
      console.error('❌ Unsubscribe SMS error:', error);
      throw new Error(error.message || 'Failed to unsubscribe from SMS notifications');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      console.log('📊 Fetching notification statistics...');

      // Check cache first
      const cached = await this.getCachedStats();
      if (cached) {
        console.log('📦 Using cached statistics');
        return cached;
      }

      const response = await apiClient.get<NotificationStats>(
        '/api/merchant/notifications/stats'
      );

      if (response.success && response.data) {
        console.log('✅ Notification statistics fetched');

        // Cache the stats
        await this.cacheStats(response.data);

        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('❌ Get stats error:', error);

      // Try to return cached stats on error
      const cached = await this.getCachedStats();
      if (cached) {
        console.log('📦 Returning cached statistics');
        return cached;
      }

      throw new Error(error.message || 'Failed to fetch notification statistics');
    }
  }

  /**
   * Clear all notifications (batch delete)
   */
  async clearAllNotifications(type?: NotificationType): Promise<number> {
    try {
      console.log('🧹 Clearing all notifications...', type);

      const response = await apiClient.post<{ deletedCount: number }>(
        '/api/merchant/notifications/clear-all',
        { type }
      );

      if (response.success && response.data) {
        console.log('✅ Notifications cleared:', response.data.deletedCount);

        // Invalidate cache
        await this.invalidateNotificationCache();

        return response.data.deletedCount;
      } else {
        throw new Error(response.message || 'Failed to clear notifications');
      }
    } catch (error: any) {
      console.error('❌ Clear all error:', error);
      throw new Error(error.message || 'Failed to clear notifications');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Build query parameters for notifications endpoint
   */
  private buildNotificationParams(request?: GetNotificationsRequest): string {
    if (!request) return '';

    const params = new URLSearchParams();

    if (request.page) params.append('page', request.page.toString());
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.type) params.append('type', request.type);
    if (request.status) params.append('status', request.status);
    if (request.priority) params.append('priority', request.priority);
    if (request.startDate) params.append('startDate', request.startDate);
    if (request.endDate) params.append('endDate', request.endDate);
    if (request.unreadOnly) params.append('unreadOnly', 'true');
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortOrder) params.append('sortOrder', request.sortOrder);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Cache notification list
   */
  private async cacheNotifications(notifications: Notification[]): Promise<void> {
    try {
      const cacheData = {
        notifications,
        timestamp: Date.now(),
      };
      await storageService.set(this.cacheKey, cacheData);
    } catch (error) {
      console.warn('Failed to cache notifications:', error);
    }
  }

  /**
   * Get cached notifications
   */
  private async getCachedNotifications(): Promise<Notification[]> {
    try {
      const cached = await storageService.get<any>(this.cacheKey);
      if (cached && Date.now() - (cached.timestamp as number) < this.cacheDuration) {
        return (cached.notifications as Notification[]) || [];
      }
    } catch (error) {
      console.warn('Failed to get cached notifications:', error);
    }
    return [];
  }

  /**
   * Invalidate notification cache
   */
  private async invalidateNotificationCache(): Promise<void> {
    try {
      await storageService.remove(this.cacheKey);
    } catch (error) {
      console.warn('Failed to invalidate notification cache:', error);
    }
  }

  /**
   * Cache notification preferences
   */
  private async cachePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      const cacheData = {
        preferences,
        timestamp: Date.now(),
      };
      await storageService.set(this.preferencesKey, cacheData);
    } catch (error) {
      console.warn('Failed to cache preferences:', error);
    }
  }

  /**
   * Get cached preferences
   */
  private async getCachedPreferences(): Promise<NotificationPreferences | null> {
    try {
      const cached = await storageService.get<any>(this.preferencesKey);
      if (cached && Date.now() - (cached.timestamp as number) < this.cacheDuration) {
        return (cached.preferences as NotificationPreferences) || null;
      }
    } catch (error) {
      console.warn('Failed to get cached preferences:', error);
    }
    return null;
  }

  /**
   * Invalidate preferences cache
   */
  private async invalidatePreferencesCache(): Promise<void> {
    try {
      await storageService.remove(this.preferencesKey);
    } catch (error) {
      console.warn('Failed to invalidate preferences cache:', error);
    }
  }

  /**
   * Cache notification stats
   */
  private async cacheStats(stats: NotificationStats): Promise<void> {
    try {
      const cacheData = {
        stats,
        timestamp: Date.now(),
      };
      await storageService.set(this.statsKey, cacheData);
    } catch (error) {
      console.warn('Failed to cache stats:', error);
    }
  }

  /**
   * Get cached stats
   */
  private async getCachedStats(): Promise<NotificationStats | null> {
    try {
      const cached = await storageService.get<any>(this.statsKey);
      if (cached && Date.now() - (cached.timestamp as number) < this.cacheDuration) {
        return (cached.stats as NotificationStats) || null;
      }
    } catch (error) {
      console.warn('Failed to get cached stats:', error);
    }
    return null;
  }

  /**
   * Invalidate stats cache
   */
  private async invalidateStatsCache(): Promise<void> {
    try {
      await storageService.remove(this.statsKey);
    } catch (error) {
      console.warn('Failed to invalidate stats cache:', error);
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();

export default notificationsService;
