# Audit Logs API Service Implementation

## Overview

The audit logs service provides comprehensive activity tracking and compliance reporting for the merchant app. It integrates with 8 backend endpoints and supports 40+ action types with full before/after state capture.

**Location:**
- Service: `services/api/audit.ts`
- Types: `types/audit.ts`

**Key Features:**
- Complete audit trail with before/after state capture
- Compliance ready (GDPR, SOC2, ISO27001, PCI)
- Advanced filtering and search capabilities
- Export functionality (CSV, Excel, JSON, PDF)
- Activity timeline and heatmap visualization
- User activity tracking
- Critical activity alerts
- Data retention and cleanup management

---

## Type Definitions

### Core Types (`types/audit.ts`)

#### Enums & Constants

```typescript
// Severity levels
type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// Resource types tracked
type AuditResourceType = 'product' | 'order' | 'store' | 'user' | ... (18 types)

// 40+ action types
type AuditAction = 'product.created' | 'product.updated' | 'order.status_changed' | ... (40+ actions)
```

#### Main Audit Log Structure

```typescript
interface AuditLog {
  id: string;
  merchantId: string;
  merchantUserId?: string;           // Team member who performed action
  action: AuditAction;               // Specific action performed
  resourceType: AuditResourceType;   // Resource affected
  resourceId?: string;               // Resource ID
  details: {
    before?: any;                    // State before change
    after?: any;                     // State after change
    changes?: AuditChangeDetail[];   // Specific changed fields
    metadata?: Record<string, any>;  // Additional context
  };
  ipAddress?: string;                // User's IP address
  userAgent?: string;                // Browser/client info
  timestamp: string;                 // ISO 8601 timestamp
  severity: AuditSeverity;          // Event severity level
}
```

#### Filtering Types

```typescript
interface AuditLogFilters extends QueryOptions, DateRangeFilter {
  action?: AuditAction | AuditAction[];
  resourceType?: AuditResourceType | AuditResourceType[];
  userId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  search?: string;
  dateRange?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}
```

#### Statistics & Analytics

```typescript
interface AuditStatistics {
  totalLogs: number;
  logsByAction: Record<AuditAction, number>;
  logsByResource: Record<AuditResourceType, number>;
  logsBySeverity: Record<AuditSeverity, number>;
  logsByUser: Array<{ userId: string; count: number; lastActivity?: string }>;
  activityTrend: Array<{ date: string; count: number; ... }>;
  topChangedResources: Array<{ ... }>;
}
```

#### Compliance & Reporting

```typescript
interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  compliance: {
    gdpr: ComplianceStatus;
    soc2: ComplianceStatus;
    iso27001: ComplianceStatus;
    pci: ComplianceStatus;
  };
  findings: ComplianceFinding[];
  summary: { compliant: boolean; overallScore: number; riskLevel: string };
}
```

---

## API Service Methods

### Main Methods (`services/api/audit.ts`)

#### 1. Get Audit Logs

```typescript
async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogListResponse>
```

**Endpoint:** `GET /api/merchant/audit/logs`

**Parameters:**
- `filters.page` - Page number (pagination)
- `filters.limit` - Records per page
- `filters.action` - Filter by action type(s)
- `filters.resourceType` - Filter by resource type(s)
- `filters.severity` - Filter by severity level(s)
- `filters.startDate/endDate` - Date range filtering
- `filters.userId` - Filter by user
- `filters.search` - Full-text search

**Example:**

```typescript
const logs = await auditService.getAuditLogs({
  action: ['product.created', 'product.updated'],
  severity: 'critical',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  limit: 50
});
```

#### 2. Get Resource History

```typescript
async getResourceHistory(resourceType: string, resourceId: string): Promise<ResourceHistory>
```

**Endpoint:** `GET /api/merchant/audit/resource/:resourceType/:resourceId`

**Returns:** Complete audit history of a specific resource with all changes.

**Example:**

```typescript
const history = await auditService.getResourceHistory('product', 'prod_123');
// Returns: { resourceId, resourceType, history: [AuditLog[], count }
```

#### 3. Get Activity Timeline

```typescript
async getTimeline(options?: TimelineQueryOptions): Promise<TimelineResponse>
```

**Endpoint:** `GET /api/merchant/audit/timeline`

**Options:**
- `userId` - Filter by user
- `resourceType` - Filter by resource type
- `action` - Filter by action
- `severity` - Filter by severity
- `startDate/endDate` - Date range
- `limit` - Max records (default: 100)
- `sort` - Sort order ('newest' | 'oldest')

**Example:**

```typescript
const timeline = await auditService.getTimeline({
  userId: 'user_123',
  startDate: '2024-01-01',
  limit: 50
});
```

#### 4. Get Today's Activities

```typescript
async getTodayActivities(): Promise<TimelineResponse>
```

**Endpoint:** `GET /api/merchant/audit/timeline/today`

**Returns:** All activities from today.

#### 5. Get Recent Activities

```typescript
async getRecentActivities(limit: number = 20): Promise<TimelineResponse>
```

**Endpoint:** `GET /api/merchant/audit/timeline/recent`

**Returns:** Most recent activities.

#### 6. Get Activity Summary

```typescript
async getActivitySummary(startDate?: string, endDate?: string): Promise<{ period, summary: ActivitySummary }>
```

**Endpoint:** `GET /api/merchant/audit/timeline/summary`

**Returns:** Summary with action breakdown, top users, and affected resources.

#### 7. Get Critical Activities

```typescript
async getCriticalActivities(limit: number = 50): Promise<CriticalActivitiesResponse>
```

**Endpoint:** `GET /api/merchant/audit/timeline/critical`

**Returns:** Security and compliance-critical activities.

#### 8. Get Activity Heatmap

```typescript
async getActivityHeatmap(startDate?: string, endDate?: string): Promise<{ heatmap: ActivityHeatmap }>
```

**Endpoint:** `GET /api/merchant/audit/timeline/heatmap`

**Returns:** Hourly and daily activity distribution for visualization.

#### 9. Search Audit Logs

```typescript
async searchAuditLogs(searchTerm: string, filters?: {...}): Promise<{ results: AuditLog[]; count: number }>
```

**Endpoint:** `GET /api/merchant/audit/search`

**Parameters:**
- `searchTerm` - Search query (required)
- `filters.startDate/endDate` - Date range
- `filters.resourceType` - Resource type

#### 10. Get Statistics

```typescript
async getAuditStatistics(startDate?: string, endDate?: string): Promise<AuditStatistics>
```

**Endpoint:** `GET /api/merchant/audit/stats`

**Returns:** Comprehensive statistics including trends, top users, and resource changes.

#### 11. Get User Activity

```typescript
async getUserActivity(userId: string, options?: {...}): Promise<{ userId, activity: AuditLog[], count }>
```

**Endpoint:** `GET /api/merchant/audit/user/:userId`

**Options:**
- `limit` - Max records
- `startDate/endDate` - Date range

#### 12. Export Audit Logs

```typescript
async exportAuditLogs(filters?: AuditExportFilters): Promise<ExportMetadata>
```

**Endpoint:** `GET /api/merchant/audit/export`

**Parameters:**
- `filters.format` - Export format ('csv' | 'excel' | 'json' | 'pdf')
- `filters.startDate/endDate` - Date range
- `filters.includeDetails` - Include detailed change info

**Example:**

```typescript
const export_data = await auditService.exportAuditLogs({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  includeDetails: true
});

// Download file from export_data.downloadUrl
```

#### 13. Get Compliance Report

```typescript
async getComplianceReport(framework?: string): Promise<ComplianceReport>
```

**Endpoint:** `GET /api/merchant/audit/retention/compliance`

**Parameters:**
- `framework` - 'gdpr' | 'soc2' | 'iso27001' | 'pci' | 'all'

**Returns:** Compliance assessment with findings and recommendations.

**Example:**

```typescript
const report = await auditService.getComplianceReport('gdpr');
// Returns compliance status, checklist, and findings
```

#### 14. Get Retention Statistics

```typescript
async getRetentionStatistics(): Promise<RetentionStatistics>
```

**Endpoint:** `GET /api/merchant/audit/retention/stats`

**Returns:** Storage usage, retention policies, and purge dates.

#### 15. Cleanup Audit Logs

```typescript
async cleanupAuditLogs(retentionDays: number = 365, autoArchive: boolean = true): Promise<{ deletedCount, archivedCount }>
```

**Endpoint:** `POST /api/merchant/audit/retention/cleanup`

**Parameters:**
- `retentionDays` - Number of days to retain (default: 365)
- `autoArchive` - Archive before deleting (default: true)

#### 16. Get Archived Logs

```typescript
async getArchivedLogs(): Promise<{ archives: Archive[]; count: number }>
```

**Endpoint:** `GET /api/merchant/audit/retention/archives`

**Returns:** List of archived files with metadata.

---

## Utility Methods

### Get Options

```typescript
// Get action type options for dropdowns
getActionOptions(): Array<{ label: string; value: string; icon?: string }>

// Get resource type options
getResourceTypeOptions(): Array<{ label: string; value: string; icon?: string }>

// Get severity options with colors
getSeverityOptions(): Array<{ label: string; value: string; color: string }>
```

### Format Audit Log

```typescript
formatAuditLog(log: AuditLog): {
  displayAction: string;
  displayResource: string;
  displayTime: string;
  severityColor: string;
  icon: string;
}
```

---

## Usage Examples

### Example 1: Get Recent Product Changes

```typescript
import { auditService } from '@/services/api';

const logs = await auditService.getAuditLogs({
  resourceType: 'product',
  action: ['product.created', 'product.updated', 'product.deleted'],
  limit: 20,
  page: 1,
  sortBy: 'timestamp',
  sortOrder: 'desc'
});

console.log(`Total changes: ${logs.pagination.total}`);
logs.logs.forEach(log => {
  const formatted = auditService.formatAuditLog(log);
  console.log(`${formatted.icon} ${formatted.displayAction} - ${formatted.displayTime}`);
});
```

### Example 2: Get Product Audit Trail

```typescript
const history = await auditService.getResourceHistory('product', 'prod_123');

console.log(`Product ${history.resourceId} has ${history.count} changes`);
console.log(`First change: ${history.firstChange}`);
console.log(`Last change: ${history.lastChange}`);

history.history.forEach(log => {
  console.log(`
    Action: ${log.action}
    Changed by: ${log.user?.name}
    Changes: ${JSON.stringify(log.details.changes)}
  `);
});
```

### Example 3: Get Activity Timeline

```typescript
const timeline = await auditService.getTimeline({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 100,
  sort: 'newest'
});

console.log(`${timeline.count} activities in January`);
```

### Example 4: Compliance Reporting

```typescript
const report = await auditService.getComplianceReport('gdpr');

console.log(`GDPR Compliance Score: ${report.compliance.gdpr.score}`);
console.log(`Compliant: ${report.summary.compliant}`);
console.log(`Risk Level: ${report.summary.riskLevel}`);

if (report.findings.length > 0) {
  console.log('\nFindings:');
  report.findings.forEach(finding => {
    console.log(`- [${finding.severity}] ${finding.description}`);
    console.log(`  Recommendation: ${finding.recommendation}`);
  });
}
```

### Example 5: Export Audit Logs

```typescript
const exportResult = await auditService.exportAuditLogs({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  includeDetails: true
});

console.log(`Export ready: ${exportResult.filename}`);
console.log(`Records: ${exportResult.recordCount}`);
console.log(`Generated: ${exportResult.generatedAt}`);

// Download file
window.open(exportResult.downloadUrl);
```

### Example 6: Critical Activity Monitoring

```typescript
const criticalActivities = await auditService.getCriticalActivities(50);

console.log(`Critical activities: ${criticalActivities.count}`);
console.log(`Unresolved: ${criticalActivities.unresolvedCount}`);

criticalActivities.activities.forEach(activity => {
  console.log(`
    [${activity.riskScore}] ${activity.action}
    Alert Type: ${activity.alertType}
    Suggested Action: ${activity.suggestedAction}
  `);
});
```

### Example 7: User Activity Analysis

```typescript
const userActivity = await auditService.getUserActivity('user_123', {
  limit: 100,
  startDate: '2024-01-01'
});

console.log(`User: ${userActivity.user?.email}`);
console.log(`Total actions: ${userActivity.stats.totalActions}`);
console.log(`Last activity: ${userActivity.stats.lastActivityAt}`);
console.log(`Most frequent action: ${userActivity.stats.mostFrequentAction}`);

if (userActivity.riskIndicators) {
  console.log(`Risk score: ${userActivity.riskIndicators.riskScore}`);
  console.log(`Failed logins: ${userActivity.riskIndicators.failedLoginAttempts}`);
}
```

---

## 40+ Supported Action Types

### Product Actions (19)
- `product.created` - New product created
- `product.updated` - Product details updated
- `product.deleted` - Product deleted
- `product.archived` - Product archived
- `product.restored` - Product restored from archive
- `product.published` - Product published to catalog
- `product.unpublished` - Product hidden from catalog
- `product.featured` - Product marked as featured
- `product.unfeatured` - Featured status removed
- `product.status_changed` - Status changed (active/inactive)
- `product.price_changed` - Price updated
- `product.inventory_updated` - Stock level changed
- `product.image_added` - Image added
- `product.image_removed` - Image removed
- `product.category_changed` - Category reassigned
- `product.bulk_update` - Bulk product update
- `product.bulk_delete` - Bulk product deletion
- `product.import` - Products imported
- `product.export` - Products exported

### Order Actions (8)
- `order.created` - Order placed
- `order.updated` - Order details updated
- `order.status_changed` - Order status changed
- `order.cancelled` - Order cancelled
- `order.refunded` - Refund issued
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered
- `order.reassigned` - Reassigned to different team member

### Store/Merchant Actions (8)
- `store.created` - Store created
- `store.updated` - Store details updated
- `store.deleted` - Store deleted
- `store.settings_changed` - Settings modified
- `store.profile_updated` - Profile information changed
- `store.status_changed` - Status changed
- `store.verified` - Store verified
- `store.suspended` - Store suspended

### User/Permission Actions (12)
- `user.created` - User account created
- `user.updated` - User details updated
- `user.deleted` - User account deleted
- `user.login` - Successful login
- `user.logout` - User logged out
- `user.password_changed` - Password changed
- `user.permissions_changed` - Permissions modified
- `user.role_changed` - Role assigned/changed
- `user.disabled` - Account disabled
- `user.enabled` - Account enabled
- `user.failed_login` - Failed login attempt
- `user.access_denied` - Access denied

### Payment Actions (5)
- `payment.processed` - Payment processed
- `payment.failed` - Payment failed
- `payment.refunded` - Refund processed
- `payment.reconciled` - Reconciliation completed
- `payment.verified` - Payment verified

### Cashback Actions (5)
- `cashback.claimed` - Cashback claimed
- `cashback.approved` - Claim approved
- `cashback.rejected` - Claim rejected
- `cashback.paid` - Cashback paid
- `cashback.expired` - Claim expired

### Inventory Actions (5)
- `inventory.stock_updated` - Stock count updated
- `inventory.low_stock_alert` - Low stock alert triggered
- `inventory.out_of_stock` - Item out of stock
- `inventory.counted` - Inventory counted
- `inventory.adjusted` - Stock adjusted

### System Actions (8)
- `system.backup_created` - Data backup created
- `system.data_exported` - Data exported
- `system.data_imported` - Data imported
- `system.report_generated` - Report generated
- `system.api_accessed` - API accessed
- `system.webhook_triggered` - Webhook triggered
- `system.security_event` - Security event
- `system.compliance_check` - Compliance check run

---

## Compliance Features

### GDPR Compliance
- Data retention policies with automatic purging
- Data export in standard formats
- Right to be forgotten support
- Processing activity documentation
- Privacy impact assessments

### SOC2 Type II
- Complete audit trails
- User access logging
- Change tracking with before/after states
- Integrity verification
- Real-time alerting for critical events

### ISO 27001
- Access control logging
- Incident tracking
- Security event monitoring
- Data classification tracking
- Compliance reporting

### PCI DSS
- Payment event logging
- User authentication tracking
- Access control auditing
- Data protection verification
- Compliance documentation

---

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const logs = await auditService.getAuditLogs(filters);
} catch (error) {
  // Error will include:
  // - HTTP status code
  // - Backend error message
  // - Fallback error message
  console.error('Failed to get audit logs:', error.message);
}
```

---

## Performance Considerations

1. **Pagination:** Always use pagination for large datasets
   ```typescript
   const logs = await auditService.getAuditLogs({
     limit: 50,
     page: 1
   });
   ```

2. **Date Ranges:** Limit date ranges for better performance
   ```typescript
   const logs = await auditService.getAuditLogs({
     startDate: '2024-01-01',
     endDate: '2024-01-31'
   });
   ```

3. **Filtering:** Use specific filters to reduce results
   ```typescript
   const logs = await auditService.getAuditLogs({
     action: 'product.created',
     resourceType: 'product'
   });
   ```

4. **Caching:** Consider caching timeline and statistics:
   ```typescript
   // Cache for 5 minutes
   const cacheKey = `stats_${startDate}_${endDate}`;
   const stats = await auditService.getAuditStatistics(startDate, endDate);
   ```

---

## Integration Points

### In Components

```typescript
import { auditService } from '@/services/api';
import { AuditLog, AuditLogFilters } from '@/types/audit';

export function AuditLogsComponent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const result = await auditService.getAuditLogs(filters);
        setLogs(result.logs);
      } catch (error) {
        console.error('Failed to load logs:', error);
      }
    };

    loadLogs();
  }, [filters]);

  return (
    <div>
      {logs.map(log => (
        <AuditLogItem key={log.id} log={log} />
      ))}
    </div>
  );
}
```

---

## Testing

The service is designed to be easily testable:

```typescript
// Mock the service
jest.mock('@/services/api/audit', () => ({
  auditService: {
    getAuditLogs: jest.fn(),
    getResourceHistory: jest.fn(),
    // ... other methods
  }
}));

// Test with mock data
test('should display audit logs', async () => {
  const mockLogs = [
    { id: '1', action: 'product.created', ... }
  ];

  auditService.getAuditLogs.mockResolvedValue({
    logs: mockLogs,
    pagination: { total: 1, page: 1, ... }
  });

  // Test component/function
});
```

---

## Files Created

1. **services/api/audit.ts** (30 KB)
   - 16 main API methods
   - 4 utility/helper methods
   - Comprehensive error handling
   - Follows established patterns

2. **types/audit.ts** (14 KB)
   - 40+ action type definitions
   - Core audit log interfaces
   - Filter and query types
   - Statistics and reporting types
   - Compliance framework types

3. **services/api/index.ts** (updated)
   - Added audit service export

---

## Next Steps

1. Use the service in audit log viewing components
2. Implement compliance report generation UI
3. Add activity timeline visualization
4. Create heatmap chart for activity patterns
5. Implement critical activity alerts
6. Add bulk export functionality
7. Create compliance dashboard

---

## Support & Documentation

- Backend Routes: `user-backend/src/merchantroutes/audit.ts`
- Backend Services: `user-backend/src/services/AuditService.ts`
- Model: `user-backend/src/models/AuditLog.ts`

For questions or issues, refer to the backend implementation or contact the development team.
