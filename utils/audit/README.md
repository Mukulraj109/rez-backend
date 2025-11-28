# Audit Utilities

Comprehensive utilities for audit log processing, formatting, filtering, and analysis.

## Files

- `auditHelpers.ts` (~600 lines) - 30+ helper functions
- `auditConstants.ts` (~400 lines) - All audit-related constants

## Helper Functions

### Formatting

```typescript
// Format audit action for display
formatAuditAction('product.created') // "Product Created"

// Format resource type
formatResourceType('product') // "Product"

// Get action icon
getActionIcon('product.created') // "add-circle"

// Get action color
getActionColor('product.created') // "#34C759"

// Get severity color
getSeverityColor('critical') // "#D70015"

// Format relative time
formatRelativeTime('2024-01-15T10:30:00Z') // "2h ago"

// Format change detail
formatChange({
  field: 'status',
  before: 'pending',
  after: 'active'
}) // "status: 'pending' → 'active'"
```

### Filtering

```typescript
// Filter by criteria
const filtered = filterAuditLogs(logs, {
  action: 'product.created',
  resourceType: 'product',
  severity: 'critical',
  fromDate: '2024-01-01',
  toDate: '2024-01-31',
  search: 'iPhone',
});

// Filter by date range
const lastWeek = filterByDateRange(
  logs,
  new Date('2024-01-08'),
  new Date('2024-01-15')
);

// Filter by user
const userLogs = filterByUser(logs, 'user-123');

// Filter by severity
const critical = filterBySeverity(logs, 'critical');
```

### Grouping

```typescript
// Group by date
const byDate = groupLogsByDate(logs);
// { "2024-01-15": [...], "2024-01-14": [...] }

// Group by user
const byUser = groupLogsByUser(logs);
// { "user-123": [...], "user-456": [...] }

// Group by resource
const byResource = groupLogsByResource(logs);
// { "product-1": [...], "order-2": [...] }

// Group timeline by date (with labels)
const grouped = groupTimelineByDate(entries);
// [
//   { title: "Today", entries: [...] },
//   { title: "Yesterday", entries: [...] },
//   { title: "This Week", entries: [...] }
// ]
```

### Analysis

```typescript
// Get most active users
const topUsers = getMostActiveUsers(logs, 10);
// [
//   { userId: "user-123", stats: { totalActions: 150, ... } },
//   ...
// ]

// Get most changed resources
const topResources = getMostChangedResources(logs, 10);
// [
//   { resourceId: "product-1", resourceType: "product", changes: 25 },
//   ...
// ]

// Get statistics
const stats = getAuditStats(logs);
// {
//   totalLogs: 1000,
//   logsByAction: { "product.created": 150, ... },
//   logsByResource: { "product": 300, "order": 250, ... },
//   logsBySeverity: { info: 700, warning: 200, ... }
// }

// Detect suspicious activity
const suspicious = detectSuspiciousActivity(logs);
// [
//   {
//     type: "multiple_failed_logins",
//     description: "5 failed login attempts",
//     logs: [...]
//   }
// ]
```

### Export

```typescript
// Export to CSV
const csv = exportLogsToCSV(logs);
// Returns CSV string

// Export timeline to CSV
const timelineCsv = exportTimelineToCSV(entries);

// Export to PDF (requires PDF library)
const pdf = await exportLogsToPDF(logs);
```

### Change Tracking

```typescript
// Compute changes between objects
const changes = computeChanges(
  { name: "iPhone 12", price: 999 },
  { name: "iPhone 12", price: 899 }
);
// [
//   {
//     field: "price",
//     before: 999,
//     after: 899,
//     oldValue: 999,
//     newValue: 899
//   }
// ]
```

### Timeline

```typescript
// Filter timeline by type
const orders = filterTimelineEntries(entries, 'orders');

// Search timeline
const results = searchTimelineEntries(entries, 'iPhone');

// Convert audit log to timeline entry
const entry = auditLogToTimelineEntry(auditLog);
```

## Constants

### Action Configurations

```typescript
AUDIT_ACTIONS['product.created']
// {
//   label: "Product Created",
//   description: "A new product was added",
//   icon: "add-circle",
//   color: "#34C759",
//   severity: "info",
//   category: "product"
// }
```

### Resource Types

```typescript
RESOURCE_TYPES['product']
// {
//   label: "Product",
//   description: "Product catalog items",
//   icon: "cube",
//   color: "#007AFF"
// }
```

### Severity Levels

```typescript
SEVERITY_LEVELS['critical']
// {
//   label: "Critical",
//   description: "Critical security or business events",
//   icon: "alert-circle",
//   color: "#D70015",
//   priority: 4
// }
```

### Icon & Color Mappings

```typescript
ACTION_ICONS['created'] // "add-circle"
ACTION_COLORS['created'] // "#34C759"
```

### Retention Periods

```typescript
RETENTION_PERIODS
// [
//   { value: 7, label: "7 days", description: "Keep logs for 7 days" },
//   { value: 30, label: "30 days", ... },
//   ...
// ]
```

### Export Formats

```typescript
EXPORT_FORMATS
// [
//   { value: 'csv', label: 'CSV', mimeType: 'text/csv', ... },
//   { value: 'pdf', label: 'PDF', mimeType: 'application/pdf', ... }
// ]
```

## Usage Examples

### Basic Filtering and Grouping

```typescript
import {
  filterAuditLogs,
  groupLogsByDate,
  formatAuditAction
} from '@/utils/audit/auditHelpers';

// Filter logs
const filtered = filterAuditLogs(allLogs, {
  resourceType: 'product',
  severity: ['warning', 'critical'],
  fromDate: '2024-01-01'
});

// Group by date
const grouped = groupLogsByDate(filtered);

// Display
Object.entries(grouped).forEach(([date, logs]) => {
  console.log(`\n${date}:`);
  logs.forEach(log => {
    console.log(`  - ${formatAuditAction(log.action)}`);
  });
});
```

### Activity Analysis

```typescript
import {
  getMostActiveUsers,
  getMostChangedResources,
  detectSuspiciousActivity
} from '@/utils/audit/auditHelpers';

// Get top users
const topUsers = getMostActiveUsers(logs, 5);
console.log('Most active users:', topUsers);

// Get top resources
const topResources = getMostChangedResources(logs, 5);
console.log('Most changed:', topResources);

// Check for suspicious activity
const suspicious = detectSuspiciousActivity(logs);
if (suspicious.length > 0) {
  console.warn('⚠️ Suspicious activity detected:', suspicious);
}
```

### Exporting Data

```typescript
import { exportLogsToCSV } from '@/utils/audit/auditHelpers';

// Export filtered logs
const csv = exportLogsToCSV(filteredLogs);

// Download (web)
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'audit-logs.csv';
link.click();
```

## Performance Tips

1. **Memoize filtered results** - Use `useMemo` for expensive filtering operations
2. **Limit initial load** - Fetch only recent logs first, load more on demand
3. **Use virtualized lists** - Render only visible items with `FlatList`
4. **Debounce search** - Wait for user to stop typing before filtering
5. **Cache statistics** - Compute stats periodically, not on every render

## Best Practices

1. **Always filter sensitive data** - Remove passwords, tokens, etc. before display/export
2. **Validate dates** - Check date ranges are valid before filtering
3. **Handle errors** - Wrap API calls in try-catch blocks
4. **Log sparingly** - Don't create audit logs for every single action
5. **Archive old logs** - Move old logs to cold storage to improve performance
