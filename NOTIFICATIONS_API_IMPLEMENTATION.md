# Merchant App Notifications API Service - Implementation Guide

## Overview

Complete implementation of the notifications API service for the merchant app, including comprehensive TypeScript types and a full-featured API client service. This system integrates with SendGrid (email) and Twilio (SMS) for multi-channel notifications.

## Files Created

### 1. **types/notifications.ts** (693 lines, 16KB)
Comprehensive TypeScript type definitions for the entire notification system.

### 2. **services/api/notifications.ts** (813 lines, 25KB)
Complete API service implementation with all notification operations.

### 3. **services/api/index.ts** (Updated)
Added export for the notifications service module.

## Architecture Overview

```
Merchant App Notification System
├── Types Layer (types/notifications.ts)
│   ├── Enums (NotificationType, NotificationChannel, etc.)
│   ├── Core Interfaces (Notification, NotificationWithDelivery)
│   ├── Specific Notification Types (OrderNotification, CashbackNotification, etc.)
│   ├── Preferences (NotificationPreferences, NotificationChannelPreference)
│   └── API Request/Response Types
│
├── Service Layer (services/api/notifications.ts)
│   ├── Notification Management
│   ├── Preference Management
│   ├── Caching & Storage
│   └── Helper Methods
│
└── API Client (services/api/index.ts)
    └── REST API Integration
```

## Supported Backend Endpoints

The service integrates with 7 backend notification endpoints:

```
GET    /api/merchant/notifications              - Get all notifications
PUT    /api/merchant/notifications/settings     - Update notification settings
POST   /api/merchant/notifications/:id/mark-read - Mark single notification as read
POST   /api/merchant/notifications/mark-all-read - Mark all notifications as read
DELETE /api/merchant/notifications/:id          - Delete notification
GET    /api/merchant/notifications/preferences  - Get notification preferences
PUT    /api/merchant/notifications/preferences  - Update notification preferences
```

## Types Definition (types/notifications.ts)

### Enums

#### NotificationType
```typescript
enum NotificationType {
  ORDER = 'order',
  PRODUCT = 'product',
  CASHBACK = 'cashback',
  TEAM = 'team',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  MARKETING = 'marketing',
  REVIEW = 'review',
  INVENTORY = 'inventory',
  ANALYTICS = 'analytics',
}
```

#### NotificationChannel
```typescript
enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push',
}
```

#### NotificationPriority
```typescript
enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

#### EmailTemplate (11+ Templates)
```typescript
enum EmailTemplate {
  // Order Notifications (5)
  NEW_ORDER = 'new_order',
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',

  // Cashback Notifications (4)
  CASHBACK_REQUEST_RECEIVED = 'cashback_request_received',
  CASHBACK_APPROVED = 'cashback_approved',
  CASHBACK_REJECTED = 'cashback_rejected',
  CASHBACK_PENDING_REVIEW = 'cashback_pending_review',

  // Product Notifications (2)
  PRODUCT_OUT_OF_STOCK = 'product_out_of_stock',
  PRODUCT_LOW_STOCK = 'product_low_stock',

  // ... and more (20+ total)
}
```

### Core Interfaces

#### Base Notification
```typescript
interface Notification {
  id: string;
  merchantId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];
  templateId?: string;
  templateVariables?: Record<string, any>;
  relatedEntityType?: 'order' | 'product' | 'cashback' | 'team_member' | 'promotion';
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  updatedAt: string;
  deliveryStatus: NotificationDeliveryStatus;
  sentAt?: string;
  failureReason?: string;
}
```

#### Notification Preferences
```typescript
interface NotificationPreferences {
  merchantId: string;
  globalMute: boolean;
  globalQuietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  categories: {
    [key in NotificationType]?: NotificationCategoryPreference;
  };
  email: {
    subscribed: boolean;
    verifiedEmail?: string;
    unsubscribeToken?: string;
    marketingEmails: boolean;
  };
  sms: {
    subscribed: boolean;
    verifiedPhone?: string;
    unsubscribeToken?: string;
  };
  dailyDigest: {
    enabled: boolean;
    time: string;
    includeCategories: NotificationType[];
  };
  weeklyDigest: {
    enabled: boolean;
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    time: string;
    includeCategories: NotificationType[];
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    allowUrgent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Specific Notification Types

#### OrderNotification
```typescript
interface OrderNotification extends Notification {
  type: NotificationType.ORDER;
  orderId: string;
  orderNumber: string;
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}
```

#### CashbackNotification
```typescript
interface CashbackNotification extends Notification {
  type: NotificationType.CASHBACK;
  cashbackRequestId: string;
  cashbackAmount: number;
  cashbackStatus: 'pending' | 'approved' | 'rejected' | 'paid';
  customerId?: string;
  orderId?: string;
}
```

#### ProductNotification
```typescript
interface ProductNotification extends Notification {
  type: NotificationType.PRODUCT;
  productId: string;
  productName: string;
  productSku?: string;
  currentStock?: number;
  reorderLevel?: number;
}
```

#### PaymentNotification
```typescript
interface PaymentNotification extends Notification {
  type: NotificationType.PAYMENT;
  paymentId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  transactionStatus: 'pending' | 'successful' | 'failed' | 'refunded';
}
```

## API Service Methods (services/api/notifications.ts)

### Notification Management

#### 1. Get Notifications
```typescript
async getNotifications(request?: GetNotificationsRequest): Promise<Notification[]>
```
- Fetch all notifications with optional filtering, pagination, and sorting
- Supports caching with 5-minute TTL
- Falls back to cached data on network errors

**Parameters:**
- `page`: number
- `limit`: number
- `type`: NotificationType
- `status`: NotificationStatus
- `priority`: NotificationPriority
- `startDate`: string (ISO format)
- `endDate`: string (ISO format)
- `unreadOnly`: boolean
- `sortBy`: 'createdAt' | 'priority' | 'status'
- `sortOrder`: 'asc' | 'desc'

#### 2. Get Notifications with Delivery Details
```typescript
async getNotificationsWithDelivery(
  request?: GetNotificationsRequest
): Promise<NotificationWithDelivery[]>
```
- Fetch notifications including detailed delivery information
- Shows email/SMS/push delivery status

#### 3. Get Unread Count
```typescript
async getUnreadCount(): Promise<{
  unreadCount: number;
  byType: Record<string, number>;
}>
```
- Get total unread count and breakdown by type

#### 4. Get Single Notification
```typescript
async getNotification(notificationId: string): Promise<Notification>
```
- Fetch a specific notification by ID

#### 5. Mark as Read Operations
```typescript
// Mark single notification as read
async markNotificationAsRead(notificationId: string): Promise<void>

// Mark multiple notifications as read
async markNotificationsAsRead(notificationIds: string[]): Promise<number>

// Mark all notifications as read
async markAllNotificationsAsRead(
  request?: MarkAllNotificationsReadRequest
): Promise<number>
```

#### 6. Delete Operations
```typescript
// Delete single notification
async deleteNotification(notificationId: string): Promise<void>

// Delete multiple notifications
async deleteNotifications(notificationIds: string[]): Promise<number>

// Archive notification (soft delete)
async archiveNotification(notificationId: string): Promise<void>

// Clear all notifications
async clearAllNotifications(type?: NotificationType): Promise<number>
```

### Preference Management

#### 7. Get Preferences
```typescript
async getNotificationPreferences(): Promise<NotificationPreferences>
```
- Fetch current notification preferences with caching

#### 8. Update Preferences
```typescript
async updateNotificationPreferences(
  request: UpdateNotificationPreferencesRequest
): Promise<NotificationPreferences>
```
- Update comprehensive notification preferences

#### 9. Update Channel Preferences
```typescript
async updateChannelPreference(
  channel: NotificationChannel,
  settings: Record<string, any>
): Promise<NotificationPreferences>
```
- Update preferences for specific channel (email/SMS)

#### 10. Update Category Preferences
```typescript
async updateCategoryPreference(
  type: NotificationType,
  settings: Record<string, any>
): Promise<NotificationPreferences>
```
- Update preferences for specific notification type

#### 11. Global Controls
```typescript
// Enable/disable all notifications
async setGlobalMute(mute: boolean): Promise<NotificationPreferences>

// Update do-not-disturb settings
async updateDoNotDisturb(settings: {
  enabled: boolean;
  startTime: string;
  endTime: string;
  allowUrgent: boolean;
}): Promise<NotificationPreferences>
```

### Subscription Management

#### 12. Email Subscription
```typescript
// Subscribe to email notifications
async subscribeToEmail(email: string): Promise<void>

// Unsubscribe from email notifications
async unsubscribeFromEmail(): Promise<void>
```

#### 13. SMS Subscription
```typescript
// Subscribe to SMS notifications
async subscribeToSms(phone: string): Promise<void>

// Unsubscribe from SMS notifications
async unsubscribeFromSms(): Promise<void>
```

### Analytics

#### 14. Get Statistics
```typescript
async getNotificationStats(): Promise<NotificationStats>
```
- Fetch notification statistics (total, unread, by type/status)
- Supports caching with 5-minute TTL

## Usage Examples

### Basic Setup
```typescript
import { notificationsService } from './services/api/notifications';
import { NotificationType, NotificationStatus } from './types/notifications';

// In your component or hook
const fetchNotifications = async () => {
  try {
    const notifications = await notificationsService.getNotifications({
      page: 1,
      limit: 20,
      unreadOnly: true,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    console.log('Fetched notifications:', notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
};
```

### Mark as Read
```typescript
// Mark single notification
await notificationsService.markNotificationAsRead(notificationId);

// Mark multiple notifications
const marked = await notificationsService.markNotificationsAsRead([id1, id2, id3]);
console.log(`Marked ${marked} notifications as read`);

// Mark all as read
const totalMarked = await notificationsService.markAllNotificationsAsRead({
  type: NotificationType.ORDER,
  beforeDate: '2024-11-17'
});
```

### Manage Preferences
```typescript
// Get current preferences
const prefs = await notificationsService.getNotificationPreferences();

// Update global mute
await notificationsService.setGlobalMute(true);

// Update specific category
await notificationsService.updateCategoryPreference(
  NotificationType.ORDER,
  {
    enabled: true,
    priority: NotificationPriority.HIGH
  }
);

// Subscribe to email
await notificationsService.subscribeToEmail('merchant@example.com');

// Update do-not-disturb
await notificationsService.updateDoNotDisturb({
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  allowUrgent: true
});
```

### Get Statistics
```typescript
const stats = await notificationsService.getNotificationStats();
console.log('Unread count:', stats.unreadCount);
console.log('By type:', stats.byType);
console.log('By status:', stats.byStatus);
```

## Caching Strategy

The service implements intelligent caching with 5-minute TTL:

- **Notifications Cache**: `notifications_cache`
  - Automatically cached after fetch
  - Invalidated on create/update/delete
  - Falls back to cache on network errors

- **Preferences Cache**: `notification_preferences_cache`
  - Cached with 5-minute TTL
  - Invalidated on preference updates
  - Persistent across app sessions

- **Stats Cache**: `notification_stats_cache`
  - Cached with 5-minute TTL
  - Invalidated on notification changes
  - Quick statistics retrieval

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const result = await notificationsService.getNotifications();
} catch (error) {
  // Error is a clear, descriptive string message
  console.error('Failed to fetch notifications:', error.message);

  // Service automatically attempts to return cached data
  // if network request fails
}
```

## Integration Points

### With Frontend Components
```typescript
import { notificationsService } from '@/services/api/notifications';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getNotifications({
        page: 1,
        limit: 20
      });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  return { notifications, loading, fetchNotifications };
};
```

### With Backend Services
- **SendGrid Integration**: Email templates and delivery tracking
- **Twilio Integration**: SMS delivery and status callbacks
- **Socket.IO**: Real-time notification updates (optional)

## File Structure

```
merchant-app/
├── types/
│   └── notifications.ts (693 lines)
│       ├── Enums (NotificationType, NotificationChannel, etc.)
│       ├── Core Interfaces (Notification, NotificationPreferences)
│       ├── Specific Types (OrderNotification, CashbackNotification, etc.)
│       └── API Request/Response Types
│
├── services/
│   └── api/
│       ├── notifications.ts (813 lines)
│       │   ├── getNotifications()
│       │   ├── markNotificationAsRead()
│       │   ├── deleteNotification()
│       │   ├── getNotificationPreferences()
│       │   ├── updateNotificationPreferences()
│       │   ├── subscribeToEmail/SMS()
│       │   ├── getNotificationStats()
│       │   └── Helper Methods (caching, params building)
│       │
│       └── index.ts (Updated)
│           └── export * from './notifications'
│
└── NOTIFICATIONS_API_IMPLEMENTATION.md (This file)
```

## Key Features

1. **Multi-Channel Support**
   - Email (SendGrid)
   - SMS (Twilio)
   - In-App
   - Push notifications

2. **11+ Email Templates**
   - Order notifications (5 templates)
   - Cashback notifications (4 templates)
   - Product notifications (2 templates)
   - Team notifications
   - Payment notifications
   - Marketing notifications
   - System alerts

3. **Comprehensive Preference Management**
   - Global mute control
   - Channel-specific preferences
   - Category-specific preferences
   - Do-not-disturb scheduling
   - Daily/weekly digest options
   - Quiet hours configuration

4. **Smart Caching**
   - 5-minute TTL for all cached data
   - Automatic cache invalidation
   - Fallback to cached data on network errors
   - Persistent storage using AsyncStorage

5. **Rich Filtering & Pagination**
   - Filter by type, status, priority
   - Date range filtering
   - Pagination support
   - Multiple sort options
   - Unread-only filtering

6. **Delivery Tracking**
   - Track email delivery status
   - Track SMS delivery status
   - In-app delivery confirmation
   - Failure reason tracking
   - MessageId tracking for external services

7. **Batch Operations**
   - Mark multiple as read
   - Delete multiple notifications
   - Clear all notifications
   - Bulk archive operations

## Performance Considerations

- **API Calls**: Paginated responses (default limit: 20)
- **Caching**: 5-minute TTL reduces API calls
- **Batch Operations**: Support for bulk actions
- **Storage**: Efficient AsyncStorage usage
- **Network**: Graceful fallback to cached data

## Security & Compliance

- **Authentication**: Bearer token via API client
- **Authorization**: Merchant-scoped queries
- **Data Privacy**: Supports unsubscribe tokens
- **GDPR**: Preference-based opt-in/opt-out
- **Rate Limiting**: Backend enforced

## Next Steps

1. **Backend Integration**: Ensure backend implements all 7 endpoints
2. **Testing**: Add unit tests for service methods
3. **Integration**: Connect to UI components
4. **Real-time**: Add Socket.IO integration for live updates
5. **Analytics**: Track notification engagement metrics

## Support & Troubleshooting

- Check API configuration in `config/api.ts`
- Verify AsyncStorage permissions
- Monitor console logs for API errors
- Check cache validity with `getCachedNotifications()`
- Test with `notificationsService.getNotificationStats()`

---

**Total Implementation Size**: ~1,500 lines, 41KB
**Files Created**: 2 new files (1 types, 1 service) + 1 updated file
**Backend Endpoints Supported**: 7 endpoints
**TypeScript Definitions**: 50+ interfaces and types
**Service Methods**: 30+ public methods
**Email Templates Defined**: 20+ templates

Implementation completed on: 2024-11-17
