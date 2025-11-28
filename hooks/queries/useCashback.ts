import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { cashbackService } from '@/services/api/cashback';
import { queryKeys, queryConfig } from '@/config/reactQuery';

/**
 * Hook to fetch a paginated list of cashback entries
 */
export function useCashback(
  filters?: {
    status?: 'pending' | 'paid' | 'rejected';
    page?: number;
    limit?: number;
    sortBy?: string;
    search?: string;
  },
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.cashback.list(filters),
    queryFn: async () => {
      const response = await cashbackService.getCashback(filters);
      return response;
    },
    ...queryConfig.cashback,
    ...options,
  });
}

/**
 * Hook to fetch a single cashback entry by ID
 */
export function useCashbackDetail(id: string, options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.cashback.detail(id),
    queryFn: async () => {
      const response = await cashbackService.getCashbackById(id);
      return response.data;
    },
    enabled: !!id,
    ...queryConfig.cashback,
    ...options,
  });
}

/**
 * Hook to fetch pending cashback requests
 */
export function usePendingCashback(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.cashback.pending(),
    queryFn: async () => {
      const response = await cashbackService.getCashback({
        status: 'pending',
      });
      return response;
    },
    staleTime: 2 * 60 * 1000, // Update frequently for pending items
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch paid cashback
 */
export function usePaidCashback(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.cashback.paid(),
    queryFn: async () => {
      const response = await cashbackService.getCashback({
        status: 'paid',
      });
      return response;
    },
    ...queryConfig.cashback,
    ...options,
  });
}

/**
 * Hook to fetch cashback requests
 */
export function useCashbackRequests(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.cashback.requests(),
    queryFn: async () => {
      const response = await cashbackService.getCashbackRequests();
      return response.data || [];
    },
    ...queryConfig.cashback,
    ...options,
  });
}

/**
 * Hook to fetch cashback analytics
 */
export function useCashbackAnalytics(
  period: '7d' | '30d' | '90d' = '30d',
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.cashback.analytics(period),
    queryFn: async () => {
      const response = await cashbackService.getCashbackAnalytics(period);
      return response.data;
    },
    ...queryConfig.cashback,
    ...options,
  });
}

/**
 * Hook to fetch cashback rules
 */
export function useCashbackRules(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.cashback.rules(),
    queryFn: async () => {
      const response = await cashbackService.getCashbackRules();
      return response.data || [];
    },
    staleTime: 30 * 60 * 1000, // Rules don't change frequently
    gcTime: 60 * 60 * 1000,
    ...options,
  });
}

/**
 * Compound hook for cashback overview
 */
export function useCashbackOverview(options?: {
  includePending?: boolean;
  includePaid?: boolean;
  includeRequests?: boolean;
  includeAnalytics?: boolean;
  includeRules?: boolean;
  period?: '7d' | '30d' | '90d';
}) {
  const {
    includePending = true,
    includePaid = true,
    includeRequests = false,
    includeAnalytics = true,
    includeRules = false,
    period = '30d',
  } = options || {};

  const pendingQuery = useQuery({
    queryKey: queryKeys.cashback.pending(),
    queryFn: async () => {
      const response = await cashbackService.getCashback({
        status: 'pending',
      });
      return response.data?.items || [];
    },
    enabled: includePending,
    staleTime: 2 * 60 * 1000,
  });

  const paidQuery = useQuery({
    queryKey: queryKeys.cashback.paid(),
    queryFn: async () => {
      const response = await cashbackService.getCashback({
        status: 'paid',
      });
      return response.data?.items || [];
    },
    enabled: includePaid,
    ...queryConfig.cashback,
  });

  const requestsQuery = useQuery({
    queryKey: queryKeys.cashback.requests(),
    queryFn: async () => {
      const response = await cashbackService.getCashbackRequests();
      return response.data || [];
    },
    enabled: includeRequests,
    ...queryConfig.cashback,
  });

  const analyticsQuery = useQuery({
    queryKey: queryKeys.cashback.analytics(period),
    queryFn: async () => {
      const response = await cashbackService.getCashbackAnalytics(period);
      return response.data;
    },
    enabled: includeAnalytics,
    ...queryConfig.cashback,
  });

  const rulesQuery = useQuery({
    queryKey: queryKeys.cashback.rules(),
    queryFn: async () => {
      const response = await cashbackService.getCashbackRules();
      return response.data || [];
    },
    enabled: includeRules,
    staleTime: 30 * 60 * 1000,
  });

  return {
    pending: pendingQuery,
    paid: paidQuery,
    requests: requestsQuery,
    analytics: analyticsQuery,
    rules: rulesQuery,
    isLoading:
      pendingQuery.isLoading ||
      paidQuery.isLoading ||
      requestsQuery.isLoading ||
      analyticsQuery.isLoading ||
      rulesQuery.isLoading,
    isError:
      pendingQuery.isError ||
      paidQuery.isError ||
      requestsQuery.isError ||
      analyticsQuery.isError ||
      rulesQuery.isError,
  };
}
