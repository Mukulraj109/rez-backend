import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FormInput from '@/components/forms/FormInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services';
import { Product } from '@/shared/types';

interface BulkActionFilters {
  search?: string;
  category?: string;
  status?: string;
}

type BulkActionType =
  | 'change_category'
  | 'update_price'
  | 'change_status'
  | 'delete'
  | 'apply_discount';

interface BulkActionState {
  type: BulkActionType | null;
  category?: string;
  price?: string;
  priceType?: 'fixed' | 'percentage';
  status?: 'active' | 'inactive';
  discount?: string;
  discountType?: 'fixed' | 'percentage';
}

interface ActionHistoryItem {
  id: string;
  action: string;
  productCount: number;
  date: string;
  status: 'completed' | 'failed' | 'partial';
  canUndo: boolean;
}

export default function BulkActionsScreen() {
  const { hasPermission } = useAuth();
  const { control, watch } = useForm<BulkActionFilters>();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionState>({ type: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([
    {
      id: '1',
      action: 'Changed category to Electronics',
      productCount: 45,
      date: '2025-11-17 10:30',
      status: 'completed',
      canUndo: true,
    },
    {
      id: '2',
      action: 'Applied 10% discount',
      productCount: 120,
      date: '2025-11-16 15:20',
      status: 'completed',
      canUndo: false,
    },
  ]);

  const searchQuery = watch('search');
  const categoryFilter = watch('category');
  const statusFilter = watch('status');

  // Check permission
  useEffect(() => {
    if (!hasPermission('products:bulk_edit')) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to perform bulk actions.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Load products
  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryFilter, statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await productsService.getProducts({
        query: searchQuery,
        category: categoryFilter,
        status: statusFilter,
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      setProducts(result.products);
    } catch (error: any) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p._id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const handleBulkAction = async () => {
    if (selectedProducts.size === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }

    if (!bulkAction.type) {
      Alert.alert('Error', 'Please select an action');
      return;
    }

    // Validate action-specific fields
    if (bulkAction.type === 'change_category' && !bulkAction.category) {
      Alert.alert('Error', 'Please enter a category');
      return;
    }

    if (bulkAction.type === 'update_price' && !bulkAction.price) {
      Alert.alert('Error', 'Please enter a price adjustment');
      return;
    }

    if (bulkAction.type === 'apply_discount' && !bulkAction.discount) {
      Alert.alert('Error', 'Please enter a discount value');
      return;
    }

    const actionDescription = getActionDescription();

    Alert.alert(
      'Confirm Bulk Action',
      `${actionDescription}\n\nThis will affect ${selectedProducts.size} product(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          style: 'destructive',
          onPress: () => performBulkAction(),
        },
      ]
    );
  };

  const getActionDescription = (): string => {
    switch (bulkAction.type) {
      case 'change_category':
        return `Change category to "${bulkAction.category}"`;
      case 'update_price':
        return `${bulkAction.priceType === 'percentage' ? 'Adjust' : 'Set'} price ${bulkAction.priceType === 'percentage' ? 'by' : 'to'} ${bulkAction.price}${bulkAction.priceType === 'percentage' ? '%' : ''}`;
      case 'change_status':
        return `Change status to ${bulkAction.status}`;
      case 'delete':
        return 'Delete selected products';
      case 'apply_discount':
        return `Apply ${bulkAction.discount}${bulkAction.discountType === 'percentage' ? '%' : ''} discount`;
      default:
        return 'Unknown action';
    }
  };

  const performBulkAction = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const productIds = Array.from(selectedProducts);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Prepare bulk action request
      let actionRequest: any = {
        productIds,
        action: bulkAction.type,
      };

      switch (bulkAction.type) {
        case 'change_category':
          actionRequest.category = bulkAction.category;
          break;
        case 'update_price':
          actionRequest.priceAdjustment = {
            value: parseFloat(bulkAction.price || '0'),
            type: bulkAction.priceType,
          };
          break;
        case 'change_status':
          actionRequest.status = bulkAction.status;
          break;
        case 'apply_discount':
          actionRequest.discount = {
            value: parseFloat(bulkAction.discount || '0'),
            type: bulkAction.discountType,
          };
          break;
      }

      console.log('Bulk action request:', actionRequest);

      // In a real implementation, call the backend API
      // const result = await productsService.bulkProductAction(actionRequest);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(progressInterval);
      setProgress(100);

      // Add to history
      const newHistoryItem: ActionHistoryItem = {
        id: Date.now().toString(),
        action: getActionDescription(),
        productCount: selectedProducts.size,
        date: new Date().toLocaleString(),
        status: 'completed',
        canUndo: bulkAction.type !== 'delete',
      };
      setActionHistory(prev => [newHistoryItem, ...prev]);

      Alert.alert(
        'Success',
        `Bulk action completed successfully for ${selectedProducts.size} product(s)!`,
        [{ text: 'OK', onPress: () => {
          deselectAll();
          setBulkAction({ type: null });
          loadProducts();
        }}]
      );
    } catch (error: any) {
      console.error('Bulk action error:', error);
      Alert.alert('Error', error.message || 'Failed to perform bulk action');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleUndo = async (historyItemId: string) => {
    Alert.alert(
      'Undo Action',
      'Are you sure you want to undo this action?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          onPress: async () => {
            try {
              // In a real implementation, call the backend API
              // await productsService.undoBulkAction(historyItemId);

              setActionHistory(prev =>
                prev.map(item =>
                  item.id === historyItemId
                    ? { ...item, canUndo: false }
                    : item
                )
              );

              Alert.alert('Success', 'Action undone successfully');
              loadProducts();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to undo action');
            }
          },
        },
      ]
    );
  };

  const renderActionSelector = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Select Action</ThemedText>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[
            styles.actionCard,
            bulkAction.type === 'change_category' && styles.actionCardSelected,
          ]}
          onPress={() => setBulkAction({ type: 'change_category' })}
        >
          <Ionicons
            name="pricetag"
            size={24}
            color={bulkAction.type === 'change_category' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={styles.actionLabel}>Change Category</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            bulkAction.type === 'update_price' && styles.actionCardSelected,
          ]}
          onPress={() => setBulkAction({ type: 'update_price', priceType: 'percentage' })}
        >
          <Ionicons
            name="cash"
            size={24}
            color={bulkAction.type === 'update_price' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={styles.actionLabel}>Update Price</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            bulkAction.type === 'change_status' && styles.actionCardSelected,
          ]}
          onPress={() => setBulkAction({ type: 'change_status', status: 'active' })}
        >
          <Ionicons
            name="toggle"
            size={24}
            color={bulkAction.type === 'change_status' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={styles.actionLabel}>Change Status</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            bulkAction.type === 'apply_discount' && styles.actionCardSelected,
          ]}
          onPress={() => setBulkAction({ type: 'apply_discount', discountType: 'percentage' })}
        >
          <Ionicons
            name="gift"
            size={24}
            color={bulkAction.type === 'apply_discount' ? Colors.light.primary : Colors.light.textSecondary}
          />
          <ThemedText style={styles.actionLabel}>Apply Discount</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            bulkAction.type === 'delete' && styles.actionCardSelected,
            { borderColor: bulkAction.type === 'delete' ? Colors.light.destructive : Colors.light.border },
          ]}
          onPress={() => setBulkAction({ type: 'delete' })}
        >
          <Ionicons
            name="trash"
            size={24}
            color={bulkAction.type === 'delete' ? Colors.light.destructive : Colors.light.textSecondary}
          />
          <ThemedText style={[
            styles.actionLabel,
            bulkAction.type === 'delete' && { color: Colors.light.destructive },
          ]}>
            Delete Products
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActionDetails = () => {
    if (!bulkAction.type) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Action Details</ThemedText>

        {bulkAction.type === 'change_category' && (
          <View>
            <ThemedText style={styles.label}>New Category</ThemedText>
            <TextInput
              style={styles.input}
              value={bulkAction.category}
              onChangeText={(value) => setBulkAction(prev => ({ ...prev, category: value }))}
              placeholder="Enter category name"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        )}

        {bulkAction.type === 'update_price' && (
          <View>
            <View style={styles.priceTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  bulkAction.priceType === 'percentage' && styles.priceTypeButtonSelected,
                ]}
                onPress={() => setBulkAction(prev => ({ ...prev, priceType: 'percentage' }))}
              >
                <ThemedText style={[
                  styles.priceTypeText,
                  bulkAction.priceType === 'percentage' && styles.priceTypeTextSelected,
                ]}>
                  Percentage
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  bulkAction.priceType === 'fixed' && styles.priceTypeButtonSelected,
                ]}
                onPress={() => setBulkAction(prev => ({ ...prev, priceType: 'fixed' }))}
              >
                <ThemedText style={[
                  styles.priceTypeText,
                  bulkAction.priceType === 'fixed' && styles.priceTypeTextSelected,
                ]}>
                  Fixed Amount
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.label}>
              {bulkAction.priceType === 'percentage' ? 'Percentage Adjustment (%)' : 'New Price (₹)'}
            </ThemedText>
            <TextInput
              style={styles.input}
              value={bulkAction.price}
              onChangeText={(value) => setBulkAction(prev => ({ ...prev, price: value }))}
              placeholder={bulkAction.priceType === 'percentage' ? 'e.g., 10 or -10' : 'e.g., 999'}
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
            />
          </View>
        )}

        {bulkAction.type === 'change_status' && (
          <View style={styles.statusSelector}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                bulkAction.status === 'active' && styles.statusButtonActive,
              ]}
              onPress={() => setBulkAction(prev => ({ ...prev, status: 'active' }))}
            >
              <ThemedText style={[
                styles.statusText,
                bulkAction.status === 'active' && { color: Colors.light.background },
              ]}>
                Activate
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                bulkAction.status === 'inactive' && styles.statusButtonInactive,
              ]}
              onPress={() => setBulkAction(prev => ({ ...prev, status: 'inactive' }))}
            >
              <ThemedText style={[
                styles.statusText,
                bulkAction.status === 'inactive' && { color: Colors.light.background },
              ]}>
                Deactivate
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {bulkAction.type === 'apply_discount' && (
          <View>
            <View style={styles.priceTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  bulkAction.discountType === 'percentage' && styles.priceTypeButtonSelected,
                ]}
                onPress={() => setBulkAction(prev => ({ ...prev, discountType: 'percentage' }))}
              >
                <ThemedText style={[
                  styles.priceTypeText,
                  bulkAction.discountType === 'percentage' && styles.priceTypeTextSelected,
                ]}>
                  Percentage
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  bulkAction.discountType === 'fixed' && styles.priceTypeButtonSelected,
                ]}
                onPress={() => setBulkAction(prev => ({ ...prev, discountType: 'fixed' }))}
              >
                <ThemedText style={[
                  styles.priceTypeText,
                  bulkAction.discountType === 'fixed' && styles.priceTypeTextSelected,
                ]}>
                  Fixed Amount
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.label}>
              {bulkAction.discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
            </ThemedText>
            <TextInput
              style={styles.input}
              value={bulkAction.discount}
              onChangeText={(value) => setBulkAction(prev => ({ ...prev, discount: value }))}
              placeholder={bulkAction.discountType === 'percentage' ? 'e.g., 10' : 'e.g., 100'}
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
            />
          </View>
        )}

        {bulkAction.type === 'delete' && (
          <View style={styles.deleteWarning}>
            <Ionicons name="warning" size={24} color={Colors.light.destructive} />
            <ThemedText style={styles.deleteWarningText}>
              This action cannot be undone. Selected products will be permanently deleted.
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderProgress = () => {
    if (!isProcessing && progress === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Processing...</ThemedText>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <ThemedText style={styles.progressText}>{progress}%</ThemedText>
        </View>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProducts.has(item._id);

    return (
      <TouchableOpacity
        style={[styles.productItem, isSelected && styles.productItemSelected]}
        onPress={() => toggleProduct(item._id)}
      >
        <View style={styles.productCheckbox}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={Colors.light.background} />
          )}
        </View>

        <View style={styles.productInfo}>
          <ThemedText style={styles.productName}>{item.name}</ThemedText>
          <View style={styles.productMeta}>
            <ThemedText style={styles.productMetaText}>{item.category}</ThemedText>
            <ThemedText style={styles.productMetaText}>•</ThemedText>
            <ThemedText style={styles.productMetaText}>₹{item.price}</ThemedText>
            <ThemedText style={styles.productMetaText}>•</ThemedText>
            <ThemedText style={styles.productMetaText}>
              Stock: {item.inventory?.stock || 0}
            </ThemedText>
          </View>
        </View>

        <View style={[
          styles.productStatus,
          { backgroundColor: item.status === 'active' ? Colors.light.success : Colors.light.warning }
        ]}>
          <ThemedText style={styles.productStatusText}>{item.status}</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistory = () => {
    if (!showHistory || actionHistory.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Action History</ThemedText>

        {actionHistory.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <View style={styles.historyInfo}>
                <ThemedText style={styles.historyAction}>{item.action}</ThemedText>
                <ThemedText style={styles.historyDate}>{item.date}</ThemedText>
                <ThemedText style={styles.historyCount}>
                  {item.productCount} products affected
                </ThemedText>
              </View>

              <View style={[
                styles.historyStatus,
                { backgroundColor: item.status === 'completed' ? Colors.light.success :
                                   item.status === 'partial' ? Colors.light.warning :
                                   Colors.light.destructive }
              ]}>
                <ThemedText style={styles.historyStatusText}>{item.status}</ThemedText>
              </View>
            </View>

            {item.canUndo && (
              <TouchableOpacity
                style={styles.undoButton}
                onPress={() => handleUndo(item.id)}
              >
                <Ionicons name="arrow-undo" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.undoButtonText}>Undo Action</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Bulk Actions</ThemedText>
        <View style={styles.placeholder} />
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <FormInput
          name="search"
          control={control}
          placeholder="Search products..."
          icon="search"
        />

        <View style={styles.filters}>
          <View style={styles.filterItem}>
            <FormInput
              name="category"
              control={control}
              placeholder="Category"
            />
          </View>
          <View style={styles.filterItem}>
            <FormInput
              name="status"
              control={control}
              placeholder="Status"
            />
          </View>
        </View>
      </View>

      {/* Selection Controls */}
      <View style={styles.selectionControls}>
        <View style={styles.selectionInfo}>
          <ThemedText style={styles.selectionCount}>
            {selectedProducts.size} of {products.length} selected
          </ThemedText>
        </View>

        <View style={styles.selectionActions}>
          <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
            <ThemedText style={styles.selectionButtonText}>Select All</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={deselectAll} style={styles.selectionButton}>
            <ThemedText style={styles.selectionButtonText}>Deselect All</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product List */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Products ({products.length})
          </ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.light.primary} />
          ) : products.length === 0 ? (
            <ThemedText style={styles.emptyText}>No products found</ThemedText>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Action Selector */}
        {selectedProducts.size > 0 && renderActionSelector()}

        {/* Action Details */}
        {renderActionDetails()}

        {/* Progress */}
        {renderProgress()}

        {/* Apply Button */}
        {selectedProducts.size > 0 && bulkAction.type && !isProcessing && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.applyButton,
                bulkAction.type === 'delete' && styles.applyButtonDelete,
              ]}
              onPress={handleBulkAction}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.background}
              />
              <ThemedText style={styles.applyButtonText}>
                Apply to {selectedProducts.size} Product(s)
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* History Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <ThemedText style={styles.historyToggleText}>
              {showHistory ? 'Hide' : 'Show'} Action History
            </ThemedText>
            <Ionicons
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.light.primary}
            />
          </TouchableOpacity>
        </View>

        {/* History */}
        {renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  searchSection: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterItem: {
    flex: 1,
  },
  selectionControls: {
    backgroundColor: Colors.light.background,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.light.background,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productItemSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  productCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  productMetaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  productStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.background,
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  actionCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  priceTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  priceTypeButtonSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  priceTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  priceTypeTextSelected: {
    color: Colors.light.primary,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  statusButtonActive: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  statusButtonInactive: {
    backgroundColor: Colors.light.warning,
    borderColor: Colors.light.warning,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  deleteWarning: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.destructive,
  },
  deleteWarningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    minWidth: 40,
  },
  applyButton: {
    backgroundColor: Colors.light.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  applyButtonDelete: {
    backgroundColor: Colors.light.destructive,
  },
  applyButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  historyToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyItem: {
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  historyCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.background,
    textTransform: 'uppercase',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  undoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
});
