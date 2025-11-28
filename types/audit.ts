import { QueryOptions, DateRangeFilter } from './api';

/**
 * Audit Logs Types
 * Comprehensive type definitions for audit logging system
 * Supports compliance tracking (GDPR, SOC2, ISO, PCI)
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Audit severity levels
 * - info: Normal operations
 * - warning: Potentially concerning actions
 * - error: Failed operations or validation errors
 * - critical: Security or critical business events
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Resource types tracked in audit logs
 */
export type AuditResourceType =
  | 'product'
  | 'order'
  | 'store'
  | 'user'
  | 'merchant'
  | 'cashback'
  | 'payment'
  | 'inventory'
  | 'category'
  | 'customer'
  | 'report'
  | 'settings'
  | 'permissions'
  | 'api_key'
  | 'webhook'
  | 'bulk_action'
  | 'export'
  | 'import';

/**
 * Comprehensive list of audit action types (40+ actions)
 */
export type AuditAction =
  // Product actions
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.archived'
  | 'product.restored'
  | 'product.published'
  | 'product.unpublished'
  | 'product.featured'
  | 'product.unfeatured'
  | 'product.status_changed'
  | 'product.price_changed'
  | 'product.inventory_updated'
  | 'product.image_added'
  | 'product.image_removed'
  | 'product.category_changed'
  | 'product.bulk_update'
  | 'product.bulk_delete'
  | 'product.import'
  | 'product.export'

  // Order actions
  | 'order.created'
  | 'order.updated'
  | 'order.status_changed'
  | 'order.cancelled'
  | 'order.refunded'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.reassigned'

  // Store/Merchant actions
  | 'store.created'
  | 'store.updated'
  | 'store.deleted'
  | 'store.settings_changed'
  | 'store.profile_updated'
  | 'store.status_changed'
  | 'store.verified'
  | 'store.suspended'

  // User/Permission actions
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  | 'user.permissions_changed'
  | 'user.role_changed'
  | 'user.disabled'
  | 'user.enabled'
  | 'user.failed_login'
  | 'user.access_denied'

  // Payment actions
  | 'payment.processed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.reconciled'
  | 'payment.verified'

  // Cashback actions
  | 'cashback.claimed'
  | 'cashback.approved'
  | 'cashback.rejected'
  | 'cashback.paid'
  | 'cashback.expired'

  // Inventory actions
  | 'inventory.stock_updated'
  | 'inventory.low_stock_alert'
  | 'inventory.out_of_stock'
  | 'inventory.counted'
  | 'inventory.adjusted'

  // System actions
  | 'system.backup_created'
  | 'system.data_exported'
  | 'system.data_imported'
  | 'system.report_generated'
  | 'system.api_accessed'
  | 'system.webhook_triggered'
  | 'system.security_event'
  | 'system.compliance_check'

  // Generic fallback
  | string;

// ============================================================================
// CORE AUDIT LOG TYPES
// ============================================================================

/**
 * Details of changes made in an audit event
 */
export interface AuditChangeDetail {
  field: string;
  before?: any;
  after?: any;
  oldValue?: any;
  newValue?: any;
}

/**
 * Complete audit log entry
 */
export interface AuditLog {
  id: string;
  merchantId: string;
  merchantUserId?: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  details: {
    before?: any;
    after?: any;
    changes?: AuditChangeDetail[];
    metadata?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: AuditSeverity;
  createdAt: string;
  updatedAt: string;

  // Enriched fields
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  resource?: {
    id: string;
    name?: string;
    type: AuditResourceType;
  };
}

/**
 * List response for audit logs with pagination
 */
export interface AuditLogListResponse {
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
    dateRange: {
      start: string;
      end: string;
    };
  };
}

/**
 * Resource history response
 */
export interface ResourceHistory {
  resourceType: AuditResourceType;
  resourceId: string;
  history: AuditLog[];
  count: number;
  firstChange?: string;
  lastChange?: string;
}

/**
 * Timeline entry (simplified audit log for timeline views)
 */
export interface TimelineEntry extends AuditLog {
  formattedTime?: string;
  relativeTime?: string;
  icon?: string;
  color?: string;
}

/**
 * Timeline response
 */
export interface TimelineResponse {
  entries: TimelineEntry[];
  count: number;
  period?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

/**
 * Audit log filtering options
 */
export interface AuditLogFilters extends QueryOptions, DateRangeFilter {
  action?: AuditAction | AuditAction[];
  resourceType?: AuditResourceType | AuditResourceType[];
  resourceId?: string;
  userId?: string;
  merchantUserId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  search?: string;
  ipAddress?: string;

  // Advanced filtering
  fromDate?: string;
  toDate?: string;
  dateRange?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

/**
 * Export filters
 */
export interface AuditExportFilters extends AuditLogFilters {
  format?: 'csv' | 'excel' | 'json' | 'pdf';
  includeDetails?: boolean;
  compression?: boolean;
}

/**
 * Timeline query options
 */
export interface TimelineQueryOptions {
  userId?: string;
  resourceType?: AuditResourceType;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  limit?: number;
  sort?: 'newest' | 'oldest';
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Activity statistics
 */
export interface AuditStatistics {
  totalLogs: number;
  logsByAction: Record<AuditAction, number>;
  logsByResource: Record<AuditResourceType, number>;
  logsBySeverity: Record<AuditSeverity, number>;
  logsByUser: Array<{
    userId: string;
    userName?: string;
    email?: string;
    count: number;
    lastActivity?: string;
  }>;
  activityTrend: Array<{
    date: string;
    count: number;
    critical: number;
    warning: number;
    error: number;
    info: number;
  }>;
  topChangedResources: Array<{
    resourceId: string;
    resourceType: AuditResourceType;
    name?: string;
    changeCount: number;
    lastChanged: string;
  }>;
  criticalEvents: AuditLog[];
}

/**
 * Activity summary
 */
export interface ActivitySummary {
  period: {
    start: string;
    end: string;
  };
  totalActivities: number;
  uniqueUsers: number;
  uniqueResources: number;
  actionBreakdown: Record<AuditAction, number>;
  severityBreakdown: Record<AuditSeverity, number>;
  topActions: Array<{
    action: AuditAction;
    count: number;
    percentage: number;
  }>;
  topUsers: Array<{
    userId: string;
    name?: string;
    activities: number;
  }>;
  mostAffectedResources: Array<{
    resourceId: string;
    resourceType: AuditResourceType;
    changes: number;
  }>;
}

/**
 * Activity heatmap data for visualization
 */
export interface ActivityHeatmap {
  period: {
    start: string;
    end: string;
  };
  heatmapData: Array<{
    date: string;
    hour: number;
    count: number;
    intensity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
    percentage: number;
  }>;
  dailyDistribution: Array<{
    date: string;
    count: number;
    percentage: number;
  }>;
  peakActivity: {
    date: string;
    hour: number;
    count: number;
  };
}

// ============================================================================
// COMPLIANCE & REPORTING
// ============================================================================

/**
 * Compliance report for regulatory requirements
 */
export interface ComplianceReport {
  reportId: string;
  merchantId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  compliance: {
    gdpr: ComplianceStatus;
    soc2: ComplianceStatus;
    iso27001: ComplianceStatus;
    pci: ComplianceStatus;
  };
  findings: ComplianceFinding[];
  summary: {
    compliant: boolean;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedActions: string[];
  };
  dataProcessing: {
    totalRecordsProcessed: number;
    dataRetention: {
      retentionDays: number;
      nextPurgeDate: string;
      archivedRecords: number;
    };
  };
  accessControl: {
    usersWithAccess: number;
    uniqueIPs: number;
    failedAccessAttempts: number;
    successfulAccessAttempts: number;
  };
  securityEvents: {
    suspiciousActivities: number;
    unauthorizedAccessAttempts: number;
    dataAccessLogs: number;
  };
}

/**
 * Compliance status for a specific framework
 */
export interface ComplianceStatus {
  framework: string;
  compliant: boolean;
  score: number;
  checklist: Array<{
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
    evidence: string[];
    note?: string;
  }>;
  lastReview: string;
  nextReview: string;
}

/**
 * Compliance finding (issue or concern)
 */
export interface ComplianceFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  affectedArea: string;
  evidence: string[];
  recommendation: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'waived';
}

/**
 * Data retention and storage statistics
 */
export interface RetentionStatistics {
  totalRecords: number;
  storageUsed: string;
  storageLimit: string;
  utilizationPercent: number;
  oldestRecord: string;
  newestRecord: string;
  averageRecordSize: string;
  estimatedPurgeDate: string;
  archivedRecords: {
    count: number;
    storageUsed: string;
  };
  retentionPolicy: {
    activeRetentionDays: number;
    archiveRetentionDays?: number;
    autoArchiveEnabled: boolean;
    autoPurgeEnabled: boolean;
  };
}

// ============================================================================
// REQUEST & RESPONSE TYPES
// ============================================================================

/**
 * Request to fetch audit logs
 */
export interface GetAuditLogsRequest {
  filters?: AuditLogFilters;
  page?: number;
  limit?: number;
}

/**
 * Request to export audit logs
 */
export interface ExportAuditLogsRequest {
  filters?: AuditExportFilters;
  filename?: string;
}

/**
 * Request to get activity timeline
 */
export interface GetTimelineRequest {
  filters?: TimelineQueryOptions;
}

/**
 * Request to get statistics
 */
export interface GetStatisticsRequest {
  startDate?: string;
  endDate?: string;
}

/**
 * Request to get compliance report
 */
export interface GetComplianceReportRequest {
  includeRecommendations?: boolean;
  framework?: 'gdpr' | 'soc2' | 'iso27001' | 'pci' | 'all';
}

/**
 * Generic API response for audit endpoints
 */
export interface AuditApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// ============================================================================
// USER ACTIVITY TYPES
// ============================================================================

/**
 * User activity summary
 */
export interface UserActivity {
  userId: string;
  user?: {
    email: string;
    name: string;
    role: string;
  };
  activity: AuditLog[];
  stats: {
    totalActions: number;
    lastActivityAt: string;
    mostFrequentAction: AuditAction;
    resourcesModified: string[];
  };
  riskIndicators?: {
    failedLoginAttempts: number;
    suspiciousPatterns: string[];
    riskScore: number;
  };
}

/**
 * Critical activity (security-relevant event)
 */
export interface CriticalActivity extends AuditLog {
  riskScore: number;
  alertType?: 'security' | 'compliance' | 'operational' | 'suspicious';
  requiresAction?: boolean;
  suggestedAction?: string;
}

/**
 * Critical activity response
 */
export interface CriticalActivitiesResponse {
  activities: CriticalActivity[];
  count: number;
  totalCriticalCount: number;
  unresolvedCount: number;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Export file metadata
 */
export interface ExportMetadata {
  filename: string;
  format: 'csv' | 'excel' | 'json' | 'pdf';
  url?: string;
  downloadUrl?: string;
  generatedAt: string;
  recordCount: number;
  fileSize?: string;
  expiresAt?: string;
}

/**
 * Bulk export response
 */
export interface BulkExportResponse {
  success: boolean;
  exports: ExportMetadata[];
  totalRecords: number;
  message?: string;
}

// ============================================================================
// ERROR & VALIDATION TYPES
// ============================================================================

/**
 * Audit log validation error
 */
export interface AuditValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Audit error response
 */
export interface AuditErrorResponse extends AuditApiResponse<null> {
  success: false;
  error: string;
  errors?: AuditValidationError[];
  timestamp: string;
}
