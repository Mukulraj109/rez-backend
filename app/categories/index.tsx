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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { productsService } from '@/services';
import { ProductCategory } from '@/types/api';

interface CategoryWithStats extends ProductCategory {
  subcategories: CategoryWithStats[];
}

interface CategoryStats {
  overview: {
    totalCategories: number;
    totalSubcategories: number;
    totalProducts: number;
  };
  topCategories: Array<{
    category: string;
    productCount: number;
    averagePrice: number;
    totalValue: number;
  }>;
  insights: {
    averageProductsPerCategory: number;
    categoriesNeedingAttention: number;
  };
}

export default function CategoriesScreen() {
  const { token } = useAuth();
  const { activeStore, stores } = useStore();
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStore?._id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fetchCategories = useCallback(async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // For now, use the products service to get categories
      // This will get basic category data - the backend may need to be extended for stats
      const categoriesData = await productsService.getCategories(selectedStoreId || undefined);
      
      // Transform the data to match the expected format with subcategories
      const categoriesWithStats: CategoryWithStats[] = categoriesData.map(cat => ({
        ...cat,
        subcategories: [] // Backend doesn't provide subcategories yet
      }));

      setCategories(categoriesWithStats);
      
      // Mock stats for now - could be extended in backend later
      const mockStats: CategoryStats = {
        overview: {
          totalCategories: categoriesData.length,
          totalSubcategories: 0,
          totalProducts: categoriesData.reduce((sum, cat) => sum + cat.productCount, 0),
        },
        topCategories: categoriesData
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 5)
          .map(cat => ({
            category: cat.name,
            productCount: cat.productCount,
            averagePrice: 0, // Would need backend calculation
            totalValue: 0, // Would need backend calculation
          })),
        insights: {
          averageProductsPerCategory: categoriesData.length > 0 
            ? Math.round(categoriesData.reduce((sum, cat) => sum + cat.productCount, 0) / categoriesData.length)
            : 0,
          categoriesNeedingAttention: categoriesData.filter(cat => cat.productCount === 0).length,
        },
      };
      
      setStats(mockStats);

    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, searchQuery, selectedStoreId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleRefresh = () => {
    fetchCategories(true);
  };

  const handleCategoryPress = (category: CategoryWithStats) => {
    if (isSelectionMode) {
      toggleCategorySelection(category.id);
    } else {
      // Navigate to category products
      router.push(`/products?category=${encodeURIComponent(category.name)}`);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCategories.length === 0) {
      Alert.alert('No Selection', 'Please select categories first.');
      return;
    }

    switch (action) {
      case 'merge':
        setShowBulkModal(true);
        break;
      case 'auto_categorize':
        await handleAutoCategorize();
        break;
      case 'export':
        await handleExport();
        break;
      default:
        Alert.alert('Action', `${action} action for ${selectedCategories.length} categories`);
    }
  };

  const handleAutoCategorize = async () => {
    // For now, show a placeholder message since this advanced feature would need backend implementation
    Alert.alert(
      'Feature Coming Soon',
      'Auto-categorization functionality will be available in a future update.',
      [{ text: 'OK' }]
    );
    setIsSelectionMode(false);
    setSelectedCategories([]);
  };

  const handleExport = async () => {
    // For now, show a simple export of current categories data
    const exportData = {
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        productCount: cat.productCount,
        isActive: cat.isActive,
      })),
      exportedAt: new Date().toISOString(),
      totalCategories: categories.length,
    };
    
    Alert.alert(
      'Export Complete',
      `Exported ${categories.length} categories. Data logged to console.`,
      [
        { text: 'View Data', onPress: () => console.log('Categories Export:', JSON.stringify(exportData, null, 2)) },
        { text: 'OK' }
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: CategoryWithStats }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        isSelectionMode && selectedCategories.includes(item.id) && styles.selectedCard,
      ]}
      onPress={() => handleCategoryPress(item)}
      onLongPress={() => {
        if (!isSelectionMode) {
          setIsSelectionMode(true);
          setSelectedCategories([item.id]);
        }
      }}
    >
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
          <ThemedText style={styles.productCount}>
            {item.productCount} {item.productCount === 1 ? 'product' : 'products'}
          </ThemedText>
          {stores.length > 1 && selectedStoreId && (
            <ThemedText style={styles.categoryStore}>
              {stores.find(s => s._id === selectedStoreId)?.name || 'Store'}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.categoryActions}>
          {isSelectionMode && (
            <View style={[
              styles.checkbox,
              selectedCategories.includes(item.id) && styles.checkedBox,
            ]}>
              {selectedCategories.includes(item.id) && (
                <Ionicons name="checkmark" size={16} color={Colors.light.background} />
              )}
            </View>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/categories/edit/${item.id}`)}
          >
            <Ionicons name="pencil" size={16} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {item.subcategories && item.subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          <ThemedText style={styles.subcategoriesTitle}>Subcategories:</ThemedText>
          <View style={styles.subcategoriesList}>
            {item.subcategories.map((subcat) => (
              <TouchableOpacity
                key={subcat.id}
                style={styles.subcategoryChip}
                onPress={() => router.push(`/products?category=${encodeURIComponent(item.name)}&subcategory=${encodeURIComponent(subcat.name)}`)}
              >
                <ThemedText style={styles.subcategoryText}>
                  {subcat.name} ({subcat.productCount})
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <ThemedText style={styles.sectionTitle}>Category Overview</ThemedText>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.overview.totalCategories}</ThemedText>
            <ThemedText style={styles.statLabel}>Categories</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.overview.totalSubcategories}</ThemedText>
            <ThemedText style={styles.statLabel}>Subcategories</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.overview.totalProducts}</ThemedText>
            <ThemedText style={styles.statLabel}>Products</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.insights.averageProductsPerCategory}</ThemedText>
            <ThemedText style={styles.statLabel}>Avg/Category</ThemedText>
          </View>
        </View>

        {stats.topCategories.length > 0 && (
          <View style={styles.topCategoriesContainer}>
            <ThemedText style={styles.subsectionTitle}>Top Categories</ThemedText>
            {stats.topCategories.slice(0, 5).map((cat, index) => (
              <View key={cat.category} style={styles.topCategoryItem}>
                <View style={styles.topCategoryRank}>
                  <ThemedText style={styles.rankNumber}>{index + 1}</ThemedText>
                </View>
                <View style={styles.topCategoryInfo}>
                  <ThemedText style={styles.topCategoryName}>{cat.category}</ThemedText>
                  <ThemedText style={styles.topCategoryStats}>
                    {cat.productCount} products • ₹${cat.averagePrice.toFixed(2)} avg
                  </ThemedText>
                </View>
                <ThemedText style={styles.topCategoryValue}>
                  ₹${cat.totalValue.toFixed(0)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="file-tray-outline" size={64} color={Colors.light.textSecondary} />
      <ThemedText style={styles.emptyTitle}>No categories found</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search terms' : 'Categories will appear here as you add products'}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Categories
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Organize your product catalog
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            {isSelectionMode ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedCategories([]);
                }}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={24} color={Colors.light.background} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Store Filter - Show only if multiple stores */}
        {stores.length > 1 && (
          <View style={styles.storeFilterContainer}>
            <ThemedText style={styles.storeFilterLabel}>Filter by Store:</ThemedText>
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
                <ThemedText
                  style={[
                    styles.storeFilterText,
                    !selectedStoreId && styles.storeFilterTextActive,
                  ]}
                >
                  All Stores
                </ThemedText>
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
                  <ThemedText
                    style={[
                      styles.storeFilterText,
                      selectedStoreId === store._id && styles.storeFilterTextActive,
                    ]}
                  >
                    {store.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selection Actions */}
        {isSelectionMode && selectedCategories.length > 0 && (
          <View style={styles.selectionActions}>
            <ThemedText style={styles.selectionCount}>
              {selectedCategories.length} selected
            </ThemedText>
            
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('auto_categorize')}
              >
                <Ionicons name="scan" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.bulkActionText}>Auto-categorize</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('export')}
              >
                <Ionicons name="download" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.bulkActionText}>Export</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('merge')}
              >
                <Ionicons name="git-merge" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.bulkActionText}>Merge</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      {loading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Loading categories...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.light.primary]}
            />
          }
        >
          {/* Stats */}
          {renderStatsCard()}

          {/* Categories List */}
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesHeader}>
              <ThemedText style={styles.sectionTitle}>All Categories</ThemedText>
              <TouchableOpacity
                style={styles.organizeButton}
                onPress={() => router.push('/categories/organize')}
              >
                <Ionicons name="reorder-three" size={20} color={Colors.light.primary} />
                <ThemedText style={styles.organizeText}>Organize</ThemedText>
              </TouchableOpacity>
            </View>
            
            {categories.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.light.background,
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  cancelText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  clearButton: {
    padding: 4,
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.light.background,
    gap: 4,
  },
  bulkActionText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  statsContainer: {
    backgroundColor: Colors.light.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  topCategoriesContainer: {
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  topCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  topCategoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.background,
  },
  topCategoryInfo: {
    flex: 1,
  },
  topCategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  topCategoryStats: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  topCategoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  categoriesContainer: {
    backgroundColor: Colors.light.background,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  organizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizeText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.light.background,
  },
  subcategoriesContainer: {
    marginTop: 8,
  },
  subcategoriesTitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  subcategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subcategoryChip: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subcategoryText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  storeFilterContainer: {
    marginBottom: 12,
  },
  storeFilterLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
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
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  storeFilterButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  storeFilterText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  storeFilterTextActive: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  categoryStore: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '500',
    marginTop: 2,
  },
});