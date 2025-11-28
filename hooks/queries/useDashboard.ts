import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  DashboardData,
  DashboardMetrics,
  RecentActivity,
  TopProduct,
  SalesData,
} from '@/services/api/dashboard';
import { dashboardService } from '@/services/api/dashboard';
import { queryKeys, queryConfig } from '@/config/reactQuery';

/**
 * Hook to fetch complete dashboard data
 */
export function useDashboard(options?: UseQueryOptions<DashboardData>) {
  return useQuery({
    queryKey: queryKeys.dashboard.data(),
    queryFn: () => dashboardService.getDashboardData(),
    ...queryConfig.dashboard,
    ...options,
  });
}

/**
 * Hook to fetch dashboard metrics only
 */
export function useDashboardMetrics(options?: UseQueryOptions<DashboardMetrics>) {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: () => dashboardService.getMetrics(),
    ...queryConfig.dashboard,
    ...options,
  });
}

/**
 * Hook to fetch recent activity
 */
export function useRecentActivity(
  limit: number = 10,
  options?: UseQueryOptions<RecentActivity[]>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () => dashboardService.getRecentActivity(limit),
    ...queryConfig.dashboard,
    ...options,
  });
}

/**
 * Hook to fetch top products
 */
export function useTopProducts(
  limit: number = 10,
  period: '7d' | '30d' | '90d' = '30d',
  options?: UseQueryOptions<TopProduct[]>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.topProducts(limit, period),
    queryFn: () => dashboardService.getTopProducts(limit, period),
    ...queryConfig.dashboard,
    ...options,
  });
}

/**
 * Hook to fetch sales data for charts
 */
export function useSalesData(
  period: '7d' | '30d' | '90d' | '1y' = '30d',
  options?: UseQueryOptions<SalesData[]>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.salesData(period),
    queryFn: () => dashboardService.getSalesData(period),
    ...queryConfig.dashboard,
    ...options,
  });
}

/**
 * Hook to fetch low stock alerts
 */
export function useLowStockAlerts(
  options?: UseQueryOptions<
    Array<{
      productId: string;
      name: string;
      currentStock: number;
      threshold: number;
    }>
  >
) {
  return useQuery({
    queryKey: queryKeys.dashboard.lowStock(),
    queryFn: () => dashboardService.getLowStockAlerts(),
    staleTime: 5 * 60 * 1000, // Update more frequently for alerts
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Compound hook that fetches multiple dashboard data points
 */
export function useDashboardData(options?: {
  includeMetrics?: boolean;
  includeActivity?: boolean;
  includeTopProducts?: boolean;
  includeSalesData?: boolean;
  includeLowStock?: boolean;
  activityLimit?: number;
  topProductsLimit?: number;
  period?: '7d' | '30d' | '90d' | '1y';
}) {
  const {
    includeMetrics = true,
    includeActivity = true,
    includeTopProducts = true,
    includeSalesData = true,
    includeLowStock = true,
    activityLimit = 10,
    topProductsLimit = 10,
    period = '30d',
  } = options || {};

  const metricsQuery = useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: () => dashboardService.getMetrics(),
    enabled: includeMetrics,
    ...queryConfig.dashboard,
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.dashboard.activity(activityLimit),
    queryFn: () => dashboardService.getRecentActivity(activityLimit),
    enabled: includeActivity,
    ...queryConfig.dashboard,
  });

  const topProductsQuery = useQuery({
    queryKey: queryKeys.dashboard.topProducts(topProductsLimit, period),
    queryFn: () => dashboardService.getTopProducts(topProductsLimit, period as any),
    enabled: includeTopProducts,
    ...queryConfig.dashboard,
  });

  const salesDataQuery = useQuery({
    queryKey: queryKeys.dashboard.salesData(period),
    queryFn: () => dashboardService.getSalesData(period as any),
    enabled: includeSalesData,
    ...queryConfig.dashboard,
  });

  const lowStockQuery = useQuery({
    queryKey: queryKeys.dashboard.lowStock(),
    queryFn: () => dashboardService.getLowStockAlerts(),
    enabled: includeLowStock,
    staleTime: 5 * 60 * 1000,
  });

  return {
    metrics: metricsQuery,
    activity: activityQuery,
    topProducts: topProductsQuery,
    salesData: salesDataQuery,
    lowStock: lowStockQuery,
    isLoading:
      metricsQuery.isLoading ||
      activityQuery.isLoading ||
      topProductsQuery.isLoading ||
      salesDataQuery.isLoading ||
      lowStockQuery.isLoading,
    isError:
      metricsQuery.isError ||
      activityQuery.isError ||
      topProductsQuery.isError ||
      salesDataQuery.isError ||
      lowStockQuery.isError,
    error:
      metricsQuery.error ||
      activityQuery.error ||
      topProductsQuery.error ||
      salesDataQuery.error ||
      lowStockQuery.error,
  };
}
