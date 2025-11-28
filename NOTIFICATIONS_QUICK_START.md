# Notifications API - Quick Start Guide

## Import the Service

```typescript
import { notificationsService } from '@/services/api';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority
} from '@/types/notifications';
```

## Common Tasks

### 1. Get All Notifications
```typescript
// Basic - get all notifications
const notifications = await notificationsService.getNotifications();

// With filters
const unreadOrders = await notificationsService.getNotifications({
  type: NotificationType.ORDER,
  status: NotificationStatus.UNREAD,
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

// Date range filter
const recentNotifications = await notificationsService.getNotifications({
  startDate: '2024-11-01',
  endDate: '2024-11-17',
  sortBy: 'priority',
  sortOrder: 'desc'
});
```

### 2. Get Unread Count
```typescript
const { unreadCount, byType } = await notificationsService.getUnreadCount();
console.log(`Total unread: ${unreadCount}`);
console.log(`Orders: ${byType.order}, Products: ${byType.product}`);
```

### 3. Mark as Read
```typescript
// Single notification
await notificationsService.markNotificationAsRead(notificationId);

// Multiple notifications
await notificationsService.markNotificationsAsRead([id1, id2, id3]);

// All notifications
await notificationsService.markAllNotificationsAsRead();

// All of specific type
await notificationsService.markAllNotificationsAsRead({
  type: NotificationType.ORDER
});
```

### 4. Delete Notifications
```typescript
// Delete single
await notificationsService.deleteNotification(notificationId);

// Delete multiple
await notificationsService.deleteNotifications([id1, id2, id3]);

// Clear all
await notificationsService.clearAllNotifications();

// Clear all of type
await notificationsService.clearAllNotifications(NotificationType.PRODUCT);
```

### 5. Manage Preferences
```typescript
// Get preferences
const prefs = await notificationsService.getNotificationPreferences();

// Update multiple settings
await notificationsService.updateNotificationPreferences({
  globalMute: false,
  email: {
    subscribed: true,
    marketingEmails: true
  },
  sms: {
    subscribed: false
  }
});

// Toggle global mute
await notificationsService.setGlobalMute(true);

// Update do-not-disturb
await notificationsService.updateDoNotDisturb({
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  allowUrgent: true
});

// Update specific channel
await notificationsService.updateChannelPreference(
  NotificationChannel.EMAIL,
  {
    enabled: true,
    frequency: 'daily_digest',
    quietHours: {
      enabled: true,
      startTime: '20:00',
      endTime: '09:00'
    }
  }
);

// Update notification type preferences
await notificationsService.updateCategoryPreference(
  NotificationType.ORDER,
  { enabled: true }
);
```

### 6. Subscribe/Unsubscribe
```typescript
// Subscribe to email
await notificationsService.subscribeToEmail('merchant@example.com');

// Subscribe to SMS
await notificationsService.subscribeToSms('+1234567890');

// Unsubscribe from email
await notificationsService.unsubscribeFromEmail();

// Unsubscribe from SMS
await notificationsService.unsubscribeFromSms();
```

### 7. Get Statistics
```typescript
const stats = await notificationsService.getNotificationStats();
console.log(`Total: ${stats.totalNotifications}`);
console.log(`Unread: ${stats.unreadCount}`);
console.log(`By type:`, stats.byType);
console.log(`By status:`, stats.byStatus);
```

### 8. Get with Delivery Details
```typescript
const notifications = await notificationsService.getNotificationsWithDelivery({
  page: 1,
  limit: 10
});

notifications.forEach(notif => {
  console.log('Email status:', notif.deliveryDetails.email?.status);
  console.log('SMS status:', notif.deliveryDetails.sms?.status);
  console.log('Push status:', notif.deliveryDetails.push?.status);
});
```

## Notification Types

```typescript
// Enum values
NotificationType.ORDER       // Order updates
NotificationType.PRODUCT     // Product notifications
NotificationType.CASHBACK    // Cashback updates
NotificationType.TEAM        // Team management
NotificationType.SYSTEM      // System alerts
NotificationType.PAYMENT     // Payment notifications
NotificationType.MARKETING   // Marketing notifications
NotificationType.REVIEW      // Review notifications
NotificationType.INVENTORY   // Stock notifications
NotificationType.ANALYTICS   // Analytics reports
```

## Notification Channels

```typescript
NotificationChannel.EMAIL    // SendGrid emails
NotificationChannel.SMS      // Twilio SMS
NotificationChannel.IN_APP   // In-app notifications
NotificationChannel.PUSH     // Push notifications
```

## Notification Status

```typescript
NotificationStatus.UNREAD    // Unread notification
NotificationStatus.READ      // Read notification
NotificationStatus.ARCHIVED  // Archived notification
NotificationStatus.DISMISSED // Dismissed notification
```

## Priority Levels

```typescript
NotificationPriority.LOW     // Low priority
NotificationPriority.MEDIUM  // Medium priority
NotificationPriority.HIGH    // High priority
NotificationPriority.URGENT  // Urgent priority
```

## Error Handling

```typescript
try {
  const notifications = await notificationsService.getNotifications();
} catch (error) {
  console.error('Failed to get notifications:', error.message);
  // Service will automatically fallback to cached data if available
}
```

## With React Hooks

```typescript
import { useState, useEffect } from 'react';
import { notificationsService } from '@/services/api';
import { Notification } from '@/types/notifications';

function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationsService.getNotifications({
          limit: 20,
          page: 1
        });
        setNotifications(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id}>
          <h3>{notif.title}</h3>
          <p>{notif.message}</p>
          <button onClick={() => notificationsService.markNotificationAsRead(notif.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

## With Context Provider

```typescript
import { createContext, useContext, useState, useCallback } from 'react';
import { notificationsService } from '@/services/api';
import { Notification } from '@/types/notifications';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
      const { unreadCount } = await notificationsService.getUnreadCount();
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await notificationsService.markNotificationAsRead(id);
    await fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
```

## Filtering Examples

```typescript
// High priority unread
await notificationsService.getNotifications({
  priority: NotificationPriority.HIGH,
  status: NotificationStatus.UNREAD
});

// Recent cashback notifications
await notificationsService.getNotifications({
  type: NotificationType.CASHBACK,
  startDate: '2024-11-10',
  endDate: '2024-11-17'
});

// Sorted by priority, newest first
await notificationsService.getNotifications({
  sortBy: 'priority',
  sortOrder: 'desc'
});

// Paginated results
await notificationsService.getNotifications({
  page: 2,
  limit: 50
});
```

## Preference Examples

```typescript
// Mute all notifications
await notificationsService.setGlobalMute(true);

// Enable only email for orders
await notificationsService.updateCategoryPreference(
  NotificationType.ORDER,
  { enabled: true }
);

// Daily digest at 9 AM
await notificationsService.updateNotificationPreferences({
  dailyDigest: {
    enabled: true,
    time: '09:00',
    includeCategories: [
      NotificationType.ORDER,
      NotificationType.PRODUCT
    ]
  }
});

// Weekly report on Friday
await notificationsService.updateNotificationPreferences({
  weeklyDigest: {
    enabled: true,
    day: 'friday',
    time: '09:00',
    includeCategories: [
      NotificationType.ANALYTICS,
      NotificationType.PAYMENT
    ]
  }
});
```

## Best Practices

1. **Cache checking** - Service automatically caches results for 5 minutes
2. **Error handling** - Always wrap in try-catch
3. **Batch operations** - Use bulk methods for multiple items
4. **Pagination** - Use pagination for large result sets
5. **Filtering** - Filter on server side to reduce data transfer
6. **Sorting** - Specify sort order to match UI needs
7. **Debounce** - Debounce rapid preference changes
8. **Validation** - Validate user input before sending

## Performance Tips

- Use pagination with limit: 20-50 for notification lists
- Filter by type/status to reduce results
- Use unreadOnly filter when appropriate
- Leverage caching for repeated requests
- Batch mark-as-read operations
- Update preferences infrequently

## Debugging

```typescript
// Check cached notifications
console.log('Cached:', await notificationsService.getNotifications());

// Check preferences
const prefs = await notificationsService.getNotificationPreferences();
console.log('Current preferences:', prefs);

// Check statistics
const stats = await notificationsService.getNotificationStats();
console.log('Statistics:', stats);

// Enable API logging
process.env.ENABLE_API_LOGGING = 'true';
```

---

For complete API reference, see `NOTIFICATIONS_API_COMPLETE.md`
