/**
 * Audit Logs API Service
 * Manages all audit log operations for the merchant app
 * Follows patterns from products.ts service
 * Compliance-ready for GDPR, SOC2, ISO27001, PCI
 */

import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';
import {
  AuditLog,
  AuditLogListResponse,
  AuditLogFilters,
  AuditStatistics,
  ActivitySummary,
  ActivityHeatmap,
  ComplianceReport,
  TimelineEntry,
  TimelineResponse,
  UserActivity,
  CriticalActivity,
  CriticalActivitiesResponse,
  ResourceHistory,
  ExportMetadata,
  AuditExportFilters,
  TimelineQueryOptions,
  RetentionStatistics,
} from '../../types/audit';

/**
 * AuditService - Comprehensive audit logs API integration
 */
class AuditService {
  /**
   * Get audit logs with filtering and pagination
   * Endpoint: GET /api/merchant/audit/logs
   *
   * @param filters - Filter options (action, resourceType, dateRange, etc.)
   * @returns Paginated list of audit logs
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogListResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        // Pagination
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());

        // Sorting
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        // Action filtering
        if (filters.action) {
          const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
          actions.forEach((action) => params.append('action', action));
        }

        // Resource type filtering
        if (filters.resourceType) {
          const types = Array.isArray(filters.resourceType)
            ? filters.resourceType
            : [filters.resourceType];
          types.forEach((type) => params.append('resourceType', type));
        }

        // Resource ID filtering
        if (filters.resourceId) params.append('resourceId', filters.resourceId);

        // User filtering
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.merchantUserId) params.append('userId', filters.merchantUserId);

        // Severity filtering
        if (filters.severity) {
          const severities = Array.isArray(filters.severity)
            ? filters.severity
            : [filters.severity];
          severities.forEach((severity) => params.append('severity', severity));
        }

        // Date range filtering
        if (filters.startDate || filters.fromDate) {
          params.append('startDate', (filters.startDate || filters.fromDate) as string);
        }
        if (filters.endDate || filters.toDate) {
          params.append('endDate', (filters.endDate || filters.toDate) as string);
        }

        // Quick date range
        if (filters.dateRange && filters.dateRange !== 'custom') {
          params.append('dateRange', filters.dateRange);
        }

        // Search
        if (filters.search) params.append('search', filters.search);

        // IP Address filtering
        if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      }

      const response = await fetch(getApiUrl(`merchant/audit/logs?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get audit logs');
      }
    } catch (error: any) {
      console.error('❌ Get audit logs error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get audit logs'
      );
    }
  }

  /**
   * Get audit history for a specific resource
   * Endpoint: GET /api/merchant/audit/resource/:resourceType/:resourceId
   *
   * @param resourceType - Type of resource (product, order, etc.)
   * @param resourceId - ID of the resource
   * @returns Complete audit history of the resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string
  ): Promise<ResourceHistory> {
    try {
      const response = await fetch(
        getApiUrl(`merchant/audit/resource/${resourceType}/${resourceId}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get resource history');
      }
    } catch (error: any) {
      console.error('❌ Get resource history error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get resource history'
      );
    }
  }

  /**
   * Get activity timeline with filtering
   * Endpoint: GET /api/merchant/audit/timeline
   *
   * @param options - Timeline query options
   * @returns Timeline of activities
   */
  async getTimeline(options?: TimelineQueryOptions): Promise<TimelineResponse> {
    try {
      const params = new URLSearchParams();

      if (options) {
        if (options.userId) params.append('userId', options.userId);
        if (options.resourceType) params.append('resourceType', options.resourceType);
        if (options.action) params.append('action', options.action);
        if (options.severity) params.append('severity', options.severity);
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.sort) params.append('sort', options.sort);
      }

      const response = await fetch(getApiUrl(`merchant/audit/timeline?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get timeline');
      }
    } catch (error: any) {
      console.error('❌ Get timeline error:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to get timeline'
      );
    }
  }

  /**
   * Get today's activities
   * Endpoint: GET /api/merchant/audit/timeline/today
   *
   * @returns Today's activities
   */
  async getTodayActivities(): Promise<TimelineResponse> {
    try {
      const response = await fetch(getApiUrl('merchant/audit/timeline/today'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get today activities');
      }
    } catch (error: any) {
      console.error('❌ Get today activities error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get today activities'
      );
    }
  }

  /**
   * Get recent activities
   * Endpoint: GET /api/merchant/audit/timeline/recent
   *
   * @param limit - Number of recent activities to retrieve (default: 20)
   * @returns Recent activities
   */
  async getRecentActivities(limit: number = 20): Promise<TimelineResponse> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const response = await fetch(
        getApiUrl(`merchant/audit/timeline/recent?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get recent activities');
      }
    } catch (error: any) {
      console.error('❌ Get recent activities error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get recent activities'
      );
    }
  }

  /**
   * Get activity summary for a period
   * Endpoint: GET /api/merchant/audit/timeline/summary
   *
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @returns Activity summary with breakdown
   */
  async getActivitySummary(
    startDate?: string,
    endDate?: string
  ): Promise<{ period: { start: string; end: string }; summary: ActivitySummary }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        getApiUrl(`merchant/audit/timeline/summary?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get activity summary');
      }
    } catch (error: any) {
      console.error('❌ Get activity summary error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get activity summary'
      );
    }
  }

  /**
   * Get critical activities
   * Endpoint: GET /api/merchant/audit/timeline/critical
   *
   * @param limit - Maximum number of critical activities
   * @returns Critical activities that require attention
   */
  async getCriticalActivities(limit: number = 50): Promise<CriticalActivitiesResponse> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const response = await fetch(
        getApiUrl(`merchant/audit/timeline/critical?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get critical activities');
      }
    } catch (error: any) {
      console.error('❌ Get critical activities error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get critical activities'
      );
    }
  }

  /**
   * Get activity heatmap for visualization
   * Endpoint: GET /api/merchant/audit/timeline/heatmap
   *
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @returns Activity heatmap data
   */
  async getActivityHeatmap(
    startDate?: string,
    endDate?: string
  ): Promise<{ period: { start: string; end: string }; heatmap: ActivityHeatmap }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        getApiUrl(`merchant/audit/timeline/heatmap?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get activity heatmap');
      }
    } catch (error: any) {
      console.error('❌ Get activity heatmap error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get activity heatmap'
      );
    }
  }

  /**
   * Search audit logs
   * Endpoint: GET /api/merchant/audit/search
   *
   * @param searchTerm - Search term
   * @param filters - Additional filters
   * @returns Search results
   */
  async searchAuditLogs(
    searchTerm: string,
    filters?: { startDate?: string; endDate?: string; resourceType?: string }
  ): Promise<{ searchTerm: string; results: AuditLog[]; count: number }> {
    try {
      const params = new URLSearchParams();
      params.append('q', searchTerm);

      if (filters) {
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
      }

      const response = await fetch(getApiUrl(`merchant/audit/search?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to search audit logs');
      }
    } catch (error: any) {
      console.error('❌ Search audit logs error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to search audit logs'
      );
    }
  }

  /**
   * Get audit statistics
   * Endpoint: GET /api/merchant/audit/stats
   *
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @returns Audit statistics and metrics
   */
  async getAuditStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<AuditStatistics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(getApiUrl(`merchant/audit/stats?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get audit statistics');
      }
    } catch (error: any) {
      console.error('❌ Get audit statistics error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get audit statistics'
      );
    }
  }

  /**
   * Get user activity history
   * Endpoint: GET /api/merchant/audit/user/:userId
   *
   * @param userId - User ID
   * @param options - Query options (limit, dateRange)
   * @returns User's activity history
   */
  async getUserActivity(
    userId: string,
    options?: { limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ userId: string; activity: AuditLog[]; count: number }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const response = await fetch(
        getApiUrl(`merchant/audit/user/${userId}?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get user activity');
      }
    } catch (error: any) {
      console.error('❌ Get user activity error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get user activity'
      );
    }
  }

  /**
   * Export audit logs to file
   * Endpoint: GET /api/merchant/audit/export
   *
   * @param filters - Export filters including date range and format
   * @returns Export file metadata and download URL
   */
  async exportAuditLogs(
    filters?: AuditExportFilters
  ): Promise<ExportMetadata> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        const format = filters.format || 'csv';
        params.append('format', format);

        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.action) params.append('action', filters.action);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.includeDetails !== undefined) {
          params.append('includeDetails', filters.includeDetails.toString());
        }
      }

      const response = await fetch(getApiUrl(`merchant/audit/export?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Response should be the file itself or metadata
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('json')) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      } else {
        // File download
        const disposition = response.headers.get('content-disposition');
        const filename = disposition
          ? disposition.split('filename=')[1]?.replace(/"/g, '')
          : `audit_logs_${Date.now()}.csv`;

        const blob = await response.blob();
        return {
          filename,
          format: (filters?.format || 'csv') as any,
          generatedAt: new Date().toISOString(),
          recordCount: 0,
          downloadUrl: URL.createObjectURL(blob),
        };
      }

      throw new Error('Failed to export audit logs');
    } catch (error: any) {
      console.error('❌ Export audit logs error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to export audit logs'
      );
    }
  }

  /**
   * Get compliance report
   * Endpoint: GET /api/merchant/audit/retention/compliance
   *
   * @param framework - Specific framework (gdpr, soc2, iso27001, pci) or 'all'
   * @returns Compliance report with findings and recommendations
   */
  async getComplianceReport(framework?: string): Promise<ComplianceReport> {
    try {
      const params = new URLSearchParams();
      if (framework) params.append('framework', framework);

      const response = await fetch(
        getApiUrl(`merchant/audit/retention/compliance?${params}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get compliance report');
      }
    } catch (error: any) {
      console.error('❌ Get compliance report error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get compliance report'
      );
    }
  }

  /**
   * Get storage and retention statistics
   * Endpoint: GET /api/merchant/audit/retention/stats
   *
   * @returns Storage usage and retention policy information
   */
  async getRetentionStatistics(): Promise<RetentionStatistics> {
    try {
      const response = await fetch(getApiUrl('merchant/audit/retention/stats'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get retention statistics');
      }
    } catch (error: any) {
      console.error('❌ Get retention statistics error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get retention statistics'
      );
    }
  }

  /**
   * Manually trigger cleanup of old logs
   * Endpoint: POST /api/merchant/audit/retention/cleanup
   *
   * @param retentionDays - Number of days to retain (default: 365)
   * @param autoArchive - Whether to auto-archive before deleting (default: true)
   * @returns Cleanup result with count of deleted/archived records
   */
  async cleanupAuditLogs(
    retentionDays: number = 365,
    autoArchive: boolean = true
  ): Promise<{ deletedCount: number; archivedCount: number; message: string }> {
    try {
      const response = await fetch(
        getApiUrl('merchant/audit/retention/cleanup'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
          body: JSON.stringify({
            retentionDays,
            autoArchive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to cleanup audit logs');
      }
    } catch (error: any) {
      console.error('❌ Cleanup audit logs error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to cleanup audit logs'
      );
    }
  }

  /**
   * Get list of archived audit log files
   * Endpoint: GET /api/merchant/audit/retention/archives
   *
   * @returns List of archived files with metadata
   */
  async getArchivedLogs(): Promise<{
    archives: Array<{
      id: string;
      filename: string;
      createdAt: string;
      recordCount: number;
      fileSize: string;
      retentionExpires: string;
    }>;
    count: number;
  }> {
    try {
      const response = await fetch(getApiUrl('merchant/audit/retention/archives'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get archived logs');
      }
    } catch (error: any) {
      console.error('❌ Get archived logs error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to get archived logs'
      );
    }
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Get action type options for filtering
   */
  getActionOptions(): Array<{ label: string; value: string; icon?: string }> {
    return [
      // Product actions
      { label: 'Product Created', value: 'product.created', icon: 'plus' },
      { label: 'Product Updated', value: 'product.updated', icon: 'edit' },
      { label: 'Product Deleted', value: 'product.deleted', icon: 'trash' },
      { label: 'Product Status Changed', value: 'product.status_changed' },
      { label: 'Inventory Updated', value: 'product.inventory_updated' },

      // Order actions
      { label: 'Order Created', value: 'order.created' },
      { label: 'Order Status Changed', value: 'order.status_changed' },
      { label: 'Order Cancelled', value: 'order.cancelled' },
      { label: 'Order Refunded', value: 'order.refunded' },

      // User actions
      { label: 'User Login', value: 'user.login' },
      { label: 'User Logout', value: 'user.logout' },
      { label: 'User Created', value: 'user.created' },
      { label: 'User Deleted', value: 'user.deleted' },
      { label: 'Failed Login', value: 'user.failed_login' },

      // Payment actions
      { label: 'Payment Processed', value: 'payment.processed' },
      { label: 'Payment Failed', value: 'payment.failed' },
      { label: 'Payment Refunded', value: 'payment.refunded' },

      // System actions
      { label: 'Data Exported', value: 'system.data_exported' },
      { label: 'Data Imported', value: 'system.data_imported' },
      { label: 'Report Generated', value: 'system.report_generated' },
      { label: 'Security Event', value: 'system.security_event' },
    ];
  }

  /**
   * Get resource type options for filtering
   */
  getResourceTypeOptions(): Array<{ label: string; value: string; icon?: string }> {
    return [
      { label: 'Product', value: 'product' },
      { label: 'Order', value: 'order' },
      { label: 'Store', value: 'store' },
      { label: 'User', value: 'user' },
      { label: 'Payment', value: 'payment' },
      { label: 'Cashback', value: 'cashback' },
      { label: 'Inventory', value: 'inventory' },
      { label: 'Category', value: 'category' },
      { label: 'Customer', value: 'customer' },
      { label: 'Report', value: 'report' },
    ];
  }

  /**
   * Get severity level options for filtering
   */
  getSeverityOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'Info', value: 'info', color: '#3b82f6' },
      { label: 'Warning', value: 'warning', color: '#f59e0b' },
      { label: 'Error', value: 'error', color: '#ef4444' },
      { label: 'Critical', value: 'critical', color: '#991b1b' },
    ];
  }

  /**
   * Format audit log for display
   */
  formatAuditLog(log: AuditLog): {
    displayAction: string;
    displayResource: string;
    displayTime: string;
    severityColor: string;
    icon: string;
  } {
    const actionParts = log.action.split('.');
    const action = actionParts[1] || log.action;
    const displayAction = action.replace(/_/g, ' ').charAt(0).toUpperCase() +
      action.replace(/_/g, ' ').slice(1);

    const timestamp = new Date(log.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let displayTime = '';
    if (diffMins < 1) {
      displayTime = 'Just now';
    } else if (diffMins < 60) {
      displayTime = `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      displayTime = `${Math.floor(diffMins / 60)}h ago`;
    } else {
      displayTime = timestamp.toLocaleDateString();
    }

    const severityColors: Record<string, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#991b1b',
    };

    const icons: Record<string, string> = {
      'product.created': '➕',
      'product.updated': '✏️',
      'product.deleted': '🗑️',
      'order.created': '📋',
      'order.status_changed': '📊',
      'user.login': '🔐',
      'user.logout': '🚪',
      'payment.processed': '💳',
      'system.security_event': '🚨',
    };

    return {
      displayAction,
      displayResource: log.resourceType,
      displayTime,
      severityColor: severityColors[log.severity] || '#3b82f6',
      icon: icons[log.action] || '📝',
    };
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return (await AsyncStorage.getItem('auth_token')) || '';
  }
}

// Create and export singleton instance
export const auditService = new AuditService();
export default auditService;
