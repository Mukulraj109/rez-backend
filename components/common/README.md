# Activity Timeline Components

This directory contains the Activity Timeline components for displaying unified audit logs and notifications.

## Components

### ActivityTimeline

Main component for displaying a unified timeline of audit logs and notifications.

**Features:**
- Chronological order (newest first)
- Grouped by date (Today, Yesterday, This Week, Older)
- Infinite scroll loading
- Pull-to-refresh
- Filter by type (all, audits, notifications, orders, products, team)
- Search functionality
- Export timeline (PDF/CSV)

**Usage:**
```tsx
import ActivityTimeline from '@/components/common/ActivityTimeline';

function MyScreen() {
  return (
    <ActivityTimeline
      userId="user-123"
      showFilters={true}
      showSearch={true}
      showExport={true}
      onItemPress={(entry) => console.log('Clicked:', entry)}
    />
  );
}
```

**Props:**
- `userId?: string` - Filter to specific user
- `resourceType?: AuditResourceType` - Filter by resource type
- `resourceId?: string` - Filter by specific resource
- `limit?: number` - Number of items per page (default: 50)
- `showFilters?: boolean` - Show filter chips (default: true)
- `showSearch?: boolean` - Show search bar (default: true)
- `showExport?: boolean` - Show export buttons (default: true)
- `onItemPress?: (entry: TimelineEntry) => void` - Item click handler
- `onFilterChange?: (filter: TimelineFilterType) => void` - Filter change handler
- `onExport?: (format: 'csv' | 'pdf', data: TimelineEntry[]) => void` - Export handler

### TimelineItem

Single timeline item component with expandable details.

**Features:**
- Animated appearance
- Expandable for more details
- Shows user info, timestamp, changes
- Severity badges
- Action icons and colors

**Usage:**
```tsx
import TimelineItem from '@/components/common/TimelineItem';

function MyList() {
  return (
    <TimelineItem
      entry={timelineEntry}
      onPress={(entry) => console.log('Clicked:', entry)}
      isLast={false}
    />
  );
}
```

**Props:**
- `entry: TimelineEntry` - Timeline entry data
- `onPress?: (entry: TimelineEntry) => void` - Click handler
- `isLast?: boolean` - Is last item in list (hides line)

## Integration Example

```tsx
import React from 'react';
import { View } from 'react-native';
import ActivityTimeline from '@/components/common/ActivityTimeline';

export default function ActivityScreen() {
  const handleItemPress = (entry: TimelineEntry) => {
    // Navigate to detail screen
    navigation.navigate('ActivityDetail', { id: entry.id });
  };

  const handleExport = (format: 'csv' | 'pdf', data: TimelineEntry[]) => {
    console.log(`Exported ${data.length} entries as ${format}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <ActivityTimeline
        showFilters={true}
        showSearch={true}
        showExport={true}
        onItemPress={handleItemPress}
        onExport={handleExport}
      />
    </View>
  );
}
```

## Filtering

Available filter types:
- `all` - Show all entries
- `audits` - Audit logs only
- `notifications` - Notifications only
- `orders` - Order-related events
- `products` - Product-related events
- `team` - Team member activities

## Real-time Updates

The timeline automatically updates when new events occur via Socket.IO:
- New audit logs
- New notifications
- Notification read status changes

## Export Formats

Supported export formats:
- **CSV** - Comma-separated values for spreadsheets
- **PDF** - Formatted document (requires PDF library)

## Performance Considerations

- Uses `FlatList` with `onEndReached` for efficient infinite scrolling
- Memoized filtering and grouping operations
- Virtualized list rendering
- Optimized re-renders with `useCallback` and `useMemo`

## Files

- `ActivityTimeline.tsx` (~800 lines) - Main timeline component
- `TimelineItem.tsx` (~400 lines) - Individual timeline item
- `README.md` - This file
