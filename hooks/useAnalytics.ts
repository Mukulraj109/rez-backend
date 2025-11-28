import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService } from '@/services/api/analytics';
import {
  DateRangeFilter,
  DateRange,
  AnalyticsOverview,
  SalesForecastResponse,
  InventoryStockoutResponse,
  CustomerInsights,
  SeasonalTrendResponse,
  ProductPerformanceResponse,
  RevenueBreakdownResponse,
  ExportRequest,
  ExportResponse,
  AnalyticsQueryOptions,
  PeriodComparison,
  RealTimeMetrics,
} from '@/types/analytics';

/**
 * Hook to fetch analytics overview
 * @param dateRange Optional date range filter
 * @param enabled Whether the query should run
 * @returns React Query result with analytics overview data
 */
export function useAnalyticsOverview(
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: () => analyticsService.getAnalyticsOverview(dateRange),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch sales forecast
 * @param forecastDays Number of days to forecast (7, 30, 60, or 90)
 * @param dateRange Historical date range for forecast basis
 * @param enabled Whether the query should run
 * @returns React Query result with sales forecast data
 */
export function useSalesForecast(
  forecastDays: 7 | 30 | 60 | 90 = 30,
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'sales-forecast', forecastDays, dateRange],
    queryFn: () => analyticsService.getSalesForecast(forecastDays, dateRange),
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch inventory stockout predictions
 * @param dateRange Date range for analysis
 * @param enabled Whether the query should run
 * @returns React Query result with stockout predictions
 */
export function useStockoutPredictions(
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'stockout-predictions', dateRange],
    queryFn: () => analyticsService.getStockoutPredictions(dateRange),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch customer insights
 * @param dateRange Date range for analysis
 * @param enabled Whether the query should run
 * @returns React Query result with customer insights
 */
export function useCustomerInsights(
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'customer-insights', dateRange],
    queryFn: () => analyticsService.getCustomerInsights(dateRange),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch seasonal trend analysis
 * @param dataType Type of data to analyze (sales, orders, customers, products)
 * @param dateRange Date range for analysis
 * @param enabled Whether the query should run
 * @returns React Query result with trend analysis
 */
export function useTrendAnalysis(
  dataType: 'sales' | 'orders' | 'customers' | 'products' = 'sales',
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'trends', dataType, dateRange],
    queryFn: () => analyticsService.getSeasonalTrends(dataType, dateRange),
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch product performance analytics
 * @param options Query options for filtering and sorting
 * @param enabled Whether the query should run
 * @returns React Query result with product performance data
 */
export function useProductPerformance(
  options?: AnalyticsQueryOptions,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'product-performance', options],
    queryFn: () => analyticsService.getProductPerformance(options),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch revenue breakdown
 * @param dateRange Date range for analysis
 * @param enabled Whether the query should run
 * @returns React Query result with revenue breakdown
 */
export function useRevenueBreakdown(
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'revenue-breakdown', dateRange],
    queryFn: () => analyticsService.getRevenueBreakdown(dateRange),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to compare analytics between two periods
 * @param currentDateRange Current period
 * @param previousDateRange Previous period
 * @param enabled Whether the query should run
 * @returns React Query result with period comparison
 */
export function usePeriodComparison(
  currentDateRange: DateRange,
  previousDateRange: DateRange,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'period-comparison', currentDateRange, previousDateRange],
    queryFn: () => analyticsService.comparePeriods(currentDateRange, previousDateRange),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch real-time metrics
 * @param enabled Whether the query should run
 * @returns React Query result with real-time metrics
 */
export function useRealTimeMetrics(enabled: boolean = true) {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => analyticsService.getRealTimeMetrics(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 3,
  });
}

/**
 * Hook to export analytics data
 * @returns Mutation for exporting analytics
 */
export function useExportAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exportRequest: ExportRequest) =>
      analyticsService.exportAnalytics(exportRequest),
    onSuccess: (data: ExportResponse) => {
      // Invalidate any export-related queries if needed
      queryClient.invalidateQueries({ queryKey: ['analytics', 'exports'] });
      console.log('Export created successfully:', data.filename);
    },
    onError: (error: Error) => {
      console.error('Export failed:', error.message);
    },
  });
}

/**
 * Hook to get export download URL
 * @param exportId Export ID from previous export
 * @param enabled Whether the query should run
 * @returns React Query result with download URL
 */
export function useExportUrl(exportId: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['analytics', 'export-url', exportId],
    queryFn: () => analyticsService.getExportUrl(exportId),
    enabled: enabled && !!exportId,
    staleTime: 0, // Don't cache
    retry: 2,
  });
}

/**
 * Combined hook for dashboard analytics
 * Fetches overview and real-time metrics together
 * @param dateRange Date range filter
 * @returns Combined analytics data
 */
export function useDashboardAnalytics(dateRange?: DateRangeFilter) {
  const overview = useAnalyticsOverview(dateRange);
  const realTime = useRealTimeMetrics();

  return {
    overview,
    realTime,
    isLoading: overview.isLoading || realTime.isLoading,
    isError: overview.isError || realTime.isError,
    error: overview.error || realTime.error,
  };
}

/**
 * Hook for analytics with automatic date range management
 * @param preset Date range preset (7d, 30d, etc.)
 * @returns Analytics data with date range utilities
 */
export function useAnalyticsWithDateRange(
  preset: '7d' | '14d' | '30d' | '90d' | '1y' = '30d'
) {
  const dateRange = analyticsService.buildDateRangeFromPreset(preset);
  const overview = useAnalyticsOverview({ ...dateRange, preset });

  return {
    ...overview,
    dateRange,
    preset,
    formatDate: (date: Date) => analyticsService.formatDate(date),
    formatCurrency: (value: number) => analyticsService.formatCurrency(value),
    formatPercentage: (value: number) => analyticsService.formatPercentage(value),
    formatCompactNumber: (value: number) => analyticsService.formatCompactNumber(value),
  };
}

/**
 * Hook for inventory analytics
 * Combines stockout predictions and product performance
 * @param dateRange Date range filter
 * @returns Combined inventory analytics
 */
export function useInventoryAnalytics(dateRange?: DateRangeFilter) {
  const stockout = useStockoutPredictions(dateRange);
  const performance = useProductPerformance({ timeRange: dateRange });

  return {
    stockout,
    performance,
    isLoading: stockout.isLoading || performance.isLoading,
    isError: stockout.isError || performance.isError,
    error: stockout.error || performance.error,
  };
}

/**
 * Hook for customer analytics
 * Combines customer insights and trend analysis
 * @param dateRange Date range filter
 * @returns Combined customer analytics
 */
export function useCustomerAnalytics(dateRange?: DateRangeFilter) {
  const insights = useCustomerInsights(dateRange);
  const trends = useTrendAnalysis('customers', dateRange);

  return {
    insights,
    trends,
    isLoading: insights.isLoading || trends.isLoading,
    isError: insights.isError || trends.isError,
    error: insights.error || trends.error,
  };
}

/**
 * Hook for sales analytics
 * Combines forecast, revenue breakdown, and trends
 * @param dateRange Date range filter
 * @param forecastDays Days to forecast
 * @returns Combined sales analytics
 */
export function useSalesAnalytics(
  dateRange?: DateRangeFilter,
  forecastDays: 7 | 30 | 60 | 90 = 30
) {
  const forecast = useSalesForecast(forecastDays, dateRange);
  const revenue = useRevenueBreakdown(dateRange);
  const trends = useTrendAnalysis('sales', dateRange);

  return {
    forecast,
    revenue,
    trends,
    isLoading: forecast.isLoading || revenue.isLoading || trends.isLoading,
    isError: forecast.isError || revenue.isError || trends.isError,
    error: forecast.error || revenue.error || trends.error,
  };
}

/**
 * Hook to invalidate all analytics caches
 * Useful after data updates
 * @returns Function to invalidate caches
 */
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}

/**
 * Hook to prefetch analytics data
 * Useful for preloading data before navigation
 * @returns Prefetch functions
 */
export function usePrefetchAnalytics() {
  const queryClient = useQueryClient();

  return {
    prefetchOverview: (dateRange?: DateRangeFilter) => {
      return queryClient.prefetchQuery({
        queryKey: ['analytics', 'overview', dateRange],
        queryFn: () => analyticsService.getAnalyticsOverview(dateRange),
      });
    },
    prefetchForecast: (forecastDays: 7 | 30 | 60 | 90 = 30, dateRange?: DateRangeFilter) => {
      return queryClient.prefetchQuery({
        queryKey: ['analytics', 'sales-forecast', forecastDays, dateRange],
        queryFn: () => analyticsService.getSalesForecast(forecastDays, dateRange),
      });
    },
    prefetchCustomerInsights: (dateRange?: DateRangeFilter) => {
      return queryClient.prefetchQuery({
        queryKey: ['analytics', 'customer-insights', dateRange],
        queryFn: () => analyticsService.getCustomerInsights(dateRange),
      });
    },
  };
}
