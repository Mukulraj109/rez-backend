# Analytics Service Guide

Complete documentation for the merchant app analytics API service with forecasting, insights, and trend analysis.

## Overview

The Analytics Service provides comprehensive business intelligence for merchants, including:

- Sales forecasting (7-90 days ahead)
- Inventory stockout predictions
- Customer insights (LTV, retention, churn)
- Seasonal trend analysis
- Product performance metrics
- Revenue breakdown analysis
- Real-time analytics
- CSV/Excel export capabilities

## Files Created

### 1. Type Definitions (`types/analytics.ts`)

Complete TypeScript types for all analytics features:

```
- DateRangeFilter          - Date range selection with presets
- SalesForecast            - Individual forecast data point
- SalesForecastResponse    - Complete sales forecast response
- StockoutPrediction       - Inventory risk prediction
- InventoryStockoutResponse - Complete inventory predictions
- CustomerLifetimeValue    - Customer LTV metrics
- CustomerRetention        - Cohort retention analysis
- ChurnPrediction          - Customer churn risk
- CustomerInsights         - Complete customer analytics
- SeasonalTrend            - Seasonal pattern data
- TrendAnalysis            - Trend strength and direction
- SeasonalTrendResponse    - Complete trend analysis
- ProductPerformance       - Product metrics
- ProductPerformanceResponse - Complete product analytics
- RevenueBreakdown         - Revenue breakdown by dimensions
- RevenueBreakdownResponse - Complete revenue analysis
- AnalyticsOverview        - Dashboard overview
- ExportRequest            - Export configuration
- ExportResponse           - Export result
- AnalyticsQueryOptions    - Query filtering options
- PeriodComparison         - Period-over-period analysis
- RealTimeMetrics          - Live data metrics
```

### 2. Service Implementation (`services/api/analytics.ts`)

Core analytics service with 15+ methods:

## API Methods

### 1. Get Analytics Overview

```typescript
async getAnalyticsOverview(dateRange?: DateRangeFilter): Promise<AnalyticsOverview>
```

Get comprehensive dashboard overview with all key metrics.

**Parameters:**
- `dateRange` (optional) - Date range filter with preset options

**Example:**
```typescript
const overview = await analyticsService.getAnalyticsOverview({
  preset: '30d'
});

console.log('Total Revenue:', overview.sales.totalRevenue);
console.log('Total Orders:', overview.sales.totalOrders);
console.log('Customer Health:', overview.health.overallScore);
```

### 2. Get Sales Forecast

```typescript
async getSalesForecast(
  forecastDays?: 7 | 30 | 60 | 90,
  dateRange?: DateRangeFilter
): Promise<SalesForecastResponse>
```

Forecast sales for next 7-90 days using AI/ML models.

**Parameters:**
- `forecastDays` - 7, 30, 60, or 90 days ahead (default: 30)
- `dateRange` - Historical data range for forecast basis

**Response includes:**
- Forecasted values with confidence intervals
- Upper/lower bounds
- Trend direction
- Historical accuracy metrics
- Seasonality detection

**Example:**
```typescript
const forecast = await analyticsService.getSalesForecast(30, {
  preset: '90d'  // Use last 90 days to train forecast
});

forecast.forecasts.forEach(f => {
  console.log(`${f.period}: $${f.forecasted} (±${f.variance})`);
  console.log(`Confidence: ${f.confidence}%`);
  console.log(`Trend: ${f.trend}`);
});

console.log(`Average forecast: $${forecast.summary.averageForecast}`);
console.log(`Total 30-day forecast: $${forecast.summary.totalForecast}`);
console.log(`Method: ${forecast.method}`);
console.log(`Accuracy: ${forecast.accuracy}%`);
```

### 3. Get Stockout Predictions

```typescript
async getStockoutPredictions(dateRange?: DateRangeFilter): Promise<InventoryStockoutResponse>
```

Predict inventory stockouts and reorder needs.

**Response includes:**
- Days until stockout for each product
- Risk levels (low, medium, high)
- Recommended reorder quantities
- Lead time calculations
- Critical items needing urgent action

**Example:**
```typescript
const stockout = await analyticsService.getStockoutPredictions({
  preset: '30d'
});

console.log(`Products at risk: ${stockout.productsAtRisk}/${stockout.totalProducts}`);

stockout.highRisk.forEach(item => {
  console.log(`🚨 ${item.productName} - Stockout in ${item.daysUntilStockout} days`);
  console.log(`   Daily usage: ${item.dailyAvgUsage} units`);
  console.log(`   Reorder: ${item.recommendedReorderQty} units by ${item.recommendedReorderDate}`);
});

console.log(`Total reorder value: $${stockout.summary.totalReorderValue}`);
stockout.recommendations.urgentReorders.forEach(id => {
  console.log(`Urgent reorder needed for product: ${id}`);
});
```

### 4. Get Customer Insights

```typescript
async getCustomerInsights(dateRange?: DateRangeFilter): Promise<CustomerInsights>
```

Analyze customer segments, lifetime value, retention, and churn.

**Response includes:**
- Total/new/active/inactive/churned customer counts
- Customer Lifetime Value (LTV) analysis
- Retention rates and cohort analysis
- Churn predictions with risk levels
- Customer segmentation
- Recommended retention actions

**Example:**
```typescript
const insights = await analyticsService.getCustomerInsights({
  preset: '90d'
});

console.log(`Total customers: ${insights.totalCustomers}`);
console.log(`New customers: ${insights.newCustomers}`);
console.log(`Retention rate: ${(insights.retention.overallRetentionRate * 100).toFixed(1)}%`);
console.log(`Churn rate: ${(insights.churn.churnRate * 100).toFixed(1)}%`);

console.log(`\nSegmentation:`);
console.log(`High-value: ${insights.segments.highValue}`);
console.log(`Medium-value: ${insights.segments.mediumValue}`);
console.log(`Low-value: ${insights.segments.lowValue}`);

console.log(`\nAt-risk customers: ${insights.churn.atRiskCount}`);
insights.churn.predictions.filter(p => p.riskLevel === 'high').forEach(p => {
  console.log(`- ${p.email}: ${p.churnProbability}% churn risk`);
  console.log(`  Actions: ${p.recommendedActions.join(', ')}`);
});

console.log(`\nAverage LTV: $${insights.ltv.averageLTV}`);
console.log(`Repeat customer rate: ${(insights.retention.repeatCustomerRate * 100).toFixed(1)}%`);
```

### 5. Get Seasonal Trends

```typescript
async getSeasonalTrends(
  dataType?: 'sales' | 'orders' | 'customers' | 'products',
  dateRange?: DateRangeFilter
): Promise<SeasonalTrendResponse>
```

Analyze seasonal patterns and cyclical trends.

**Parameters:**
- `dataType` - Type of data to analyze (default: 'sales')
- `dateRange` - Historical period to analyze

**Response includes:**
- Seasonal trend data by season
- Trend strength (0-100)
- Seasonality index
- Cyclicity patterns
- Peak and trough periods
- Next season predictions

**Example:**
```typescript
const trends = await analyticsService.getSeasonalTrends('sales', {
  preset: '1y'  // Analyze full year for seasonality
});

console.log(`Overall trend: ${trends.overallAnalysis.trend}`);
console.log(`Seasonality strength: ${trends.overallAnalysis.seasonality}%`);
console.log(`Trend strength: ${trends.overallAnalysis.strength}%`);
console.log(`Growth rate: ${(trends.overallAnalysis.growthRate * 100).toFixed(1)}%`);

console.log(`\nSeasonal peaks:`);
trends.peaks.forEach(p => {
  console.log(`${p.period}: $${p.value} (index: ${p.seasonalIndex})`);
});

console.log(`\nNext season prediction:`);
console.log(`Period: ${trends.predictions.nextSeason}`);
console.log(`Expected: ${trends.predictions.expectedValue} (${trends.predictions.expectedTrend})`);
console.log(`Confidence: ${trends.predictions.confidence}%`);

trends.byCategory.forEach(cat => {
  console.log(`\n${cat.category} trend: ${cat.analysis.trend}`);
});
```

### 6. Get Product Performance

```typescript
async getProductPerformance(options?: AnalyticsQueryOptions): Promise<ProductPerformanceResponse>
```

Analyze product sales, profitability, and health metrics.

**Response includes:**
- Top/middle/underperforming products
- Sales and revenue metrics
- Inventory turnover rates
- Customer ratings and reviews
- Profit margins
- Category comparisons
- Performance rankings

**Example:**
```typescript
const products = await analyticsService.getProductPerformance({
  category: 'Electronics',
  sortBy: 'revenue',
  limit: 10
});

console.log(`Analyzed ${products.analyzedProducts}/${products.totalProducts} products`);

console.log(`\nTop performers:`);
products.byPerformance.topPerformers.slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.productName}`);
  console.log(`   Sales: ${p.sales.quantity} units, $${p.sales.revenue}`);
  console.log(`   Margin: ${p.profitability.marginPercentage}%`);
  console.log(`   Rating: ${p.customer.avgRating}/5 (${p.customer.reviewCount} reviews)`);
});

console.log(`\nUnderperformers:`);
products.byPerformance.underperformers.forEach((p, i) => {
  console.log(`${i+1}. ${p.productName} - Health: ${p.performance.health}`);
});

products.byCategory.forEach(cat => {
  console.log(`\n${cat.category}: ${cat.totalRevenue} revenue`);
  console.log(`Top product: ${cat.topProduct.productName}`);
});
```

### 7. Get Revenue Breakdown

```typescript
async getRevenueBreakdown(dateRange?: DateRangeFilter): Promise<RevenueBreakdownResponse>
```

Analyze revenue distribution across dimensions.

**Response includes:**
- Revenue by payment method
- Revenue by category
- Revenue by customer segment
- Revenue by channel
- Refunds analysis
- Net revenue
- Period-over-period comparison

**Example:**
```typescript
const revenue = await analyticsService.getRevenueBreakdown({
  preset: '30d'
});

console.log(`Total revenue: $${revenue.totalRevenue}`);
console.log(`Net revenue: $${revenue.breakdown.netRevenue}`);
console.log(`Refunds: $${revenue.breakdown.refunds.totalAmount} (${revenue.breakdown.refunds.count} items)`);

console.log(`\nBy payment method:`);
revenue.breakdown.byPaymentMethod.forEach(m => {
  console.log(`${m.method}: $${m.amount} (${m.percentage.toFixed(1)}%)`);
});

console.log(`\nBy category:`);
revenue.breakdown.byCategory.forEach(c => {
  console.log(`${c.category}: $${c.amount} (${c.percentage.toFixed(1)}% - ${c.growthRate > 0 ? '+' : ''}${(c.growthRate * 100).toFixed(1)}%)`);
});

console.log(`\nBy customer segment:`);
revenue.breakdown.byCustomerSegment.forEach(s => {
  console.log(`${s.segment}: $${s.amount} from ${s.customerCount} customers (avg $${s.avgOrderValue})`);
});

if (revenue.comparison) {
  console.log(`\nPeriod comparison:`);
  console.log(`Previous period: $${revenue.comparison.previousPeriod}`);
  console.log(`Growth: $${revenue.comparison.growth} (${(revenue.comparison.growthPercentage * 100).toFixed(1)}%)`);
}
```

### 8. Compare Periods

```typescript
async comparePeriods(
  currentDateRange: DateRange,
  previousDateRange: DateRange
): Promise<PeriodComparison>
```

Compare metrics between two periods.

**Example:**
```typescript
const today = analyticsService.getTodayDate();
const thirtyDaysAgo = analyticsService.getDateNDaysAgo(30);
const sixtyDaysAgo = analyticsService.getDateNDaysAgo(60);

const comparison = await analyticsService.comparePeriods(
  { startDate: thirtyDaysAgo, endDate: today },
  { startDate: sixtyDaysAgo, endDate: thirtyDaysAgo }
);

console.log(`Current period: $${comparison.current.revenue}`);
console.log(`Previous period: $${comparison.previous.revenue}`);
console.log(`Change: $${comparison.change.revenue} (${(comparison.change.revenuePercentage * 100).toFixed(1)}%)`);

console.log(`\nOrders:`);
console.log(`Current: ${comparison.current.orders}`);
console.log(`Previous: ${comparison.previous.orders}`);
console.log(`Change: ${comparison.change.orders} (${(comparison.change.ordersPercentage * 100).toFixed(1)}%)`);
```

### 9. Get Real-time Metrics

```typescript
async getRealTimeMetrics(): Promise<RealTimeMetrics>
```

Get live business metrics.

**Example:**
```typescript
const realtime = await analyticsService.getRealTimeMetrics();

console.log(`Last updated: ${realtime.lastUpdated}`);
console.log(`Online customers: ${realtime.onlineCustomers}`);
console.log(`Orders in progress: ${realtime.ordersInProgress}`);
console.log(`System health: ${realtime.systemHealth}`);

realtime.recentTransactions.forEach(t => {
  console.log(`Order ${t.orderId}: $${t.amount} - ${t.status}`);
});
```

### 10. Export Analytics

```typescript
async exportAnalytics(exportRequest: ExportRequest): Promise<ExportResponse>
```

Export analytics reports in CSV, Excel, or PDF format.

**Parameters:**
```typescript
{
  format: 'csv' | 'excel' | 'pdf',
  reportTypes: string[],  // overview, sales_forecast, inventory, customers, trends, products, revenue
  timeRange?: DateRange,
  includeCharts?: boolean,
  includeComparisons?: boolean
}
```

**Example:**
```typescript
const export = await analyticsService.exportAnalytics({
  format: 'excel',
  reportTypes: ['overview', 'sales_forecast', 'customers', 'products'],
  timeRange: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  },
  includeCharts: true,
  includeComparisons: true
});

console.log(`Export created: ${export.filename}`);
console.log(`Download: ${export.url}`);
console.log(`Size: ${export.fileSize} bytes`);
console.log(`Expires: ${export.expiresAt}`);
```

## Helper Methods

### Date Management

```typescript
// Get date range from preset
const range = analyticsService.buildDateRangeFromPreset('30d');
// { startDate: '2024-10-18', endDate: '2024-11-17' }

// Get today's date
const today = analyticsService.getTodayDate();
// '2024-11-17'

// Get date N days ago
const weekAgo = analyticsService.getDateNDaysAgo(7);
// '2024-11-10'

// Calculate days between dates
const days = analyticsService.getDaysDifference('2024-11-01', '2024-11-17');
// 16

// Get previous period (same duration)
const current = { startDate: '2024-11-01', endDate: '2024-11-17' };
const previous = analyticsService.getPreviousPeriodDateRange(current);
// { startDate: '2024-10-16', endDate: '2024-11-01' }

// Parse date string
const date = analyticsService.parseDate('2024-11-17');
// Date object
```

### Formatting

```typescript
// Format currency
analyticsService.formatCurrency(1234.56, 'USD');
// '$1,234.56'

// Format percentage
analyticsService.formatPercentage(0.1523);
// '15.23%'

// Format large numbers
analyticsService.formatCompactNumber(1500000);
// '1.5M'

// Get trend emoji
analyticsService.getTrendEmoji('up');
// '📈'

// Get risk level color
analyticsService.getRiskLevelColor('high');
// '#ef4444' (red)

// Get health status color
analyticsService.getHealthStatusColor('excellent');
// '#059669' (dark green)
```

## Usage Patterns

### Complete Analytics Dashboard

```typescript
import { analyticsService } from '../services/api/analytics';

async function initializeDashboard() {
  try {
    const dateRange = analyticsService.buildDateRangeFromPreset('30d');

    // Parallel requests
    const [overview, forecast, stockout, insights] = await Promise.all([
      analyticsService.getAnalyticsOverview({ preset: '30d' }),
      analyticsService.getSalesForecast(30, { preset: '90d' }),
      analyticsService.getStockoutPredictions({ preset: '30d' }),
      analyticsService.getCustomerInsights({ preset: '30d' })
    ]);

    console.log('Dashboard loaded:', {
      overview,
      forecast: forecast.summary,
      stockout: stockout.summary,
      insights: insights.summary
    });
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}
```

### Product Optimization

```typescript
async function identifyOptimizations() {
  const performance = await analyticsService.getProductPerformance({
    sortBy: 'marginPercentage',
    sortOrder: 'asc'
  });

  const underperformers = performance.byPerformance.underperformers;
  console.log(`${underperformers.length} products need optimization:`);

  underperformers.forEach(p => {
    console.log(`${p.productName}: ${p.performance.health} health`);
    console.log(`- Margin: ${p.profitability.marginPercentage}%`);
    console.log(`- Stock turnover: ${p.inventory.stockTurnovers}x`);
  });
}
```

### Inventory Planning

```typescript
async function planInventory() {
  const stockout = await analyticsService.getStockoutPredictions();

  console.log('Inventory orders needed:');
  stockout.recommendations.urgentReorders.forEach(async (productId) => {
    const risk = [
      ...stockout.highRisk,
      ...stockout.mediumRisk
    ].find(p => p.productId === productId);

    if (risk) {
      console.log(`
        Product: ${risk.productName}
        Quantity: ${risk.recommendedReorderQty} units
        Due: ${risk.recommendedReorderDate}
        Lead time: ${risk.lead_time_days} days
        Budget: $${risk.recommendedReorderQty * 10}
      `);
    }
  });
}
```

### Customer Retention Strategy

```typescript
async function createRetentionStrategy() {
  const insights = await analyticsService.getCustomerInsights();

  const atRiskCustomers = insights.churn.predictions
    .filter(p => p.riskLevel === 'high')
    .slice(0, 20);

  console.log(`Sending retention offers to ${atRiskCustomers.length} customers:`);
  atRiskCustomers.forEach(c => {
    console.log(`${c.email}: ${c.churnProbability}% risk`);
    console.log(`Recommended: ${c.recommendedActions[0]}`);
  });
}
```

## Integration with Components

### React Native Component

```tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { analyticsService } from '../services/api/analytics';
import { AnalyticsOverview } from '../types/analytics';

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      setLoading(true);
      const data = await analyticsService.getAnalyticsOverview({ preset: '30d' });
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (!overview) return <Text>No data</Text>;

  return (
    <View>
      <Text>Revenue: {analyticsService.formatCurrency(overview.sales.totalRevenue)}</Text>
      <Text>Orders: {overview.sales.totalOrders}</Text>
      <Text>Health: {overview.health.overallScore}/100</Text>
    </View>
  );
}
```

## Error Handling

All methods throw descriptive errors. Handle them appropriately:

```typescript
try {
  const forecast = await analyticsService.getSalesForecast();
} catch (error) {
  if (error instanceof Error) {
    console.error(`API Error: ${error.message}`);
    // Handle specific errors
    if (error.message.includes('HTTP 401')) {
      // Redirect to login
    } else if (error.message.includes('HTTP 500')) {
      // Show retry button
    }
  }
}
```

## Performance Considerations

1. **Parallel Requests**: Fetch multiple analytics at once
```typescript
const [overview, forecast, stockout] = await Promise.all([
  analyticsService.getAnalyticsOverview(),
  analyticsService.getSalesForecast(),
  analyticsService.getStockoutPredictions()
]);
```

2. **Caching**: Consider implementing caching for frequently accessed data
```typescript
const cached = await storageService.get('analytics_overview');
if (cached && !isExpired(cached)) {
  return cached;
}
```

3. **Date Range Optimization**: Use preset ranges instead of custom dates
```typescript
// Good
analyticsService.getAnalyticsOverview({ preset: '30d' });

// Less efficient
analyticsService.getAnalyticsOverview({
  startDate: '2024-10-18',
  endDate: '2024-11-17'
});
```

## Deployment Checklist

- [x] Types file created: `types/analytics.ts`
- [x] Service file created: `services/api/analytics.ts`
- [x] Service exported in `services/api/index.ts`
- [x] Authentication token handling implemented
- [x] Error handling implemented
- [x] Date range helpers implemented
- [x] Formatting utilities implemented
- [x] All 15+ API endpoints covered
- [x] Export functionality implemented
- [x] Comprehensive documentation provided

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/analytics/overview` | Dashboard overview |
| GET | `/merchant/analytics/sales/forecast` | Sales forecast |
| GET | `/merchant/analytics/inventory/stockout-prediction` | Stockout predictions |
| GET | `/merchant/analytics/customers/insights` | Customer analytics |
| GET | `/merchant/analytics/trends/seasonal` | Seasonal trends |
| GET | `/merchant/analytics/products/performance` | Product performance |
| GET | `/merchant/analytics/revenue/breakdown` | Revenue breakdown |
| GET | `/merchant/analytics/comparison` | Period comparison |
| GET | `/merchant/analytics/realtime` | Real-time metrics |
| POST | `/merchant/analytics/export` | Export analytics |
| GET | `/merchant/analytics/export/{id}` | Get export URL |

## Support

For issues or questions about the analytics service:
1. Check the examples in this guide
2. Review type definitions in `types/analytics.ts`
3. Check service implementation in `services/api/analytics.ts`
4. Verify API endpoints with backend team
