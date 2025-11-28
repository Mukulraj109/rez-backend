# Activity Timeline - Quick Start Guide

Get started with the Activity Timeline system in 5 minutes.

## Installation

No additional dependencies required! The system uses existing packages:
- ✅ `react-native`
- ✅ `@expo/vector-icons`
- ✅ `@react-native-async-storage/async-storage`

## 1. Basic Timeline Display

```tsx
import { ActivityTimeline } from '@/components/common';

export default function ActivityScreen() {
  return <ActivityTimeline />;
}
```

That's it! You now have a fully functional activity timeline.

## 2. Add Filtering

```tsx
<ActivityTimeline
  showFilters={true}
  showSearch={true}
  showExport={true}
/>
```

## 3. Handle Item Clicks

```tsx
<ActivityTimeline
  onItemPress={(entry) => {
    console.log('Clicked:', entry);
    // Navigate to detail screen
    navigation.navigate('Detail', { id: entry.id });
  }}
/>
```

## 4. Filter by User

```tsx
<ActivityTimeline
  userId="user-123"
  showFilters={false}
/>
```

## 5. Add Notification Badge

```tsx
import { useNotificationBadge } from '@/hooks/useNotificationBadge';

export default function AppHeader() {
  const { count } = useNotificationBadge();

  return (
    <View>
      <Icon name="notifications" />
      {count > 0 && <Badge>{count}</Badge>}
    </View>
  );
}
```

## 6. Use Audit Helpers

```tsx
import {
  filterAuditLogs,
  groupLogsByDate,
  getAuditStats
} from '@/utils/audit';

// Filter logs
const filtered = filterAuditLogs(logs, {
  severity: 'critical',
  fromDate: '2024-01-01'
});

// Group by date
const grouped = groupLogsByDate(filtered);

// Get statistics
const stats = getAuditStats(filtered);
```

## 7. Use Notification Helpers

```tsx
import {
  filterNotifications,
  getUnreadCount,
  sortNotifications
} from '@/utils/notifications';

// Filter unread
const unread = filterNotifications(notifications, {
  unreadOnly: true
});

// Count unread
const count = getUnreadCount(notifications);

// Sort smartly
const sorted = sortNotifications(notifications);
```

## 8. Export Timeline

```tsx
import { exportLogsToCSV } from '@/utils/audit';

const handleExport = (entries) => {
  const csv = exportLogsToCSV(entries);
  // Download or share the CSV
};

<ActivityTimeline
  showExport={true}
  onExport={(format, data) => handleExport(data)}
/>
```

## Common Use Cases

### Show Only Order Events
```tsx
<ActivityTimeline
  resourceType="order"
  onFilterChange={(filter) => console.log('Filter:', filter)}
/>
```

### User Activity Dashboard
```tsx
import { useActivityTimeline } from '@/hooks/useActivityTimeline';

export default function UserDashboard({ userId }) {
  const { entries, loading, refresh } = useActivityTimeline({
    userId,
    limit: 20
  });

  if (loading) return <LoadingSpinner />;

  return (
    <FlatList
      data={entries}
      renderItem={({ item }) => <TimelineItem entry={item} />}
      onRefresh={refresh}
    />
  );
}
```

### Notification Badge with Types
```tsx
const { countByType } = useNotificationBadge();

<View>
  <Badge color="green">{countByType.order}</Badge>
  <Badge color="orange">{countByType.cashback}</Badge>
  <Badge color="blue">{countByType.payment}</Badge>
</View>
```

### Detect Suspicious Activity
```tsx
import { detectSuspiciousActivity } from '@/utils/audit';

const suspicious = detectSuspiciousActivity(logs);

if (suspicious.length > 0) {
  console.warn('⚠️ Suspicious activity detected!');
  suspicious.forEach(activity => {
    console.log(`- ${activity.type}: ${activity.description}`);
  });
}
```

## Real-time Updates

The timeline automatically updates via Socket.IO:

```tsx
// No configuration needed!
// Socket events are handled automatically:
// - audit:new
// - notification:new
// - notification:read
```

## Customization

### Custom Filters
```tsx
const [filter, setFilter] = useState('all');

<ActivityTimeline
  onFilterChange={(newFilter) => setFilter(newFilter)}
/>
```

### Custom Empty State
```tsx
if (entries.length === 0) {
  return <CustomEmptyState />;
}
```

### Custom Item Rendering
```tsx
import { TimelineItem } from '@/components/common';

<FlatList
  data={entries}
  renderItem={({ item }) => (
    <TimelineItem
      entry={item}
      onPress={handlePress}
      isLast={item.isLast}
    />
  )}
/>
```

## Performance Tips

1. **Limit initial load**
   ```tsx
   <ActivityTimeline limit={20} />
   ```

2. **Memoize callbacks**
   ```tsx
   const handlePress = useCallback((entry) => {
     // Handle press
   }, []);
   ```

3. **Debounce search**
   - Already built-in!

4. **Use virtualized lists**
   - Already using `FlatList`!

## Troubleshooting

### Timeline not loading?
- Check API endpoints are configured
- Verify Socket.IO connection
- Check console for errors

### Badge count incorrect?
- Refresh the badge: `refresh()`
- Check AsyncStorage is working
- Verify Socket.IO events

### Export not working?
- Check platform (web vs mobile)
- Verify file permissions
- Check export format support

## Next Steps

1. **Read full documentation**
   - `components/common/README.md`
   - `utils/audit/README.md`
   - `utils/notifications/README.md`

2. **Explore helpers**
   - Browse `utils/audit/auditHelpers.ts`
   - Browse `utils/notifications/notificationHelpers.ts`

3. **Check constants**
   - Review `utils/audit/auditConstants.ts`
   - Review `utils/notifications/notificationConstants.ts`

4. **Test integration**
   - Add to your screens
   - Test real-time updates
   - Verify filtering works

## Support

For issues or questions:
1. Check the README files
2. Review the delivery report
3. Examine the code comments
4. Test with mock data first

---

**Quick Reference:**
- Timeline Component: `components/common/ActivityTimeline.tsx`
- Audit Helpers: `utils/audit/auditHelpers.ts`
- Notification Helpers: `utils/notifications/notificationHelpers.ts`
- Hooks: `hooks/useActivityTimeline.ts`, `hooks/useNotificationBadge.ts`
