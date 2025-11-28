import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { Order, OrderStatus } from '@/shared/types';
import { ordersService } from '@/services/api/orders';
import { queryKeys, queryConfig } from '@/config/reactQuery';

/**
 * Hook to fetch a paginated list of orders
 */
export function useOrders(
  filters?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    search?: string;
  },
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const response = await ordersService.getOrders(filters);
      return response;
    },
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch infinite list of orders (for pagination/lazy loading)
 */
export function useInfiniteOrders(
  filters?: {
    status?: OrderStatus;
    sortBy?: string;
    search?: string;
  },
  options?: UseInfiniteQueryOptions<any>
) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await ordersService.getOrders({
        ...filters,
        page: pageParam,
        limit: 20,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.pagination?.hasNext) {
        return lastPage.data.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string, options?: UseQueryOptions<Order>) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: async () => {
      const response = await ordersService.getOrderById(id);
      return response.data;
    },
    enabled: !!id,
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch pending orders
 */
export function usePendingOrders(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.orders.pending(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'pending' as OrderStatus,
      });
      return response;
    },
    staleTime: 1 * 60 * 1000, // Update frequently for pending orders
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch completed orders
 */
export function useCompletedOrders(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.orders.completed(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'completed' as OrderStatus,
      });
      return response;
    },
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch cancelled orders
 */
export function useCancelledOrders(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.orders.cancelled(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'cancelled' as OrderStatus,
      });
      return response;
    },
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch orders by status
 */
export function useOrdersByStatus(
  status: OrderStatus,
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.orders.byStatus(status),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status,
      });
      return response;
    },
    enabled: !!status,
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch order analytics
 */
export function useOrderAnalytics(
  period: '7d' | '30d' | '90d' = '30d',
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.orders.analytics(period),
    queryFn: async () => {
      const response = await ordersService.getOrderAnalytics(period);
      return response.data;
    },
    ...queryConfig.orders,
    ...options,
  });
}

/**
 * Hook to fetch order timeline/status updates
 */
export function useOrderTimeline(
  orderId: string,
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.orders.timeline(orderId),
    queryFn: async () => {
      const response = await ordersService.getOrderTimeline(orderId);
      return response.data || [];
    },
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Compound hook that fetches multiple order data points
 */
export function useOrdersOverview(options?: {
  includePending?: boolean;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
  includeAnalytics?: boolean;
  period?: '7d' | '30d' | '90d';
}) {
  const {
    includePending = true,
    includeCompleted = true,
    includeCancelled = true,
    includeAnalytics = true,
    period = '30d',
  } = options || {};

  const pendingQuery = useQuery({
    queryKey: queryKeys.orders.pending(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'pending' as OrderStatus,
      });
      return response.data?.items || [];
    },
    enabled: includePending,
    staleTime: 1 * 60 * 1000,
  });

  const completedQuery = useQuery({
    queryKey: queryKeys.orders.completed(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'completed' as OrderStatus,
      });
      return response.data?.items || [];
    },
    enabled: includeCompleted,
    ...queryConfig.orders,
  });

  const cancelledQuery = useQuery({
    queryKey: queryKeys.orders.cancelled(),
    queryFn: async () => {
      const response = await ordersService.getOrders({
        status: 'cancelled' as OrderStatus,
      });
      return response.data?.items || [];
    },
    enabled: includeCancelled,
    ...queryConfig.orders,
  });

  const analyticsQuery = useQuery({
    queryKey: queryKeys.orders.analytics(period),
    queryFn: async () => {
      const response = await ordersService.getOrderAnalytics(period);
      return response.data;
    },
    enabled: includeAnalytics,
    ...queryConfig.orders,
  });

  return {
    pending: pendingQuery,
    completed: completedQuery,
    cancelled: cancelledQuery,
    analytics: analyticsQuery,
    isLoading:
      pendingQuery.isLoading ||
      completedQuery.isLoading ||
      cancelledQuery.isLoading ||
      analyticsQuery.isLoading,
    isError:
      pendingQuery.isError ||
      completedQuery.isError ||
      cancelledQuery.isError ||
      analyticsQuery.isError,
  };
}
