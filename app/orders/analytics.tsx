import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ordersService } from '@/services';
import { OrderAnalytics, OrderStatus } from '@/types/api';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  growth?: string;
  subtitle?: string;
}

const MetricCard = ({ title, value, icon, color, growth, subtitle }: MetricCardProps) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricHeader}>
      <Ionicons name={icon as any} size={24} color={color} />
      <ThemedText style={styles.metricTitle}>{title}</ThemedText>
    </View>
    <ThemedText style={styles.metricValue}>
      {typeof value === 'number' && title.includes('Revenue') 
        ? `₹${value.toLocaleString()}` 
        : value.toLocaleString()}
    </ThemedText>
    {growth && (
      <ThemedText style={[styles.metricGrowth, { 
        color: growth.startsWith('+') ? '#4CAF50' : 
               growth.startsWith('-') ? '#F44336' : color 
      }]}>
        {growth}
      </ThemedText>
    )}
    {subtitle && (
      <ThemedText style={styles.metricSubtitle}>{subtitle}</ThemedText>
    )}
  </View>
);

interface StatusBreakdownCardProps {
  title: string;
  statusData: Record<string, number>;
  statusColors: Record<string, string>;
}

const StatusBreakdownCard = ({ title, statusData, statusColors }: StatusBreakdownCardProps) => {
  const total = Object.values(statusData).reduce((sum, value) => sum + value, 0);
  
  return (
    <View style={styles.breakdownCard}>
      <ThemedText style={styles.breakdownTitle}>{title}</ThemedText>
      <View style={styles.breakdownContainer}>
        {Object.entries(statusData).map(([status, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <View key={status} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <View style={styles.breakdownLabelRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: statusColors[status] || '#BDBDBD' }]} />
                  <ThemedText style={styles.breakdownLabel}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </ThemedText>
                </View>
                <ThemedText style={styles.breakdownValue}>{count}</ThemedText>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: statusColors[status] || '#BDBDBD' 
                    }
                  ]} 
                />
              </View>
              <ThemedText style={styles.breakdownPercentage}>{percentage.toFixed(1)}%</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface TopProductsCardProps {
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

const TopProductsCard = ({ products }: TopProductsCardProps) => (
  <View style={styles.topProductsCard}>
    <ThemedText style={styles.topProductsTitle}>Top Selling Products</ThemedText>
    <View style={styles.topProductsList}>
      {products.slice(0, 5).map((product, index) => (
        <View key={product.productId} style={styles.productItem}>
          <View style={styles.productRank}>
            <ThemedText style={styles.productRankText}>{index + 1}</ThemedText>
          </View>
          <View style={styles.productInfo}>
            <ThemedText style={styles.productName}>{product.productName}</ThemedText>
            <ThemedText style={styles.productStats}>
              {product.quantity} sold • ₹${product.revenue.toFixed(2)} revenue
            </ThemedText>
          </View>
          <ThemedText style={styles.productRevenue}>
            ₹${product.revenue.toFixed(2)}
          </ThemedText>
        </View>
      ))}
    </View>
  </View>
);

const statusColors: Record<OrderStatus, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#FF5722',
  ready: '#4CAF50',
  out_for_delivery: '#9C27B0',
  delivered: '#4CAF50',
  cancelled: '#F44336',
  refunded: '#607D8B'
};

export default function OrderAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const fetchAnalytics = useCallback(async () => {
    try {
      console.log('🔄 Fetching order analytics...');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const analyticsData = await ordersService.getAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      console.log('✅ Analytics received:', analyticsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading analytics...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Order Analytics
            </ThemedText>
          </View>
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeContainer}>
          <ThemedText style={styles.dateRangeLabel}>Time Period</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRangeScroll}>
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.dateRangeButton,
                  dateRange === range && styles.activeDateRangeButton
                ]}
                onPress={() => setDateRange(range)}
              >
                <ThemedText style={[
                  styles.dateRangeButtonText,
                  dateRange === range && styles.activeDateRangeButtonText
                ]}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {analytics && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Key Metrics
              </ThemedText>
              <View style={styles.metricsGrid}>
                <MetricCard
                  title="Total Orders"
                  value={analytics.totalOrders}
                  icon="receipt"
                  color="#2196F3"
                  growth={analytics.orderGrowth ? `${analytics.orderGrowth > 0 ? '+' : ''}${analytics.orderGrowth.toFixed(1)}%` : undefined}
                />
                <MetricCard
                  title="Total Revenue"
                  value={analytics.totalRevenue}
                  icon="trending-up"
                  color="#4CAF50"
                  growth={analytics.revenueGrowth ? `${analytics.revenueGrowth > 0 ? '+' : ''}${analytics.revenueGrowth.toFixed(1)}%` : undefined}
                />
                <MetricCard
                  title="Average Order Value"
                  value={analytics.averageOrderValue}
                  icon="calculator"
                  color="#FF9800"
                  subtitle="Per order average"
                />
              </View>
            </View>

            {/* Order Status Breakdown */}
            <View style={styles.breakdownSection}>
              <StatusBreakdownCard
                title="Order Status Distribution"
                statusData={analytics.statusBreakdown}
                statusColors={statusColors}
              />
            </View>

            {/* Top Products */}
            {analytics.topProducts && analytics.topProducts.length > 0 && (
              <View style={styles.topProductsSection}>
                <TopProductsCard products={analytics.topProducts} />
              </View>
            )}

            {/* Summary Insights */}
            <View style={styles.insightsSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Insights
              </ThemedText>
              <View style={styles.insightsCard}>
                <View style={styles.insightItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <ThemedText style={styles.insightText}>
                    {analytics.statusBreakdown.delivered} orders successfully delivered
                  </ThemedText>
                </View>
                <View style={styles.insightItem}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                  <ThemedText style={styles.insightText}>
                    {analytics.statusBreakdown.pending} orders waiting for confirmation
                  </ThemedText>
                </View>
                <View style={styles.insightItem}>
                  <Ionicons name="trending-up" size={20} color="#2196F3" />
                  <ThemedText style={styles.insightText}>
                    Average order value: ₹${analytics.averageOrderValue.toFixed(2)}
                  </ThemedText>
                </View>
                {analytics.statusBreakdown.cancelled > 0 && (
                  <View style={styles.insightItem}>
                    <Ionicons name="warning" size={20} color="#F44336" />
                    <ThemedText style={styles.insightText}>
                      {analytics.statusBreakdown.cancelled} orders were cancelled - review reasons
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {!analytics && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#BDBDBD" />
            <ThemedText style={styles.emptyStateTitle}>No Analytics Data</ThemedText>
            <ThemedText style={styles.emptyStateSubtitle}>
              There's no order data available for the selected time period.
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: Colors.light.text,
  },
  dateRangeContainer: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  dateRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  dateRangeScroll: {
    flexDirection: 'row',
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  activeDateRangeButton: {
    backgroundColor: '#2196F3',
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeDateRangeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.light.text,
    marginBottom: 16,
  },
  metricsSection: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
  },
  metricsGrid: {
    gap: 16,
  },
  metricCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metricGrowth: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricSubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  breakdownSection: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
  },
  breakdownCard: {
    gap: 16,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownItem: {
    gap: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
  topProductsSection: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
  },
  topProductsCard: {
    gap: 16,
  },
  topProductsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  topProductsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  productStats: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  insightsSection: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
  },
  insightsCard: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});