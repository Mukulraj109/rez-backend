/**
 * Product Variants Management Screen
 * Displays all variants for a specific product with management options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services';
import { Product } from '@/shared/types';

interface Variant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  salePrice?: number;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
  };
  attributes: Array<{
    name: string;
    value: string;
  }>;
  image?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
}

export default function ProductVariantsScreen() {
  const params = useLocalSearchParams();
  const { productId } = params;
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const canEdit = hasPermission('products:edit');

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const productIdStr = Array.isArray(productId) ? productId[0] : productId;

      const [productData, variantsData] = await Promise.all([
        productsService.getProduct(productIdStr),
        productsService.getProductVariants(productIdStr),
      ]);

      setProduct(productData);
      setVariants(variantsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [productId]);

  const handleAddVariant = () => {
    const productIdStr = Array.isArray(productId) ? productId[0] : productId;
    router.push(`/products/variants/add/${productIdStr}` as any);
  };

  const handleEditVariant = (variantId: string) => {
    router.push(`/products/variants/edit/${variantId}` as any);
  };

  const handleDeleteVariant = (variantId: string) => {
    Alert.alert(
      'Delete Variant',
      'Are you sure you want to delete this variant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productsService.deleteVariant(variantId);
              Alert.alert('Success', 'Variant deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete variant');
            }
          },
        },
      ]
    );
  };

  const toggleVariantSelection = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedVariants.size === 0) {
      Alert.alert('No Selection', 'Please select at least one variant');
      return;
    }

    const actionText = action === 'activate' ? 'activate' : action === 'deactivate' ? 'deactivate' : 'delete';

    Alert.alert(
      `Bulk ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      `Are you sure you want to ${actionText} ${selectedVariants.size} variant(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setBulkActionLoading(true);
              const result = await productsService.bulkVariantAction(
                action,
                Array.from(selectedVariants)
              );

              Alert.alert(
                'Success',
                `${result.successful} variant(s) ${actionText}d successfully${
                  result.failed > 0 ? `, ${result.failed} failed` : ''
                }`
              );

              setSelectedVariants(new Set());
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to perform bulk action');
            } finally {
              setBulkActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGenerateCombinations = () => {
    Alert.alert(
      'Generate Combinations',
      'This will generate all possible variant combinations based on product attributes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            // Navigate to a generation wizard or modal
            Alert.alert('Coming Soon', 'Variant combination generator will be available soon');
          },
        },
      ]
    );
  };

  const renderVariantCard = (variant: Variant) => {
    const isSelected = selectedVariants.has(variant.id);

    return (
      <TouchableOpacity
        key={variant.id}
        style={[styles.variantCard, isSelected && styles.variantCardSelected]}
        onPress={() => canEdit && handleEditVariant(variant.id)}
        onLongPress={() => canEdit && toggleVariantSelection(variant.id)}
        activeOpacity={0.7}
      >
        <View style={styles.variantHeader}>
          <TouchableOpacity
            onPress={() => canEdit && toggleVariantSelection(variant.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? Colors.light.primary : Colors.light.textSecondary}
            />
          </TouchableOpacity>

          {variant.image && (
            <Image source={{ uri: variant.image }} style={styles.variantImage} />
          )}

          <View style={styles.variantInfo}>
            <ThemedText style={styles.variantName}>{variant.name}</ThemedText>
            {variant.sku && (
              <ThemedText style={styles.variantSku}>SKU: {variant.sku}</ThemedText>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: variant.status === 'active' ? '#DEF7EC' : '#FEF3C7' },
            ]}
          >
            <ThemedText
              style={[
                styles.statusText,
                { color: variant.status === 'active' ? '#03543F' : '#92400E' },
              ]}
            >
              {variant.status.charAt(0).toUpperCase() + variant.status.slice(1)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.variantAttributes}>
          {variant.attributes.map((attr, index) => (
            <View key={index} style={styles.attributeChip}>
              <ThemedText style={styles.attributeText}>
                {attr.name}: {attr.value}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.variantFooter}>
          <View style={styles.priceContainer}>
            <ThemedText style={styles.priceLabel}>Price:</ThemedText>
            {variant.salePrice && variant.salePrice < (variant.price || 0) ? (
              <>
                <ThemedText style={styles.salePrice}>₹{variant.salePrice}</ThemedText>
                <ThemedText style={styles.regularPrice}>₹{variant.price}</ThemedText>
              </>
            ) : (
              <ThemedText style={styles.price}>₹{variant.price || 'N/A'}</ThemedText>
            )}
          </View>

          <View style={styles.stockContainer}>
            <ThemedText style={styles.stockLabel}>Stock:</ThemedText>
            <ThemedText
              style={[
                styles.stockValue,
                {
                  color:
                    variant.inventory.quantity === 0
                      ? Colors.light.destructive
                      : variant.inventory.quantity < 10
                      ? '#F59E0B'
                      : Colors.light.success,
                },
              ]}
            >
              {variant.inventory.quantity}
            </ThemedText>
          </View>

          {canEdit && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditVariant(variant.id)}
              >
                <Ionicons name="create-outline" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteVariant(variant.id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.light.destructive} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Product Variants
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading variants...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.title}>
              Variants
            </ThemedText>
            {product && (
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{variants.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {variants.filter((v) => v.status === 'active').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {variants.filter((v) => v.inventory.quantity === 0).length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Out of Stock</ThemedText>
          </View>
        </View>

        {/* Bulk Actions Bar */}
        {selectedVariants.size > 0 && canEdit && (
          <View style={styles.bulkActionsBar}>
            <ThemedText style={styles.bulkActionsText}>
              {selectedVariants.size} selected
            </ThemedText>
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.activateButton]}
                onPress={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.bulkActionText}>Activate</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.deactivateButton]}
                onPress={() => handleBulkAction('deactivate')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.bulkActionText}>Deactivate</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.deleteAllButton]}
                onPress={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.bulkActionText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Variants List */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {variants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={Colors.light.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Variants</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Add variants to manage different versions of this product
              </ThemedText>
              {canEdit && (
                <TouchableOpacity style={styles.emptyButton} onPress={handleAddVariant}>
                  <ThemedText style={styles.emptyButtonText}>Add First Variant</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.variantsList}>
              {variants.map((variant) => renderVariantCard(variant))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Buttons */}
        {canEdit && (
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={[styles.fab, styles.fabSecondary]}
              onPress={handleGenerateCombinations}
            >
              <Ionicons name="grid-outline" size={24} color={Colors.light.background} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fab} onPress={handleAddVariant}>
              <Ionicons name="add" size={28} color={Colors.light.background} />
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: Colors.light.text,
  },
  productName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    width: 32,
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  bulkActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activateButton: {
    backgroundColor: Colors.light.success,
  },
  deactivateButton: {
    backgroundColor: '#F59E0B',
  },
  deleteAllButton: {
    backgroundColor: Colors.light.destructive,
  },
  bulkActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.background,
  },
  content: {
    flex: 1,
  },
  variantsList: {
    padding: 16,
    gap: 12,
  },
  variantCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  variantCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  variantImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  variantSku: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  variantAttributes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  attributeChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attributeText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  variantFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.destructive,
  },
  regularPrice: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.textSecondary,
  },
});
