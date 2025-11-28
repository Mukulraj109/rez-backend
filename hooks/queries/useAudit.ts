/**
 * Audit Logs React Query Hooks
 * Comprehensive hooks for fetching and managing audit log data
 */

import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { auditService } from '@/services/api/audit';
import { queryKeys } from './queryKeys';
import {
  AuditLog,
  AuditLogListResponse,
  AuditLogFilters,
  AuditStatistics,
  ActivitySummary,
  ActivityHeatmap,
  ComplianceReport,
  TimelineResponse,
  TimelineQueryOptions,
  CriticalActivitiesResponse,
  ResourceHistory,
  ExportMetadata,
  AuditExportFilters,
  RetentionStatistics,
} from '@/types/audit';

/**
 * Hook to fetch paginated audit logs with filters
 */
export function useAuditLogs(
  filters?: AuditLogFilters,
  options?: UseQueryOptions<AuditLogListResponse>
) {
  return useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: async () => {
      const response = await auditService.getAuditLogs(filters);
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds - audit logs should be fairly fresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch infinite list of audit logs (for pagination)
 */
export function useInfiniteAuditLogs(
  filters?: AuditLogFilters,
  options?: UseInfiniteQueryOptions<AuditLogListResponse>
) {
  return useInfiniteQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await auditService.getAuditLogs({
        ...filters,
        page: pageParam,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch resource history (all audit logs for a specific resource)
 */
export function useResourceHistory(
  resourceType: string,
  resourceId: string,
  options?: UseQueryOptions<ResourceHistory>
) {
  return useQuery({
    queryKey: queryKeys.audit.resourceHistory(resourceType, resourceId),
    queryFn: async () => {
      const response = await auditService.getResourceHistory(resourceType, resourceId);
      return response;
    },
    enabled: !!resourceType && !!resourceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch activity timeline
 */
export function useActivityTimeline(
  queryOptions?: TimelineQueryOptions,
  options?: UseQueryOptions<TimelineResponse>
) {
  return useQuery({
    queryKey: queryKeys.audit.timeline(queryOptions),
    queryFn: async () => {
      const response = await auditService.getTimeline(queryOptions);
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch today's activities
 */
export function useTodayActivities(
  options?: UseQueryOptions<TimelineResponse>
) {
  return useQuery({
    queryKey: queryKeys.audit.todayActivities(),
    queryFn: async () => {
      const response = await auditService.getTodayActivities();
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    ...options,
  });
}

/**
 * Hook to fetch recent activities
 */
export function useRecentActivities(
  limit: number = 20,
  options?: UseQueryOptions<TimelineResponse>
) {
  return useQuery({
    queryKey: queryKeys.audit.recentActivities(limit),
    queryFn: async () => {
      const response = await auditService.getRecentActivities(limit);
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch activity summary for a period
 */
export function useActivitySummary(
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<{ period: { start: string; end: string }; summary: ActivitySummary }>
) {
  return useQuery({
    queryKey: queryKeys.audit.activitySummary(startDate, endDate),
    queryFn: async () => {
      const response = await auditService.getActivitySummary(startDate, endDate);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch critical activities
 */
export function useCriticalActivities(
  limit: number = 50,
  options?: UseQueryOptions<CriticalActivitiesResponse>
) {
  return useQuery({
    queryKey: queryKeys.audit.criticalActivities(limit),
    queryFn: async () => {
      const response = await auditService.getCriticalActivities(limit);
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - critical events should be fresh
    gcTime: 5 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000, // Auto-refetch every 3 minutes
    ...options,
  });
}

/**
 * Hook to fetch activity heatmap
 */
export function useActivityHeatmap(
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<{ period: { start: string; end: string }; heatmap: ActivityHeatmap }>
) {
  return useQuery({
    queryKey: queryKeys.audit.activityHeatmap(startDate, endDate),
    queryFn: async () => {
      const response = await auditService.getActivityHeatmap(startDate, endDate);
      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - heatmap changes slowly
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to search audit logs
 */
export function useSearchAuditLogs(
  searchTerm: string,
  filters?: { startDate?: string; endDate?: string; resourceType?: string },
  options?: UseQueryOptions<{ searchTerm: string; results: AuditLog[]; count: number }>
) {
  return useQuery({
    queryKey: queryKeys.audit.search(searchTerm, filters),
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return { searchTerm: '', results: [], count: 0 };
      }
      const response = await auditService.searchAuditLogs(searchTerm, filters);
      return response;
    },
    enabled: !!searchTerm.trim(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch audit statistics
 */
export function useAuditStatistics(
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<AuditStatistics>
) {
  return useQuery({
    queryKey: queryKeys.audit.statistics(startDate, endDate),
    queryFn: async () => {
      const response = await auditService.getAuditStatistics(startDate, endDate);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch user activity history
 */
export function useUserActivity(
  userId: string,
  queryOptions?: { limit?: number; startDate?: string; endDate?: string },
  options?: UseQueryOptions<{ userId: string; activity: AuditLog[]; count: number }>
) {
  return useQuery({
    queryKey: queryKeys.audit.userActivity(userId, queryOptions),
    queryFn: async () => {
      const response = await auditService.getUserActivity(userId, queryOptions);
      return response;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to export audit logs (returns download URL/metadata)
 */
export function useExportAuditLogs(
  filters?: AuditExportFilters,
  options?: UseQueryOptions<ExportMetadata>
) {
  return useQuery({
    queryKey: queryKeys.audit.export(filters),
    queryFn: async () => {
      const response = await auditService.exportAuditLogs(filters);
      return response;
    },
    enabled: false, // Only run when manually triggered
    staleTime: 0, // Never cache
    gcTime: 0,
    ...options,
  });
}

/**
 * Hook to fetch compliance report
 */
export function useComplianceReport(
  framework?: string,
  options?: UseQueryOptions<ComplianceReport>
) {
  return useQuery({
    queryKey: queryKeys.audit.complianceReport(framework),
    queryFn: async () => {
      const response = await auditService.getComplianceReport(framework);
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - compliance reports change slowly
    gcTime: 60 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch retention statistics
 */
export function useRetentionStatistics(
  options?: UseQueryOptions<RetentionStatistics>
) {
  return useQuery({
    queryKey: queryKeys.audit.retentionStats(),
    queryFn: async () => {
      const response = await auditService.getRetentionStatistics();
      return response;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch archived logs list
 */
export function useArchivedLogs(
  options?: UseQueryOptions<{
    archives: Array<{
      id: string;
      filename: string;
      createdAt: string;
      recordCount: number;
      fileSize: string;
      retentionExpires: string;
    }>;
    count: number;
  }>
) {
  return useQuery({
    queryKey: queryKeys.audit.archivedLogs(),
    queryFn: async () => {
      const response = await auditService.getArchivedLogs();
      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Utility: Get action type options for filtering
 */
export function useActionOptions() {
  return auditService.getActionOptions();
}

/**
 * Utility: Get resource type options for filtering
 */
export function useResourceTypeOptions() {
  return auditService.getResourceTypeOptions();
}

/**
 * Utility: Get severity level options for filtering
 */
export function useSeverityOptions() {
  return auditService.getSeverityOptions();
}

/**
 * Utility: Format audit log for display
 */
export function useFormatAuditLog() {
  return (log: AuditLog) => auditService.formatAuditLog(log);
}
