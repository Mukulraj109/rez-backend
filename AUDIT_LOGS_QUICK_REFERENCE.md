# Audit Logs API - Quick Reference

## Import the Service

```typescript
import { auditService } from '@/services/api';
import type { AuditLog, AuditLogFilters, AuditStatistics, ComplianceReport } from '@/types/audit';
```

## Quick Method Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getAuditLogs()` | GET /api/merchant/audit/logs | Get filtered audit logs with pagination |
| `getResourceHistory()` | GET /api/merchant/audit/resource/:type/:id | Get complete audit history of a resource |
| `getTimeline()` | GET /api/merchant/audit/timeline | Get activity timeline |
| `getTodayActivities()` | GET /api/merchant/audit/timeline/today | Get today's activities |
| `getRecentActivities()` | GET /api/merchant/audit/timeline/recent | Get recent activities |
| `getActivitySummary()` | GET /api/merchant/audit/timeline/summary | Get activity summary |
| `getCriticalActivities()` | GET /api/merchant/audit/timeline/critical | Get critical activities |
| `getActivityHeatmap()` | GET /api/merchant/audit/timeline/heatmap | Get activity heatmap |
| `searchAuditLogs()` | GET /api/merchant/audit/search | Search audit logs |
| `getAuditStatistics()` | GET /api/merchant/audit/stats | Get audit statistics |
| `getUserActivity()` | GET /api/merchant/audit/user/:userId | Get user activity |
| `exportAuditLogs()` | GET /api/merchant/audit/export | Export audit logs |
| `getComplianceReport()` | GET /api/merchant/audit/retention/compliance | Get compliance report |
| `getRetentionStatistics()` | GET /api/merchant/audit/retention/stats | Get retention stats |
| `cleanupAuditLogs()` | POST /api/merchant/audit/retention/cleanup | Cleanup old logs |
| `getArchivedLogs()` | GET /api/merchant/audit/retention/archives | Get archived logs |

## Common Tasks

### 1. Get All Logs (Last 30 Days)

```typescript
const logs = await auditService.getAuditLogs({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  limit: 100,
  page: 1
});
```

### 2. Track Product Changes

```typescript
const productHistory = await auditService.getResourceHistory('product', productId);
```

### 3. Get User Activity Report

```typescript
const userActivity = await auditService.getUserActivity(userId, {
  limit: 100,
  startDate: '2024-01-01'
});
```

### 4. Filter by Action Type

```typescript
const creations = await auditService.getAuditLogs({
  action: ['product.created', 'product.updated'],
  limit: 50
});
```

### 5. Get Critical Events

```typescript
const critical = await auditService.getCriticalActivities(50);
```

### 6. Export for Compliance

```typescript
const export_result = await auditService.exportAuditLogs({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  includeDetails: true
});
```

### 7. Check Compliance Status

```typescript
const report = await auditService.getComplianceReport('gdpr');
console.log(report.summary.compliant);
console.log(report.summary.riskLevel);
```

### 8. Get Monthly Statistics

```typescript
const stats = await auditService.getAuditStatistics('2024-01-01', '2024-01-31');
console.log(stats.totalLogs);
console.log(stats.logsBySeverity);
console.log(stats.topChangedResources);
```

### 9. Activity Heatmap Data

```typescript
const heatmap = await auditService.getActivityHeatmap('2024-01-01', '2024-01-31');
// Use for visualization of hourly/daily activity patterns
```

### 10. Search Logs

```typescript
const results = await auditService.searchAuditLogs('payment failed', {
  startDate: '2024-01-01',
  resourceType: 'payment'
});
```

## Severity Levels

```typescript
type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// Info: Normal operations
// Warning: Potentially concerning actions
// Error: Failed operations
// Critical: Security/compliance events
```

## Resource Types

```
product | order | store | user | merchant | cashback | payment |
inventory | category | customer | report | settings | permissions |
api_key | webhook | bulk_action | export | import
```

## Quick Filters

```typescript
// By severity
filters = { severity: 'critical' };

// By action
filters = { action: 'order.cancelled' };

// By date range
filters = {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
};

// By user
filters = { userId: 'user_123' };

// By resource
filters = {
  resourceType: 'product',
  resourceId: 'prod_123'
};

// Combined
filters = {
  action: ['product.created', 'product.updated'],
  severity: ['warning', 'critical'],
  startDate: '2024-01-01',
  resourceType: 'product',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 50,
  page: 1
};
```

## Format Helper

```typescript
const formatted = auditService.formatAuditLog(log);
// Returns:
// {
//   displayAction: 'Updated',
//   displayResource: 'product',
//   displayTime: '5m ago',
//   severityColor: '#f59e0b',
//   icon: '✏️'
// }
```

## Export Formats

```typescript
// CSV (default)
await auditService.exportAuditLogs({ format: 'csv' });

// Excel
await auditService.exportAuditLogs({ format: 'excel' });

// JSON
await auditService.exportAuditLogs({ format: 'json' });

// PDF
await auditService.exportAuditLogs({ format: 'pdf' });
```

## Compliance Frameworks

```typescript
// Single framework
await auditService.getComplianceReport('gdpr');
await auditService.getComplianceReport('soc2');
await auditService.getComplianceReport('iso27001');
await auditService.getComplianceReport('pci');

// All frameworks
await auditService.getComplianceReport('all');
```

## Error Handling

```typescript
try {
  const logs = await auditService.getAuditLogs();
} catch (error) {
  console.error('Failed:', error.message);
  // Handle error appropriately
}
```

## Pagination Example

```typescript
let page = 1;
let allLogs = [];
let hasMore = true;

while (hasMore) {
  const result = await auditService.getAuditLogs({
    page,
    limit: 100
  });

  allLogs = allLogs.concat(result.logs);
  hasMore = result.pagination.hasNext;
  page++;
}
```

## Date Helpers

```typescript
// Last 7 days
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Last 30 days
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// Last 90 days
const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

// Month start to end
const startDate = new Date(2024, 0, 1).toISOString();
const endDate = new Date(2024, 0, 31).toISOString();
```

## Utility Methods

```typescript
// Get action options for dropdowns
const actions = auditService.getActionOptions();

// Get resource type options
const resources = auditService.getResourceTypeOptions();

// Get severity options with colors
const severities = auditService.getSeverityOptions();
```

## Response Interfaces

### AuditLogListResponse
```typescript
{
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: AuditLogFilters;
  summary?: {
    totalLoggedEvents: number;
    dateRange: { start: string; end: string };
  };
}
```

### AuditStatistics
```typescript
{
  totalLogs: number;
  logsByAction: Record<AuditAction, number>;
  logsByResource: Record<AuditResourceType, number>;
  logsBySeverity: Record<AuditSeverity, number>;
  logsByUser: Array<{ userId: string; count: number; lastActivity?: string }>;
  activityTrend: Array<{ date: string; count: number; critical: number; ... }>;
  topChangedResources: Array<{ resourceId: string; changeCount: number; ... }>;
  criticalEvents: AuditLog[];
}
```

### ComplianceReport
```typescript
{
  reportId: string;
  generatedAt: string;
  compliance: {
    gdpr: { compliant: boolean; score: number; checklist: [...] };
    soc2: { compliant: boolean; score: number; checklist: [...] };
    iso27001: { compliant: boolean; score: number; checklist: [...] };
    pci: { compliant: boolean; score: number; checklist: [...] };
  };
  findings: ComplianceFinding[];
  summary: {
    compliant: boolean;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedActions: string[];
  };
}
```

## Files Location

- **Service:** `services/api/audit.ts` (30 KB)
- **Types:** `types/audit.ts` (14 KB)
- **Documentation:** `AUDIT_LOGS_IMPLEMENTATION.md`
- **Index Export:** `services/api/index.ts` (updated)

---

**Need More Help?** See `AUDIT_LOGS_IMPLEMENTATION.md` for detailed documentation.
