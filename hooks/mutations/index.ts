/**
 * Mutations Hooks Index
 * Central export point for all React Query mutation hooks
 */

export {
  useMutationWithInvalidation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateProductStockMutation,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useCancelOrderMutation,
  useCreateCashbackMutation,
  useUpdateCashbackMutation,
  useApproveCashbackMutation,
  useBatchMutation,
} from './useMutations';
