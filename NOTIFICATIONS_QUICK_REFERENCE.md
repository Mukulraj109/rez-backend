# Notifications Quick Reference

## 🚀 Quick Start

### Navigate to Notifications
```typescript
import { router } from 'expo-router';

// Navigate to notification center
router.push('/notifications');

// Navigate to specific notification
router.push('/notifications/abc123');

// Navigate to preferences
router.push('/notifications/preferences');

// Navigate to settings
router.push('/notifications/settings');
```

### Use Notification Context
```typescript
import { useNotificationContext } from '@/contexts/NotificationContext';

function MyComponent() {
  const { unreadCount, unreadByType, latestNotification } = useNotificationContext();

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      <Text>Orders: {unreadByType.order || 0}</Text>
    </View>
  );
}
```

### Use Notification Hooks
```typescript
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead
} from '@/hooks/queries/useNotifications';

function NotificationList() {
  const { data: notifications, isLoading } = useNotifications({ unreadOnly: true });
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  // ... rest of component
}
```

---

## 🎯 Common Use Cases

### 1. Show Unread Count in Tab Bar
```typescript
import { useNotificationContext } from '@/contexts/NotificationContext';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';

function TabBarIcon() {
  const { unreadCount } = useNotificationContext();

  return (
    <View>
      <Ionicons name="notifications" size={24} />
      <NotificationBadge count={unreadCount} position="top-right" />
    </View>
  );
}
```

### 2. Listen for New Notifications
```typescript
import { useEffect } from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';

function MyScreen() {
  const { latestNotification } = useNotificationContext();

  useEffect(() => {
    if (latestNotification) {
      console.log('New notification received:', latestNotification.title);
      // Handle new notification
    }
  }, [latestNotification]);

  // ... rest of component
}
```

### 3. Mark All as Read
```typescript
import { useMarkAllAsRead } from '@/hooks/queries/useNotifications';

function NotificationScreen() {
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(); // Mark all notifications as read
  };

  return (
    <Button onPress={handleMarkAllAsRead}>
      Mark All as Read
    </Button>
  );
}
```

### 4. Filter by Type
```typescript
import { useNotificationsByType } from '@/hooks/queries/useNotifications';
import { NotificationType } from '@/types/notifications';

function OrderNotifications() {
  const { data: orderNotifications } = useNotificationsByType(
    NotificationType.ORDER
  );

  return (
    <FlatList
      data={orderNotifications}
      renderItem={({ item }) => <NotificationCard notification={item} />}
    />
  );
}
```

### 5. Update Preferences
```typescript
import { useUpdateNotificationPreferences } from '@/hooks/queries/useNotifications';

function PreferencesForm() {
  const updatePrefs = useUpdateNotificationPreferences();

  const handleTogglePush = (enabled: boolean) => {
    updatePrefs.mutate({
      globalMute: !enabled
    });
  };

  const handleToggleQuietHours = (enabled: boolean) => {
    updatePrefs.mutate({
      doNotDisturb: {
        enabled,
        startTime: '22:00',
        endTime: '08:00',
        allowUrgent: true
      }
    });
  };

  // ... rest of component
}
```

---

## 🔔 Notification Types

```typescript
enum NotificationType {
  ORDER = 'order',           // Order-related notifications
  PRODUCT = 'product',       // Product updates
  CASHBACK = 'cashback',     // Cashback notifications
  TEAM = 'team',             // Team member updates
  SYSTEM = 'system',         // System alerts
  PAYMENT = 'payment',       // Payment notifications
  MARKETING = 'marketing',   // Marketing campaigns
  REVIEW = 'review',         // Product reviews
  INVENTORY = 'inventory',   // Stock updates
  ANALYTICS = 'analytics',   // Analytics reports
}
```

---

## 🎨 Icon & Color Reference

```typescript
const NOTIFICATION_CONFIG = {
  order: {
    icon: 'cart',
    color: '#3B82F6' // Blue
  },
  product: {
    icon: 'cube',
    color: '#8B5CF6' // Purple
  },
  cashback: {
    icon: 'cash',
    color: '#10B981' // Green
  },
  team: {
    icon: 'people',
    color: '#F59E0B' // Amber
  },
  payment: {
    icon: 'card',
    color: '#EC4899' // Pink
  },
  system: {
    icon: 'settings',
    color: '#6B7280' // Gray
  }
};
```

---

## 🔌 Socket Events

### Events You Can Listen To

```typescript
import { socketService } from '@/services/api/socket';

// New notification received
socketService.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});

// Notification marked as read
socketService.on('notification:read', ({ notificationId }) => {
  console.log('Marked as read:', notificationId);
});

// Notification deleted
socketService.on('notification:deleted', ({ notificationId }) => {
  console.log('Deleted:', notificationId);
});

// Unread count updated
socketService.on('notification:unread-count', ({ count, byType }) => {
  console.log('Unread count:', count);
  console.log('By type:', byType);
});
```

---

## 🔐 Permission Checks

```typescript
import { useAuth } from '@/contexts/AuthContext';

function ExportButton() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('notifications:export');

  if (!canExport) {
    return <Text>No permission to export</Text>;
  }

  return (
    <Button onPress={handleExport}>
      Export Notifications
    </Button>
  );
}
```

**Available Permissions:**
- `notifications:view` - View notifications
- `notifications:manage` - Manage settings
- `notifications:export` - Export history

---

## 📊 Query Invalidation

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';

function MyComponent() {
  const queryClient = useQueryClient();

  const refreshNotifications = () => {
    // Invalidate all notification queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all
    });
  };

  const refreshUnreadCount = () => {
    // Invalidate unread count only
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unread()
    });
  };

  // ... rest of component
}
```

---

## 🎯 Best Practices

### 1. Always Use Optimistic Updates
```typescript
// ✅ Good - uses built-in optimistic updates
const markAsRead = useMarkAsRead();
markAsRead.mutate(notificationId);

// ❌ Bad - manual API call without optimistic updates
await notificationsService.markNotificationAsRead(notificationId);
```

### 2. Use Context for Global State
```typescript
// ✅ Good - uses context for unread count
const { unreadCount } = useNotificationContext();

// ❌ Bad - fetches unread count in every component
const { data } = useUnreadCount();
```

### 3. Handle Loading and Error States
```typescript
// ✅ Good
const { data, isLoading, error } = useNotifications();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorState error={error} />;
if (!data?.length) return <EmptyState />;

// ❌ Bad - no error handling
const { data } = useNotifications();
return <List data={data} />;
```

### 4. Clean Up Socket Listeners
```typescript
// ✅ Good - cleanup in useEffect
useEffect(() => {
  const handleNewNotification = (notif) => {
    console.log('New notification:', notif);
  };

  socketService.on('notification:new', handleNewNotification);

  return () => {
    socketService.off('notification:new', handleNewNotification);
  };
}, []);

// ❌ Bad - no cleanup
useEffect(() => {
  socketService.on('notification:new', handleNewNotification);
}, []);
```

---

## 🐛 Troubleshooting

### Notifications Not Updating
```typescript
// Check if NotificationProvider is in the tree
// app/_layout.tsx should have:
<NotificationProvider>
  <YourApp />
</NotificationProvider>
```

### Socket Events Not Firing
```typescript
// Check socket connection
import { socketService } from '@/services/api/socket';

// In your component
useEffect(() => {
  const checkConnection = async () => {
    const isConnected = socketService.isConnected();
    console.log('Socket connected:', isConnected);
  };

  checkConnection();
}, []);
```

### Toast Not Showing
```typescript
// Make sure NotificationToastContainer is rendered
// app/_layout.tsx should have:
<NotificationProvider>
  <NotificationToastContainer />
  <YourApp />
</NotificationProvider>
```

### Query Not Refetching
```typescript
// Manually refetch
const { refetch } = useNotifications();

const handleRefresh = () => {
  refetch();
};
```

---

## 📱 Screen Routes

```typescript
/notifications              // Main notification center
/notifications/:id          // Notification detail
/notifications/preferences  // Notification preferences
/notifications/settings     // Advanced settings
```

---

## 🎉 That's It!

You're now ready to use the Notification Center in your merchant app. For more details, see `WEEK_6_AGENT_2_NOTIFICATIONS_IMPLEMENTATION.md`.
