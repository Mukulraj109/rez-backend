# React Query Setup Guide

This document provides guidance on using the React Query infrastructure in the merchant app.

## Overview

React Query is integrated for efficient data fetching, caching, and synchronization. All query configurations are centralized for consistency and easy maintenance.

## Key Files

- `config/reactQuery.ts` - QueryClient configuration and default options
- `hooks/queries/queryKeys.ts` - Centralized query key factory
- `hooks/queries/useProducts.ts` - Product-related hooks
- `hooks/queries/useDashboard.ts` - Dashboard-related hooks
- `hooks/queries/useOrders.ts` - Order-related hooks
- `hooks/queries/useCashback.ts` - Cashback-related hooks
- `hooks/mutations/useMutations.ts` - Custom mutation hooks
- `app/_layout.tsx` - QueryClientProvider integration

## Query Configuration

Different entities have different cache durations based on update frequency:

- **Dashboard**: 5-20 minutes (less frequent updates)
- **Products**: 5-15 minutes (moderate updates)
- **Orders**: 2-10 minutes (frequent updates)
- **Cashback**: 2-10 minutes (frequent updates)
- **Auth**: 1-5 minutes (security focused)
- **Analytics**: 15-30 minutes (long-term data)

## Basic Usage Examples

### Fetching Products

```typescript
import { useProducts, useProduct } from '@/hooks/queries';

function ProductsList() {
  // Get paginated products
  const { data, isLoading, error } = useProducts({
    page: 1,
    limit: 20,
    category: 'electronics'
  });

  // Get a single product
  const { data: product } = useProduct('product-id-123');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <FlatList
      data={data?.data?.items}
      renderItem={({ item }) => <ProductCard product={item} />}
    />
  );
}
```

### Fetching Dashboard Data

```typescript
import { useDashboard, useDashboardMetrics } from '@/hooks/queries';

function Dashboard() {
  // Get all dashboard data at once
  const { data, isLoading } = useDashboard();

  // Or use the compound hook for selective data
  const dashboardData = useDashboardData({
    includeMetrics: true,
    includeActivity: true,
    includeTopProducts: true,
    includeSalesData: true,
    period: '30d'
  });

  return (
    <ScrollView>
      {dashboardData.metrics.data && <MetricsCard {...dashboardData.metrics.data} />}
      {dashboardData.activity.data && <ActivityList {...dashboardData.activity.data} />}
    </ScrollView>
  );
}
```

### Fetching Orders

```typescript
import { useOrders, usePendingOrders, useOrder } from '@/hooks/queries';

function OrdersScreen() {
  // Get all orders
  const { data: allOrders } = useOrders();

  // Get only pending orders
  const { data: pendingOrders, isLoading } = usePendingOrders();

  // Get single order details
  const { data: orderDetails } = useOrder('order-id-123');

  return (
    <ScrollView>
      <PendingOrdersList orders={pendingOrders?.data?.items} isLoading={isLoading} />
    </ScrollView>
  );
}
```

## Creating and Updating Data

### Using Mutations with Auto-Invalidation

```typescript
import { useCreateProductMutation, useUpdateProductMutation } from '@/hooks/mutations';
import { productsService } from '@/services/api/products';

function CreateProduct() {
  // Create a new product
  const createMutation = useCreateProductMutation(
    (data) => productsService.createProduct(data),
    {
      onSuccess: () => {
        showSuccessMessage('Product created!');
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

  return (
    <Form
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
    />
  );
}
```

### Updating Products

```typescript
function EditProduct({ productId, initialData }) {
  const updateMutation = useUpdateProductMutation(
    productId,
    (data) => productsService.updateProduct(productId, data)
  );

  const handleUpdate = async (formData) => {
    await updateMutation.mutateAsync(formData);
  };

  return (
    <Form
      initialValues={initialData}
      onSubmit={handleUpdate}
      isSubmitting={updateMutation.isPending}
    />
  );
}
```

### Bulk Operations

```typescript
import { useBatchMutation } from '@/hooks/mutations';
import { queryKeys } from '@/hooks/queries';

function BulkApprovals() {
  const batchMutation = useBatchMutation(
    (ids) => cashbackService.approveBulk(ids),
    [{ queryKey: queryKeys.cashback.all }]
  );

  const handleApproveBulk = async (selectedIds) => {
    await batchMutation.mutateAsync(selectedIds);
  };

  return (
    <ApprovalsList
      onApproveBulk={handleApproveBulk}
      isLoading={batchMutation.isPending}
    />
  );
}
```

## Query Invalidation Patterns

### Automatic Invalidation

Mutations automatically invalidate related queries:

```typescript
// This automatically invalidates:
// - queryKeys.products.all
// - queryKeys.dashboard.all
const createMutation = useCreateProductMutation(...);

// This automatically invalidates:
// - queryKeys.orders.all
// - queryKeys.orders.detail(orderId)
// - queryKeys.orders.timeline(orderId)
// - queryKeys.dashboard.all
const updateMutation = useUpdateOrderMutation(orderId, ...);
```

### Manual Invalidation

For custom scenarios:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleCustomAction = async () => {
    // Do something...

    // Invalidate specific queries
    await queryClient.invalidateQueries({
      queryKey: queryKeys.products.all
    });

    // Invalidate multiple related queries
    await queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.all,
      exact: false // Invalidates all dashboard queries
    });
  };
}
```

## Advanced Patterns

### Infinite Queries (Pagination)

```typescript
import { useInfiniteProducts } from '@/hooks/queries';

function InfiniteProductsList() {
  const { data, hasNextPage, fetchNextPage, isLoading } = useInfiniteProducts({
    category: 'electronics'
  });

  const handleLoadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  const allProducts = data?.pages.flatMap(page => page.data?.items || []) || [];

  return (
    <FlatList
      data={allProducts}
      onEndReached={handleLoadMore}
      renderItem={({ item }) => <ProductCard product={item} />}
    />
  );
}
```

### Dependent Queries

```typescript
import { useProduct, useProductStock } from '@/hooks/queries';

function ProductWithStock({ productId }) {
  // First query
  const { data: product } = useProduct(productId);

  // Second query depends on first
  const { data: stockInfo } = useProductStock(productId, {
    enabled: !!product // Only run when product is loaded
  });

  return (
    <View>
      <ProductDetails product={product} />
      <StockStatus stock={stockInfo} />
    </View>
  );
}
```

### Combining Multiple Queries

```typescript
function OrderDetails({ orderId }) {
  // Use compound hooks that fetch multiple related data points
  const orderOverview = useOrdersOverview({
    includePending: true,
    includeAnalytics: true,
    period: '30d'
  });

  return (
    <View>
      {orderOverview.isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <OrderStats stats={orderOverview.analytics.data} />
          <PendingOrdersList orders={orderOverview.pending.data} />
        </>
      )}
    </View>
  );
}
```

## Error Handling

```typescript
function ProductsList() {
  const { data, isLoading, error, retry } = useProducts();

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <ErrorView
        message={error.message}
        onRetry={retry}
      />
    );
  }

  return <ProductList products={data?.data?.items} />;
}
```

## Performance Tips

1. **Use specific query hooks** instead of fetching all data:
   ```typescript
   // Good - only fetch what you need
   const { data: topProducts } = useTopProducts(10, '30d');

   // Avoid - fetches everything
   const { data } = useDashboard();
   ```

2. **Set appropriate stale times** in configuration based on update frequency

3. **Use query keys consistently** for reliable cache invalidation

4. **Leverage infinite queries** for large datasets:
   ```typescript
   const { data, hasNextPage, fetchNextPage } = useInfiniteProducts();
   ```

5. **Combine queries when necessary** using compound hooks:
   ```typescript
   const dashboardData = useDashboardData({...});
   // Instead of multiple individual calls
   ```

## Debugging

Enable React Query DevTools in development:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In your app layout or root component
<QueryClientProvider client={queryClient}>
  {children}
  {__DEV__ && <ReactQueryDevtools />}
</QueryClientProvider>
```

## Query Key Structure

Query keys follow a hierarchical structure for easy invalidation:

```
products
├── list [{ filters }]
├── detail [id]
├── categories
├── search [query]
├── byCategory [categoryId]
└── lowStock
```

This allows for granular invalidation:
```typescript
// Invalidate all product queries
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// Invalidate only product detail
queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });

// Invalidate all product lists with wildcard
queryClient.invalidateQueries({
  queryKey: queryKeys.products.all,
  exact: false
});
```

## Offline Support

React Query integrates with the existing offline queue system. Mutations are automatically queued when offline and retried when connection is restored.
