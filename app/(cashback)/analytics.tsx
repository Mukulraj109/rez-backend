import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { CashbackAnalytics } from '@/shared/types';

const { width } = Dimensions.get('window');

export default function CashbackAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<CashbackAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range based on selection
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedTimeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Use the proper cashback service instead of direct fetch
      const { cashbackService } = await import('@/services/api/cashback');
      const analyticsData = await cashbackService.getAnalytics(startDate.toISOString(), endDate.toISOString());
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const timeRangeOptions = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
    { key: '1y', label: '1Y' },
  ] as const;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Loading analytics...</ThemedText>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>No analytics data available</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Cashback Analytics
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Performance insights and trends
          </ThemedText>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === option.key && styles.activeTimeRange
              ]}
              onPress={() => setSelectedTimeRange(option.key)}
            >
              <ThemedText
                style={[
                  styles.timeRangeText,
                  selectedTimeRange === option.key && styles.activeTimeRangeText
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Key Metrics</ThemedText>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="cash" size={24} color={Colors.light.success} />
              </View>
              <ThemedText style={styles.metricValue}>
                {formatCurrency(analytics.totalPaid)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Total Paid</ThemedText>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="time" size={24} color={Colors.light.warning} />
              </View>
              <ThemedText style={styles.metricValue}>
                {formatCurrency(analytics.totalPending)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Total Pending</ThemedText>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.light.primary} />
              </View>
              <ThemedText style={styles.metricValue}>
                {formatPercentage(analytics.approvalRate)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Approval Rate</ThemedText>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.light.error} />
              </View>
              <ThemedText style={styles.metricValue}>
                {formatPercentage(analytics.fraudDetectionRate)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Fraud Detection</ThemedText>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Performance</ThemedText>
          <View style={styles.performanceContainer}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="speedometer" size={20} color={Colors.light.primary} />
                <ThemedText style={styles.performanceTitle}>Approval Time</ThemedText>
              </View>
              <ThemedText style={styles.performanceValue}>
                {analytics.averageApprovalTime.toFixed(1)} hours
              </ThemedText>
              <ThemedText style={styles.performanceSubtext}>
                Average time to review requests
              </ThemedText>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="people" size={20} color={Colors.light.success} />
                <ThemedText style={styles.performanceTitle}>Customer Impact</ThemedText>
              </View>
              <ThemedText style={styles.performanceValue}>
                +{formatPercentage(analytics.customerRetentionImpact)}
              </ThemedText>
              <ThemedText style={styles.performanceSubtext}>
                Estimated retention improvement
              </ThemedText>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="trending-up" size={20} color={Colors.light.warning} />
                <ThemedText style={styles.performanceTitle}>Revenue Impact</ThemedText>
              </View>
              <ThemedText style={styles.performanceValue}>
                {formatCurrency(analytics.revenueImpact)}
              </ThemedText>
              <ThemedText style={styles.performanceSubtext}>
                Estimated additional revenue
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Top Categories */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Top Categories</ThemedText>
          <View style={styles.categoriesContainer}>
            {analytics.topCategories.map((category, index) => (
              <View key={category.categoryId} style={styles.categoryItem}>
                <View style={styles.categoryRank}>
                  <ThemedText style={styles.rankNumber}>{index + 1}</ThemedText>
                </View>
                <View style={styles.categoryInfo}>
                  <ThemedText style={styles.categoryName}>{category.categoryName}</ThemedText>
                  <ThemedText style={styles.categoryOrders}>
                    {category.orderCount} orders
                  </ThemedText>
                </View>
                <View style={styles.categoryAmount}>
                  <ThemedText style={styles.categoryValue}>
                    {formatCurrency(category.cashbackPaid)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Trends Chart */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Monthly Trends</ThemedText>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.success }]} />
                  <ThemedText style={styles.legendText}>Cashback Paid</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.primary }]} />
                  <ThemedText style={styles.legendText}>Orders</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.error }]} />
                  <ThemedText style={styles.legendText}>Fraud Attempts</ThemedText>
                </View>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartData}>
                {analytics.monthlyTrends.map((trend, index) => {
                  const maxPaid = Math.max(...analytics.monthlyTrends.map(t => t.cashbackPaid));
                  const maxOrders = Math.max(...analytics.monthlyTrends.map(t => t.ordersWithCashback));
                  const maxFraud = Math.max(...analytics.monthlyTrends.map(t => t.fraudAttempts));
                  
                  const paidHeight = maxPaid > 0 ? (trend.cashbackPaid / maxPaid) * 100 : 0;
                  const ordersHeight = maxOrders > 0 ? (trend.ordersWithCashback / maxOrders) * 100 : 0;
                  const fraudHeight = maxFraud > 0 ? (trend.fraudAttempts / maxFraud) * 50 : 0; // Scaled down
                  
                  return (
                    <View key={index} style={styles.chartMonth}>
                      <View style={styles.chartBars}>
                        <View
                          style={[
                            styles.chartBar,
                            styles.paidBar,
                            { height: Math.max(paidHeight, 2) }
                          ]}
                        />
                        <View
                          style={[
                            styles.chartBar,
                            styles.ordersBar,
                            { height: Math.max(ordersHeight, 2) }
                          ]}
                        />
                        <View
                          style={[
                            styles.chartBar,
                            styles.fraudBar,
                            { height: Math.max(fraudHeight, 2) }
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.chartLabel}>{trend.month}</ThemedText>
                      <View style={styles.chartValues}>
                        <ThemedText style={styles.chartValue}>
                          {formatCurrency(trend.cashbackPaid)}
                        </ThemedText>
                        <ThemedText style={styles.chartSubValue}>
                          {trend.ordersWithCashback} orders
                        </ThemedText>
                        {trend.fraudAttempts > 0 && (
                          <ThemedText style={[styles.chartSubValue, { color: Colors.light.error }]}>
                            {trend.fraudAttempts} fraud
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTimeRange: {
    backgroundColor: Colors.light.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  activeTimeRangeText: {
    color: Colors.light.background,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 48) / 2,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  performanceContainer: {
    gap: 16,
  },
  performanceCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  categoriesContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryRank: {
    width: 32,
    height: 32,
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  categoryOrders: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  chartContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  chartData: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 20,
  },
  chartMonth: {
    alignItems: 'center',
    minWidth: 80,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
    gap: 2,
  },
  chartBar: {
    width: 8,
    borderRadius: 2,
    minHeight: 2,
  },
  paidBar: {
    backgroundColor: Colors.light.success,
  },
  ordersBar: {
    backgroundColor: Colors.light.primary,
  },
  fraudBar: {
    backgroundColor: Colors.light.error,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  chartValues: {
    alignItems: 'center',
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chartSubValue: {
    fontSize: 8,
    color: Colors.light.textSecondary,
  },
});