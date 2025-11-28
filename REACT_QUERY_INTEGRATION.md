# React Query Integration - Complete Setup

## Summary

React Query infrastructure has been successfully set up for the merchant app. This provides efficient data fetching, caching, synchronization, and mutation management across the application.

## Files Created

### Configuration
- **`config/reactQuery.ts`**
  - QueryClient configuration with sensible defaults
  - Query and mutation retry strategies
  - Cache duration settings per entity type
  - Stale time and garbage collection times

### Query Hooks
- **`hooks/queries/queryKeys.ts`** - Centralized query key factory for all entities
- **`hooks/queries/useProducts.ts`** - Product fetching hooks (list, single, categories, search, etc.)
- **`hooks/queries/useDashboard.ts`** - Dashboard metrics, activity, trends, analytics
- **`hooks/queries/useOrders.ts`** - Order management hooks (list, detail, status-based, analytics)
- **`hooks/queries/useCashback.ts`** - Cashback operations (requests, approvals, analytics)
- **`hooks/queries/index.ts`** - Central export point for all query hooks

### Mutation Hooks
- **`hooks/mutations/useMutations.ts`** - Custom mutation hooks with auto-invalidation
- **`hooks/mutations/index.ts`** - Central export point for all mutation hooks

### Documentation
- **`hooks/queries/REACT_QUERY_SETUP.md`** - Detailed usage guide with examples

### Integration
- **`app/_layout.tsx`** - Updated with QueryClientProvider wrapper

## Key Features

### 1. Smart Caching
Different cache durations based on entity update frequency:
- Dashboard: 5-20 minutes
- Products: 5-15 minutes
- Orders: 2-10 minutes (frequent updates)
- Cashback: 2-10 minutes (frequent updates)
- Auth: 1-5 minutes (security critical)
- Analytics: 15-30 minutes

### 2. Automatic Query Invalidation
Mutations automatically invalidate related queries:
```typescript
// Creating a product automatically invalidates:
// - All product queries
// - Dashboard queries (since metrics might change)
useCreateProductMutation(...)
```

### 3. Compound Hooks
Fetch multiple related data points efficiently:
```typescript
const dashboardData = useDashboardData({
  includeMetrics: true,
  includeActivity: true,
  includeTopProducts: true,
  includeSalesData: true,
  period: '30d'
});
```

### 4. Infinite Queries
Built-in pagination support for large datasets:
```typescript
const { data, hasNextPage, fetchNextPage } = useInfiniteProducts();
```

### 5. Retry Strategy
- Queries: 3 retries with exponential backoff (up to 30s)
- Mutations: 1 retry with 1s delay

## Available Hooks

### Dashboard Hooks
- `useDashboard()` - Complete dashboard data
- `useDashboardMetrics()` - Metrics only
- `useRecentActivity(limit)` - Recent activity feed
- `useTopProducts(limit, period)` - Top performing products
- `useSalesData(period)` - Sales trend data
- `useLowStockAlerts()` - Low inventory alerts
- `useDashboardData(options)` - Compound hook for multiple data

### Product Hooks
- `useProducts(filters)` - Paginated product list
- `useInfiniteProducts(filters)` - Infinite scroll products
- `useProduct(id)` - Single product details
- `useProductCategories()` - Product categories
- `useSearchProducts(query, filters)` - Product search
- `useProductsByCategory(categoryId)` - Category-specific products
- `useLowStockProducts()` - Low stock items
- `useProductStock(id)` - Product stock status

### Order Hooks
- `useOrders(filters)` - Paginated orders
- `useInfiniteOrders(filters)` - Infinite scroll orders
- `useOrder(id)` - Single order details
- `usePendingOrders()` - Pending orders only
- `useCompletedOrders()` - Completed orders
- `useCancelledOrders()` - Cancelled orders
- `useOrdersByStatus(status)` - Orders by status
- `useOrderAnalytics(period)` - Order analytics
- `useOrderTimeline(orderId)` - Order status timeline
- `useOrdersOverview(options)` - Compound overview hook

### Cashback Hooks
- `useCashback(filters)` - Paginated cashback entries
- `useCashbackDetail(id)` - Single cashback details
- `usePendingCashback()` - Pending cashback
- `usePaidCashback()` - Paid cashback
- `useCashbackRequests()` - Cashback requests
- `useCashbackAnalytics(period)` - Cashback analytics
- `useCashbackRules()` - Cashback rules
- `useCashbackOverview(options)` - Compound overview hook

### Mutation Hooks
- `useMutationWithInvalidation()` - Generic mutation with invalidation
- `useCreateProductMutation()` - Create product
- `useUpdateProductMutation()` - Update product
- `useDeleteProductMutation()` - Delete product
- `useUpdateProductStockMutation()` - Update stock
- `useCreateOrderMutation()` - Create order
- `useUpdateOrderMutation()` - Update order
- `useCancelOrderMutation()` - Cancel order
- `useCreateCashbackMutation()` - Create cashback
- `useUpdateCashbackMutation()` - Update cashback
- `useApproveCashbackMutation()` - Approve cashback
- `useBatchMutation()` - Batch operations

## Integration Steps

### 1. Already Done - Provider Setup
The `QueryClientProvider` has been added to `app/_layout.tsx` and wraps the entire app.

### 2. Use in Components
```typescript
import { useProducts, useDashboard } from '@/hooks/queries';
import { useCreateProductMutation } from '@/hooks/mutations';

function ProductsList() {
  const { data, isLoading, error } = useProducts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView error={error} />;

  return <FlatList data={data?.data?.items} />;
}
```

### 3. Mutations with Error Handling
```typescript
const createMutation = useCreateProductMutation(
  (data) => productsService.createProduct(data),
  {
    onSuccess: () => {
      showSuccessMessage('Product created!');
      navigation.goBack();
    },
    onError: (error) => {
      showErrorMessage(error.message);
    }
  }
);

const handleSubmit = async (formData) => {
  try {
    await createMutation.mutateAsync(formData);
  } catch (error) {
    console.error(error);
  }
};
```

## Best Practices

1. **Use Specific Hooks**
   ```typescript
   // Good - Only fetch what you need
   const { data } = useTopProducts(10, '30d');

   // Avoid - Fetches all dashboard data
   const { data } = useDashboard();
   ```

2. **Handle Loading and Error States**
   ```typescript
   const { data, isLoading, error, retry } = useProducts();

   if (isLoading) return <Skeleton />;
   if (error) return <ErrorBoundary onRetry={retry} />;
   return <ProductList data={data} />;
   ```

3. **Use Compound Hooks When Beneficial**
   ```typescript
   // Better than multiple individual calls
   const dashboardData = useDashboardData({
     includeMetrics: true,
     includeActivity: true,
     period: '30d'
   });
   ```

4. **Implement Proper Error Boundaries**
   - Wrap screens with error boundaries
   - Provide retry options
   - Log errors for debugging

5. **Monitor Cache Performance**
   - Use React Query DevTools in development
   - Check for unnecessary re-fetches
   - Adjust stale times based on actual usage

## Testing Considerations

When testing components using these hooks:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function TestWrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// In tests:
render(<YourComponent />, { wrapper: TestWrapper });
```

## Performance Monitoring

React Query automatically handles:
- Request deduplication (same query within specified time)
- Automatic refetching on window focus (configurable)
- Background refetching
- Automatic garbage collection of unused queries
- Memory management with proper stale/cache durations

## Offline Support

React Query integrates with the existing offline queue system:
- Mutations are queued when offline
- Automatically retried when connection restored
- Proper error handling and user feedback

## Next Steps

1. **Migrate existing API calls** to use React Query hooks
2. **Replace context-based data fetching** with query hooks
3. **Implement DevTools** for development debugging
4. **Add error boundaries** to screens
5. **Test performance** with various network conditions
6. **Document custom hooks** if adding more

## Troubleshooting

### Queries not invalidating after mutations
- Check that `invalidateKeys` includes the correct query key paths
- Verify the `exact` parameter in `invalidateQueries`
- Use `queryKey: [..., exact: false]` for wildcard invalidation

### Stale data appearing
- Check `staleTime` configuration in `queryConfig`
- Consider using manual invalidation
- Verify mutation callbacks are properly invalidating

### Memory leaks
- Ensure components unmount cleanly
- Check that queries are being garbage collected
- Adjust `gcTime` if needed

### DevTools not working
- Install `@tanstack/react-query-devtools`
- Add DevTools component in development only
- Check console for errors

## Reference Documentation

- [React Query Official Docs](https://tanstack.com/query/latest)
- [API Reference Guide](./hooks/queries/REACT_QUERY_SETUP.md)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
