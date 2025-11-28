import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
  InvalidateQueryFilters,
} from '@tanstack/react-query';
import { queryKeys } from '../queries/queryKeys';

/**
 * Generic mutation hook with automatic query invalidation
 */
export function useMutationWithInvalidation<
  TData = unknown,
  TError = unknown,
  TVariables = void
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: InvalidateQueryFilters[],
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate all specified queries
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries(key);
      });

      // Call user's onSuccess callback if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Create a product mutation with automatic dashboard/product invalidation
 */
export function useCreateProductMutation(
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.products.all },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Update a product mutation
 */
export function useUpdateProductMutation(
  productId: string,
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.products.all },
      { queryKey: queryKeys.products.detail(productId) },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Delete a product mutation
 */
export function useDeleteProductMutation(
  productId: string,
  mutationFn: (id: string) => Promise<any>,
  options?: UseMutationOptions<any, any, string>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.products.all },
      { queryKey: queryKeys.products.detail(productId) },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Update product stock mutation
 */
export function useUpdateProductStockMutation(
  productId: string,
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.products.stock(productId) },
      { queryKey: queryKeys.products.detail(productId) },
      { queryKey: queryKeys.dashboard.lowStock },
    ],
    options
  );
}

/**
 * Create an order mutation
 */
export function useCreateOrderMutation(
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.orders.all },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Update an order mutation
 */
export function useUpdateOrderMutation(
  orderId: string,
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.orders.all },
      { queryKey: queryKeys.orders.detail(orderId) },
      { queryKey: queryKeys.orders.timeline(orderId) },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Cancel an order mutation
 */
export function useCancelOrderMutation(
  orderId: string,
  mutationFn: (id: string) => Promise<any>,
  options?: UseMutationOptions<any, any, string>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.orders.all },
      { queryKey: queryKeys.orders.detail(orderId) },
      { queryKey: queryKeys.orders.pending },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Create a cashback mutation
 */
export function useCreateCashbackMutation(
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.cashback.all },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Update a cashback mutation
 */
export function useUpdateCashbackMutation(
  cashbackId: string,
  mutationFn: (data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, any>
) {
  return useMutationWithInvalidation(
    mutationFn,
    [
      { queryKey: queryKeys.cashback.all },
      { queryKey: queryKeys.cashback.detail(cashbackId) },
      { queryKey: queryKeys.dashboard.all },
    ],
    options
  );
}

/**
 * Approve a cashback payment
 */
export function useApproveCashbackMutation(
  mutationFn: (id: string, data: any) => Promise<any>,
  options?: UseMutationOptions<any, any, { id: string; data: any }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => mutationFn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashback.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashback.pending });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

/**
 * Generic batch mutation for multiple items
 */
export function useBatchMutation<TData = unknown, TError = unknown>(
  mutationFn: (items: any[]) => Promise<TData>,
  invalidateKeys: InvalidateQueryFilters[],
  options?: UseMutationOptions<TData, TError, any[]>
) {
  return useMutationWithInvalidation(mutationFn, invalidateKeys, options);
}
