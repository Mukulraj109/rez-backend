/**
 * Inventory Analytics Screen
 * Stockout predictions, reorder recommendations, and inventory risk management
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { analyticsService } from '@/services/api/analytics';
import { useHasPermission } from '@/hooks/usePermissions';
import { StockoutPrediction } from '@/types/analytics';

type RiskFilter = 'all' | 'high' | 'medium' | 'safe';

export default function InventoryAnalyticsScreen() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const canViewAnalytics = useHasPermission('analytics:view');
  const canViewInventory = useHasPermission('products:view');

  // Fetch stockout predictions
  const {
    data: inventory,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory-predictions'],
    queryFn: () => analyticsService.getStockoutPredictions(),
    enabled: canViewAnalytics && canViewInventory,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    return analyticsService.getRiskLevelColor(riskLevel);
  };

  const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      default: return 'checkmark-circle';
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFilteredProducts = () => {
    if (!inventory) return [];

    switch (riskFilter) {
      case 'high': return inventory.highRisk;
      case 'medium': return inventory.mediumRisk;
      case 'safe': return inventory.safeStock;
      default: return [...inventory.highRisk, ...inventory.mediumRisk, ...inventory.safeStock];
    }
  };

  const ProductCard = ({ product }: { product: StockoutPrediction }) => (
    <View style={[styles.productCard, { borderLeftColor: getRiskColor(product.riskLevel) }]}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <ThemedText type="defaultSemiBold" style={styles.productName}>
            {product.productName}
          </ThemedText>
          <ThemedText style={styles.productSku}>SKU: {product.sku}</ThemedText>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(product.riskLevel) }]}>
          <ThemedText style={styles.riskBadgeText}>
            {product.riskLevel.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.productMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel}>Current Stock</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.metricValue}>
              {product.currentStock}
            </ThemedText>
          </View>
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel}>Daily Usage</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.metricValue}>
              {product.dailyAvgUsage.toFixed(1)}
            </ThemedText>
          </View>
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel}>Lead Time</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.metricValue}>
              {product.lead_time_days}d
            </ThemedText>
          </View>
        </View>

        {product.daysUntilStockout !== null && (
          <View style={styles.stockoutWarning}>
            <Ionicons name="time" size={16} color={getRiskColor(product.riskLevel)} />
            <ThemedText style={[styles.stockoutText, { color: getRiskColor(product.riskLevel) }]}>
              Stockout in {product.daysUntilStockout} days
              {product.predictedStockoutDate && ` (${formatDate(product.predictedStockoutDate)})`}
            </ThemedText>
          </View>
        )}

        <View style={styles.recommendationContainer}>
          <View style={styles.recommendationItem}>
            <Ionicons name="cube" size={16} color={Colors.light.primary} />
            <ThemedText style={styles.recommendationText}>
              Reorder {product.recommendedReorderQty} units
            </ThemedText>
          </View>
          <View style={styles.recommendationItem}>
            <Ionicons name="calendar" size={16} color={Colors.light.secondary} />
            <ThemedText style={styles.recommendationText}>
              By {formatDate(product.recommendedReorderDate)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.confidenceBar}>
          <View style={styles.confidenceBarFill} />
          <View
            style={[
              styles.confidenceBarProgress,
              {
                width: `${product.confidence}%`,
                backgroundColor: product.confidence >= 80 ? Colors.light.success :
                               product.confidence >= 60 ? Colors.light.warning :
                               Colors.light.error
              }
            ]}
          />
          <ThemedText style={styles.confidenceText}>
            {product.confidence.toFixed(0)}% confidence
          </ThemedText>
        </View>
      </View>
    </View>
  );

  if (!canViewAnalytics || !canViewInventory) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading && !inventory) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Analyzing inventory...</ThemedText>
      </ThemedView>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.title}>
              Inventory Analytics
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Stockout predictions & recommendations
            </ThemedText>
          </View>
        </View>

        {/* Summary Cards */}
        {inventory && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { borderLeftColor: Colors.light.info }]}>
              <ThemedText style={styles.summaryLabel}>Total Products</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {inventory.totalProducts}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>Being tracked</ThemedText>
            </View>

            <View style={[styles.summaryCard, { borderLeftColor: Colors.light.error }]}>
              <ThemedText style={styles.summaryLabel}>At Risk</ThemedText>
              <ThemedText type="title" style={[styles.summaryValue, { color: Colors.light.error }]}>
                {inventory.productsAtRisk}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {((inventory.productsAtRisk / inventory.totalProducts) * 100).toFixed(1)}% of total
              </ThemedText>
            </View>

            <View style={[styles.summaryCard, { borderLeftColor: Colors.light.warning }]}>
              <ThemedText style={styles.summaryLabel}>Avg Days to Stockout</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {inventory.summary.averageDaysToStockout.toFixed(0)}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>For at-risk items</ThemedText>
            </View>

            <View style={[styles.summaryCard, { borderLeftColor: Colors.light.success }]}>
              <ThemedText style={styles.summaryLabel}>Reorder Value</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {formatCurrency(inventory.summary.totalReorderValue)}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {inventory.summary.criticalItems} critical items
              </ThemedText>
            </View>
          </View>
        )}

        {/* Risk Filter */}
        <View style={styles.filterContainer}>
          <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
            Filter by Risk
          </ThemedText>
          <View style={styles.filterButtons}>
            {[
              { key: 'all' as RiskFilter, label: 'All', count: inventory?.totalProducts || 0 },
              { key: 'high' as RiskFilter, label: 'High Risk', count: inventory?.highRisk?.length || 0 },
              { key: 'medium' as RiskFilter, label: 'Medium', count: inventory?.mediumRisk?.length || 0 },
              { key: 'safe' as RiskFilter, label: 'Safe', count: inventory?.safeStock?.length || 0 },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  riskFilter === filter.key && styles.activeFilterButton,
                ]}
                onPress={() => setRiskFilter(filter.key)}
              >
                <ThemedText
                  style={[
                    styles.filterButtonText,
                    riskFilter === filter.key && styles.activeFilterButtonText,
                  ]}
                >
                  {filter.label}
                </ThemedText>
                <View style={[
                  styles.filterBadge,
                  riskFilter === filter.key && styles.activeFilterBadge,
                ]}>
                  <ThemedText style={[
                    styles.filterBadgeText,
                    riskFilter === filter.key && styles.activeFilterBadgeText,
                  ]}>
                    {filter.count}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Urgent Actions */}
        {inventory?.recommendations && (inventory.recommendations.urgentReorders.length > 0 || inventory.recommendations.optimizeStockLevels.length > 0) && (
          <View style={styles.urgentSection}>
            <View style={styles.urgentHeader}>
              <Ionicons name="alert-circle" size={24} color={Colors.light.error} />
              <ThemedText type="subtitle" style={styles.urgentTitle}>
                Urgent Actions Required
              </ThemedText>
            </View>

            {inventory.recommendations.urgentReorders.length > 0 && (
              <View style={styles.urgentCard}>
                <ThemedText type="defaultSemiBold" style={styles.urgentCardTitle}>
                  Immediate Reorders ({inventory.recommendations.urgentReorders.length})
                </ThemedText>
                <ThemedText style={styles.urgentCardText}>
                  These products need immediate attention to avoid stockouts
                </ThemedText>
              </View>
            )}

            {inventory.recommendations.optimizeStockLevels.length > 0 && (
              <View style={styles.urgentCard}>
                <ThemedText type="defaultSemiBold" style={styles.urgentCardTitle}>
                  Optimize Stock Levels ({inventory.recommendations.optimizeStockLevels.length})
                </ThemedText>
                <ThemedText style={styles.urgentCardText}>
                  Review these products to optimize inventory management
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Product List */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Product Predictions ({filteredProducts.length})
          </ThemedText>
          <View style={styles.productList}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color={Colors.light.textMuted} />
                <ThemedText style={styles.emptyText}>No products in this category</ThemedText>
              </View>
            )}
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: Colors.light.text,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  summaryContainer: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  summarySubtext: {
    color: Colors.light.textMuted,
    fontSize: 12,
  },
  filterContainer: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  filterLabel: {
    color: Colors.light.text,
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFilterButtonText: {
    color: 'white',
  },
  filterBadge: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  activeFilterBadgeText: {
    color: 'white',
  },
  urgentSection: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.error,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  urgentTitle: {
    color: Colors.light.error,
  },
  urgentCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  urgentCardTitle: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  urgentCardText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: Colors.light.text,
    marginBottom: 16,
  },
  productList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  productSku: {
    color: Colors.light.textMuted,
    fontSize: 12,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    color: Colors.light.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: Colors.light.text,
    fontSize: 16,
  },
  stockoutWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
  },
  stockoutText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationContainer: {
    gap: 6,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recommendationText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  confidenceBar: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
  },
  confidenceBarFill: {
    position: 'absolute',
    width: '100%',
    height: 6,
    backgroundColor: Colors.light.background,
    borderRadius: 3,
  },
  confidenceBarProgress: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    color: Colors.light.textMuted,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
  },
  errorText: {
    marginTop: 12,
    color: Colors.light.error,
  },
});
