# Analytics Components

Comprehensive analytics components for the merchant app, providing professional data visualization and metrics display.

## Components Overview

### Chart Components

#### 1. LineChart
Reusable line chart component with support for multiple data series, trends, and confidence intervals.

**Features:**
- Multiple data series support
- Historical + forecast data with dashed lines
- Confidence intervals (shaded area)
- Interactive tooltips
- Responsive design
- Custom colors and formatting
- Grid lines and axis labels

**Usage:**
```tsx
import { LineChart } from '@/components/analytics';

<LineChart
  series={[
    {
      id: 'revenue',
      name: 'Revenue',
      data: [
        { x: '2024-01', y: 1000 },
        { x: '2024-02', y: 1200 },
      ],
      color: '#7C3AED',
    },
  ]}
  showLegend
  showGrid
  showTooltip
  xAxisLabel="Month"
  yAxisLabel="Revenue ($)"
  formatYValue={(value) => `$${value}`}
/>
```

#### 2. BarChart
Versatile bar chart component supporting vertical/horizontal orientation and grouped/stacked bars.

**Features:**
- Vertical/horizontal orientation
- Single, grouped, or stacked bars
- Value labels on bars
- Custom colors
- Interactive bar selection
- Responsive design

**Usage:**
```tsx
import { BarChart } from '@/components/analytics';

<BarChart
  data={[
    { label: 'Jan', value: 1000, color: '#7C3AED' },
    { label: 'Feb', value: 1500, color: '#10B981' },
  ]}
  orientation="vertical"
  type="single"
  showValues
  showGrid
  onBarPress={(bar, index) => console.log(bar)}
/>
```

**Grouped Bars:**
```tsx
<BarChart
  data={[
    {
      label: 'Jan',
      groupValues: [1000, 800, 600],
    },
  ]}
  type="grouped"
  groupLabels={['Product A', 'Product B', 'Product C']}
/>
```

#### 3. ForecastChart
Specialized forecast visualization showing historical data (solid line) and predictions (dashed line).

**Features:**
- Historical data (solid line)
- Predicted data (dashed line)
- Confidence interval (shaded area)
- Key dates markers
- Legend and interpretation guide
- Zoom/pan support

**Usage:**
```tsx
import { ForecastChart } from '@/components/analytics';

<ForecastChart
  data={[
    { date: '2024-01', actual: 1000 },
    { date: '2024-02', predicted: 1200, confidenceUpper: 1300, confidenceLower: 1100 },
  ]}
  title="Revenue Forecast"
  keyDates={[
    { date: '2024-02-15', label: 'Promotion Start', color: '#F59E0B' },
  ]}
  showConfidenceInterval
/>
```

#### 4. SegmentPieChart
Pie/donut chart for displaying categorical data segments.

**Features:**
- Pie or donut chart types
- Interactive slices
- Legend with values and percentages
- Custom colors
- Center label for donut charts

**Usage:**
```tsx
import { SegmentPieChart } from '@/components/analytics';

<SegmentPieChart
  data={[
    { id: '1', label: 'Electronics', value: 5000 },
    { id: '2', label: 'Clothing', value: 3000 },
    { id: '3', label: 'Food', value: 2000 },
  ]}
  type="donut"
  showLegend
  showPercentages
  centerLabel="Total Revenue"
  centerValue="$10,000"
/>
```

### Metric Components

#### 5. MetricCard
Display single metric with title, value, trend, and icon.

**Features:**
- Title, value, change display
- Icon with custom color
- Trend indicator
- Clickable for detail view
- Loading skeleton state

**Usage:**
```tsx
import { MetricCard } from '@/components/analytics';

<MetricCard
  title="Total Revenue"
  value={15000}
  change={12.5}
  trend="up"
  icon="trending-up"
  iconColor="#10B981"
  subtitle="vs last month"
  formatValue={(value) => `$${value.toLocaleString()}`}
  onPress={() => console.log('View details')}
  loading={false}
/>
```

#### 6. CustomerMetricCard
Specialized card for customer metrics (CLV, retention, churn, satisfaction).

**Features:**
- Pre-configured metric types
- Trend indicator (with inverted logic for negative metrics)
- Visual gauge/progress bar
- Color-coded based on value
- Additional metrics display

**Usage:**
```tsx
import { CustomerMetricCard } from '@/components/analytics';

<CustomerMetricCard
  type="clv"
  value={1250}
  previousValue={1100}
  percentageChange={13.6}
  trend="up"
  currency="$"
  showGauge
  maxValue={2000}
  onPress={() => console.log('View CLV details')}
/>
```

**Available Metric Types:**
- `clv` - Customer Lifetime Value
- `retention` - Retention Rate
- `churn` - Churn Rate
- `satisfaction` - Customer Satisfaction
- `engagement` - Engagement Score

#### 7. StockoutAlertCard
Display stockout predictions with risk level and recommended actions.

**Features:**
- Product info with image
- Risk level indicator (high/medium/low)
- Days until stockout
- Recommended reorder quantity
- Progress bar showing stock level
- Action buttons (Reorder, View Details, Dismiss)

**Usage:**
```tsx
import { StockoutAlertCard } from '@/components/analytics';

<StockoutAlertCard
  productId="P123"
  productName="Premium Widget"
  productImage="https://example.com/image.jpg"
  currentStock={25}
  riskLevel="high"
  daysUntilStockout={5}
  recommendedReorderQty={100}
  predictedDate="2024-02-20"
  onReorder={() => console.log('Reorder')}
  onDismiss={() => console.log('Dismiss')}
  onViewDetails={() => console.log('View details')}
/>
```

### Utility Components

#### 8. TrendIndicator
Show trend direction with arrow, percentage change, and color coding.

**Features:**
- Up/down/flat arrows
- Percentage or absolute change
- Color-coded (green/red/gray)
- Multiple sizes (small/medium/large)
- Inverted logic support for negative metrics

**Usage:**
```tsx
import { TrendIndicator } from '@/components/analytics';

<TrendIndicator
  trend="up"
  value={12.5}
  isPositive={true}
  size="medium"
  showPercentage
  showIcon
/>
```

#### 9. DateRangeSelector
Date range selection with preset options and custom picker.

**Features:**
- Preset options (7d, 30d, 90d, 1y)
- Custom date range picker
- Quick filters (Yesterday, Today, This Month)
- Apply button
- Modal interface

**Usage:**
```tsx
import { DateRangeSelector } from '@/components/analytics';

const [dateRange, setDateRange] = useState({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

<DateRangeSelector
  value={dateRange}
  onChange={setDateRange}
  presets={['7d', '30d', '90d', '1y', 'custom']}
  maxDate={new Date()}
/>
```

#### 10. ExportButton
Export analytics data to various formats (CSV, Excel, PDF).

**Features:**
- Format selection (CSV, Excel, PDF)
- Export progress indicator
- Download link
- Modal interface
- Disabled state support

**Usage:**
```tsx
import { ExportButton } from '@/components/analytics';

<ExportButton
  data={analyticsData}
  filename="monthly_report"
  onExport={async (options) => {
    // Perform export logic
    console.log('Exporting as', options.format);
    return 'https://example.com/download/file.csv';
  }}
  disabled={false}
/>
```

## Design System Integration

All components are fully integrated with the merchant app design system:

- **Colors**: Uses theme colors from `constants/Colors.ts`
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standard padding and margins
- **Dark Mode**: Full support for light/dark themes
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Responsive Design

All components are responsive and work across different screen sizes:

- Mobile: Optimized for small screens with horizontal scrolling where needed
- Tablet: Full-width layouts with better spacing
- Desktop: Multi-column layouts where appropriate

## Loading States

Components include loading states for async data:

```tsx
<MetricCard
  title="Revenue"
  value={0}
  loading={true}
/>
```

## Error Handling

Components handle edge cases gracefully:

- Empty data sets
- Invalid data
- Missing optional props
- Network errors (for data fetching)

## Best Practices

### 1. Data Formatting

Always format data before passing to components:

```tsx
const formattedData = rawData.map(item => ({
  label: item.month,
  value: parseFloat(item.revenue),
}));
```

### 2. Performance

For large datasets, consider:
- Pagination
- Virtual scrolling
- Data aggregation
- Lazy loading

### 3. Accessibility

Ensure all interactive elements are accessible:

```tsx
<TouchableOpacity
  accessible
  accessibilityLabel="View revenue details"
  accessibilityRole="button"
>
  {/* Content */}
</TouchableOpacity>
```

### 4. Theme Support

Always use theme colors instead of hardcoded values:

```tsx
const colorScheme = useColorScheme();
const theme = Colors[colorScheme ?? 'light'];

<View style={{ backgroundColor: theme.card }}>
```

## Example Integration

Complete example showing multiple components together:

```tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  MetricCard,
  LineChart,
  BarChart,
  DateRangeSelector,
  ExportButton,
  StockoutAlertCard,
} from '@/components/analytics';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  return (
    <ScrollView>
      {/* Date Range Selector */}
      <DateRangeSelector value={dateRange} onChange={setDateRange} />

      {/* Metric Cards */}
      <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
        <MetricCard
          title="Total Revenue"
          value={15000}
          change={12.5}
          trend="up"
          icon="cash"
        />
        <MetricCard
          title="Orders"
          value={245}
          change={-5.2}
          trend="down"
          icon="cart"
        />
      </View>

      {/* Line Chart */}
      <LineChart
        series={[
          {
            id: 'revenue',
            name: 'Revenue',
            data: monthlyData,
            color: '#7C3AED',
          },
        ]}
        showLegend
        showGrid
      />

      {/* Stockout Alerts */}
      <StockoutAlertCard
        productId="P123"
        productName="Premium Widget"
        currentStock={25}
        riskLevel="high"
        daysUntilStockout={5}
        recommendedReorderQty={100}
        predictedDate="2024-02-20"
        onReorder={() => handleReorder()}
      />

      {/* Export Button */}
      <ExportButton
        data={analyticsData}
        onExport={handleExport}
      />
    </ScrollView>
  );
}
```

## TypeScript Support

All components are fully typed with TypeScript interfaces:

```tsx
import type {
  LineChartProps,
  BarChartProps,
  MetricCardProps,
} from '@/components/analytics';
```

## Contributing

When adding new analytics components:

1. Follow existing patterns and naming conventions
2. Include TypeScript types
3. Add loading and error states
4. Support light/dark themes
5. Include accessibility features
6. Document props and usage
7. Add examples to README

## License

Part of the merchant app project.
