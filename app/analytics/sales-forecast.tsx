/**
 * Sales Forecast Analytics Screen
 * AI-powered sales forecasting with confidence intervals and seasonal patterns
 */

import React, { useState } from 'react';
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

const { width } = Dimensions.get('window');

type ForecastPeriod = 7 | 30 | 60 | 90;

export default function SalesForecastScreen() {
  const [forecastDays, setForecastDays] = useState<ForecastPeriod>(30);
  const [refreshing, setRefreshing] = useState(false);

  // Permission check
  const canViewAnalytics = useHasPermission('analytics:view');
  const canExport = useHasPermission('analytics:export');

  // Fetch sales forecast
  const {
    data: forecast,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales-forecast', forecastDays],
    queryFn: () => analyticsService.getSalesForecast(forecastDays),
    enabled: canViewAnalytics,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!canExport) {
      Alert.alert('Permission Denied', 'You do not have permission to export data.');
      return;
    }

    try {
      const exportResponse = await analyticsService.exportAnalytics({
        format: 'excel',
        reportTypes: ['sales_forecast'],
        includeCharts: true,
      });

      Alert.alert(
        'Export Successful',
        `Your forecast has been exported. File: ${exportResponse.filename}`,
        [
          {
            text: 'Download',
            onPress: () => {
              // Handle download
              console.log('Download URL:', exportResponse.url);
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const forecastPeriods: { value: ForecastPeriod; label: string }[] = [
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 60, label: '60 Days' },
    { value: 90, label: '90 Days' },
  ];

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return Colors.light.success;
      case 'down': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  const ForecastChart = () => {
    if (!forecast || !forecast.forecasts || forecast.forecasts.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color={Colors.light.textMuted} />
          <ThemedText style={styles.emptyChartText}>No forecast data available</ThemedText>
        </View>
      );
    }

    const allValues = forecast.forecasts.map(f => [f.forecasted, f.lower, f.upper]).flat();
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const range = maxValue - minValue || 1;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {/* Y-axis */}
          <View style={styles.yAxis}>
            <ThemedText style={styles.axisLabel}>{formatCurrency(maxValue)}</ThemedText>
            <ThemedText style={styles.axisLabel}>{formatCurrency(maxValue * 0.5)}</ThemedText>
            <ThemedText style={styles.axisLabel}>₹0</ThemedText>
          </View>

          {/* Chart plot area */}
          <View style={styles.chartPlot}>
            {/* Grid lines */}
            <View style={styles.gridLines}>
              {[0, 25, 50, 75, 100].map(i => (
                <View key={i} style={[styles.gridLine, { top: `${i}%` }]} />
              ))}
            </View>

            {/* Confidence interval area */}
            <View style={styles.confidenceArea}>
              {forecast.forecasts.map((item, index) => {
                const x = (index / (forecast.forecasts.length - 1)) * 100;
                const yUpper = 100 - ((item.upper - minValue) / range) * 100;
                const yLower = 100 - ((item.lower - minValue) / range) * 100;
                const height = yLower - yUpper;

                return (
                  <View
                    key={`confidence-${index}`}
                    style={[
                      styles.confidenceBar,
                      {
                        left: `${x}%`,
                        top: `${yUpper}%`,
                        height: `${height}%`,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Forecast line */}
            <View style={styles.forecastLine}>
              {forecast.forecasts.map((item, index) => {
                const x = (index / (forecast.forecasts.length - 1)) * 100;
                const y = 100 - ((item.forecasted - minValue) / range) * 100;

                return (
                  <View
                    key={`point-${index}`}
                    style={[
                      styles.forecastPoint,
                      {
                        left: `${x}%`,
                        top: `${y}%`,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        {/* X-axis */}
        <View style={styles.xAxis}>
          {forecast.forecasts
            .filter((_, index) => index % Math.ceil(forecast.forecasts.length / 5) === 0)
            .slice(0, 5)
            .map((item, index) => (
              <ThemedText key={index} style={styles.axisLabel}>
                {formatDate(item.period)}
              </ThemedText>
            ))}
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

  if (isLoading && !forecast) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Generating forecast...</ThemedText>
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
              Sales Forecast
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              AI-powered predictions
            </ThemedText>
          </View>
          {canExport && (
            <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
              <Ionicons name="download" size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Forecast Period Selector */}
        <View style={styles.periodSelector}>
          {forecastPeriods.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                forecastDays === period.value && styles.activePeriodButton,
              ]}
              onPress={() => setForecastDays(period.value)}
            >
              <ThemedText
                style={[
                  styles.periodButtonText,
                  forecastDays === period.value && styles.activePeriodButtonText,
                ]}
              >
                {period.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        {forecast?.summary && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Total Forecast</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {formatCurrency(forecast.summary.totalForecast)}
              </ThemedText>
              <View style={styles.trendContainer}>
                <Ionicons
                  name={getTrendIcon(forecast.summary.trend)}
                  size={16}
                  color={getTrendColor(forecast.summary.trend)}
                />
                <ThemedText style={[styles.trendText, { color: getTrendColor(forecast.summary.trend) }]}>
                  {(forecast.summary.growthRate * 100).toFixed(1)}% growth
                </ThemedText>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Daily Average</ThemedText>
              <ThemedText type="title" style={styles.summaryValue}>
                {formatCurrency(forecast.summary.averageForecast)}
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                Forecasting method: {forecast.method}
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>Accuracy</ThemedText>
              <ThemedText type="title" style={[
                styles.summaryValue,
                { color: forecast.accuracy >= 80 ? Colors.light.success :
                         forecast.accuracy >= 60 ? Colors.light.warning :
                         Colors.light.error }
              ]}>
                {forecast.accuracy.toFixed(1)}%
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                Based on historical data
              </ThemedText>
            </View>
          </View>
        )}

        {/* Forecast Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Forecast Visualization
            </ThemedText>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.light.primary }]} />
                <ThemedText style={styles.legendText}>Forecast</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.light.info, opacity: 0.3 }]} />
                <ThemedText style={styles.legendText}>Confidence</ThemedText>
              </View>
            </View>
          </View>
          <ForecastChart />
        </View>

        {/* Metadata */}
        {forecast?.metadata && (
          <View style={styles.metadataContainer}>
            <View style={styles.metadataCard}>
              <Ionicons
                name={forecast.metadata.seasonalityDetected ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={forecast.metadata.seasonalityDetected ? Colors.light.success : Colors.light.textMuted}
              />
              <View style={styles.metadataContent}>
                <ThemedText type="defaultSemiBold" style={styles.metadataTitle}>
                  Seasonality
                </ThemedText>
                <ThemedText style={styles.metadataText}>
                  {forecast.metadata.seasonalityDetected ? 'Detected in data' : 'Not detected'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.metadataCard}>
              <Ionicons
                name="pulse"
                size={24}
                color={
                  forecast.metadata.volatility === 'low' ? Colors.light.success :
                  forecast.metadata.volatility === 'medium' ? Colors.light.warning :
                  Colors.light.error
                }
              />
              <View style={styles.metadataContent}>
                <ThemedText type="defaultSemiBold" style={styles.metadataTitle}>
                  Volatility
                </ThemedText>
                <ThemedText style={styles.metadataText}>
                  {forecast.metadata.volatility.toUpperCase()} - {forecast.metadata.dataPoints} data points
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Forecast Details List */}
        {forecast?.forecasts && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Daily Breakdown
            </ThemedText>
            <View style={styles.forecastList}>
              {forecast.forecasts.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.forecastItem}>
                  <View style={styles.forecastItemLeft}>
                    <ThemedText type="defaultSemiBold" style={styles.forecastDate}>
                      {formatDate(item.period)}
                    </ThemedText>
                    <View style={styles.confidenceContainer}>
                      <View style={[
                        styles.confidenceBadge,
                        { backgroundColor: item.confidence >= 80 ? Colors.light.success :
                                          item.confidence >= 60 ? Colors.light.warning :
                                          Colors.light.error }
                      ]}>
                        <ThemedText style={styles.confidenceText}>
                          {item.confidence.toFixed(0)}%
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.forecastItemRight}>
                    <ThemedText type="defaultSemiBold" style={styles.forecastValue}>
                      {formatCurrency(item.forecasted)}
                    </ThemedText>
                    <ThemedText style={styles.forecastRange}>
                      {formatCurrency(item.lower)} - {formatCurrency(item.upper)}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={getTrendIcon(item.trend)}
                    size={20}
                    color={getTrendColor(item.trend)}
                  />
                </View>
              ))}
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
  exportButton: {
    padding: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.light.background,
    padding: 4,
    borderRadius: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: Colors.light.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activePeriodButtonText: {
    color: 'white',
  },
  summaryContainer: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
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
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.light.text,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  chartContainer: {
    height: 250,
  },
  chartArea: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    width: 60,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  chartPlot: {
    flex: 1,
    position: 'relative',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.light.border,
    opacity: 0.3,
  },
  confidenceArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confidenceBar: {
    position: 'absolute',
    width: 2,
    backgroundColor: Colors.light.info,
    opacity: 0.3,
  },
  forecastLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  forecastPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
    marginLeft: -4,
    marginTop: -4,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingLeft: 68,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  emptyChartText: {
    marginTop: 12,
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  metadataContainer: {
    gap: 12,
  },
  metadataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  metadataContent: {
    flex: 1,
  },
  metadataTitle: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  metadataText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  forecastList: {
    gap: 8,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  forecastItemLeft: {
    flex: 1,
  },
  forecastDate: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  forecastItemRight: {
    alignItems: 'flex-end',
  },
  forecastValue: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  forecastRange: {
    color: Colors.light.textMuted,
    fontSize: 11,
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
