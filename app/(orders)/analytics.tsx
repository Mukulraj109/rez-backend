import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { OrderAnalytics } from '../../shared/types';
import { ordersService } from '@/services/api/orders';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  urgent?: boolean;
}

const MetricCard = ({ title, value, icon, color, urgent }: MetricCardProps) => (
  <View style={[styles.metricCard, urgent && styles.urgentMetric]}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </View>
      {urgent && (
        <View style={styles.urgentBadge}>
          <Ionicons name="warning" size={12} color="#F44336" />
        </View>
      )}
    </View>
    <ThemedText style={styles.metricValue}>{value}</ThemedText>
    <ThemedText style={styles.metricTitle}>{title}</ThemedText>
  </View>
);

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>;
  height: number;
  color: string;
}

const SimpleBarChart = ({ data, height, color }: SimpleBarChartProps) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartBars}>
        {data.map((item, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: maxValue > 0 ? (item.value / maxValue) * (height - 60) : 0,
                    backgroundColor: color
                  }
                ]}
              />
              <ThemedText style={styles.barValue}>
                {item.value}
              </ThemedText>
            </View>
            <ThemedText style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function OrderAnalyticsScreen() {
  const { state } = useAuth();
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const fetchAnalytics = async () => {
    try {
      let dateStart: string | undefined;
      let dateEnd: string | undefined;

      const now = new Date();
      const endDate = new Date(now);

      switch (timeRange) {
        case 'today':
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          dateStart = startOfDay.toISOString();
          dateEnd = endDate.toISOString();
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - 7);
          dateStart = startOfWeek.toISOString();
          dateEnd = endDate.toISOString();
          break;
        case 'month':
          const startOfMonth = new Date(now);
          startOfMonth.setDate(now.getDate() - 30);
          dateStart = startOfMonth.toISOString();
          dateEnd = endDate.toISOString();
          break;
      }

      const params = new URLSearchParams();
      if (dateStart) params.append('dateStart', dateStart);
      if (dateEnd) params.append('dateEnd', dateEnd);

      // Use the proper order service instead of direct fetch
      const analyticsData = await ordersService.getAnalytics(dateStart, dateEnd);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading analytics...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Order Analytics
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['today', 'week', 'month'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.activeTimeRangeButton]}
              onPress={() => setTimeRange(range)}
            >
              <ThemedText style={[
                styles.timeRangeButtonText,
                timeRange === range && styles.activeTimeRangeButtonText
              ]}>
                {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Metrics Overview */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Orders"
            value={analytics?.totalOrders.toString() || '0'}
            icon="receipt"
            color="#2196F3"
          />
          <MetricCard
            title="Pending Orders"
            value={analytics?.pendingOrders.toString() || '0'}
            icon="time"
            color="#FF9800"
            urgent={analytics ? analytics.pendingOrders > 10 : false}
          />
          <MetricCard
            title="Avg Processing Time"
            value={`${Math.round(analytics?.averageProcessingTime || 0)}m`}
            icon="timer"
            color="#4CAF50"
          />
          <MetricCard
            title="Completion Rate"
            value={`${analytics?.orderCompletionRate.toFixed(1) || 0}%`}
            icon="checkmark-circle"
            color="#9C27B0"
          />
        </View>

        <View style={styles.avgOrderValueCard}>
          <ThemedText style={styles.avgOrderTitle}>Average Order Value</ThemedText>
          <ThemedText style={styles.avgOrderValue}>
            ${analytics?.averageOrderValue.toFixed(2) || '0.00'}
          </ThemedText>
        </View>
      </View>

      {/* Order Volume by Hour */}
      {analytics && analytics.hourlyOrderDistribution.some(d => d.orderCount > 0) && (
        <View style={styles.chartCard}>
          <ThemedText style={styles.chartTitle}>Order Volume by Hour</ThemedText>
          <SimpleBarChart
            data={analytics.hourlyOrderDistribution.map(d => ({
              label: `${d.hour}:00`,
              value: d.orderCount
            }))}
            height={200}
            color="#2196F3"
          />
          <ThemedText style={styles.chartSubtitle}>
            Peak hours help optimize staffing and preparation times
          </ThemedText>
        </View>
      )}

      {/* Daily Order Trends */}
      {analytics && analytics.dailyOrderTrends.some(d => d.orderCount > 0) && (
        <View style={styles.chartCard}>
          <ThemedText style={styles.chartTitle}>Daily Order Trends</ThemedText>
          <SimpleBarChart
            data={analytics.dailyOrderTrends.slice(-14).map(d => ({
              label: new Date(d.date).getDate().toString(),
              value: d.orderCount
            }))}
            height={200}
            color="#4CAF50"
          />
          <ThemedText style={styles.chartSubtitle}>
            Last 14 days order volume
          </ThemedText>
        </View>
      )}

      {/* Top Selling Products */}
      {analytics && analytics.topSellingProducts.length > 0 && (
        <View style={styles.chartCard}>
          <ThemedText style={styles.chartTitle}>Top Selling Products</ThemedText>
          {analytics.topSellingProducts.slice(0, 5).map((product, index) => (
            <View key={product.productId} style={styles.productRow}>
              <View style={styles.productRank}>
                <ThemedText style={styles.productRankText}>#{index + 1}</ThemedText>
              </View>
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={1}>
                  {product.productName}
                </ThemedText>
                <ThemedText style={styles.productSales}>
                  {product.quantitySold} sold • ₹${product.revenue.toFixed(2)} revenue
                </ThemedText>
              </View>
              <View style={styles.productProgress}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(product.quantitySold / analytics.topSellingProducts[0].quantitySold) * 100}%`
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      <View style={styles.insightsCard}>
        <ThemedText style={styles.chartTitle}>Insights</ThemedText>

        {analytics && (
          <View style={styles.insightsList}>
            {analytics.pendingOrders > 10 && (
              <View style={styles.insightItem}>
                <Ionicons name="warning" size={20} color="#F44336" />
                <ThemedText style={styles.insightText}>
                  You have {analytics.pendingOrders} pending orders that need attention
                </ThemedText>
              </View>
            )}

            {analytics.averageProcessingTime > 60 && (
              <View style={styles.insightItem}>
                <Ionicons name="time" size={20} color="#FF9800" />
                <ThemedText style={styles.insightText}>
                  Average processing time is {Math.round(analytics.averageProcessingTime)} minutes.
                  Consider optimizing your workflow.
                </ThemedText>
              </View>
            )}

            {analytics.orderCompletionRate < 90 && (
              <View style={styles.insightItem}>
                <Ionicons name="trending-down" size={20} color="#F44336" />
                <ThemedText style={styles.insightText}>
                  Order completion rate is {analytics.orderCompletionRate.toFixed(1)}%.
                  Review cancelled orders to identify improvement areas.
                </ThemedText>
              </View>
            )}

            {analytics.totalOrders > 0 && analytics.pendingOrders === 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <ThemedText style={styles.insightText}>
                  Great job! No pending orders. Your efficiency is excellent.
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.light.text,
  },
  headerRight: {
    width: 40,
  },
  timeRangeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  activeTimeRangeButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeTimeRangeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  metricsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urgentMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  avgOrderValueCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avgOrderTitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  avgOrderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
  },
  chartCard: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  chartContainer: {
    marginHorizontal: -8,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '80%',
    borderRadius: 2,
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  productSales: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  productProgress: {
    width: 60,
    height: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  insightsCard: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
});