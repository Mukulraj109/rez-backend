/**
 * Trend Analysis Screen
 * Seasonal patterns, peak/trough identification, and cyclicity analysis
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

type DataType = 'sales' | 'orders' | 'customers' | 'products';

export default function TrendsAnalysisScreen() {
  const [dataType, setDataType] = useState<DataType>('sales');
  const [refreshing, setRefreshing] = useState(false);

  const canViewAnalytics = useHasPermission('analytics:view');

  const {
    data: trends,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trends', dataType],
    queryFn: () => analyticsService.getSeasonalTrends(dataType),
    enabled: canViewAnalytics,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const dataTypes: { value: DataType; label: string; icon: string }[] = [
    { value: 'sales', label: 'Sales', icon: 'cash' },
    { value: 'orders', label: 'Orders', icon: 'receipt' },
    { value: 'customers', label: 'Customers', icon: 'people' },
    { value: 'products', label: 'Products', icon: 'cube' },
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return Colors.light.success;
      case 'down': return Colors.light.error;
      case 'cyclic': return Colors.light.info;
      default: return Colors.light.textSecondary;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      case 'cyclic': return 'sync';
      default: return 'remove';
    }
  };

  const formatValue = (value: number) => {
    if (dataType === 'sales') return `₹${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  if (!canViewAnalytics) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading && !trends) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Analyzing trends...</ThemedText>
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
              Trend Analysis
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Seasonal patterns & insights
            </ThemedText>
          </View>
        </View>

        {/* Data Type Selector */}
        <View style={styles.typeSelector}>
          {dataTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                dataType === type.value && styles.activeTypeButton,
              ]}
              onPress={() => setDataType(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={dataType === type.value ? 'white' : Colors.light.textSecondary}
              />
              <ThemedText
                style={[
                  styles.typeButtonText,
                  dataType === type.value && styles.activeTypeButtonText,
                ]}
              >
                {type.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall Analysis */}
        {trends?.overallAnalysis && (
          <View style={[styles.analysisCard, { borderLeftColor: getTrendColor(trends.overallAnalysis.trend) }]}>
            <View style={styles.analysisHeader}>
              <View style={styles.analysisIcon}>
                <Ionicons
                  name={getTrendIcon(trends.overallAnalysis.trend) as any}
                  size={32}
                  color={getTrendColor(trends.overallAnalysis.trend)}
                />
              </View>
              <View style={styles.analysisContent}>
                <ThemedText type="subtitle" style={styles.analysisTitle}>
                  Overall Trend: {trends.overallAnalysis.trend.toUpperCase()}
                </ThemedText>
                <ThemedText style={styles.analysisSubtext}>
                  {(trends.overallAnalysis.growthRate * 100).toFixed(1)}% growth rate
                </ThemedText>
              </View>
            </View>

            <View style={styles.strengthBars}>
              <View style={styles.strengthBar}>
                <ThemedText style={styles.strengthLabel}>Trend Strength</ThemedText>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${trends.overallAnalysis.strength}%`,
                        backgroundColor: trends.overallAnalysis.strength >= 70 ? Colors.light.success :
                                       trends.overallAnalysis.strength >= 40 ? Colors.light.warning :
                                       Colors.light.error
                      }
                    ]}
                  />
                  <ThemedText style={styles.barValue}>{trends.overallAnalysis.strength.toFixed(0)}%</ThemedText>
                </View>
              </View>

              <View style={styles.strengthBar}>
                <ThemedText style={styles.strengthLabel}>Seasonality</ThemedText>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${trends.overallAnalysis.seasonality}%`, backgroundColor: Colors.light.info }
                    ]}
                  />
                  <ThemedText style={styles.barValue}>{trends.overallAnalysis.seasonality.toFixed(0)}%</ThemedText>
                </View>
              </View>

              <View style={styles.strengthBar}>
                <ThemedText style={styles.strengthLabel}>Cyclicity</ThemedText>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${trends.overallAnalysis.cyclicity}%`, backgroundColor: Colors.light.secondary }
                    ]}
                  />
                  <ThemedText style={styles.barValue}>{trends.overallAnalysis.cyclicity.toFixed(0)}%</ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Peaks & Troughs */}
        {trends && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Peaks & Troughs
            </ThemedText>
            <View style={styles.peaksGrid}>
              <View style={styles.peakCard}>
                <View style={[styles.peakBadge, { backgroundColor: Colors.light.success }]}>
                  <Ionicons name="trending-up" size={24} color="white" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.peakTitle}>
                  Top Peak
                </ThemedText>
                {trends.peaks.length > 0 && (
                  <>
                    <ThemedText type="title" style={styles.peakValue}>
                      {formatValue(trends.peaks[0].value)}
                    </ThemedText>
                    <ThemedText style={styles.peakDate}>
                      {new Date(trends.peaks[0].period).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </ThemedText>
                    {trends.peaks[0].dayOfWeek && (
                      <ThemedText style={styles.peakDay}>{trends.peaks[0].dayOfWeek}</ThemedText>
                    )}
                  </>
                )}
              </View>

              <View style={styles.peakCard}>
                <View style={[styles.peakBadge, { backgroundColor: Colors.light.error }]}>
                  <Ionicons name="trending-down" size={24} color="white" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.peakTitle}>
                  Lowest Trough
                </ThemedText>
                {trends.troughs.length > 0 && (
                  <>
                    <ThemedText type="title" style={styles.peakValue}>
                      {formatValue(trends.troughs[0].value)}
                    </ThemedText>
                    <ThemedText style={styles.peakDate}>
                      {new Date(trends.troughs[0].period).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </ThemedText>
                    {trends.troughs[0].dayOfWeek && (
                      <ThemedText style={styles.peakDay}>{trends.troughs[0].dayOfWeek}</ThemedText>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Seasonal Trends */}
        {trends?.seasonalTrends && trends.seasonalTrends.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Seasonal Patterns
            </ThemedText>
            <View style={styles.seasonalList}>
              {trends.seasonalTrends.map((season, index) => (
                <View key={index} style={styles.seasonCard}>
                  <View style={styles.seasonHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.seasonTitle}>
                      {season.season} {season.year}
                    </ThemedText>
                    <View style={styles.seasonStats}>
                      <View style={styles.seasonStat}>
                        <Ionicons name="trending-up" size={14} color={Colors.light.success} />
                        <ThemedText style={styles.seasonStatText}>
                          {formatValue(season.peak)}
                        </ThemedText>
                      </View>
                      <View style={styles.seasonStat}>
                        <Ionicons name="trending-down" size={14} color={Colors.light.error} />
                        <ThemedText style={styles.seasonStatText}>
                          {formatValue(season.trough)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.seasonMetrics}>
                    <View style={styles.seasonMetric}>
                      <ThemedText style={styles.seasonMetricLabel}>Average</ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.seasonMetricValue}>
                        {formatValue(season.average)}
                      </ThemedText>
                    </View>
                    <View style={styles.seasonMetric}>
                      <ThemedText style={styles.seasonMetricLabel}>Volatility</ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.seasonMetricValue}>
                        {season.volatility.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.seasonMetric}>
                      <ThemedText style={styles.seasonMetricLabel}>Data Points</ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.seasonMetricValue}>
                        {season.dataPoints.length}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {trends?.byCategory && trends.byCategory.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Trends by Category
            </ThemedText>
            <View style={styles.categoryList}>
              {trends.byCategory.map((category, index) => (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.categoryName}>
                      {category.category}
                    </ThemedText>
                    <View style={[styles.trendBadge, { backgroundColor: getTrendColor(category.analysis.trend) }]}>
                      <Ionicons
                        name={getTrendIcon(category.analysis.trend) as any}
                        size={14}
                        color="white"
                      />
                      <ThemedText style={styles.trendBadgeText}>
                        {category.analysis.trend.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.categoryMetrics}>
                    <View style={styles.categoryMetric}>
                      <ThemedText style={styles.categoryMetricLabel}>Growth Rate</ThemedText>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[styles.categoryMetricValue, { color: getTrendColor(category.analysis.trend) }]}
                      >
                        {(category.analysis.growthRate * 100).toFixed(1)}%
                      </ThemedText>
                    </View>
                    <View style={styles.categoryMetric}>
                      <ThemedText style={styles.categoryMetricLabel}>Strength</ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.categoryMetricValue}>
                        {category.analysis.strength.toFixed(0)}%
                      </ThemedText>
                    </View>
                    <View style={styles.categoryMetric}>
                      <ThemedText style={styles.categoryMetricLabel}>Seasonality</ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.categoryMetricValue}>
                        {category.analysis.seasonality.toFixed(0)}%
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Predictions */}
        {trends?.predictions && (
          <View style={styles.predictionsCard}>
            <View style={styles.predictionsHeader}>
              <Ionicons name="analytics" size={24} color={Colors.light.primary} />
              <ThemedText type="subtitle" style={styles.predictionsTitle}>
                Next Period Forecast
              </ThemedText>
            </View>
            <View style={styles.predictionsContent}>
              <View style={styles.predictionRow}>
                <ThemedText style={styles.predictionLabel}>Period:</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.predictionValue}>
                  {trends.predictions.nextSeason}
                </ThemedText>
              </View>
              <View style={styles.predictionRow}>
                <ThemedText style={styles.predictionLabel}>Expected Trend:</ThemedText>
                <View style={styles.predictionTrend}>
                  <Ionicons
                    name={getTrendIcon(trends.predictions.expectedTrend) as any}
                    size={16}
                    color={getTrendColor(trends.predictions.expectedTrend)}
                  />
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.predictionValue, { color: getTrendColor(trends.predictions.expectedTrend) }]}
                  >
                    {trends.predictions.expectedTrend.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.predictionRow}>
                <ThemedText style={styles.predictionLabel}>Expected Value:</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.predictionValue}>
                  {formatValue(trends.predictions.expectedValue)}
                </ThemedText>
              </View>
              <View style={styles.predictionRow}>
                <ThemedText style={styles.predictionLabel}>Confidence:</ThemedText>
                <View style={styles.confidenceContainer}>
                  <View
                    style={[
                      styles.confidenceBadge,
                      {
                        backgroundColor: trends.predictions.confidence >= 80 ? Colors.light.success :
                                       trends.predictions.confidence >= 60 ? Colors.light.warning :
                                       Colors.light.error
                      }
                    ]}
                  >
                    <ThemedText style={styles.confidenceText}>
                      {trends.predictions.confidence.toFixed(0)}%
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTypeButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTypeButtonText: {
    color: 'white',
  },
  analysisCard: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  analysisIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisContent: {
    flex: 1,
  },
  analysisTitle: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  analysisSubtext: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  strengthBars: {
    gap: 16,
  },
  strengthBar: {
    gap: 8,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  barContainer: {
    height: 32,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    zIndex: 1,
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
  peaksGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  peakCard: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  peakBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakTitle: {
    color: Colors.light.text,
    fontSize: 13,
  },
  peakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  peakDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  peakDay: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  seasonalList: {
    gap: 12,
  },
  seasonCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonTitle: {
    color: Colors.light.text,
  },
  seasonStats: {
    flexDirection: 'row',
    gap: 12,
  },
  seasonStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seasonStatText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  seasonMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  seasonMetric: {
    flex: 1,
    alignItems: 'center',
  },
  seasonMetricLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  seasonMetricValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    color: Colors.light.text,
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  categoryMetricLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  categoryMetricValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  predictionsCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  predictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  predictionsTitle: {
    color: Colors.light.primary,
  },
  predictionsContent: {
    gap: 12,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  predictionLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  predictionValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  predictionTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
