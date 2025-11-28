# Audit Components

Reusable components for displaying and filtering audit logs in the merchant app. All components are theme-aware and support light/dark mode.

## Components

### 1. AuditLogCard
Display a single audit log entry in card format.

**Props:**
- `log: AuditLog` - The audit log data
- `onPress?: () => void` - Callback when card is pressed
- `compact?: boolean` - Enable compact mode (default: false)
- `testID?: string` - Test identifier

**Features:**
- Expandable to show detailed metadata
- Color-coded severity borders
- User avatar and action type badges
- Timestamp formatting (relative time)
- IP address and user agent display

**Example:**
```tsx
import { AuditLogCard } from '@/components/audit';

<AuditLogCard
  log={auditLog}
  onPress={() => navigation.navigate('AuditDetail', { id: auditLog.id })}
  compact={false}
/>
```

---

### 2. ActionTypeBadge
Display action type with icon and color.

**Props:**
- `actionType: ActionType` - One of: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT
- `size?: 'small' | 'medium' | 'large'` - Badge size (default: 'medium')
- `testID?: string` - Test identifier

**Features:**
- 8 pre-defined action types with unique colors
- Icon for each action type
- Responsive sizing

**Example:**
```tsx
import { ActionTypeBadge } from '@/components/audit';

<ActionTypeBadge actionType="CREATE" size="medium" />
```

---

### 3. SeverityBadge
Display severity level with color coding.

**Props:**
- `severity: AuditSeverity` - One of: critical, error, warning, info
- `showIcon?: boolean` - Show severity icon (default: true)
- `size?: 'small' | 'medium' | 'large'` - Badge size (default: 'medium')
- `testID?: string` - Test identifier

**Features:**
- 4 severity levels with distinct colors
- Optional icon display
- Responsive sizing

**Example:**
```tsx
import { SeverityBadge } from '@/components/audit';

<SeverityBadge severity="critical" showIcon={true} />
```

---

### 4. ChangesDiff
Show before/after comparison for UPDATE actions.

**Props:**
- `before: any` - Previous state
- `after: any` - New state
- `fields?: string[]` - Optional: only show specific fields
- `testID?: string` - Test identifier

**Features:**
- Side-by-side diff view
- Highlighted changed fields
- Support for nested objects
- Color-coded additions/removals
- Change count summary

**Example:**
```tsx
import { ChangesDiff } from '@/components/audit';

<ChangesDiff
  before={{ name: 'Product A', price: 100 }}
  after={{ name: 'Product B', price: 150 }}
  fields={['name', 'price']}
/>
```

---

### 5. AuditFilters
Filter component with chips and quick filters.

**Props:**
- `filters: AuditLogFilters` - Current filter state
- `onFilterChange: (filters: AuditLogFilters) => void` - Callback when filters change
- `onReset: () => void` - Callback to reset all filters
- `testID?: string` - Test identifier

**Features:**
- Active filters displayed as removable chips
- Quick filter buttons for common filters
- Severity, resource type, and date range filters
- Reset all functionality

**Example:**
```tsx
import { AuditFilters } from '@/components/audit';

const [filters, setFilters] = useState<AuditLogFilters>({});

<AuditFilters
  filters={filters}
  onFilterChange={setFilters}
  onReset={() => setFilters({})}
/>
```

---

### 6. AuditStatsCard
Display audit statistics with trend indicators.

**Props:**
- `title: string` - Card title
- `value: string | number` - Main value to display
- `trend?: number` - Percentage change (positive or negative)
- `icon: IconName` - Ionicons icon name
- `color: string` - Primary color for icon
- `testID?: string` - Test identifier

**Features:**
- Large number formatting (K, M)
- Trend arrow (up/down)
- Color-coded trend badges
- Percentage change vs previous period

**Example:**
```tsx
import { AuditStatsCard } from '@/components/audit';

<AuditStatsCard
  title="Total Activities"
  value={1234}
  trend={15.5}
  icon="analytics"
  color="#7C3AED"
/>
```

---

## Usage Examples

### Complete Audit Log Screen

```tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  AuditLogCard,
  AuditFilters,
  AuditStatsCard,
} from '@/components/audit';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export function AuditLogsScreen() {
  const [filters, setFilters] = useState({});
  const { logs, stats, loading } = useAuditLogs(filters);

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <AuditStatsCard
          title="Total Logs"
          value={stats.total}
          trend={12.5}
          icon="document-text"
          color="#7C3AED"
        />
        <AuditStatsCard
          title="Critical Events"
          value={stats.critical}
          trend={-5.2}
          icon="alert-circle"
          color="#EF4444"
        />
      </View>

      {/* Filters */}
      <AuditFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({})}
      />

      {/* Logs List */}
      <FlatList
        data={logs}
        renderItem={({ item }) => (
          <AuditLogCard
            log={item}
            onPress={() => handleLogPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
});
```

### Audit Detail Modal

```tsx
import React from 'react';
import { Modal, View, Text, ScrollView } from 'react-native';
import {
  ActionTypeBadge,
  SeverityBadge,
  ChangesDiff,
} from '@/components/audit';

export function AuditDetailModal({ log, visible, onClose }) {
  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <ScrollView>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            Audit Log Details
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <ActionTypeBadge actionType="UPDATE" size="large" />
            <SeverityBadge severity={log.severity} size="large" />
          </View>

          {log.details.before && log.details.after && (
            <ChangesDiff
              before={log.details.before}
              after={log.details.after}
            />
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}
```

---

## Type Definitions

### ActionType
```typescript
type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
```

### Full types available in
- `types/audit.ts` - Complete audit type definitions

---

## Styling

All components use the theme system from `components/ui/ThemeProvider`. Colors, spacing, and typography automatically adapt to light/dark mode.

---

## Accessibility

All components include:
- Proper `testID` props for testing
- Accessible text labels
- High contrast color ratios
- Touch target sizes ≥ 44x44 points

---

## Best Practices

1. **Always provide testID** for automated testing
2. **Use compact mode** in dense layouts (lists)
3. **Filter by severity** for critical monitoring
4. **Show trends** in stats cards for better insights
5. **Limit expanded metadata** to avoid overwhelming users
