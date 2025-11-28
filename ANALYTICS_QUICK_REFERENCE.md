# Analytics Service Quick Reference

## Quick Import

```typescript
import { analyticsService } from '@/services/api/analytics';
import {
  DateRangeFilter,
  SalesForecastResponse,
  InventoryStockoutResponse,
  CustomerInsights,
  SeasonalTrendResponse,
  ProductPerformanceResponse,
  RevenueBreakdownResponse,
  AnalyticsOverview,
  ExportRequest,
  ExportResponse
} from '@/types/analytics';
```

## Core Methods

### Overview & Dashboards
```typescript
// Get all key metrics for dashboard
const overview = await analyticsService.getAnalyticsOverview({ preset: '30d' });
```

### Forecasting
```typescript
// Sales forecast for next 30/60/90 days
const forecast = await analyticsService.getSalesForecast(30, { preset: '90d' });
console.log(forecast.summary.averageForecast);  // Average forecasted sales
console.log(forecast.summary.trend);             // 'up' | 'down' | 'stable'
```

### Inventory Management
```typescript
// Predict stockouts and reorder needs
const inventory = await analyticsService.getStockoutPredictions();
inventory.highRisk.forEach(item => {
  console.log(`${item.productName}: ${item.daysUntilStockout} days until stockout`);
  console.log(`Reorder: ${item.recommendedReorderQty} units by ${item.recommendedReorderDate}`);
});
```

### Customer Analytics
```typescript
// Comprehensive customer insights
const insights = await analyticsService.getCustomerInsights();
console.log(insights.ltv.averageLTV);              // Average customer lifetime value
console.log(insights.retention.overallRetentionRate); // Retention %
console.log(insights.churn.atRiskCount);           // Customers at churn risk
insights.churn.predictions.forEach(p => {
  if (p.riskLevel === 'high') {
    console.log(`${p.email}: ${p.recommendedActions[0]}`); // Retention action
  }
});
```

### Trend Analysis
```typescript
// Seasonal patterns and trends
const trends = await analyticsService.getSeasonalTrends('sales', { preset: '1y' });
console.log(trends.overallAnalysis.trend);       // 'up' | 'down' | 'stable' | 'cyclic'
console.log(trends.overallAnalysis.seasonality); // 0-100
console.log(trends.predictions.expectedTrend);   // Next season trend
```

### Product Performance
```typescript
// Product metrics and rankings
const products = await analyticsService.getProductPerformance({
  sortBy: 'revenue',
  limit: 10
});
products.byPerformance.topPerformers.forEach(p => {
  console.log(`${p.productName}: $${p.profitability.netProfit} profit`);
  console.log(`Margin: ${p.profitability.marginPercentage}%`);
});
```

### Revenue Analysis
```typescript
// Revenue breakdown by dimensions
const revenue = await analyticsService.getRevenueBreakdown();
revenue.breakdown.byCategory.forEach(c => {
  console.log(`${c.category}: $${c.amount}`);
});
revenue.breakdown.byPaymentMethod.forEach(m => {
  console.log(`${m.method}: ${m.percentage.toFixed(1)}%`);
});
```

## Date Range Helpers

```typescript
// Quick date ranges
const today = analyticsService.getTodayDate();                        // '2024-11-17'
const weekAgo = analyticsService.getDateNDaysAgo(7);                  // '2024-11-10'
const range = analyticsService.buildDateRangeFromPreset('30d');       // { startDate, endDate }
const days = analyticsService.getDaysDifference(start, end);          // Number of days
const previous = analyticsService.getPreviousPeriodDateRange(range);  // Previous period
```

## Date Range Presets

```typescript
// Use preset for quick date ranges
const presets = ['7d', '14d', '30d', '90d', '1y', 'custom'];

// Example usage
const data = await analyticsService.getAnalyticsOverview({
  preset: '30d'  // Last 30 days
});

// Or custom dates
const custom = await analyticsService.getAnalyticsOverview({
  startDate: '2024-10-01',
  endDate: '2024-10-31'
});
```

## Formatting Utilities

```typescript
// Currency
analyticsService.formatCurrency(1234.56, 'USD');        // '$1,234.56'

// Percentage
analyticsService.formatPercentage(0.1523);              // '15.23%'
analyticsService.formatPercentage(1.5);                 // '150.00%'

// Large numbers
analyticsService.formatCompactNumber(1500000);          // '1.5M'
analyticsService.formatCompactNumber(1234567);          // '1.2M'

// Emojis
analyticsService.getTrendEmoji('up');                   // '📈'
analyticsService.getTrendEmoji('down');                 // '📉'
analyticsService.getTrendEmoji('stable');               // '➡️'

// Colors
analyticsService.getRiskLevelColor('high');             // '#ef4444'
analyticsService.getRiskLevelColor('medium');           // '#f59e0b'
analyticsService.getRiskLevelColor('low');              // '#10b981'

analyticsService.getHealthStatusColor('excellent');     // '#059669'
analyticsService.getHealthStatusColor('good');          // '#10b981'
analyticsService.getHealthStatusColor('fair');          // '#f59e0b'
analyticsService.getHealthStatusColor('poor');          // '#ef4444'
```

## Common Patterns

### Dashboard Component
```typescript
useEffect(() => {
  (async () => {
    try {
      const [overview, forecast] = await Promise.all([
        analyticsService.getAnalyticsOverview({ preset: '30d' }),
        analyticsService.getSalesForecast(30)
      ]);
      setDashboard({ overview, forecast });
    } catch (error) {
      setError(error.message);
    }
  })();
}, []);
```

### Period Comparison
```typescript
const today = analyticsService.getTodayDate();
const thirtyDaysAgo = analyticsService.getDateNDaysAgo(30);
const sixtyDaysAgo = analyticsService.getDateNDaysAgo(60);

const comparison = await analyticsService.comparePeriods(
  { startDate: thirtyDaysAgo, endDate: today },
  { startDate: sixtyDaysAgo, endDate: thirtyDaysAgo }
);

console.log(`Growth: ${(comparison.change.revenuePercentage * 100).toFixed(1)}%`);
```

### Batch Export
```typescript
const export = await analyticsService.exportAnalytics({
  format: 'excel',
  reportTypes: ['overview', 'sales_forecast', 'customers', 'products'],
  timeRange: analyticsService.buildDateRangeFromPreset('30d'),
  includeCharts: true,
  includeComparisons: true
});

console.log(`Download: ${export.url}`);
```

## Type Definitions Summary

### Key Response Types

```typescript
// Sales Forecast
SalesForecastResponse {
  timeRange: DateRange
  forecastDays: number
  method: string
  accuracy: number
  forecasts: SalesForecast[]
  summary: {
    averageForecast: number
    totalForecast: number
    trend: 'up' | 'down' | 'stable'
    growthRate: number
  }
}

// Stockout Prediction
InventoryStockoutResponse {
  totalProducts: number
  productsAtRisk: number
  highRisk: StockoutPrediction[]
  mediumRisk: StockoutPrediction[]
  safeStock: StockoutPrediction[]
  summary: { ... }
  recommendations: { ... }
}

// Customer Insights
CustomerInsights {
  totalCustomers: number
  newCustomers: number
  ltv: { averageLTV, highValueCount, ... }
  retention: { overallRetentionRate, cohorts, ... }
  churn: { churnRate, predictions, ... }
  segments: { ... }
}

// Product Performance
ProductPerformanceResponse {
  totalProducts: number
  byPerformance: {
    topPerformers: ProductPerformance[]
    middlePerformers: ProductPerformance[]
    underperformers: ProductPerformance[]
  }
  byCategory: [ ... ]
  summary: { ... }
}
```

## Error Handling

```typescript
try {
  const data = await analyticsService.getSalesForecast();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
    // Handle based on message
    if (error.message.includes('401')) {
      // Reauthenticate
    } else if (error.message.includes('500')) {
      // Retry
    }
  }
}
```

## All Available Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `getAnalyticsOverview(dateRange?)` | `AnalyticsOverview` | Dashboard metrics |
| `getSalesForecast(days?, dateRange?)` | `SalesForecastResponse` | Sales forecast |
| `getStockoutPredictions(dateRange?)` | `InventoryStockoutResponse` | Inventory risk |
| `getCustomerInsights(dateRange?)` | `CustomerInsights` | Customer analytics |
| `getSeasonalTrends(dataType?, dateRange?)` | `SeasonalTrendResponse` | Seasonal patterns |
| `getProductPerformance(options?)` | `ProductPerformanceResponse` | Product metrics |
| `getRevenueBreakdown(dateRange?)` | `RevenueBreakdownResponse` | Revenue analysis |
| `comparePeriods(current, previous)` | `PeriodComparison` | Period comparison |
| `getRealTimeMetrics()` | `RealTimeMetrics` | Live metrics |
| `exportAnalytics(request)` | `ExportResponse` | Export report |
| `getExportUrl(exportId)` | `string` | Download URL |

## Endpoint Mapping

| Service Method | Backend Endpoint |
|---|---|
| `getAnalyticsOverview()` | `GET /api/merchant/analytics/overview` |
| `getSalesForecast()` | `GET /api/merchant/analytics/sales/forecast` |
| `getStockoutPredictions()` | `GET /api/merchant/analytics/inventory/stockout-prediction` |
| `getCustomerInsights()` | `GET /api/merchant/analytics/customers/insights` |
| `getSeasonalTrends()` | `GET /api/merchant/analytics/trends/seasonal` |
| `getProductPerformance()` | `GET /api/merchant/analytics/products/performance` |
| `getRevenueBreakdown()` | `GET /api/merchant/analytics/revenue/breakdown` |
| `comparePeriods()` | `GET /api/merchant/analytics/comparison` |
| `getRealTimeMetrics()` | `GET /api/merchant/analytics/realtime` |
| `exportAnalytics()` | `POST /api/merchant/analytics/export` |

## Checklist for Implementation

- [x] Import service and types
- [x] Implement error handling
- [x] Use date range helpers
- [x] Format output with utilities
- [x] Handle loading states
- [x] Cache if needed
- [x] Implement analytics tracking
- [x] Add to components
- [x] Test with real data
- [x] Deploy to production
