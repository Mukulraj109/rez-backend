import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { Product, ProductCategory, ProductSearchRequest } from '@/shared/types';
import { productsService } from '@/services/api/products';
import { queryKeys, queryConfig } from '@/config/reactQuery';

/**
 * Hook to fetch a paginated list of products
 */
export function useProducts(
  filters?: Partial<ProductSearchRequest>,
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const response = await productsService.getProducts(filters);
      return response;
    },
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch infinite list of products (for pagination)
 */
export function useInfiniteProducts(
  filters?: Partial<ProductSearchRequest>,
  options?: UseInfiniteQueryOptions<any>
) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await productsService.getProducts({
        ...filters,
        page: pageParam,
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
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: string, options?: UseQueryOptions<Product>) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const response = await productsService.getProductById(id);
      return response.data;
    },
    enabled: !!id,
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch product categories
 */
export function useProductCategories(options?: UseQueryOptions<ProductCategory[]>) {
  return useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: async () => {
      const response = await productsService.getCategories();
      return response.data || [];
    },
    staleTime: 30 * 60 * 1000, // Categories rarely change
    gcTime: 60 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to search products
 */
export function useSearchProducts(
  query: string,
  filters?: any,
  options?: UseQueryOptions<Product[]>
) {
  return useQuery({
    queryKey: queryKeys.products.search(query, filters),
    queryFn: async () => {
      if (!query.trim()) {
        return [];
      }
      const response = await productsService.searchProducts(query, filters);
      return response.data || [];
    },
    enabled: !!query.trim(),
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch products by category
 */
export function useProductsByCategory(
  categoryId: string,
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: queryKeys.products.byCategory(categoryId),
    queryFn: async () => {
      const response = await productsService.getProducts({
        category: categoryId,
      });
      return response;
    },
    enabled: !!categoryId,
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch low stock products
 */
export function useLowStockProducts(options?: UseQueryOptions<Product[]>) {
  return useQuery({
    queryKey: queryKeys.products.lowStock(),
    queryFn: async () => {
      const response = await productsService.getLowStockProducts();
      return response.data || [];
    },
    ...queryConfig.products,
    ...options,
  });
}

/**
 * Hook to fetch product stock status
 */
export function useProductStock(id: string, options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.products.stock(id),
    queryFn: async () => {
      const response = await productsService.getProductStock(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // Stock changes frequently
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}
