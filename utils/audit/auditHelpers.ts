/**
 * Audit Helpers
 *
 * 30+ helper functions for audit log processing:
 * - Formatting (actions, resources, timestamps)
 * - Filtering (by date, user, severity)
 * - Grouping (by date, user, resource)
 * - Analysis (activity stats, suspicious patterns)
 * - Export (CSV, PDF)
 * - Change tracking
 */

import type {
  AuditLog,
  AuditAction,
  AuditResourceType,
  AuditSeverity,
  AuditLogFilters,
  AuditChangeDetail,
  TimelineEntry,
  UserActivity,
  AuditStatistics,
} from '../../types/audit';

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format audit action for display
 */
export const formatAuditAction = (action: AuditAction): string => {
  return action
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format resource type for display
 */
export const formatResourceType = (type: AuditResourceType): string => {
  const typeMap: Record<AuditResourceType, string> = {
    product: 'Product',
    order: 'Order',
    store: 'Store',
    user: 'User',
    merchant: 'Merchant',
    cashback: 'Cashback',
    payment: 'Payment',
    inventory: 'Inventory',
    category: 'Category',
    customer: 'Customer',
    report: 'Report',
    settings: 'Settings',
    permissions: 'Permissions',
    api_key: 'API Key',
    webhook: 'Webhook',
    bulk_action: 'Bulk Action',
    export: 'Export',
    import: 'Import',
  };
  return typeMap[type] || type;
};

/**
 * Get icon for audit action
 */
export const getActionIcon = (action: AuditAction): string => {
  const iconMap: Record<string, string> = {
    // Product
    'product.created': 'add-circle',
    'product.updated': 'create',
    'product.deleted': 'trash',
    'product.published': 'checkmark-circle',
    'product.unpublished': 'close-circle',

    // Order
    'order.created': 'cart',
    'order.updated': 'create',
    'order.status_changed': 'swap-horizontal',
    'order.cancelled': 'close-circle',
    'order.shipped': 'airplane',
    'order.delivered': 'checkmark-done',

    // User
    'user.created': 'person-add',
    'user.updated': 'create',
    'user.deleted': 'person-remove',
    'user.login': 'log-in',
    'user.logout': 'log-out',
    'user.password_changed': 'key',
    'user.permissions_changed': 'shield',

    // Store
    'store.created': 'storefront',
    'store.updated': 'create',
    'store.verified': 'checkmark-circle',
    'store.suspended': 'ban',

    // Payment
    'payment.processed': 'card',
    'payment.failed': 'close-circle',
    'payment.refunded': 'return-up-back',

    // Cashback
    'cashback.claimed': 'wallet',
    'cashback.approved': 'checkmark-circle',
    'cashback.rejected': 'close-circle',
    'cashback.paid': 'cash',

    // System
    'system.backup_created': 'save',
    'system.data_exported': 'download',
    'system.data_imported': 'cloud-upload',
    'system.security_event': 'shield-checkmark',
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (action.includes(key)) return icon;
  }

  // Default icons by action type
  if (action.includes('created')) return 'add-circle';
  if (action.includes('updated')) return 'create';
  if (action.includes('deleted')) return 'trash';
  if (action.includes('approved')) return 'checkmark-circle';
  if (action.includes('rejected')) return 'close-circle';

  return 'information-circle';
};

/**
 * Get color for audit action
 */
export const getActionColor = (action: AuditAction): string => {
  const colorMap: Record<string, string> = {
    created: '#34C759',
    updated: '#007AFF',
    deleted: '#FF3B30',
    approved: '#34C759',
    rejected: '#FF3B30',
    published: '#34C759',
    unpublished: '#FF9500',
    cancelled: '#FF3B30',
    shipped: '#007AFF',
    delivered: '#34C759',
    verified: '#34C759',
    suspended: '#FF3B30',
    failed: '#FF3B30',
    refunded: '#FF9500',
    login: '#34C759',
    logout: '#666',
    security_event: '#FF3B30',
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (action.includes(key)) return color;
  }

  return '#007AFF';
};

/**
 * Get severity color
 */
export const getSeverityColor = (severity: AuditSeverity): string => {
  const severityColors: Record<AuditSeverity, string> = {
    info: '#007AFF',
    warning: '#FF9500',
    error: '#FF3B30',
    critical: '#D70015',
  };
  return severityColors[severity];
};

/**
 * Format relative time
 */
export const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

/**
 * Format change detail
 */
export const formatChange = (change: AuditChangeDetail): string => {
  const field = change.field;
  const before = change.before ?? change.oldValue;
  const after = change.after ?? change.newValue;

  if (before === undefined && after !== undefined) {
    return `${field}: set to "${after}"`;
  }
  if (before !== undefined && after === undefined) {
    return `${field}: removed "${before}"`;
  }
  if (before !== undefined && after !== undefined) {
    return `${field}: "${before}" → "${after}"`;
  }

  return `${field} changed`;
};

// ============================================================================
// FILTERING HELPERS
// ============================================================================

/**
 * Filter audit logs by criteria
 */
export const filterAuditLogs = (
  logs: AuditLog[],
  filters: AuditLogFilters
): AuditLog[] => {
  return logs.filter(log => {
    // Action filter
    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      if (!actions.some(a => log.action.includes(a))) return false;
    }

    // Resource type filter
    if (filters.resourceType) {
      const types = Array.isArray(filters.resourceType)
        ? filters.resourceType
        : [filters.resourceType];
      if (!types.includes(log.resourceType)) return false;
    }

    // Resource ID filter
    if (filters.resourceId && log.resourceId !== filters.resourceId) {
      return false;
    }

    // User filter
    if (filters.userId && log.merchantUserId !== filters.userId) {
      return false;
    }

    // Severity filter
    if (filters.severity) {
      const severities = Array.isArray(filters.severity)
        ? filters.severity
        : [filters.severity];
      if (!severities.includes(log.severity)) return false;
    }

    // Date range filter
    if (filters.fromDate || filters.toDate) {
      const logDate = new Date(log.timestamp);
      if (filters.fromDate && logDate < new Date(filters.fromDate)) return false;
      if (filters.toDate && logDate > new Date(filters.toDate)) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        log.action,
        log.resourceType,
        log.user?.name,
        log.user?.email,
        JSON.stringify(log.details),
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchLower)) return false;
    }

    // IP address filter
    if (filters.ipAddress && log.ipAddress !== filters.ipAddress) {
      return false;
    }

    return true;
  });
};

/**
 * Filter by date range
 */
export const filterByDateRange = (
  logs: AuditLog[],
  start: Date,
  end: Date
): AuditLog[] => {
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= start && logDate <= end;
  });
};

/**
 * Filter by user
 */
export const filterByUser = (logs: AuditLog[], userId: string): AuditLog[] => {
  return logs.filter(log => log.merchantUserId === userId);
};

/**
 * Filter by severity
 */
export const filterBySeverity = (
  logs: AuditLog[],
  severity: AuditSeverity
): AuditLog[] => {
  return logs.filter(log => log.severity === severity);
};

// ============================================================================
// GROUPING HELPERS
// ============================================================================

/**
 * Group logs by date
 */
export const groupLogsByDate = (
  logs: AuditLog[]
): Record<string, AuditLog[]> => {
  const groups: Record<string, AuditLog[]> = {};

  logs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
  });

  return groups;
};

/**
 * Group logs by user
 */
export const groupLogsByUser = (
  logs: AuditLog[]
): Record<string, AuditLog[]> => {
  const groups: Record<string, AuditLog[]> = {};

  logs.forEach(log => {
    const userId = log.merchantUserId || 'system';
    if (!groups[userId]) {
      groups[userId] = [];
    }
    groups[userId].push(log);
  });

  return groups;
};

/**
 * Group logs by resource
 */
export const groupLogsByResource = (
  logs: AuditLog[]
): Record<string, AuditLog[]> => {
  const groups: Record<string, AuditLog[]> = {};

  logs.forEach(log => {
    const key = log.resourceId || log.resourceType;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(log);
  });

  return groups;
};

/**
 * Group timeline by date (with relative labels)
 */
export const groupTimelineByDate = (
  entries: TimelineEntry[]
): Array<{ title: string; date: string; entries: TimelineEntry[] }> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, TimelineEntry[]> = {};

  entries.forEach(entry => {
    const entryDate = new Date(entry.timestamp);
    const entryDay = new Date(
      entryDate.getFullYear(),
      entryDate.getMonth(),
      entryDate.getDate()
    );

    let label: string;
    if (entryDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (entryDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (entryDay >= weekAgo) {
      label = 'This Week';
    } else {
      label = 'Older';
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(entry);
  });

  const order = ['Today', 'Yesterday', 'This Week', 'Older'];
  return order
    .filter(label => groups[label])
    .map(label => ({
      title: label,
      date: label.toLowerCase().replace(' ', '_'),
      entries: groups[label],
    }));
};

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

/**
 * Get most active users
 */
export const getMostActiveUsers = (
  logs: AuditLog[],
  limit: number = 10
): UserActivity[] => {
  const userMap = new Map<string, UserActivity>();

  logs.forEach(log => {
    if (!log.merchantUserId) return;

    const existing = userMap.get(log.merchantUserId);
    if (existing) {
      existing.activity.push(log);
      existing.stats.totalActions++;
      if (new Date(log.timestamp) > new Date(existing.stats.lastActivityAt)) {
        existing.stats.lastActivityAt = log.timestamp;
      }
    } else {
      userMap.set(log.merchantUserId, {
        userId: log.merchantUserId,
        user: log.user,
        activity: [log],
        stats: {
          totalActions: 1,
          lastActivityAt: log.timestamp,
          mostFrequentAction: log.action,
          resourcesModified: log.resourceId ? [log.resourceId] : [],
        },
      });
    }
  });

  return Array.from(userMap.values())
    .sort((a, b) => b.stats.totalActions - a.stats.totalActions)
    .slice(0, limit);
};

/**
 * Get most changed resources
 */
export const getMostChangedResources = (
  logs: AuditLog[],
  limit: number = 10
): Array<{ resourceId: string; resourceType: AuditResourceType; changes: number }> => {
  const resourceMap = new Map<string, { type: AuditResourceType; count: number }>();

  logs.forEach(log => {
    if (!log.resourceId) return;

    const key = `${log.resourceType}:${log.resourceId}`;
    const existing = resourceMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      resourceMap.set(key, { type: log.resourceType, count: 1 });
    }
  });

  return Array.from(resourceMap.entries())
    .map(([key, value]) => ({
      resourceId: key.split(':')[1],
      resourceType: value.type,
      changes: value.count,
    }))
    .sort((a, b) => b.changes - a.changes)
    .slice(0, limit);
};

/**
 * Get audit statistics
 */
export const getAuditStats = (logs: AuditLog[]): Partial<AuditStatistics> => {
  const logsByAction: Record<string, number> = {};
  const logsByResource: Record<string, number> = {};
  const logsBySeverity: Record<AuditSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };

  logs.forEach(log => {
    // By action
    logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;

    // By resource
    logsByResource[log.resourceType] = (logsByResource[log.resourceType] || 0) + 1;

    // By severity
    logsBySeverity[log.severity]++;
  });

  return {
    totalLogs: logs.length,
    logsByAction: logsByAction as any,
    logsByResource: logsByResource as any,
    logsBySeverity,
  };
};

/**
 * Detect suspicious activity patterns
 */
export const detectSuspiciousActivity = (
  logs: AuditLog[]
): Array<{ type: string; description: string; logs: AuditLog[] }> => {
  const suspicious: Array<{ type: string; description: string; logs: AuditLog[] }> = [];

  // Failed login attempts
  const failedLogins = logs.filter(log => log.action === 'user.failed_login');
  const failedLoginsByUser = groupLogsByUser(failedLogins);
  Object.entries(failedLoginsByUser).forEach(([userId, userLogs]) => {
    if (userLogs.length >= 5) {
      suspicious.push({
        type: 'multiple_failed_logins',
        description: `${userLogs.length} failed login attempts`,
        logs: userLogs,
      });
    }
  });

  // Bulk deletions
  const deletions = logs.filter(log => log.action.includes('deleted'));
  if (deletions.length >= 10) {
    const timeSpan = new Date(deletions[0].timestamp).getTime() -
      new Date(deletions[deletions.length - 1].timestamp).getTime();
    if (timeSpan < 3600000) { // Within 1 hour
      suspicious.push({
        type: 'bulk_deletion',
        description: `${deletions.length} items deleted within 1 hour`,
        logs: deletions,
      });
    }
  }

  // Access denied events
  const accessDenied = logs.filter(log => log.action === 'user.access_denied');
  if (accessDenied.length >= 3) {
    suspicious.push({
      type: 'multiple_access_denied',
      description: `${accessDenied.length} access denied events`,
      logs: accessDenied,
    });
  }

  return suspicious;
};

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Export logs to CSV
 */
export const exportLogsToCSV = (logs: AuditLog[]): string => {
  const headers = [
    'Timestamp',
    'Action',
    'Resource Type',
    'Resource ID',
    'User',
    'Email',
    'Severity',
    'IP Address',
  ];

  const rows = logs.map(log => [
    log.timestamp,
    log.action,
    log.resourceType,
    log.resourceId || '',
    log.user?.name || '',
    log.user?.email || '',
    log.severity,
    log.ipAddress || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

/**
 * Export timeline to CSV
 */
export const exportTimelineToCSV = (entries: TimelineEntry[]): string => {
  return exportLogsToCSV(entries);
};

/**
 * Export logs to PDF (placeholder - requires PDF library)
 */
export const exportLogsToPDF = async (logs: AuditLog[]): Promise<string> => {
  // This would use a PDF generation library like react-native-pdf or jspdf
  // For now, return a placeholder
  return 'PDF generation not implemented yet';
};

/**
 * Export timeline to PDF
 */
export const exportTimelineToPDF = async (entries: TimelineEntry[]): Promise<string> => {
  return exportLogsToPDF(entries);
};

// ============================================================================
// CHANGE TRACKING HELPERS
// ============================================================================

/**
 * Compute changes between two objects
 */
export const computeChanges = (before: any, after: any): AuditChangeDetail[] => {
  const changes: AuditChangeDetail[] = [];

  if (!before || !after) return changes;

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  allKeys.forEach(key => {
    const beforeValue = before[key];
    const afterValue = after[key];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        field: key,
        before: beforeValue,
        after: afterValue,
        oldValue: beforeValue,
        newValue: afterValue,
      });
    }
  });

  return changes;
};

// ============================================================================
// TIMELINE HELPERS
// ============================================================================

/**
 * Filter timeline entries by type
 */
export const filterTimelineEntries = (
  entries: TimelineEntry[],
  type: string
): TimelineEntry[] => {
  if (type === 'all') return entries;

  const typeMap: Record<string, string[]> = {
    audits: ['product', 'order', 'store', 'user', 'merchant'],
    notifications: ['notification'],
    orders: ['order'],
    products: ['product'],
    team: ['user', 'permissions'],
    cashback: ['cashback'],
    payments: ['payment'],
  };

  const resourceTypes = typeMap[type] || [];
  return entries.filter(entry => resourceTypes.includes(entry.resourceType));
};

/**
 * Search timeline entries
 */
export const searchTimelineEntries = (
  entries: TimelineEntry[],
  query: string
): TimelineEntry[] => {
  const queryLower = query.toLowerCase();

  return entries.filter(entry => {
    const searchText = [
      entry.action,
      entry.resourceType,
      entry.user?.name,
      entry.user?.email,
      JSON.stringify(entry.details),
    ].join(' ').toLowerCase();

    return searchText.includes(queryLower);
  });
};

/**
 * Convert audit log to timeline entry
 */
export const auditLogToTimelineEntry = (log: AuditLog): TimelineEntry => {
  return {
    ...log,
    formattedTime: new Date(log.timestamp).toLocaleString(),
    relativeTime: formatRelativeTime(log.timestamp),
    icon: getActionIcon(log.action),
    color: getActionColor(log.action),
  };
};
