# Notification Utilities

Comprehensive utilities for notification processing, formatting, filtering, and management.

## Files

- `notificationHelpers.ts` (~500 lines) - 25+ helper functions
- `notificationConstants.ts` (~300 lines) - All notification-related constants

## Helper Functions

### Formatting

```typescript
// Format notification title
formatNotificationTitle(notification) // "New Order"

// Format notification message
formatNotificationMessage(notification) // "You have a new order #12345"

// Get notification icon
getNotificationIcon(NotificationType.ORDER) // "cart"

// Get notification color
getNotificationColor(NotificationType.ORDER) // "#34C759"

// Get priority color
getPriorityColor(NotificationPriority.URGENT) // "#FF3B30"

// Format relative time
formatNotificationTime('2024-01-15T10:30:00Z') // "2h ago"
```

### Filtering

```typescript
// Filter notifications
const filtered = filterNotifications(notifications, {
  type: NotificationType.ORDER,
  status: NotificationStatus.UNREAD,
  priority: NotificationPriority.HIGH,
  unreadOnly: true,
  search: 'order',
});

// Filter unread only
const unread = filterUnread(notifications);

// Filter by type
const orders = filterByType(notifications, NotificationType.ORDER);

// Filter by priority
const urgent = filterByPriority(notifications, NotificationPriority.URGENT);
```

### Grouping

```typescript
// Group by date
const byDate = groupNotificationsByDate(notifications);
// {
//   "Today": [...],
//   "Yesterday": [...],
//   "This Week": [...],
//   "Older": [...]
// }

// Group by type
const byType = groupNotificationsByType(notifications);
// {
//   [NotificationType.ORDER]: [...],
//   [NotificationType.PRODUCT]: [...]
// }

// Group by priority
const byPriority = groupNotificationsByPriority(notifications);
// {
//   [NotificationPriority.URGENT]: [...],
//   [NotificationPriority.HIGH]: [...]
// }
```

### Badge Counting

```typescript
// Get unread count
const count = getUnreadCount(notifications); // 15

// Get unread by type
const orderCount = getUnreadCountByType(
  notifications,
  NotificationType.ORDER
); // 5

// Get unread by priority
const urgentCount = getUnreadCountByPriority(
  notifications,
  NotificationPriority.URGENT
); // 2

// Get urgent unread
const urgent = getUrgentUnreadCount(notifications); // 2

// Get counts by type
const counts = getCountsByType(notifications);
// {
//   [NotificationType.ORDER]: { total: 10, unread: 5 },
//   [NotificationType.PRODUCT]: { total: 8, unread: 3 }
// }
```

### Preferences

```typescript
// Check if notification should be shown
const shouldShow = shouldShowNotification(notification, preferences);

// Check if in quiet hours
const isQuiet = isQuietHours(preferences); // true/false

// Get enabled channels for type
const channels = getEnabledChannels(
  NotificationType.ORDER,
  preferences
);
// [NotificationChannel.EMAIL, NotificationChannel.PUSH]

// Check if channel is enabled
const emailEnabled = isChannelEnabled(
  NotificationType.ORDER,
  NotificationChannel.EMAIL,
  preferences
); // true
```

### Actions

```typescript
// Get notification action
const action = getNotificationAction(notification);
// {
//   label: "View Order",
//   action: "navigate",
//   url: "/orders/123"
// }

// Build notification payload
const payload = buildNotificationPayload(NotificationType.ORDER, {
  message: 'New order received',
  priority: NotificationPriority.HIGH,
  relatedEntityId: 'order-123',
});
```

### Sorting

```typescript
// Sort by newest first
const sorted = sortByNewest(notifications);

// Sort by priority
const byPriority = sortByPriority(notifications);

// Sort (unread first, then by priority, then by date)
const smartSort = sortNotifications(notifications);
```

### Statistics

```typescript
// Get notification statistics
const stats = getNotificationStats(notifications);
// {
//   total: 50,
//   unread: 15,
//   read: 35,
//   urgent: 2,
//   byType: { ... }
// }

// Get delivery rate
const deliveryRate = getDeliveryRate(notifications); // 95 (%)
```

## Constants

### Notification Type Configurations

```typescript
NOTIFICATION_TYPES[NotificationType.ORDER]
// {
//   label: "Orders",
//   description: "Order updates and notifications",
//   icon: "cart",
//   color: "#34C759",
//   defaultPriority: NotificationPriority.HIGH,
//   defaultChannels: [IN_APP, EMAIL, PUSH],
//   requiresAction: true
// }
```

### Channel Configurations

```typescript
NOTIFICATION_CHANNELS[NotificationChannel.EMAIL]
// {
//   label: "Email",
//   description: "Send email notifications",
//   icon: "mail",
//   enabled: true,
//   requiresSetup: true
// }
```

### Priority Configurations

```typescript
NOTIFICATION_PRIORITIES[NotificationPriority.URGENT]
// {
//   label: "Urgent",
//   description: "Critical, immediate action required",
//   icon: "warning",
//   color: "#FF3B30",
//   soundEnabled: true,
//   vibrationEnabled: true
// }
```

### Other Constants

- `RETENTION_PERIODS` - How long to keep notifications
- `GROUPING_OPTIONS` - Ways to group notifications
- `DIGEST_FREQUENCIES` - Email digest frequencies
- `QUIET_HOURS_PRESETS` - Common quiet hour settings
- `NOTIFICATION_SOUNDS` - Available sound options
- `VIBRATION_PATTERNS` - Vibration pattern options
- `EMAIL_TEMPLATE_CATEGORIES` - Template organization
- `NOTIFICATION_LIMITS` - Rate limits and constraints
- `BADGE_SETTINGS` - Badge display settings

## Usage Examples

### Basic Filtering and Display

```typescript
import {
  filterNotifications,
  groupNotificationsByDate,
  formatNotificationTime
} from '@/utils/notifications/notificationHelpers';

// Filter unread notifications
const unread = filterNotifications(allNotifications, {
  unreadOnly: true,
  priority: NotificationPriority.HIGH
});

// Group by date
const grouped = groupNotificationsByDate(unread);

// Display
Object.entries(grouped).forEach(([date, notifications]) => {
  console.log(`\n${date}:`);
  notifications.forEach(notif => {
    console.log(`  - ${notif.title} (${formatNotificationTime(notif.createdAt)})`);
  });
});
```

### Badge Management

```typescript
import {
  getUnreadCount,
  getCountsByType,
  getUrgentUnreadCount
} from '@/utils/notifications/notificationHelpers';

// Get total unread
const totalUnread = getUnreadCount(notifications);

// Get counts by type for badges
const typeCounts = getCountsByType(notifications);
console.log('Order notifications:', typeCounts[NotificationType.ORDER].unread);

// Check for urgent notifications
const urgentCount = getUrgentUnreadCount(notifications);
if (urgentCount > 0) {
  console.warn(`⚠️ ${urgentCount} urgent notifications!`);
}
```

### Preference Checking

```typescript
import {
  shouldShowNotification,
  isQuietHours,
  getEnabledChannels
} from '@/utils/notifications/notificationHelpers';

// Check if notification should be shown
if (shouldShowNotification(notification, userPreferences)) {
  // Get enabled channels
  const channels = getEnabledChannels(notification.type, userPreferences);

  // Send through each channel
  for (const channel of channels) {
    await sendNotification(notification, channel);
  }
}

// Respect quiet hours
if (isQuietHours(userPreferences)) {
  if (notification.priority === NotificationPriority.URGENT) {
    // Allow urgent notifications
    await sendNotification(notification);
  } else {
    // Queue for later
    await queueNotification(notification);
  }
}
```

### Smart Sorting

```typescript
import { sortNotifications } from '@/utils/notifications/notificationHelpers';

// Sort intelligently (unread first, then priority, then date)
const sorted = sortNotifications(notifications);

// Display with sections
const unread = sorted.filter(n => n.status === NotificationStatus.UNREAD);
const read = sorted.filter(n => n.status !== NotificationStatus.UNREAD);

console.log('Unread:', unread.length);
console.log('Read:', read.length);
```

## Performance Tips

1. **Cache counts** - Use `useMemo` for badge counts
2. **Debounce filters** - Wait before applying search filters
3. **Virtualize lists** - Use `FlatList` for large notification lists
4. **Lazy load** - Load notifications on demand
5. **Group efficiently** - Group once, not on every render

## Best Practices

1. **Respect preferences** - Always check user preferences before sending
2. **Honor quiet hours** - Don't disturb users during quiet times (except urgent)
3. **Batch updates** - Group notification updates to reduce re-renders
4. **Clear old notifications** - Archive or delete old notifications regularly
5. **Provide actions** - Include clear action buttons when possible
6. **Test channels** - Verify all notification channels work correctly
7. **Handle failures** - Gracefully handle send failures and retry
8. **Track analytics** - Monitor notification engagement rates

## Integration with Socket.IO

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { getUnreadCount } from '@/utils/notifications/notificationHelpers';

const socket = useSocket();

socket.on('notification:new', (notification) => {
  // Add to list
  setNotifications(prev => [notification, ...prev]);

  // Update badge
  const newCount = getUnreadCount([notification, ...notifications]);
  setBadgeCount(newCount);
});

socket.on('notification:read', (notificationId) => {
  // Update status
  setNotifications(prev =>
    prev.map(n =>
      n.id === notificationId
        ? { ...n, status: NotificationStatus.READ }
        : n
    )
  );
});
```

## Error Handling

```typescript
import { NOTIFICATION_ERRORS } from '@/utils/notifications/notificationConstants';

try {
  await sendNotification(notification);
} catch (error) {
  if (error.message === NOTIFICATION_ERRORS.RATE_LIMIT_EXCEEDED) {
    // Handle rate limit
    await queueNotification(notification);
  } else if (error.message === NOTIFICATION_ERRORS.RECIPIENT_NOT_FOUND) {
    // Handle missing recipient
    console.error('Recipient not found');
  } else {
    // Generic error
    console.error('Send failed:', error);
  }
}
```
