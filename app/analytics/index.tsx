/**
 * Analytics Dashboard Overview Screen
 * Main analytics screen with quick stats, date range selector, and navigation to detailed analytics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
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
import { DateRangePreset } from '@/types/analytics';

const { width } = Dimensions.get('window');

export default function AnalyticsOverviewScreen() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Permission check
  const canViewAnalytics = useHasPermission('analytics:view');
  const canViewRevenue = useHasPermission('analytics:view_revenue');

  // Fetch analytics overview
  const {
    data: overview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: () => analyticsService.getAnalyticsOverview({
      preset: dateRange,
      startDate: '',
      endDate: '',
    }),
    enabled: canViewAnalytics,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch real-time metrics
  const {
    data: realTimeMetrics,
    refetch: refetchRealTime,
  } = useQuery({
    queryKey: ['real-time-metrics'],
    queryFn: () => analyticsService.getRealTimeMetrics(),
    enabled: canViewAnalytics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (!canViewAnalytics) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to view analytics.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [canViewAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchRealTime()]);
    setRefreshing(false);
  };

  const dateRangeOptions: { key: DateRangePreset; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return Colors.light.success;
    if (growth < 0) return Colors.light.error;
    return Colors.light.textSecondary;
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    change,
    onPress,
  }: {
    title: string;
    value: string;
    icon: string;
    color: string;
    change?: number;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <ThemedText type="caption" style={styles.statTitle}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change > 0 ? 'trending-up' : change < 0 ? 'trending-down' : 'remove'}
            size={16}
            color={getGrowthColor(change)}
          />
          <ThemedText style={[styles.statChange, { color: getGrowthColor(change) }]}>
            {formatPercentage(change)}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  const AnalyticsNavCard = ({
    title,
    description,
    icon,
    color,
    onPress,
  }: {
    title: string;
    description: string;
    icon: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.navCard} onPress={onPress}>
      <View style={[styles.navIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={28} color="white" />
      </View>
      <View style={styles.navContent}>
        <ThemedText type="defaultSemiBold" style={styles.navTitle}>
          {title}
        </ThemedText>
        <ThemedText style={styles.navDescription}>{description}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
    </TouchableOpacity>
  );

  const AlertCard = ({
    severity,
    title,
    description,
  }: {
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
  }) => {
    const severityColors = {
      low: Colors.light.info,
      medium: Colors.light.warning,
      high: Colors.light.error,
    };

    return (
      <View style={[styles.alertCard, { borderLeftColor: severityColors[severity] }]}>
        <View style={styles.alertHeader}>
          <Ionicons
            name={severity === 'high' ? 'alert-circle' : severity === 'medium' ? 'warning' : 'information-circle'}
            size={20}
            color={severityColors[severity]}
          />
          <ThemedText type="defaultSemiBold" style={styles.alertTitle}>
            {title}
          </ThemedText>
        </View>
        <ThemedText style={styles.alertDescription}>{description}</ThemedText>
      </View>
    );
  };

  if (!canViewAnalytics) {
    return null;
  }

  if (isLoading && !overview) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading analytics...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle" size={48} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Failed to load analytics</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

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
          <View>
            <ThemedText type="title" style={styles.title}>
              Analytics Dashboard
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Last updated: {realTimeMetrics ? new Date(realTimeMetrics.lastUpdated).toLocaleTimeString() : 'N/A'}
            </ThemedText>
          </View>

          {/* Real-time status */}
          {realTimeMetrics && (
            <View style={styles.realtimeStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: realTimeMetrics.systemHealth === 'healthy' ? Colors.light.success : Colors.light.warning }
              ]} />
              <ThemedText style={styles.statusText}>
                {realTimeMetrics.systemHealth === 'healthy' ? 'Live' : 'Limited'}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeContainer}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Time Period
          </ThemedText>
          <View style={styles.dateRangeButtons}>
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dateRangeButton,
                  dateRange === option.key && styles.activeDateRangeButton,
                ]}
                onPress={() => setDateRange(option.key)}
              >
                <ThemedText
                  style={[
                    styles.dateRangeButtonText,
                    dateRange === option.key && styles.activeDateRangeButtonText,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Key Metrics
          </ThemedText>
          <View style={styles.statsGrid}>
            {canViewRevenue && (
              <>
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(overview?.sales?.totalRevenue || 0)}
                  icon="cash"
                  color={Colors.light.success}
                  change={overview?.sales?.revenueGrowth}
                />
                <StatCard
                  title="Avg Order Value"
                  value={formatCurrency(overview?.sales?.avgOrderValue || 0)}
                  icon="calculator"
                  color={Colors.light.primary}
                />
              </>
            )}
            <StatCard
              title="Total Orders"
              value={formatNumber(overview?.sales?.totalOrders || 0)}
              icon="receipt"
              color={Colors.light.info}
            />
            <StatCard
              title="Total Customers"
              value={formatNumber(overview?.customers?.totalCustomers || 0)}
              icon="people"
              color={Colors.light.secondary}
            />
            <StatCard
              title="Active Customers"
              value={formatNumber(overview?.customers?.activeCustomers || 0)}
              icon="person-add"
              color={Colors.light.tertiary}
            />
            <StatCard
              title="Retention Rate"
              value={`${(overview?.customers?.retentionRate || 0).toFixed(1)}%`}
              icon="repeat"
              color={Colors.light.warning}
            />
          </View>
        </View>

        {/* Health Score */}
        {overview?.health && (
          <View style={styles.healthSection}>
            <View style={styles.healthHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Business Health Score
              </ThemedText>
              <View style={styles.healthScoreContainer}>
                <ThemedText type="title" style={[
                  styles.healthScore,
                  { color: overview.health.overallScore >= 80 ? Colors.light.success :
                           overview.health.overallScore >= 60 ? Colors.light.warning :
                           Colors.light.error }
                ]}>
                  {overview.health.overallScore}
                </ThemedText>
                <ThemedText style={styles.healthScoreLabel}>/100</ThemedText>
              </View>
            </View>

            {overview.health.alerts && overview.health.alerts.length > 0 && (
              <View style={styles.alertsContainer}>
                <ThemedText type="defaultSemiBold" style={styles.alertsTitle}>
                  Alerts & Recommendations
                </ThemedText>
                {overview.health.alerts.slice(0, 3).map((alert, index) => (
                  <AlertCard
                    key={index}
                    severity={alert.severity}
                    title={alert.title}
                    description={alert.description}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Real-time Metrics */}
        {realTimeMetrics && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Real-time Activity
            </ThemedText>
            <View style={styles.realtimeGrid}>
              <View style={styles.realtimeCard}>
                <Ionicons name="people" size={24} color={Colors.light.info} />
                <ThemedText type="title" style={styles.realtimeValue}>
                  {realTimeMetrics.onlineCustomers}
                </ThemedText>
                <ThemedText style={styles.realtimeLabel}>Online Now</ThemedText>
              </View>
              <View style={styles.realtimeCard}>
                <Ionicons name="cart" size={24} color={Colors.light.warning} />
                <ThemedText type="title" style={styles.realtimeValue}>
                  {realTimeMetrics.ordersInProgress}
                </ThemedText>
                <ThemedText style={styles.realtimeLabel}>In Progress</ThemedText>
              </View>
              <View style={styles.realtimeCard}>
                <Ionicons name="time" size={24} color={Colors.light.secondary} />
                <ThemedText type="title" style={styles.realtimeValue}>
                  {realTimeMetrics.avgResponseTime}ms
                </ThemedText>
                <ThemedText style={styles.realtimeLabel}>Avg Response</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Detailed Analytics Navigation */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Detailed Analytics
          </ThemedText>
          <View style={styles.navCardsContainer}>
            <AnalyticsNavCard
              title="Sales Forecast"
              description="AI-powered sales predictions for 7-90 days"
              icon="trending-up"
              color={Colors.light.success}
              onPress={() => router.push('/analytics/sales-forecast')}
            />
            <AnalyticsNavCard
              title="Inventory Analytics"
              description="Stockout predictions & reorder recommendations"
              icon="cube"
              color={Colors.light.warning}
              onPress={() => router.push('/analytics/inventory')}
            />
            <AnalyticsNavCard
              title="Customer Insights"
              description="CLV, retention, churn analysis"
              icon="people"
              color={Colors.light.info}
              onPress={() => router.push('/analytics/customers')}
            />
            <AnalyticsNavCard
              title="Trend Analysis"
              description="Seasonal patterns & peak detection"
              icon="pulse"
              color={Colors.light.secondary}
              onPress={() => router.push('/analytics/trends')}
            />
            <AnalyticsNavCard
              title="Product Performance"
              description="Top performers & profitability analysis"
              icon="bar-chart"
              color={Colors.light.tertiary}
              onPress={() => router.push('/analytics/products')}
            />
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.background,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  dateRangeContainer: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  sectionLabel: {
    color: Colors.light.text,
    marginBottom: 12,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeDateRangeButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  dateRangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeDateRangeButtonText: {
    color: 'white',
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
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  healthSection: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthScore: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  healthScoreLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  alertsContainer: {
    gap: 8,
  },
  alertsTitle: {
    color: Colors.light.text,
    marginBottom: 8,
  },
  alertCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    color: Colors.light.text,
    fontSize: 14,
  },
  alertDescription: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginLeft: 28,
  },
  realtimeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  realtimeCard: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  realtimeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 8,
  },
  realtimeLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  navCardsContainer: {
    gap: 12,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  navDescription: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
  },
  errorText: {
    marginTop: 12,
    color: Colors.light.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
