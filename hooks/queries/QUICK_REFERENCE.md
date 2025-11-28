# React Query - Quick Reference

## Import Statements

```typescript
// Query hooks
import {
  useDashboard,
  useDashboardMetrics,
  useProducts,
  useProduct,
  useOrders,
  useOrder,
  usePendingOrders,
  useCashback,
  usePendingCashback,
  queryKeys,
} from '@/hooks/queries';

// Mutation hooks
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useCreateOrderMutation,
  useUpdateOrderMutation,
} from '@/hooks/mutations';

// Query client (for manual invalidation)
import { useQueryClient } from '@tanstack/react-query';
```

## Most Common Usage Patterns

### 1. Fetch and Display Data

```typescript
const { data, isLoading, error } = useProducts({ page: 1, limit: 20 });

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorView />;
return <ProductList products={data?.data?.items} />;
```

### 2. Create with Auto-Invalidation

```typescript
const mutation = useCreateProductMutation(
  (data) => productsService.createProduct(data),
  { onSuccess: () => navigation.goBack() }
);

const handleSubmit = (formData) => mutation.mutateAsync(formData);
```

### 3. Dashboard Overview

```typescript
const dashboardData = useDashboardData({
  includeMetrics: true,
  includeActivity: true,
  period: '30d'
});

// Use individual queries:
const { data: metrics, isLoading } = dashboardData.metrics;
const { data: activity } = dashboardData.activity;
```

### 4. Status-Based Lists

```typescript
// Just pending orders
const { data } = usePendingOrders();

// All orders with filters
const { data } = useOrders({ status: 'pending' });

// Completed orders
const { data } = useCompletedOrders();
```

### 5. Infinite Scroll

```typescript
const { data, hasNextPage, fetchNextPage } = useInfiniteProducts();

<FlatList
  data={data?.pages.flatMap(p => p.data?.items)}
  onEndReached={() => hasNextPage && fetchNextPage()}
/>
```

## Hook Quick Lookup

| Purpose | Hook | Key Features |
|---------|------|--------------|
| Products | `useProducts()` | Paginated, filterable |
| Single Product | `useProduct(id)` | Detail view |
| Product Search | `useSearchProducts(q)` | Real-time search |
| Low Stock | `useLowStockProducts()` | Alerts |
| Dashboard | `useDashboard()` | All data |
| Metrics | `useDashboardMetrics()` | KPIs only |
| Orders | `useOrders()` | All orders |
| Pending Orders | `usePendingOrders()` | Status filter |
| Single Order | `useOrder(id)` | Detail |
| Cashback | `useCashback()` | All entries |
| Pending CB | `usePendingCashback()` | Status filter |
| Rules | `useCashbackRules()` | Config |

## Mutation Quick Lookup

| Action | Hook | Invalidates |
|--------|------|-------------|
| Create Product | `useCreateProductMutation()` | products, dashboard |
| Update Product | `useUpdateProductMutation(id)` | products, dashboard |
| Delete Product | `useDeleteProductMutation(id)` | products, dashboard |
| Create Order | `useCreateOrderMutation()` | orders, dashboard |
| Update Order | `useUpdateOrderMutation(id)` | orders, dashboard |
| Approve Cashback | `useApproveCashbackMutation()` | cashback, dashboard |

## Common Options

```typescript
// Loading state
const { isPending } = mutation;

// Manual retry
const { retry } = query;

// Get/set data
const { data, setData } = query;

// Refetch
const { refetch } = query;

// Error handling
const { error } = query;
const { error } = mutation;
```

## Query State Shortcuts

```typescript
// Check if loading
if (isLoading) return <Spinner />;

// Check if error
if (isError) return <Error error={error} />;

// Check if has data
if (data?.data?.items?.length === 0) return <EmptyState />;

// Check if stale
if (isStale) return <RefreshPrompt />;
```

## Manual Cache Management

```typescript
const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// Invalidate all product queries
queryClient.invalidateQueries({ queryKey: queryKeys.products.all, exact: false });

// Get cached data
const cachedData = queryClient.getQueryData(queryKeys.products.detail('id'));

// Manually set data
queryClient.setQueryData(queryKeys.products.detail('id'), data);

// Clear all cache
queryClient.clear();
```

## Filter Examples

### Product Filters
```typescript
useProducts({
  page: 1,
  limit: 20,
  category: 'electronics',
  status: 'active',
  sortBy: 'price_desc'
})
```

### Order Filters
```typescript
useOrders({
  status: 'pending',
  page: 1,
  limit: 50,
  sortBy: 'created_at_desc',
  search: 'product name'
})
```

### Cashback Filters
```typescript
useCashback({
  status: 'pending',
  page: 1,
  limit: 20,
  sortBy: 'date_desc'
})
```

## Error Handling Patterns

### Basic Error UI
```typescript
const { data, error, retry } = useProducts();

if (error) {
  return (
    <View>
      <Text>Error: {error.message}</Text>
      <Button title="Retry" onPress={retry} />
    </View>
  );
}
```

### Mutation Error Handling
```typescript
const mutation = useCreateProductMutation(
  (data) => productsService.createProduct(data),
  {
    onError: (error) => {
      showErrorToast(error.message);
    }
  }
);
```

### Try-Catch Pattern
```typescript
try {
  await mutation.mutateAsync(formData);
  showSuccessMessage('Created!');
} catch (error) {
  showErrorMessage(error.message);
}
```

## Performance Tips

1. **Use specific hooks** (not full dashboard)
   ```typescript
   // Good
   const { data } = useMetrics();

   // Avoid
   const { data } = useDashboard();
   ```

2. **Enable only needed data** in compounds
   ```typescript
   useDashboardData({
     includeMetrics: true,
     includeActivity: false,
     includeSalesData: false
   })
   ```

3. **Use infinite queries** for big lists
   ```typescript
   useInfiniteProducts() // Better than pagination
   ```

4. **Set enabled conditionally**
   ```typescript
   useProduct(id, { enabled: !!id })
   ```

## Debugging

Enable in development:
```typescript
// In app/_layout.tsx or root component
if (__DEV__) {
  const { ReactQueryDevtools } = require('@tanstack/react-query-devtools');
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Queries not refetching | Check `staleTime` config |
| Old data appears | Verify mutation invalidation |
| Duplicated requests | Check query deduplication time |
| Memory usage high | Reduce `gcTime` values |
| DevTools not showing | Install package & add component |

## Cache Durations (Default)

- Dashboard: 5 min (stale) / 10 min (cache)
- Products: 5 min / 15 min
- Orders: 2 min / 10 min
- Cashback: 2 min / 10 min
- Auth: 1 min / 5 min
- Analytics: 15 min / 30 min

## File Locations

- Query hooks: `/hooks/queries/*.ts`
- Mutation hooks: `/hooks/mutations/*.ts`
- Query keys: `/hooks/queries/queryKeys.ts`
- Config: `/config/reactQuery.ts`
- Docs: `/hooks/queries/REACT_QUERY_SETUP.md`
