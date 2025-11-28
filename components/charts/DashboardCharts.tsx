import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;
const chartHeight = 200;

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  cashback: number;
}

interface DashboardChartsProps {
  timeSeriesData?: TimeSeriesData[];
  categoryPerformance?: ChartData[];
  customerInsights?: any;
  isLoading?: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  timeSeriesData = [],
  categoryPerformance = [],
  customerInsights,
  isLoading = false
}) => {
  const [activeChart, setActiveChart] = useState<'revenue' | 'orders' | 'categories'>('revenue');
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const chartTabs = [
    { key: 'revenue', label: 'Revenue', icon: 'trending-up' },
    { key: 'orders', label: 'Orders', icon: 'receipt' },
    { key: 'categories', label: 'Categories', icon: 'pie-chart' },
  ];

  const periodTabs = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  // Simple line chart component
  const LineChart = ({ data, dataKey, color }: { data: TimeSeriesData[]; dataKey: keyof TimeSeriesData; color: string }) => {
    if (!data || data.length === 0) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <ThemedText style={styles.emptyChartText}>No data available</ThemedText>
        </View>
      );
    }

    const values = data.map(item => typeof item[dataKey] === 'number' ? item[dataKey] : 0) as number[];
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
            {activeChart === 'revenue' ? 'Revenue Trend' : 'Orders Trend'}
          </ThemedText>
          <ThemedText style={styles.chartValue}>
            {activeChart === 'revenue' 
              ? `₹${maxValue.toLocaleString()}` 
              : `${maxValue.toLocaleString()}`
            }
          </ThemedText>
        </View>
        
        <View style={styles.chartArea}>
          <View style={styles.yAxis}>
            <ThemedText style={styles.axisLabel}>{Math.round(maxValue)}</ThemedText>
            <ThemedText style={styles.axisLabel}>{Math.round(maxValue * 0.5)}</ThemedText>
            <ThemedText style={styles.axisLabel}>0</ThemedText>
          </View>
          
          <View style={styles.chartPlot}>
            {/* Chart background lines */}
            <View style={styles.gridLines}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.gridLine, { top: `${i * 25}%` }]} />
              ))}
            </View>
            
            {/* Data points and lines */}
            <View style={styles.dataPath}>
              {values.map((value, index) => {
                const x = (index / (values.length - 1)) * 100;
                const y = 100 - ((value - minValue) / range) * 100;
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.dataPoint,
                      {
                        left: `${x}%`,
                        top: `${y}%`,
                        backgroundColor: color,
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
        
        <View style={styles.xAxis}>
          {data.slice(0, 5).map((item, index) => (
            <ThemedText key={index} style={styles.axisLabel}>
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </ThemedText>
          ))}
        </View>
      </View>
    );
  };

  // Simple bar chart for categories
  const BarChart = ({ data }: { data: ChartData[] }) => {
    if (!data || data.length === 0) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <ThemedText style={styles.emptyChartText}>No category data available</ThemedText>
        </View>
      );
    }

    const maxValue = Math.max(...data.map(item => item.value));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
            Category Performance
          </ThemedText>
          <ThemedText style={styles.chartValue}>
            ₹${maxValue.toLocaleString()} max
          </ThemedText>
        </View>
        
        <View style={styles.barChartArea}>
          {data.slice(0, 6).map((item, index) => {
            const barHeight = (item.value / maxValue) * 100;
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${barHeight}%`,
                        backgroundColor: item.color || Colors.light.primary,
                      }
                    ]}
                  />
                </View>
                <ThemedText style={styles.barLabel} numberOfLines={2}>
                  {item.label}
                </ThemedText>
                <ThemedText style={styles.barValue}>
                  ₹${item.value.toLocaleString()}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Customer insights donut chart representation
  const CustomerInsightsChart = () => {
    if (!customerInsights) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <ThemedText style={styles.emptyChartText}>No customer data available</ThemedText>
        </View>
      );
    }

    const insights = [
      { 
        label: 'New Customers', 
        value: customerInsights.newCustomers || 0, 
        color: Colors.light.success,
        percentage: customerInsights.newCustomerPercentage || 0
      },
      { 
        label: 'Returning Customers', 
        value: customerInsights.returningCustomers || 0, 
        color: Colors.light.primary,
        percentage: customerInsights.returningCustomerPercentage || 0
      },
      { 
        label: 'VIP Customers', 
        value: customerInsights.vipCustomers || 0, 
        color: Colors.light.warning,
        percentage: customerInsights.vipCustomerPercentage || 0
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
            Customer Segments
          </ThemedText>
          <ThemedText style={styles.chartValue}>
            {customerInsights.totalCustomers || 0} total
          </ThemedText>
        </View>
        
        <View style={styles.insightsGrid}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.insightDot, { backgroundColor: insight.color }]} />
                <ThemedText type="defaultSemiBold" style={styles.insightLabel}>
                  {insight.label}
                </ThemedText>
              </View>
              <ThemedText type="title" style={styles.insightValue}>
                {insight.value.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.insightPercentage}>
                {insight.percentage.toFixed(1)}% of total
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderActiveChart = () => {
    if (isLoading) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <ThemedText style={styles.emptyChartText}>Loading chart data...</ThemedText>
        </View>
      );
    }

    switch (activeChart) {
      case 'revenue':
        return (
          <LineChart 
            data={timeSeriesData} 
            dataKey="revenue" 
            color={Colors.light.success} 
          />
        );
      case 'orders':
        return (
          <LineChart 
            data={timeSeriesData} 
            dataKey="orders" 
            color={Colors.light.info} 
          />
        );
      case 'categories':
        return <BarChart data={categoryPerformance} />;
      default:
        return <CustomerInsightsChart />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          Analytics Charts
        </ThemedText>
        
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {periodTabs.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodTab,
                chartPeriod === period.key && styles.activePeriodTab
              ]}
              onPress={() => setChartPeriod(period.key as any)}
            >
              <ThemedText
                style={[
                  styles.periodTabText,
                  chartPeriod === period.key && styles.activePeriodTabText
                ]}
              >
                {period.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart type tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.chartTabs}
        contentContainerStyle={styles.chartTabsContent}
      >
        {chartTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.chartTab,
              activeChart === tab.key && styles.activeChartTab
            ]}
            onPress={() => setActiveChart(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={
                activeChart === tab.key 
                  ? Colors.light.primary 
                  : Colors.light.textSecondary
              }
            />
            <ThemedText
              style={[
                styles.chartTabText,
                activeChart === tab.key && styles.activeChartTabText
              ]}
            >
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active chart */}
      {renderActiveChart()}

      {/* Chart summary */}
      <View style={styles.chartSummary}>
        <View style={styles.summaryItem}>
          <Ionicons name="trending-up" size={16} color={Colors.light.success} />
          <ThemedText style={styles.summaryText}>
            Revenue up 12.5% this month
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="people" size={16} color={Colors.light.info} />
          <ThemedText style={styles.summaryText}>
            {customerInsights?.totalCustomers || 0} active customers
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.light.text,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activePeriodTab: {
    backgroundColor: Colors.light.primary,
  },
  periodTabText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  activePeriodTabText: {
    color: 'white',
    fontWeight: '600',
  },
  chartTabs: {
    marginBottom: 16,
  },
  chartTabsContent: {
    gap: 12,
  },
  chartTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeChartTab: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.primary,
  },
  chartTabText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  activeChartTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  chartContainer: {
    height: chartHeight,
    marginBottom: 16,
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  emptyChartText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    color: Colors.light.text,
    fontSize: 16,
  },
  chartValue: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  chartArea: {
    flexDirection: 'row',
    flex: 1,
  },
  yAxis: {
    width: 40,
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
    borderRadius: 4,
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
  dataPath: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingLeft: 48,
  },
  barChartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    paddingTop: 20,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 50,
  },
  barColumn: {
    height: 120,
    width: 24,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  barValue: {
    fontSize: 9,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
  },
  insightCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightLabel: {
    fontSize: 12,
    color: Colors.light.text,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  insightPercentage: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});