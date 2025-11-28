/**
 * Query Hooks Index
 * Central export point for all React Query hooks
 */

// Query key factory
export * from './queryKeys';

// Dashboard queries
export {
  useDashboard,
  useDashboardMetrics,
  useRecentActivity,
  useTopProducts,
  useSalesData,
  useLowStockAlerts,
  useDashboardData,
} from './useDashboard';

// Product queries
export {
  useProducts,
  useInfiniteProducts,
  useProduct,
  useProductCategories,
  useSearchProducts,
  useProductsByCategory,
  useLowStockProducts,
  useProductStock,
} from './useProducts';

// Order queries
export {
  useOrders,
  useInfiniteOrders,
  useOrder,
  usePendingOrders,
  useCompletedOrders,
  useCancelledOrders,
  useOrdersByStatus,
  useOrderAnalytics,
  useOrderTimeline,
  useOrdersOverview,
} from './useOrders';

// Cashback queries
export {
  useCashback,
  useCashbackDetail,
  usePendingCashback,
  usePaidCashback,
  useCashbackRequests,
  useCashbackAnalytics,
  useCashbackRules,
  useCashbackOverview,
} from './useCashback';

// Notification queries
export {
  useNotifications,
  useInfiniteNotifications,
  useNotification,
  useUnreadCount,
  useNotificationPreferences,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteNotifications,
  useUpdateNotificationPreferences,
  useClearAllNotifications,
  useNotificationsByType,
  useUnreadNotifications,
} from './useNotifications';

// Audit Log queries
export {
  useAuditLogs,
  useInfiniteAuditLogs,
  useResourceHistory,
  useActivityTimeline,
  useTodayActivities,
  useRecentActivities,
  useActivitySummary,
  useCriticalActivities,
  useActivityHeatmap,
  useSearchAuditLogs,
  useAuditStatistics,
  useUserActivity,
  useExportAuditLogs,
  useComplianceReport,
  useRetentionStatistics,
  useArchivedLogs,
  useActionOptions,
  useResourceTypeOptions,
  useSeverityOptions,
  useFormatAuditLog,
} from './useAudit';
