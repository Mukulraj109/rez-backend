/**
 * Product Performance Analytics Screen
 * Top performers, profitability analysis, and product rankings
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { analyticsService } from '@/services/api/analytics';
import { useHasPermission } from '@/hooks/usePermissions';
import { ProductPerformance } from '@/types/analytics';

type PerformanceFilter = 'all' | 'top' | 'middle' | 'under';

export default function ProductPerformanceScreen() {
  const [filter, setFilter] = useState<PerformanceFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const canViewAnalytics = useHasPermission('analytics:view');
  const canViewProducts = useHasPermission('products:view');

  const {
    data: performance,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['product-performance'],
    queryFn: () => analyticsService.getProductPerformance(),
    enabled: canViewAnalytics && canViewProducts,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getHealthColor = (health: string) => {
    return analyticsService.getHealthStatusColor(health as any);
  };

  const getRankingColor = (ranking: string) => {
    switch (ranking) {
      case 'top_tier': return Colors.light.success;
      case 'mid_tier': return Colors.light.warning;
      default: return Colors.light.error;
    }
  };

  const getFilteredProducts = () => {
    if (!performance) return [];

    switch (filter) {
      case 'top': return performance.byPerformance.topPerformers;
      case 'middle': return performance.byPerformance.middlePerformers;
      case 'under': return performance.byPerformance.underperformers;
      default:
        return [
          ...performance.byPerformance.topPerformers,
          ...performance.byPerformance.middlePerformers,
          ...performance.byPerformance.underperformers,
        ];
    }
  };

  const ProductCard = ({ product, rank }: { product: ProductPerformance; rank: number }) => (
    <View style={[styles.productCard, { borderLeftColor: getHealthColor(product.performance.health) }]}>
      <View style={styles.productHeader}>
        <View style={styles.productRank}>
          <ThemedText type="defaultSemiBold" style={styles.rankText}>
            #{rank}
          </ThemedText>
        </View>
        <View style={styles.productInfo}>
          <ThemedText type="defaultSemiBold" style={styles.productName}>
            {product.productName}
          </ThemedText>
          <ThemedText style={styles.productMeta}>
            {product.category} • SKU: {product.sku}
          </ThemedText>
        </View>
        <View style={[styles.healthBadge, { backgroundColor: getHealthColor(product.performance.health) }]}>
          <ThemedText style={styles.healthBadgeText}>
            {product.performance.health.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.productMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Ionicons name="trending-up" size={16} color={Colors.light.success} />
            <View style={styles.metricContent}>
              <ThemedText style={styles.metricLabel}>Revenue</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricValue}>
                {formatCurrency(product.sales.revenue)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metric}>
            <Ionicons name="cart" size={16} color={Colors.light.info} />
            <View style={styles.metricContent}>
              <ThemedText style={styles.metricLabel}>Quantity</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricValue}>
                {product.sales.quantity}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Ionicons name="cube" size={16} color={Colors.light.warning} />
            <View style={styles.metricContent}>
              <ThemedText style={styles.metricLabel}>Stock</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricValue}>
                {product.inventory.currentStock}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metric}>
            <Ionicons name="star" size={16} color={Colors.light.secondary} />
            <View style={styles.metricContent}>
              <ThemedText style={styles.metricLabel}>Rating</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricValue}>
                {product.customer.avgRating.toFixed(1)} ({product.customer.reviewCount})
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.profitabilitySection}>
          <View style={styles.profitRow}>
            <ThemedText style={styles.profitLabel}>Margin:</ThemedText>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.profitValue, { color: Colors.light.success }]}
            >
              {formatPercentage(product.profitability.marginPercentage)}
            </ThemedText>
          </View>
          <View style={styles.profitRow}>
            <ThemedText style={styles.profitLabel}>Net Profit:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.profitValue}>
              {formatCurrency(product.profitability.netProfit)}
            </ThemedText>
          </View>
          <View style={styles.profitRow}>
            <ThemedText style={styles.profitLabel}>Turnover:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.profitValue}>
              {product.inventory.stockTurnovers.toFixed(1)}x
            </ThemedText>
          </View>
        </View>

        {product.sales.trend !== 0 && (
          <View style={styles.trendIndicator}>
            <Ionicons
              name={product.sales.trend > 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={product.sales.trend > 0 ? Colors.light.success : Colors.light.error}
            />
            <ThemedText
              style={[
                styles.trendText,
                { color: product.sales.trend > 0 ? Colors.light.success : Colors.light.error }
              ]}
            >
              {formatPercentage(Math.abs(product.sales.trend))} {product.sales.trend > 0 ? 'increase' : 'decrease'}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );

  if (!canViewAnalytics || !canViewProducts) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading && !performance) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Analyzing products...</ThemedText>
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
              Product Performance
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Rankings & profitability analysis
            </ThemedText>
          </View>
        </View>

        {/* Summary Cards */}
        {performance?.summary && (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Total Products</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {performance.totalProducts}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {performance.analyzedProducts} analyzed
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Total Revenue</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {formatCurrency(performance.summary.totalRevenue)}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {performance.summary.totalSalesQty} units sold
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Avg Product Revenue</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {formatCurrency(performance.summary.avgProductRevenue)}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {formatPercentage(performance.summary.avgMargin)} avg margin
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Top Category</ThemedText>
              <ThemedText type="title" style={[styles.summaryValue, { fontSize: 20 }]}>
                {performance.summary.topCategory}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                Best performing
              </ThemedText>
            </View>
          </View>
        )}

        {/* Category Performance */}
        {performance?.byCategory && performance.byCategory.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Performance by Category
            </ThemedText>
            <View style={styles.categoryList}>
              {performance.byCategory.map((category, index) => (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.categoryName}>
                        {category.category}
                      </ThemedText>
                      <ThemedText style={styles.categoryMeta}>
                        {category.productCount} products • {category.totalSales} sales
                      </ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.categoryRevenue}>
                      {formatCurrency(category.totalRevenue)}
                    </ThemedText>
                  </View>

                  {category.topProduct && (
                    <View style={styles.topProductBanner}>
                      <Ionicons name="trophy" size={14} color={Colors.light.warning} />
                      <ThemedText style={styles.topProductText}>
                        Top: {category.topProduct.productName} ({formatCurrency(category.topProduct.sales.revenue)})
                      </ThemedText>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Performance Filter */}
        <View style={styles.filterContainer}>
          <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
            Filter by Performance
          </ThemedText>
          <View style={styles.filterButtons}>
            {[
              { key: 'all' as PerformanceFilter, label: 'All Products', icon: 'apps' },
              { key: 'top' as PerformanceFilter, label: 'Top Performers', icon: 'trending-up' },
              { key: 'middle' as PerformanceFilter, label: 'Middle', icon: 'remove' },
              { key: 'under' as PerformanceFilter, label: 'Underperformers', icon: 'trending-down' },
            ].map((filterOption) => (
              <TouchableOpacity
                key={filterOption.key}
                style={[
                  styles.filterButton,
                  filter === filterOption.key && styles.activeFilterButton,
                ]}
                onPress={() => setFilter(filterOption.key)}
              >
                <Ionicons
                  name={filterOption.icon as any}
                  size={16}
                  color={filter === filterOption.key ? 'white' : Colors.light.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.filterButtonText,
                    filter === filterOption.key && styles.activeFilterButtonText,
                  ]}
                >
                  {filterOption.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product List */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Product Rankings ({filteredProducts.length})
          </ThemedText>
          <View style={styles.productList}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <ProductCard key={product.productId} product={product} rank={product.performance.rank} />
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  summaryLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  summarySubtext: {
    color: Colors.light.textMuted,
    fontSize: 11,
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
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  categoryMeta: {
    color: Colors.light.textMuted,
    fontSize: 11,
  },
  categoryRevenue: {
    color: Colors.light.text,
    fontSize: 16,
  },
  topProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
  },
  topProductText: {
    flex: 1,
    fontSize: 11,
    color: Colors.light.textSecondary,
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
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFilterButtonText: {
    color: 'white',
  },
  productList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: 'white',
    fontSize: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  productMeta: {
    color: Colors.light.textMuted,
    fontSize: 11,
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthBadgeText: {
    color: 'white',
    fontSize: 9,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.background,
    padding: 8,
    borderRadius: 6,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    color: Colors.light.text,
  },
  profitabilitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
  },
  profitRow: {
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 12,
    color: Colors.light.text,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
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
