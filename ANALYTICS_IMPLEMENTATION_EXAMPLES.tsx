/**
 * Real-world Analytics Service Implementation Examples
 * React Native / Expo components demonstrating analytics integration
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { analyticsService } from '@/services/api/analytics';
import {
  AnalyticsOverview,
  SalesForecastResponse,
  CustomerInsights,
  ProductPerformanceResponse,
  InventoryStockoutResponse,
  RevenueBreakdownResponse,
} from '@/types/analytics';

// ============================================================================
// EXAMPLE 1: Analytics Dashboard Screen
// ============================================================================
/**
 * Main dashboard showing overview metrics, forecasts, and alerts
 */
export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [forecast, setForecast] = useState<SalesForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch multiple data sources in parallel
      const [overviewData, forecastData] = await Promise.all([
        analyticsService.getAnalyticsOverview({ preset: '30d' }),
        analyticsService.getSalesForecast(30, { preset: '90d' }),
      ]);

      setOverview(overviewData);
      setForecast(forecastData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Error: {error}</Text>
        <Text onPress={loadDashboardData} style={{ color: 'blue' }}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      {/* Header */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Analytics Dashboard
      </Text>

      {/* Key Metrics */}
      {overview && (
        <>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
              Revenue & Orders
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>Total Revenue</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {analyticsService.formatCurrency(overview.sales.totalRevenue)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>Orders</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {overview.sales.totalOrders}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>Avg Order Value</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {analyticsService.formatCurrency(overview.sales.avgOrderValue)}
                </Text>
              </View>
            </View>
          </View>

          {/* Health Card */}
          <View
            style={{
              padding: 15,
              backgroundColor: '#f0f0f0',
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
              Business Health
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: analyticsService.getHealthStatusColor(
                    overview.health.overallScore > 70 ? 'excellent' : 'good'
                  ),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {overview.health.overallScore}
                </Text>
              </View>
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={{ marginBottom: 5 }}>
                  Trend: {analyticsService.getTrendEmoji(overview.health.trend)}{' '}
                  {overview.health.trend}
                </Text>
                <Text style={{ color: '#666', fontSize: 12 }}>
                  {overview.health.alerts.length} alert
                  {overview.health.alerts.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Alerts */}
          {overview.health.alerts.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                Alerts
              </Text>
              {overview.health.alerts.slice(0, 3).map((alert, i) => (
                <View
                  key={i}
                  style={{
                    padding: 10,
                    backgroundColor: alert.severity === 'high' ? '#fee' : '#ffe',
                    borderLeftWidth: 3,
                    borderLeftColor:
                      alert.severity === 'high' ? '#f00' : '#faa',
                    marginBottom: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>{alert.title}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {alert.description}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Sales Forecast */}
      {forecast && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
            30-Day Sales Forecast
          </Text>
          <View style={{ backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>Average Daily</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {analyticsService.formatCurrency(forecast.summary.averageForecast)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>30-Day Total</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {analyticsService.formatCurrency(forecast.summary.totalForecast)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>Trend</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {analyticsService.getTrendEmoji(forecast.summary.trend)}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
              Model: {forecast.method} | Accuracy: {forecast.accuracy}%
            </Text>
          </View>
        </View>
      )}

      {/* Customer Metrics */}
      {overview && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
            Customers
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {overview.customers.totalCustomers}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>New</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {overview.customers.newCustomers}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>Active</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {overview.customers.activeCustomers}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>Churn Rate</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {analyticsService.formatPercentage(overview.customers.churnRate)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 2: Customer Insights Screen
// ============================================================================
/**
 * Detailed customer analysis with retention and churn predictions
 */
export function CustomerInsightsScreen() {
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      setLoading(true);
      const data = await analyticsService.getCustomerInsights({ preset: '90d' });
      setInsights(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ActivityIndicator />;
  if (!insights) return <Text>No data</Text>;

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Customer Analytics
      </Text>

      {/* Lifetime Value */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          Lifetime Value
        </Text>
        <View style={{ backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#00aa00' }}>
            {analyticsService.formatCurrency(insights.ltv.averageLTV)}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
            {insights.ltv.highValueCount} high-value customers
          </Text>
        </View>
      </View>

      {/* Retention */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          Retention Rate
        </Text>
        <View
          style={{
            height: 40,
            backgroundColor: '#e0e0e0',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${insights.retention.overallRetentionRate * 100}%`,
              backgroundColor: '#00aa00',
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingRight: 10,
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {analyticsService.formatPercentage(insights.retention.overallRetentionRate)}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          {insights.retention.repeatCustomerCount} customers have made repeat purchases
        </Text>
      </View>

      {/* Churn Risk */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          At-Risk Customers
        </Text>
        {insights.churn.predictions
          .filter((c) => c.riskLevel === 'high')
          .slice(0, 5)
          .map((customer, i) => (
            <View
              key={i}
              style={{
                padding: 12,
                backgroundColor: '#fff3cd',
                borderLeftWidth: 3,
                borderLeftColor: '#ffc107',
                marginBottom: 8,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontWeight: '600' }}>{customer.email}</Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {customer.churnProbability}% churn risk
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                Last purchase: {customer.daysSinceLastPurchase} days ago
              </Text>
              {customer.recommendedActions[0] && (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#0066cc',
                    marginTop: 4,
                    fontWeight: '600',
                  }}
                >
                  Action: {customer.recommendedActions[0]}
                </Text>
              )}
            </View>
          ))}
      </View>

      {/* Segments */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          Customer Segments
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {insights.segments.highValue}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>High Value</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {insights.segments.mediumValue}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Medium Value</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {insights.segments.lowValue}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Low Value</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 3: Inventory Management Screen
// ============================================================================
/**
 * Stockout predictions and inventory alerts
 */
export function InventoryManagementScreen() {
  const [stockout, setStockout] = useState<InventoryStockoutResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockoutData();
  }, []);

  async function loadStockoutData() {
    try {
      setLoading(true);
      const data = await analyticsService.getStockoutPredictions();
      setStockout(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ActivityIndicator />;
  if (!stockout) return <Text>No data</Text>;

  const getFilteredItems = () => {
    if (selectedFilter === 'high') return stockout.highRisk;
    if (selectedFilter === 'medium') return stockout.mediumRisk;
    return [...stockout.highRisk, ...stockout.mediumRisk, ...stockout.safeStock];
  };

  const filteredItems = getFilteredItems();

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Inventory Management
      </Text>

      {/* Summary Cards */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <View
            style={{
              backgroundColor: '#ffe0e0',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#cc0000' }}>
              {stockout.highRisk.length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Critical Items</Text>
          </View>
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View
            style={{
              backgroundColor: '#fff3cd',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#cc6600' }}>
              {stockout.mediumRisk.length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>At Risk</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: '#e0ffe0',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#00cc00' }}>
              {stockout.safeStock.length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Safe Stock</Text>
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
        {(['all', 'high', 'medium'] as const).map((filter) => (
          <Text
            key={filter}
            onPress={() => setSelectedFilter(filter)}
            style={{
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 10,
              backgroundColor: selectedFilter === filter ? '#0066cc' : '#e0e0e0',
              color: selectedFilter === filter ? 'white' : '#666',
              fontWeight: selectedFilter === filter ? '600' : '400',
            }}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        ))}
      </View>

      {/* Items List */}
      {filteredItems.slice(0, 10).map((item, i) => (
        <View
          key={i}
          style={{
            padding: 12,
            backgroundColor: item.riskLevel === 'high' ? '#ffe0e0' : '#fff3cd',
            borderLeftWidth: 4,
            borderLeftColor:
              item.riskLevel === 'high'
                ? analyticsService.getRiskLevelColor('high')
                : analyticsService.getRiskLevelColor('medium'),
            marginBottom: 10,
            borderRadius: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                {item.productName}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>SKU: {item.sku}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '600', color: '#cc0000' }}>
                {item.daysUntilStockout ? `${item.daysUntilStockout}d` : 'Safe'}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {item.confidence}% confident
              </Text>
            </View>
          </View>
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: '#ddd',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 12, color: '#666' }}>
              Current: {item.currentStock} | Daily: {item.dailyAvgUsage}
            </Text>
            <Text style={{ fontSize: 12, color: '#0066cc', fontWeight: '600' }}>
              Reorder: {item.recommendedReorderQty} by {item.recommendedReorderDate}
            </Text>
          </View>
        </View>
      ))}

      {/* Recommendations */}
      {stockout.recommendations.urgentReorders.length > 0 && (
        <View
          style={{
            marginTop: 20,
            padding: 15,
            backgroundColor: '#fff0f0',
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#cc0000', marginBottom: 10 }}>
            Urgent Action Required
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {stockout.recommendations.urgentReorders.length} product(s) need immediate
            reordering. Total budget needed:{' '}
            {analyticsService.formatCurrency(stockout.summary.totalReorderValue)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 4: Product Performance Screen
// ============================================================================
/**
 * Product analytics with rankings and category breakdown
 */
export function ProductPerformanceScreen() {
  const [products, setProducts] = useState<ProductPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductData();
  }, []);

  async function loadProductData() {
    try {
      setLoading(true);
      const data = await analyticsService.getProductPerformance({
        sortBy: 'revenue',
        limit: 20,
      });
      setProducts(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ActivityIndicator />;
  if (!products) return <Text>No data</Text>;

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Product Performance
      </Text>

      {/* Summary */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
          Summary
        </Text>
        <View
          style={{
            backgroundColor: '#f9f9f9',
            padding: 15,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'space-around',
          }}
        >
          <View>
            <Text style={{ fontSize: 12, color: '#666' }}>Total Revenue</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              {analyticsService.formatCurrency(products.summary.totalRevenue)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: '#666' }}>Avg Margin</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              {analyticsService.formatPercentage(products.summary.avgMargin)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: '#666' }}>Products</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              {products.analyzedProducts}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Products */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
          Top Performers
        </Text>
        {products.byPerformance.topPerformers.slice(0, 5).map((product, i) => (
          <View
            key={i}
            style={{
              padding: 12,
              backgroundColor: '#f0f9ff',
              borderLeftWidth: 3,
              borderLeftColor: '#0066cc',
              marginBottom: 10,
              borderRadius: 4,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                  #{i + 1} {product.productName}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {product.sales.quantity} units sold
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '600', fontSize: 14 }}>
                  {analyticsService.formatCurrency(product.sales.revenue)}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {analyticsService.formatPercentage(product.profitability.marginPercentage)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* By Category */}
      <View>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
          By Category
        </Text>
        {products.byCategory.map((cat, i) => (
          <View
            key={i}
            style={{
              padding: 12,
              backgroundColor: '#f9f9f9',
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>{cat.category}</Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#666',
              }}
            >
              <Text style={{ fontSize: 12, color: '#666' }}>
                {cat.productCount} products
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {analyticsService.formatCurrency(cat.totalRevenue)}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                Top: {cat.topProduct.productName}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 5: Period Comparison Hook
// ============================================================================
/**
 * Custom hook for comparing analytics periods
 */
export function usePeriodComparison() {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const compare = async (daysBack: number = 30) => {
    try {
      setLoading(true);

      const today = analyticsService.getTodayDate();
      const startCurrent = analyticsService.getDateNDaysAgo(daysBack);
      const startPrevious = analyticsService.getDateNDaysAgo(daysBack * 2);
      const endPrevious = analyticsService.getDateNDaysAgo(daysBack);

      const result = await analyticsService.comparePeriods(
        { startDate: startCurrent, endDate: today },
        { startDate: startPrevious, endDate: endPrevious }
      );

      setComparison(result);
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { comparison, loading, compare };
}

// ============================================================================
// EXAMPLE 6: Export Analytics Hook
// ============================================================================
/**
 * Custom hook for exporting analytics reports
 */
export function useExportAnalytics() {
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const exportReport = async (reportType: 'daily' | 'weekly' | 'monthly' = 'monthly') => {
    try {
      setExporting(true);

      const dateRange = analyticsService.buildDateRangeFromPreset('30d');

      const result = await analyticsService.exportAnalytics({
        format: 'excel',
        reportTypes: ['overview', 'sales_forecast', 'customers', 'products'],
        timeRange: dateRange,
        includeCharts: true,
        includeComparisons: true,
      });

      setDownloadUrl(result.url);
      Alert.alert('Success', `Report exported: ${result.filename}`);
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  return { exporting, downloadUrl, exportReport };
}

export default AnalyticsDashboard;
