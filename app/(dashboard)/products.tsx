import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Shadows, BorderRadius } from '@/constants/DesignTokens';
import { Card, Heading2, Heading3, BodyText, Caption, Badge, Button } from '@/components/ui/DesignSystemComponents';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { productsService } from '@/services';
import { Product } from '@/shared/types';
import { processProductImages } from '@/utils/imageUtils';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock';

export default function ProductsScreen() {
  const { token } = useAuth();
  const { activeStore, stores } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStore?._id || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      const filters = {
        page: isRefresh ? 1 : page,
        limit: 20,
        sortBy: 'created' as const,
        sortOrder: 'desc' as const,
        query: searchQuery.trim() || undefined,
        status: activeFilter === 'active' ? 'active' as const : 
                activeFilter === 'inactive' ? 'inactive' as const : undefined,
        stockLevel: activeFilter === 'low_stock' ? 'low_stock' as const : 
                   activeFilter === 'out_of_stock' ? 'out_of_stock' as const : 
                   activeFilter === 'all' ? 'all' as const : undefined,
        storeId: selectedStoreId || undefined,
      };

      const data = await productsService.getProducts(filters);
      
      // Process images for all products
      const processedProducts = data.products.map(product => ({
        ...product,
        images: processProductImages(product.images)
      }));
      
      if (isRefresh || page === 1) {
        setProducts(processedProducts);
      } else {
        setProducts(prev => [...prev, ...processedProducts]);
      }

      setTotalCount(data.totalCount);
      setHasMore(page < data.totalPages);
      
      if (!isRefresh && data.products.length > 0) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, searchQuery, activeFilter, selectedStoreId, page]);

  useEffect(() => {
    fetchProducts(true);
  }, [searchQuery, activeFilter, selectedStoreId]);

  const handleRefresh = () => {
    fetchProducts(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    console.log('🗑️ [DELETE LIST] handleDeleteProduct called with ID:', productId);
    console.log('🗑️ [DELETE LIST] Token exists:', !!token);
    console.log('🗑️ [DELETE LIST] Platform:', Platform.OS);
    
    if (!token) {
      console.error('❌ [DELETE LIST] No token available');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Error: Authentication required. Please log in again.');
      } else {
        Alert.alert('Error', 'Authentication required. Please log in again.');
      }
      return;
    }

    const confirmMessage = 'Are you sure you want to delete this product? This will delete the product, all images, videos, and related data. This action cannot be undone.';
    
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      console.log('🗑️ [DELETE LIST] Using window.confirm for web');
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        console.log('🗑️ [DELETE LIST] User confirmed deletion via window.confirm');
        await handleDeleteConfirmed(productId);
      } else {
        console.log('🗑️ [DELETE LIST] User cancelled deletion via window.confirm');
      }
    } else {
      console.log('🗑️ [DELETE LIST] Using Alert.alert for native');
      Alert.alert(
        'Delete Product',
        confirmMessage,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🗑️ [DELETE LIST] User cancelled deletion');
            }
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('🗑️ [DELETE LIST] User confirmed deletion via Alert');
              handleDeleteConfirmed(productId);
            },
          },
        ]
      );
    }
  };

  const handleDeleteConfirmed = async (productId: string) => {
    console.log('🗑️ [DELETE LIST] handleDeleteConfirmed called with ID:', productId);
    console.log('🗑️ [DELETE LIST] Starting deletion process...');
    
    try {
      console.log('🗑️ [DELETE LIST] Calling productsService.deleteProduct with ID:', productId);
      
      await productsService.deleteProduct(productId);
      
      console.log('✅ [DELETE LIST] Product deleted successfully via productsService');
      
      // Remove from local state
      setProducts(prev => prev.filter(p => (p.id || (p as any)._id) !== productId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ [DELETE LIST] Product removed from local state');
      
      // Show success message
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Product and all related data deleted successfully');
      } else {
        Alert.alert('Success', 'Product and all related data deleted successfully');
      }
      
      // Refresh the list to ensure consistency
      console.log('🗑️ [DELETE LIST] Refreshing product list...');
      await fetchProducts();
      console.log('✅ [DELETE LIST] Product list refreshed');
    } catch (error: any) {
      console.error('❌ [DELETE LIST] Error caught:', error);
      console.error('❌ [DELETE LIST] Error message:', error?.message);
      console.error('❌ [DELETE LIST] Error stack:', error?.stack);
      
      const errorMessage = error?.message || 'Failed to delete product. Please try again.';
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const renderProductCard = ({ item, index }: { item: Product, index: number }) => {
    // Filter out invalid images (file:// URLs or empty URLs)
    // Handle both string URLs and object formats
    const validImages = item.images?.filter((img: any) => {
      const url = typeof img === 'string' ? img : img.url;
      return url && !url.startsWith('file://') && url.trim() !== '';
    }) || [];
    
    const mainImage = typeof validImages[0] === 'string' 
      ? validImages[0] 
      : validImages[0]?.url;
    const isLowStock = item.inventory.stock <= item.inventory.lowStockThreshold;
    const isOutOfStock = item.inventory.stock === 0;

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 50).springify()} 
        style={[styles.productCardWrapper, viewMode === 'grid' ? { flex: 0.5 } : { width: '100%' }]}
      >
      <Card
        style={[
          styles.productCard,
          viewMode === 'list' && styles.productCardList,
        ]}
        onPress={() => router.push(`/products/${item.id}`)}
        padding="sm"
      >
        <View style={[
          styles.productImageContainer,
          viewMode === 'list' && styles.productImageContainerList,
        ]}>
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={32} color={Colors.gray[400]} />
            </View>
          )}
          
          {(isOutOfStock || isLowStock) && (
            <View style={[
              styles.stockBadge,
            ]}>
              <Badge variant={isOutOfStock ? 'error' : 'warning'} size="small">
                  {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
              </Badge>
            </View>
          )}
        </View>

        <View style={[
          styles.productInfo,
          viewMode === 'list' && styles.productInfoList,
        ]}>
          <BodyText style={styles.productName} numberOfLines={2}>
            {item.name}
          </BodyText>
          
          <Heading3 style={styles.productPrice}>
            ₹{(Number(item.pricing?.selling) || Number(item.price) || 0).toFixed(2)}
          </Heading3>

          {item.sku && (
            <Caption style={styles.productSku} numberOfLines={1}>
              SKU: {item.sku}
            </Caption>
          )}
          {(item as any).storeId && stores.length > 1 && (
            <Caption style={styles.productStore} numberOfLines={1}>
              {stores.find(s => s._id === (item as any).storeId)?.name || 'Unknown Store'}
            </Caption>
          )}
          
          <View style={styles.productMeta}>
             <Badge variant={item.status === 'active' ? 'success' : 'default'} size="small">
                {item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
             </Badge>
            
            <Caption style={styles.stockText}>
              Stock: {item.inventory.stock}
            </Caption>
          </View>
        </View>

        <View style={styles.productActions}>
            <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: Colors.primary[50] }]}
                onPress={() => router.push(`/products/edit/${item.id || (item as any)._id}`)}
            >
                <Ionicons name="pencil" size={16} color={Colors.primary[600]} />
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: Colors.error[50] }]}
                onPress={(e) => {
                  console.log('🗑️ [DELETE LIST] Delete button pressed');
                  e.stopPropagation();
                  const productId = item.id || (item as any)._id;
                  console.log('🗑️ [DELETE LIST] Product ID:', productId);
                  console.log('🗑️ [DELETE LIST] Product name:', item.name);
                  
                  if (productId) {
                    handleDeleteProduct(productId);
                  } else {
                    console.error('❌ [DELETE LIST] Product ID not found');
                    const errorMsg = 'Product ID not found';
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.alert(`Error: ${errorMsg}`);
                    } else {
                      Alert.alert('Error', errorMsg);
                    }
                  }
                }}
                activeOpacity={0.7}
            >
                <Ionicons name="trash" size={16} color={Colors.error[600]} />
            </TouchableOpacity>
        </View>
      </Card>
      </Animated.View>
    );
  };

  const renderFilters = () => {
    const filters: { key: FilterType; label: string; icon: string }[] = [
      { key: 'all', label: 'All', icon: 'grid' },
      { key: 'active', label: 'Active', icon: 'checkmark-circle' },
      { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
      { key: 'low_stock', label: 'Low Stock', icon: 'warning' },
      { key: 'out_of_stock', label: 'Out of Stock', icon: 'close-circle' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={activeFilter === filter.key ? Colors.text.inverse : Colors.text.secondary}
            />
            <BodyText
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </BodyText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color={Colors.gray[300]} />
      <Heading2 style={styles.emptyTitle}>
        {searchQuery || activeFilter !== 'all' ? 'No products found' : 'No products yet'}
      </Heading2>
      <BodyText style={styles.emptySubtitle}>
        {searchQuery || activeFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Add your first product to get started'
        }
      </BodyText>
      {(!searchQuery && activeFilter === 'all') && (
        <Button
          title="Add Product"
          onPress={() => router.push('/products/add')}
          style={{ marginTop: Spacing.lg }}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Heading2>Products</Heading2>
            <BodyText>
              {totalCount} {totalCount === 1 ? 'product' : 'products'}
            </BodyText>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/products/add')}
          >
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.text.tertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Store Filter */}
        {stores.length > 1 && (
          <View style={styles.storeFilterContainer}>
            <Caption style={styles.storeFilterLabel}>Filter by Store:</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storeFilterScroll}
              contentContainerStyle={styles.storeFilterContent}
            >
              <TouchableOpacity
                style={[
                  styles.storeFilterButton,
                  !selectedStoreId && styles.storeFilterButtonActive,
                ]}
                onPress={() => setSelectedStoreId('')}
              >
                <BodyText
                  style={[
                    styles.storeFilterText,
                    !selectedStoreId && styles.storeFilterTextActive,
                  ]}
                >
                  All Stores
                </BodyText>
              </TouchableOpacity>
              {stores.map((store) => (
                <TouchableOpacity
                  key={store._id}
                  style={[
                    styles.storeFilterButton,
                    selectedStoreId === store._id && styles.storeFilterButtonActive,
                  ]}
                  onPress={() => setSelectedStoreId(store._id)}
                >
                  <BodyText
                    style={[
                      styles.storeFilterText,
                      selectedStoreId === store._id && styles.storeFilterTextActive,
                    ]}
                  >
                    {store.name}
                  </BodyText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* View Toggle and Filters */}
        <View style={styles.controlsRow}>
          {renderFilters()}
          
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.viewButton,
                viewMode === 'grid' && styles.activeViewButton,
              ]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons
                name="grid"
                size={20}
                color={viewMode === 'grid' ? Colors.primary[500] : Colors.text.tertiary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewButton,
                viewMode === 'list' && styles.activeViewButton,
              ]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? Colors.primary[500] : Colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Products List */}
      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <BodyText style={styles.loadingText}>Loading products...</BodyText>
        </View>
      ) : products.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={products}
          renderItem={({ item, index }) => renderProductCard({ item, index })}
          keyExtractor={(item) => item.id || (item as any)._id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary[500]]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() => 
            loading && products.length > 0 ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary[500]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    paddingTop: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary[500],
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  clearButton: {
    padding: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtersContainer: {
    flex: 1,
    marginRight: 12,
  },
  filtersContent: {
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  filterText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: Colors.text.inverse,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    padding: 6,
    borderRadius: 6,
  },
  activeViewButton: {
    backgroundColor: Colors.background.primary,
    ...Shadows.sm,
  },
  productsList: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  productCardWrapper: {
    padding: 4,
  },
  productCard: {
    flex: 1,
    minHeight: 250,
  },
  productCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 'auto',
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  productImageContainerList: {
    width: 80,
    height: 80,
    marginBottom: 0,
    marginRight: Spacing.md,
    flex: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  productInfo: {
    flex: 1,
  },
  productInfoList: {
    justifyContent: 'center',
  },
  productName: {
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.text.primary,
  },
  productSku: {
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  productPrice: {
    color: Colors.primary[600],
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stockText: {
    color: Colors.text.secondary,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.text.secondary,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  storeFilterContainer: {
    marginBottom: 12,
  },
  storeFilterLabel: {
    marginBottom: 8,
  },
  storeFilterScroll: {
    maxHeight: 40,
  },
  storeFilterContent: {
    gap: 8,
    paddingRight: 16,
  },
  storeFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeFilterButtonActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  storeFilterText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  storeFilterTextActive: {
    color: Colors.text.inverse,
  },
  productStore: {
    fontSize: 11,
    color: Colors.primary[600],
    fontWeight: '500',
    marginBottom: 4,
  },
});
