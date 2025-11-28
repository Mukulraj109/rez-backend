# Analytics Components - Quick Start Guide

## Import Components

```tsx
import {
  // Charts
  LineChart,
  BarChart,
  ForecastChart,
  SegmentPieChart,

  // Metrics
  MetricCard,
  CustomerMetricCard,
  StockoutAlertCard,

  // Utils
  TrendIndicator,
  DateRangeSelector,
  ExportButton,
} from '@/components/analytics';
```

## Basic Usage Examples

### 1. Simple Metric Card
```tsx
<MetricCard
  title="Total Revenue"
  value={15000}
  change={12.5}
  trend="up"
  icon="cash"
  formatValue={(val) => `$${val.toLocaleString()}`}
  onPress={() => navigation.navigate('RevenueDetails')}
/>
```

### 2. Line Chart (Revenue Over Time)
```tsx
<LineChart
  series={[
    {
      id: 'revenue',
      name: 'Revenue',
      data: [
        { x: 'Jan', y: 1000 },
        { x: 'Feb', y: 1200 },
        { x: 'Mar', y: 1100 },
      ],
      color: '#7C3AED',
    },
  ]}
  showLegend
  showGrid
  xAxisLabel="Month"
  yAxisLabel="Revenue"
  formatYValue={(val) => `$${val}`}
/>
```

### 3. Bar Chart (Sales by Category)
```tsx
<BarChart
  data={[
    { label: 'Electronics', value: 5000 },
    { label: 'Clothing', value: 3000 },
    { label: 'Food', value: 2000 },
  ]}
  orientation="vertical"
  showValues
  showGrid
  formatValue={(val) => `$${val}`}
/>
```

### 4. Customer Lifetime Value
```tsx
<CustomerMetricCard
  type="clv"
  value={1250}
  previousValue={1100}
  percentageChange={13.6}
  trend="up"
  currency="$"
  showGauge
  onPress={() => navigation.navigate('CustomerDetails')}
/>
```

### 5. Stock Alert
```tsx
<StockoutAlertCard
  productId="P123"
  productName="Premium Widget"
  productImage="https://example.com/image.jpg"
  currentStock={25}
  riskLevel="high"
  daysUntilStockout={5}
  recommendedReorderQty={100}
  predictedDate="2024-02-20"
  onReorder={() => handleReorder()}
  onViewDetails={() => navigation.navigate('Product', { id: 'P123' })}
/>
```

### 6. Date Range Filter
```tsx
const [dateRange, setDateRange] = useState({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

<DateRangeSelector
  value={dateRange}
  onChange={setDateRange}
  presets={['7d', '30d', '90d', '1y']}
/>
```

### 7. Export Data
```tsx
<ExportButton
  data={analyticsData}
  filename="monthly_report"
  onExport={async (options) => {
    const url = await exportService.export(options.format, analyticsData);
    return url;
  }}
/>
```

### 8. Pie Chart (Revenue Distribution)
```tsx
<SegmentPieChart
  data={[
    { id: '1', label: 'Electronics', value: 5000, color: '#7C3AED' },
    { id: '2', label: 'Clothing', value: 3000, color: '#10B981' },
    { id: '3', label: 'Food', value: 2000, color: '#F59E0B' },
  ]}
  type="donut"
  showLegend
  centerLabel="Total"
  centerValue="$10K"
/>
```

### 9. Forecast Chart
```tsx
<ForecastChart
  data={[
    { date: '2024-01', actual: 1000 },
    { date: '2024-02', actual: 1200 },
    { date: '2024-03', predicted: 1300, confidenceUpper: 1400, confidenceLower: 1200 },
  ]}
  title="Revenue Forecast - Next 3 Months"
  showConfidenceInterval
/>
```

### 10. Trend Indicator (Standalone)
```tsx
<TrendIndicator
  trend="up"
  value={12.5}
  size="medium"
  showPercentage
/>
```

## Complete Dashboard Example

```tsx
import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  MetricCard,
  LineChart,
  BarChart,
  CustomerMetricCard,
  StockoutAlertCard,
  DateRangeSelector,
  ExportButton,
  SegmentPieChart,
} from '@/components/analytics';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  return (
    <ScrollView style={styles.container}>
      {/* Header with Date Range and Export */}
      <View style={styles.header}>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        <ExportButton
          data={analyticsData}
          onExport={handleExport}
        />
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="Revenue"
          value={15000}
          change={12.5}
          trend="up"
          icon="cash"
          formatValue={(val) => `$${val.toLocaleString()}`}
        />
        <MetricCard
          title="Orders"
          value={245}
          change={-5.2}
          trend="down"
          icon="cart"
        />
        <MetricCard
          title="Customers"
          value={1200}
          change={8.3}
          trend="up"
          icon="people"
        />
      </View>

      {/* Revenue Chart */}
      <View style={styles.section}>
        <LineChart
          series={[
            {
              id: 'revenue',
              name: 'Revenue',
              data: monthlyRevenue,
              color: '#7C3AED',
            },
          ]}
          showLegend
          showGrid
          xAxisLabel="Month"
          yAxisLabel="Revenue ($)"
        />
      </View>

      {/* Customer Metrics */}
      <View style={styles.metricsRow}>
        <CustomerMetricCard
          type="clv"
          value={1250}
          trend="up"
          percentageChange={13.6}
        />
        <CustomerMetricCard
          type="retention"
          value={85.5}
          trend="up"
          percentageChange={2.3}
        />
      </View>

      {/* Category Distribution */}
      <View style={styles.section}>
        <SegmentPieChart
          data={categoryData}
          type="donut"
          showLegend
          centerLabel="Total Revenue"
          centerValue="$50K"
        />
      </View>

      {/* Stock Alerts */}
      <View style={styles.section}>
        {stockAlerts.map((alert) => (
          <StockoutAlertCard
            key={alert.productId}
            {...alert}
            onReorder={() => handleReorder(alert.productId)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
});
```

## Common Patterns

### Loading State
```tsx
<MetricCard
  title="Revenue"
  value={0}
  loading={true}
/>
```

### Grouped Bar Chart
```tsx
<BarChart
  data={[
    {
      label: 'Jan',
      groupValues: [1000, 800, 600],
    },
    {
      label: 'Feb',
      groupValues: [1200, 900, 700],
    },
  ]}
  type="grouped"
  groupLabels={['Product A', 'Product B', 'Product C']}
/>
```

### Multiple Line Series
```tsx
<LineChart
  series={[
    {
      id: 'revenue',
      name: 'Revenue',
      data: revenueData,
      color: '#7C3AED',
    },
    {
      id: 'profit',
      name: 'Profit',
      data: profitData,
      color: '#10B981',
    },
  ]}
  showLegend
/>
```

### Horizontal Bar Chart
```tsx
<BarChart
  data={categoryData}
  orientation="horizontal"
  type="single"
  showValues
/>
```

### Customer Metrics Grid
```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
  <CustomerMetricCard type="clv" value={1250} />
  <CustomerMetricCard type="retention" value={85.5} />
  <CustomerMetricCard type="churn" value={4.2} />
  <CustomerMetricCard type="satisfaction" value={4.5} />
</View>
```

## Pro Tips

### 1. Format Values Consistently
```tsx
const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
```

### 2. Theme-Aware Colors
```tsx
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

const colorScheme = useColorScheme();
const theme = Colors[colorScheme ?? 'light'];
```

### 3. Responsive Layout
```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <LineChart width={600} />
</ScrollView>
```

### 4. Error Handling
```tsx
try {
  const url = await onExport(options);
  Alert.alert('Success', 'File exported successfully');
} catch (error) {
  Alert.alert('Error', 'Failed to export file');
}
```

### 5. Data Validation
```tsx
const validData = data.filter(item =>
  item.value !== null &&
  item.value !== undefined &&
  !isNaN(item.value)
);
```

## Performance Tips

1. **Memoize expensive calculations:**
```tsx
const chartData = useMemo(() =>
  processData(rawData),
  [rawData]
);
```

2. **Lazy load heavy components:**
```tsx
const ForecastChart = lazy(() => import('./ForecastChart'));
```

3. **Virtualize long lists:**
```tsx
<FlatList
  data={alerts}
  renderItem={({ item }) => <StockoutAlertCard {...item} />}
/>
```

4. **Debounce user inputs:**
```tsx
const debouncedSetDateRange = useMemo(
  () => debounce(setDateRange, 300),
  []
);
```

## Troubleshooting

### Charts Not Displaying
- Check data format matches expected interface
- Verify all required props are provided
- Ensure width/height are set properly

### Theme Colors Not Working
- Import Colors from constants/Colors.ts
- Use useColorScheme() hook
- Apply theme colors in styles

### Performance Issues
- Reduce data points for charts (aggregate if needed)
- Use loading states for async operations
- Implement virtualization for lists

### TypeScript Errors
- Check prop types match interfaces
- Import types from component files
- Use proper type annotations

## Resources

- Full Documentation: `components/analytics/README.md`
- Complete Guide: `ANALYTICS_COMPONENTS_COMPLETE.md`
- Component Files: `components/analytics/`

## Support

For issues or questions:
1. Check component documentation
2. Review usage examples
3. Verify prop types
4. Test with sample data

Happy building! 📊
