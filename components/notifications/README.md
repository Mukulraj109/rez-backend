# Notification Components

Reusable components for displaying and managing notifications in the merchant app. All components are theme-aware and support light/dark mode with smooth animations.

## Components

### 1. NotificationCard
Display a single notification in card format.

**Props:**
- `notification: Notification` - The notification data
- `onPress?: () => void` - Callback when card is pressed
- `onMarkRead?: () => void` - Callback to mark notification as read
- `onDelete?: () => void` - Callback to delete notification
- `testID?: string` - Test identifier

**Features:**
- Unread indicator dot
- Priority badge (urgent, high, medium, low)
- Swipeable actions (mark as read, delete)
- Fade animation when marking as read
- Action button support
- Relative timestamp

**Example:**
```tsx
import { NotificationCard } from '@/components/notifications';

<NotificationCard
  notification={notification}
  onPress={() => handleNotificationPress(notification)}
  onMarkRead={() => markAsRead(notification.id)}
  onDelete={() => deleteNotification(notification.id)}
/>
```

---

### 2. NotificationBadge
Notification count badge with pulse animation.

**Props:**
- `count: number` - Number of notifications
- `maxCount?: number` - Maximum count to display before showing "99+" (default: 99)
- `position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'` - Badge position (default: 'top-right')
- `size?: 'small' | 'medium' | 'large'` - Badge size (default: 'medium')
- `testID?: string` - Test identifier

**Features:**
- Auto-hides when count is 0
- Pulse animation when count increases
- Positioned absolutely (place inside parent container)
- Max count display (e.g., "99+")

**Example:**
```tsx
import { NotificationBadge } from '@/components/notifications';

<View>
  <Ionicons name="notifications-outline" size={24} />
  <NotificationBadge count={5} position="top-right" size="medium" />
</View>
```

---

### 3. NotificationToast
Toast notification with slide-in animation and auto-dismiss.

**Props:**
- `notification: Notification` - The notification data
- `duration?: number` - Auto-dismiss duration in ms, 0 = no auto-dismiss (default: 5000)
- `onPress?: () => void` - Callback when toast is pressed
- `onDismiss: () => void` - Callback when toast is dismissed
- `testID?: string` - Test identifier

**Features:**
- Slide-in animation from top
- Auto-dismiss timer with progress bar
- Swipe up to dismiss gesture
- Type-specific icon and colors
- Tap to view/dismiss

**Example:**
```tsx
import { NotificationToast } from '@/components/notifications';

const [toast, setToast] = useState(null);

{toast && (
  <NotificationToast
    notification={toast}
    duration={5000}
    onPress={() => handleToastPress(toast)}
    onDismiss={() => setToast(null)}
  />
)}
```

---

### 4. NotificationTypeIcon
Icon component for notification types.

**Props:**
- `type: NotificationType | string` - Notification type
- `size?: number` - Icon size (default: 24)
- `color?: string` - Icon color (default: '#6B7280')
- `testID?: string` - Test identifier

**Supported Types:**
- ORDER - Receipt icon
- PRODUCT - Cube icon
- CASHBACK - Cash icon
- TEAM - People icon
- SYSTEM - Settings icon
- PAYMENT - Card icon
- MARKETING - Megaphone icon
- REVIEW - Star icon
- INVENTORY - Archive icon
- ANALYTICS - Analytics icon

**Example:**
```tsx
import { NotificationTypeIcon } from '@/components/notifications';

<NotificationTypeIcon
  type={NotificationType.ORDER}
  size={32}
  color="#3B82F6"
/>
```

---

### 5. PreferenceToggle
Toggle with description for notification preferences.

**Props:**
- `title: string` - Preference title
- `description?: string` - Preference description
- `enabled: boolean` - Current state
- `onChange: (enabled: boolean) => Promise<void> | void` - Callback when toggled
- `disabled?: boolean` - Disable toggle (default: false)
- `isPremium?: boolean` - Show premium badge (default: false)
- `testID?: string` - Test identifier

**Features:**
- Loading state during API call
- Premium badge for pro features
- Description text support
- Disabled state styling

**Example:**
```tsx
import { PreferenceToggle } from '@/components/notifications';

<PreferenceToggle
  title="Email Notifications"
  description="Receive notifications via email"
  enabled={preferences.emailEnabled}
  onChange={async (enabled) => {
    await updatePreference('email', enabled);
  }}
  isPremium={false}
/>
```

---

## Usage Examples

### Complete Notifications Screen

```tsx
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { NotificationCard } from '@/components/notifications';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsScreen() {
  const {
    notifications,
    loading,
    markAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => (
        <NotificationCard
          notification={item}
          onPress={() => handleNotificationPress(item)}
          onMarkRead={() => markAsRead(item.id)}
          onDelete={() => deleteNotification(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
});
```

---

### Notification Bell with Badge

```tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBadge } from '@/components/notifications';
import { useNotificationStats } from '@/hooks/useNotificationStats';

export function NotificationBell() {
  const { unreadCount } = useNotificationStats();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
      <Ionicons name="notifications-outline" size={24} color="#111827" />
      <NotificationBadge count={unreadCount} position="top-right" />
    </TouchableOpacity>
  );
}
```

---

### Toast Notification System

```tsx
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NotificationToast } from '@/components/notifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export function ToastNotificationProvider({ children }) {
  const [currentToast, setCurrentToast] = useState(null);
  const { latestNotification } = useRealtimeNotifications();

  useEffect(() => {
    if (latestNotification) {
      setCurrentToast(latestNotification);
    }
  }, [latestNotification]);

  return (
    <View style={{ flex: 1 }}>
      {children}

      {currentToast && (
        <NotificationToast
          notification={currentToast}
          duration={5000}
          onPress={() => {
            navigation.navigate('NotificationDetail', { id: currentToast.id });
            setCurrentToast(null);
          }}
          onDismiss={() => setCurrentToast(null)}
        />
      )}
    </View>
  );
}
```

---

### Notification Preferences Screen

```tsx
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { PreferenceToggle } from '@/components/notifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function NotificationPreferencesScreen() {
  const { preferences, updatePreference } = useNotificationPreferences();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Email Notifications</Text>

      <PreferenceToggle
        title="Order Updates"
        description="Get notified about new orders and status changes"
        enabled={preferences.email.orders}
        onChange={(enabled) => updatePreference('email.orders', enabled)}
      />

      <PreferenceToggle
        title="Product Alerts"
        description="Low stock and out of stock notifications"
        enabled={preferences.email.products}
        onChange={(enabled) => updatePreference('email.products', enabled)}
      />

      <PreferenceToggle
        title="Marketing Emails"
        description="Promotional content and feature updates"
        enabled={preferences.email.marketing}
        onChange={(enabled) => updatePreference('email.marketing', enabled)}
        isPremium={true}
      />

      <Text style={styles.sectionTitle}>Push Notifications</Text>

      <PreferenceToggle
        title="Enable Push"
        description="Receive push notifications on your device"
        enabled={preferences.push.enabled}
        onChange={(enabled) => updatePreference('push.enabled', enabled)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
});
```

---

## Type Definitions

### NotificationType Enum
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

### NotificationPriority Enum
```typescript
enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

### Full types available in
- `types/notifications.ts` - Complete notification type definitions

---

## Animations

All components include smooth animations:

- **NotificationCard**: Fade animation on mark as read
- **NotificationBadge**: Pulse animation on count increase
- **NotificationToast**: Slide-in from top, swipe to dismiss
- **PreferenceToggle**: Loading spinner during async operations

---

## Styling

All components use the theme system from `components/ui/ThemeProvider`. Colors, spacing, and typography automatically adapt to light/dark mode.

### Color Schemes by Type
- ORDER: Blue (#3B82F6)
- PRODUCT: Green (#10B981)
- CASHBACK: Orange (#F59E0B)
- TEAM: Purple (#7C3AED)
- SYSTEM: Gray (#6B7280)
- ALERT/ERROR: Red (#EF4444)

---

## Accessibility

All components include:
- Proper `testID` props for testing
- Accessible labels and hints
- High contrast colors
- Touch targets ≥ 44x44 points
- Screen reader support

---

## Best Practices

1. **Use NotificationToast** for real-time notifications
2. **Show NotificationBadge** on bell icon for unread count
3. **Group preferences** by category (email, SMS, push)
4. **Limit toast duration** to 3-5 seconds
5. **Provide swipe gestures** for better UX
6. **Mark as read** automatically when notification is opened
7. **Use priority levels** to highlight urgent notifications
8. **Show type icons** for quick visual identification
