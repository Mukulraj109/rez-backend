/**
 * Customer Insights Analytics Screen
 * Customer Lifetime Value, retention, churn analysis, and segmentation
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { analyticsService } from '@/services/api/analytics';
import { useHasPermission } from '@/hooks/usePermissions';

const { width } = Dimensions.get('window');

export default function CustomerInsightsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ltv' | 'retention' | 'churn' | 'segments'>('ltv');

  const canViewAnalytics = useHasPermission('analytics:view');

  // Fetch customer insights
  const {
    data: insights,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer-insights'],
    queryFn: () => analyticsService.getCustomerInsights(),
    enabled: canViewAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const tabs = [
    { key: 'ltv' as const, label: 'Lifetime Value', icon: 'cash' },
    { key: 'retention' as const, label: 'Retention', icon: 'repeat' },
    { key: 'churn' as const, label: 'Churn Risk', icon: 'warning' },
    { key: 'segments' as const, label: 'Segments', icon: 'people' },
  ];

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high_value': return Colors.light.success;
      case 'medium_value': return Colors.light.info;
      case 'low_value': return Colors.light.warning;
      case 'churned': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    return analyticsService.getRiskLevelColor(riskLevel as any);
  };

  const LTVContent = () => {
    if (!insights?.ltv) return null;

    return (
      <View style={styles.tabContent}>
        {/* Average LTV Card */}
        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <Ionicons name="trophy" size={32} color={Colors.light.warning} />
          </View>
          <View style={styles.highlightContent}>
            <ThemedText style={styles.highlightLabel}>Average Customer LTV</ThemedText>
            <ThemedText type="title" style={styles.highlightValue}>
              {formatCurrency(insights.ltv.averageLTV)}
            </ThemedText>
            <ThemedText style={styles.highlightSubtext}>
              {insights.ltv.highValueCount} high-value customers (≥ {formatCurrency(insights.ltv.highValueThreshold)})
            </ThemedText>
          </View>
        </View>

        {/* Top Customers */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Top Customers (90 Days)
          </ThemedText>
          <View style={styles.customerList}>
            {insights.ltv.ltv90Days.slice(0, 10).map((customer, index) => (
              <View key={customer.customerId} style={styles.customerCard}>
                <View style={styles.customerRank}>
                  <ThemedText type="defaultSemiBold" style={styles.rankNumber}>
                    #{index + 1}
                  </ThemedText>
                </View>
                <View style={styles.customerInfo}>
                  <View style={styles.customerHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.customerValue}>
                      {formatCurrency(customer.estimatedLTV)}
                    </ThemedText>
                    <View style={[styles.segmentBadge, { backgroundColor: getSegmentColor(customer.segment) }]}>
                      <ThemedText style={styles.segmentBadgeText}>
                        {customer.segment.replace('_', ' ').toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.customerMetrics}>
                    <View style={styles.customerMetric}>
                      <Ionicons name="cart" size={14} color={Colors.light.textSecondary} />
                      <ThemedText style={styles.customerMetricText}>
                        {customer.totalPurchases} orders
                      </ThemedText>
                    </View>
                    <View style={styles.customerMetric}>
                      <Ionicons name="cash" size={14} color={Colors.light.textSecondary} />
                      <ThemedText style={styles.customerMetricText}>
                        {formatCurrency(customer.totalSpent)} spent
                      </ThemedText>
                    </View>
                    <View style={styles.customerMetric}>
                      <Ionicons name="trending-up" size={14} color={Colors.light.textSecondary} />
                      <ThemedText style={styles.customerMetricText}>
                        {formatCurrency(customer.averageOrderValue)} AOV
                      </ThemedText>
                    </View>
                  </View>
                  {customer.nextPredictedPurchase && (
                    <ThemedText style={styles.predictionText}>
                      Next purchase predicted: {new Date(customer.nextPredictedPurchase).toLocaleDateString()}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const RetentionContent = () => {
    if (!insights?.retention) return null;

    return (
      <View style={styles.tabContent}>
        {/* Retention Overview */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="people" size={24} color={Colors.light.success} />
            <ThemedText type="title" style={styles.metricCardValue}>
              {formatPercentage(insights.retention.overallRetentionRate)}
            </ThemedText>
            <ThemedText style={styles.metricCardLabel}>Overall Retention</ThemedText>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="repeat" size={24} color={Colors.light.info} />
            <ThemedText type="title" style={styles.metricCardValue}>
              {formatPercentage(insights.retention.repeatCustomerRate)}
            </ThemedText>
            <ThemedText style={styles.metricCardLabel}>Repeat Customer Rate</ThemedText>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="arrow-forward" size={24} color={Colors.light.secondary} />
            <ThemedText type="title" style={styles.metricCardValue}>
              {insights.retention.repeatCustomerCount}
            </ThemedText>
            <ThemedText style={styles.metricCardLabel}>Repeat Customers</ThemedText>
          </View>
        </View>

        {/* Cohort Analysis */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Cohort Retention Analysis
          </ThemedText>
          {insights.retention.cohorts.map((cohort, index) => (
            <View key={index} style={styles.cohortCard}>
              <View style={styles.cohortHeader}>
                <ThemedText type="defaultSemiBold" style={styles.cohortDate}>
                  {new Date(cohort.cohortDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </ThemedText>
                <ThemedText style={styles.cohortSize}>
                  {cohort.cohortSize} customers
                </ThemedText>
              </View>

              <View style={styles.retentionBar}>
                <View
                  style={[
                    styles.retentionBarFill,
                    {
                      width: `${cohort.avgRetentionRate}%`,
                      backgroundColor: cohort.avgRetentionRate >= 70 ? Colors.light.success :
                                     cohort.avgRetentionRate >= 40 ? Colors.light.warning :
                                     Colors.light.error
                    }
                  ]}
                />
                <ThemedText style={styles.retentionBarText}>
                  {formatPercentage(cohort.avgRetentionRate)}
                </ThemedText>
              </View>

              {cohort.retention.length > 0 && (
                <View style={styles.retentionTimeline}>
                  {cohort.retention.slice(0, 6).map((point, idx) => (
                    <View key={idx} style={styles.timelinePoint}>
                      <ThemedText style={styles.timelineDay}>Day {point.day}</ThemedText>
                      <ThemedText style={styles.timelinePercentage}>
                        {formatPercentage(point.percentage)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const ChurnContent = () => {
    if (!insights?.churn) return null;

    return (
      <View style={styles.tabContent}>
        {/* Churn Overview */}
        <View style={styles.highlightCard}>
          <View style={[styles.highlightIcon, { backgroundColor: Colors.light.error }]}>
            <Ionicons name="alert" size={32} color="white" />
          </View>
          <View style={styles.highlightContent}>
            <ThemedText style={styles.highlightLabel}>Overall Churn Rate</ThemedText>
            <ThemedText type="title" style={[styles.highlightValue, { color: Colors.light.error }]}>
              {formatPercentage(insights.churn.churnRate)}
            </ThemedText>
            <ThemedText style={styles.highlightSubtext}>
              {insights.churn.atRiskCount} customers at risk • {insights.churn.churnedCount} churned
            </ThemedText>
          </View>
        </View>

        {/* At-Risk Customers */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Customers at Risk ({insights.churn.predictions.length})
          </ThemedText>
          <View style={styles.churnList}>
            {insights.churn.predictions.slice(0, 15).map((prediction, index) => (
              <View key={index} style={[styles.churnCard, { borderLeftColor: getRiskColor(prediction.riskLevel) }]}>
                <View style={styles.churnHeader}>
                  <View style={styles.churnInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.churnEmail}>
                      {prediction.email}
                    </ThemedText>
                    <ThemedText style={styles.churnDate}>
                      Last purchase: {new Date(prediction.lastPurchaseDate).toLocaleDateString()}
                      ({prediction.daysSinceLastPurchase}d ago)
                    </ThemedText>
                  </View>
                  <View style={styles.churnRisk}>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(prediction.riskLevel) }]}>
                      <ThemedText style={styles.riskBadgeText}>
                        {prediction.churnProbability.toFixed(0)}%
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.riskLabel, { color: getRiskColor(prediction.riskLevel) }]}>
                      {prediction.riskLevel.toUpperCase()}
                    </ThemedText>
                  </View>
                </View>

                {prediction.reasons.length > 0 && (
                  <View style={styles.reasonsContainer}>
                    <ThemedText style={styles.reasonsLabel}>Reasons:</ThemedText>
                    {prediction.reasons.map((reason, idx) => (
                      <View key={idx} style={styles.reasonItem}>
                        <View style={styles.reasonDot} />
                        <ThemedText style={styles.reasonText}>{reason}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {prediction.recommendedActions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    <ThemedText style={styles.actionsLabel}>Recommended Actions:</ThemedText>
                    {prediction.recommendedActions.map((action, idx) => (
                      <View key={idx} style={styles.actionItem}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.light.success} />
                        <ThemedText style={styles.actionText}>{action}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const SegmentsContent = () => {
    if (!insights?.segments || !insights?.summary) return null;

    const segmentData = [
      { key: 'highValue', label: 'High Value', count: insights.segments.highValue, color: Colors.light.success },
      { key: 'mediumValue', label: 'Medium Value', count: insights.segments.mediumValue, color: Colors.light.info },
      { key: 'lowValue', label: 'Low Value', count: insights.segments.lowValue, color: Colors.light.warning },
      { key: 'dormant', label: 'Dormant', count: insights.segments.dormant, color: Colors.light.textMuted },
      { key: 'new', label: 'New', count: insights.segments.new, color: Colors.light.secondary },
    ];

    const totalCustomers = insights.totalCustomers;

    return (
      <View style={styles.tabContent}>
        {/* Customer Summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryItemLabel}>Total Customers</ThemedText>
            <ThemedText type="title" style={styles.summaryItemValue}>
              {totalCustomers}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryItemLabel}>New Customers</ThemedText>
            <ThemedText type="title" style={styles.summaryItemValue}>
              {insights.newCustomers}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryItemLabel}>Active</ThemedText>
            <ThemedText type="title" style={styles.summaryItemValue}>
              {insights.activeCustomers}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryItemLabel}>Inactive</ThemedText>
            <ThemedText type="title" style={styles.summaryItemValue}>
              {insights.inactiveCustomers}
            </ThemedText>
          </View>
        </View>

        {/* Segment Distribution */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Customer Segmentation
          </ThemedText>
          <View style={styles.segmentList}>
            {segmentData.map((segment) => {
              const percentage = (segment.count / totalCustomers) * 100;

              return (
                <View key={segment.key} style={styles.segmentItem}>
                  <View style={styles.segmentHeader}>
                    <View style={styles.segmentLabelContainer}>
                      <View style={[styles.segmentDot, { backgroundColor: segment.color }]} />
                      <ThemedText type="defaultSemiBold" style={styles.segmentLabel}>
                        {segment.label}
                      </ThemedText>
                    </View>
                    <View style={styles.segmentStats}>
                      <ThemedText type="defaultSemiBold" style={styles.segmentCount}>
                        {segment.count}
                      </ThemedText>
                      <ThemedText style={styles.segmentPercentage}>
                        {formatPercentage(percentage)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.segmentBar}>
                    <View
                      style={[
                        styles.segmentBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: segment.color,
                        }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Additional Insights */}
        <View style={styles.insightsCard}>
          <ThemedText type="subtitle" style={styles.insightsTitle}>
            Key Insights
          </ThemedText>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="time" size={20} color={Colors.light.info} />
              <ThemedText style={styles.insightText}>
                Average customer age: {insights.summary.averageCustomerAge} days
              </ThemedText>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="cart" size={20} color={Colors.light.secondary} />
              <ThemedText style={styles.insightText}>
                Avg orders per customer: {insights.summary.avgOrdersPerCustomer.toFixed(1)}
              </ThemedText>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="cash" size={20} color={Colors.light.success} />
              <ThemedText style={styles.insightText}>
                Avg spend per customer: {formatCurrency(insights.summary.avgSpendPerCustomer)}
              </ThemedText>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="trophy" size={20} color={Colors.light.warning} />
              <ThemedText style={styles.insightText}>
                Top segment: {insights.summary.topSegment}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!canViewAnalytics) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading && !insights) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Analyzing customers...</ThemedText>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.title}>
              Customer Insights
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              LTV, retention & churn analysis
            </ThemedText>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    selectedTab === tab.key && styles.activeTab,
                  ]}
                  onPress={() => setSelectedTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={selectedTab === tab.key ? Colors.light.primary : Colors.light.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.tabText,
                      selectedTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tab Content */}
        {selectedTab === 'ltv' && <LTVContent />}
        {selectedTab === 'retention' && <RetentionContent />}
        {selectedTab === 'churn' && <ChurnContent />}
        {selectedTab === 'segments' && <SegmentsContent />}
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
  tabsContainer: {
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: Colors.light.primary,
  },
  tabContent: {
    gap: 16,
  },
  highlightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  highlightIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightContent: {
    flex: 1,
  },
  highlightLabel: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  highlightSubtext: {
    color: Colors.light.textMuted,
    fontSize: 12,
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
  customerList: {
    gap: 12,
  },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  customerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    color: 'white',
    fontSize: 12,
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerValue: {
    color: Colors.light.text,
    fontSize: 16,
  },
  segmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  segmentBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  customerMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  customerMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerMetricText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  predictionText: {
    fontSize: 11,
    color: Colors.light.info,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  metricCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  metricCardLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  cohortCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  cohortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cohortDate: {
    color: Colors.light.text,
  },
  cohortSize: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  retentionBar: {
    height: 32,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  retentionBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  retentionBarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    zIndex: 1,
  },
  retentionTimeline: {
    flexDirection: 'row',
    gap: 8,
  },
  timelinePoint: {
    flex: 1,
    alignItems: 'center',
  },
  timelineDay: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  timelinePercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.text,
  },
  churnList: {
    gap: 12,
  },
  churnCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 8,
  },
  churnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  churnInfo: {
    flex: 1,
    marginRight: 12,
  },
  churnEmail: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  churnDate: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  churnRisk: {
    alignItems: 'flex-end',
    gap: 4,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  reasonsContainer: {
    gap: 4,
  },
  reasonsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.textMuted,
  },
  reasonText: {
    flex: 1,
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  actionsContainer: {
    gap: 4,
  },
  actionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.success,
    marginBottom: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    flex: 1,
    fontSize: 11,
    color: Colors.light.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  summaryItemLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  segmentList: {
    gap: 16,
  },
  segmentItem: {
    gap: 8,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  segmentLabel: {
    color: Colors.light.text,
  },
  segmentStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  segmentCount: {
    color: Colors.light.text,
    fontSize: 18,
  },
  segmentPercentage: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  segmentBar: {
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segmentBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  insightsTitle: {
    color: Colors.light.text,
    marginBottom: 16,
  },
  insightsList: {
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
    color: Colors.light.text,
    fontSize: 13,
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
