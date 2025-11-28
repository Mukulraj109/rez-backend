import { Colors } from '@/constants/Colors';

/**
 * Chart color palette
 */
export const CHART_COLORS = {
  primary: Colors.light.primary,
  secondary: Colors.light.secondary,
  tertiary: Colors.light.tertiary,
  success: Colors.light.success,
  warning: Colors.light.warning,
  danger: Colors.light.danger,
  info: Colors.light.info,

  // Extended palette for multi-series charts
  palette: [
    Colors.light.primary,    // Purple
    Colors.light.info,       // Blue
    Colors.light.success,    // Green
    Colors.light.warning,    // Amber
    Colors.light.secondary,  // Green
    Colors.light.tertiary,   // Indigo
    '#EC4899',              // Pink
    '#8B5CF6',              // Violet
    '#14B8A6',              // Teal
    '#F97316',              // Orange
  ],

  // Gradient colors
  gradients: {
    success: ['#10B981', '#34D399'],
    warning: ['#F59E0B', '#FBBF24'],
    danger: ['#EF4444', '#F87171'],
    primary: ['#7C3AED', '#A855F7'],
    info: ['#3B82F6', '#60A5FA'],
  },
};

/**
 * Format data for line/bar charts
 * @param data Array of data points
 * @param xKey Key for x-axis values
 * @param yKey Key for y-axis values
 * @returns Formatted chart data
 */
export function formatChartData<T>(
  data: T[],
  xKey: keyof T,
  yKey: keyof T
): Array<{ x: string | number; y: number; label?: string }> {
  return data.map((item) => ({
    x: item[xKey] as string | number,
    y: Number(item[yKey]) || 0,
    label: String(item[xKey]),
  }));
}

/**
 * Format data for multi-series charts
 * @param data Array of data points
 * @param xKey Key for x-axis values
 * @param seriesKeys Array of keys for different series
 * @returns Formatted multi-series chart data
 */
export function formatMultiSeriesData<T>(
  data: T[],
  xKey: keyof T,
  seriesKeys: Array<{ key: keyof T; label: string; color?: string }>
): Array<{ x: string | number; [key: string]: string | number }> {
  return data.map((item) => {
    const point: any = { x: item[xKey] as string | number };
    seriesKeys.forEach((series) => {
      point[series.label] = Number(item[series.key]) || 0;
    });
    return point;
  });
}

/**
 * Calculate trend from data points
 * @param data Array of numeric values
 * @returns Trend object with direction, percentage, and value
 */
export function calculateTrend(data: number[]): {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  value: number;
  isSignificant: boolean;
} {
  if (!data || data.length < 2) {
    return { direction: 'stable', percentage: 0, value: 0, isSignificant: false };
  }

  const first = data[0];
  const last = data[data.length - 1];
  const change = last - first;
  const percentage = first !== 0 ? (change / first) * 100 : 0;

  // Consider trend significant if change is > 5%
  const isSignificant = Math.abs(percentage) > 5;

  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    percentage,
    value: change,
    isSignificant,
  };
}

/**
 * Calculate moving average for smoothing data
 * @param data Array of numeric values
 * @param window Window size for moving average
 * @returns Smoothed data array
 */
export function calculateMovingAverage(data: number[], window: number = 7): number[] {
  if (!data || data.length === 0) return [];
  if (window <= 1) return data;

  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const windowData = data.slice(start, end);
    const average = windowData.reduce((sum, val) => sum + val, 0) / windowData.length;
    result.push(average);
  }

  return result;
}

/**
 * Get color palette for charts
 * @param count Number of colors needed
 * @returns Array of colors
 */
export function getChartColors(count: number = 1): string[] {
  const colors = [...CHART_COLORS.palette];

  if (count <= colors.length) {
    return colors.slice(0, count);
  }

  // If we need more colors, repeat the palette
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }

  return result;
}

/**
 * Format axis label based on value type
 * @param value Numeric value
 * @param type Type of formatting (currency, number, percentage)
 * @param compact Whether to use compact notation (K, M, B)
 * @returns Formatted label string
 */
export function formatAxisLabel(
  value: number,
  type: 'currency' | 'number' | 'percentage' = 'number',
  compact: boolean = true
): string {
  if (type === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  if (type === 'currency') {
    if (compact) {
      return formatCurrencyCompact(value);
    }
    return `₹${value.toLocaleString()}`;
  }

  // Number
  if (compact) {
    return formatNumberCompact(value);
  }
  return value.toLocaleString();
}

/**
 * Format currency with compact notation
 * @param value Numeric value
 * @returns Formatted currency string
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 10_000_000) {
    return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  }
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(1)}L`;
  }
  if (value >= 1_000) {
    return `₹${(value / 1_000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
}

/**
 * Format number with compact notation
 * @param value Numeric value
 * @returns Formatted number string
 */
export function formatNumberCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Aggregate data by time interval
 * @param data Array of data points with timestamp
 * @param interval Aggregation interval (hour, day, week, month)
 * @param valueKey Key for values to aggregate
 * @returns Aggregated data
 */
export function aggregateData<T extends { timestamp: string | Date }>(
  data: T[],
  interval: 'hour' | 'day' | 'week' | 'month',
  valueKey: keyof T
): Array<{ period: string; value: number; count: number }> {
  const aggregated = new Map<string, { sum: number; count: number }>();

  data.forEach((item) => {
    const date = new Date(item.timestamp);
    let key: string;

    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString();
    }

    const value = Number(item[valueKey]) || 0;
    const existing = aggregated.get(key) || { sum: 0, count: 0 };
    aggregated.set(key, {
      sum: existing.sum + value,
      count: existing.count + 1,
    });
  });

  return Array.from(aggregated.entries())
    .map(([period, { sum, count }]) => ({
      period,
      value: sum,
      count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Smooth data using exponential smoothing
 * @param data Array of numeric values
 * @param alpha Smoothing factor (0-1)
 * @returns Smoothed data
 */
export function smoothData(data: number[], alpha: number = 0.3): number[] {
  if (!data || data.length === 0) return [];

  const smoothed: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const smoothedValue = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
    smoothed.push(smoothedValue);
  }

  return smoothed;
}

/**
 * Calculate percentage distribution
 * @param data Array of objects with values
 * @param valueKey Key for values
 * @returns Array with percentages added
 */
export function calculatePercentages<T>(
  data: T[],
  valueKey: keyof T
): Array<T & { percentage: number }> {
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);

  if (total === 0) {
    return data.map((item) => ({ ...item, percentage: 0 }));
  }

  return data.map((item) => ({
    ...item,
    percentage: ((Number(item[valueKey]) || 0) / total) * 100,
  }));
}

/**
 * Get color based on value and thresholds
 * @param value Numeric value
 * @param thresholds Object with good, warning, and danger thresholds
 * @returns Color string
 */
export function getValueColor(
  value: number,
  thresholds: { good: number; warning: number; danger?: number }
): string {
  if (value >= thresholds.good) {
    return CHART_COLORS.success;
  }
  if (value >= thresholds.warning) {
    return CHART_COLORS.warning;
  }
  return CHART_COLORS.danger;
}

/**
 * Get trend color based on direction and context
 * @param direction Trend direction
 * @param isPositive Whether up is good (true) or bad (false)
 * @returns Color string
 */
export function getTrendColor(
  direction: 'up' | 'down' | 'stable',
  isPositive: boolean = true
): string {
  if (direction === 'stable') return Colors.light.textSecondary;

  if (direction === 'up') {
    return isPositive ? CHART_COLORS.success : CHART_COLORS.danger;
  }

  return isPositive ? CHART_COLORS.danger : CHART_COLORS.success;
}

/**
 * Generate date labels for a date range
 * @param startDate Start date
 * @param endDate End date
 * @param interval Interval for labels
 * @returns Array of date labels
 */
export function generateDateLabels(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month' = 'day'
): string[] {
  const labels: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const label = formatDateLabel(current, interval);
    labels.push(label);

    // Increment based on interval
    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return labels;
}

/**
 * Format date for chart labels
 * @param date Date object
 * @param format Format type
 * @returns Formatted date string
 */
export function formatDateLabel(
  date: Date,
  format: 'day' | 'week' | 'month' | 'short' = 'day'
): string {
  switch (format) {
    case 'day':
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    case 'week':
      return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleString('default', { month: 'short' })}`;
    case 'month':
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    case 'short':
      return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Calculate chart dimensions based on container
 * @param containerWidth Container width
 * @param aspectRatio Desired aspect ratio (default 16:9)
 * @returns Chart dimensions
 */
export function calculateChartDimensions(
  containerWidth: number,
  aspectRatio: number = 16 / 9
): { width: number; height: number } {
  const width = containerWidth - 32; // Account for padding
  const height = width / aspectRatio;

  return { width, height };
}

/**
 * Find min and max values in dataset
 * @param data Array of numeric values
 * @param padding Padding percentage to add to range
 * @returns Min and max values with padding
 */
export function getDataRange(
  data: number[],
  padding: number = 0.1
): { min: number; max: number } {
  if (!data || data.length === 0) {
    return { min: 0, max: 100 };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  return {
    min: min - range * padding,
    max: max + range * padding,
  };
}

/**
 * Normalize data to 0-100 scale
 * @param data Array of numeric values
 * @returns Normalized data
 */
export function normalizeData(data: number[]): number[] {
  const { min, max } = getDataRange(data, 0);
  const range = max - min;

  if (range === 0) return data.map(() => 50);

  return data.map((value) => ((value - min) / range) * 100);
}

/**
 * Generate sample chart data for testing
 * @param count Number of data points
 * @param min Minimum value
 * @param max Maximum value
 * @returns Sample data array
 */
export function generateSampleData(
  count: number = 30,
  min: number = 0,
  max: number = 100
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => ({
    x: i,
    y: Math.random() * (max - min) + min,
  }));
}
