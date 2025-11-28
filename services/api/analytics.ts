import { getApiUrl } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ExportResponse,
  AnalyticsQueryOptions,
  PeriodComparison,
  RealTimeMetrics,
  AnalyticsResponse,
  DateRangePreset,
  DateRange,
} from '../../types/analytics';

class AnalyticsService {
  /**
   * Get analytics overview for dashboard
   * @param dateRange Date range filter
   * @returns AnalyticsOverview with key metrics
   */
  async getAnalyticsOverview(dateRange?: DateRangeFilter): Promise<AnalyticsOverview> {
    try {
      const params = this.buildQueryParams({ timeRange: dateRange });
      const response = await fetch(getApiUrl(`merchant/analytics/overview?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get analytics overview');
      }
    } catch (error: any) {
      console.error('Get analytics overview error:', error);
      throw new Error(error.message || 'Failed to get analytics overview');
    }
  }

  /**
   * Get sales forecast for specified period
   * @param forecastDays 7, 30, 60, or 90 days ahead
   * @param dateRange Historical date range for forecast basis
   * @returns SalesForecastResponse with forecasted sales
   */
  async getSalesForecast(
    forecastDays: 7 | 30 | 60 | 90 = 30,
    dateRange?: DateRangeFilter
  ): Promise<SalesForecastResponse> {
    try {
      const params = new URLSearchParams();
      params.append('forecastDays', forecastDays.toString());

      if (dateRange) {
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);
        if (dateRange.preset) params.append('preset', dateRange.preset);
      }

      const response = await fetch(getApiUrl(`merchant/analytics/sales/forecast?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get sales forecast');
      }
    } catch (error: any) {
      console.error('Get sales forecast error:', error);
      throw new Error(error.message || 'Failed to get sales forecast');
    }
  }

  /**
   * Get inventory stockout predictions
   * @param dateRange Date range for analysis
   * @returns InventoryStockoutResponse with risk predictions
   */
  async getStockoutPredictions(
    dateRange?: DateRangeFilter
  ): Promise<InventoryStockoutResponse> {
    try {
      const params = this.buildQueryParams({ timeRange: dateRange });
      const response = await fetch(getApiUrl(`merchant/analytics/inventory/stockout-prediction?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get stockout predictions');
      }
    } catch (error: any) {
      console.error('Get stockout predictions error:', error);
      throw new Error(error.message || 'Failed to get stockout predictions');
    }
  }

  /**
   * Get customer insights including LTV, retention, and churn analysis
   * @param dateRange Date range for analysis
   * @returns CustomerInsights with comprehensive customer analytics
   */
  async getCustomerInsights(
    dateRange?: DateRangeFilter
  ): Promise<CustomerInsights> {
    try {
      const params = this.buildQueryParams({ timeRange: dateRange });
      const response = await fetch(getApiUrl(`merchant/analytics/customers/insights?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get customer insights');
      }
    } catch (error: any) {
      console.error('Get customer insights error:', error);
      throw new Error(error.message || 'Failed to get customer insights');
    }
  }

  /**
   * Get seasonal trend analysis
   * @param dataType Type of data to analyze (sales, orders, customers, products)
   * @param dateRange Date range for analysis
   * @returns SeasonalTrendResponse with trend patterns
   */
  async getSeasonalTrends(
    dataType: 'sales' | 'orders' | 'customers' | 'products' = 'sales',
    dateRange?: DateRangeFilter
  ): Promise<SeasonalTrendResponse> {
    try {
      const params = new URLSearchParams();
      params.append('dataType', dataType);

      if (dateRange) {
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);
        if (dateRange.preset) params.append('preset', dateRange.preset);
      }

      const response = await fetch(getApiUrl(`merchant/analytics/trends/seasonal?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get seasonal trends');
      }
    } catch (error: any) {
      console.error('Get seasonal trends error:', error);
      throw new Error(error.message || 'Failed to get seasonal trends');
    }
  }

  /**
   * Get product performance analytics
   * @param options Query options for filtering and sorting
   * @returns ProductPerformanceResponse with product metrics
   */
  async getProductPerformance(
    options?: AnalyticsQueryOptions
  ): Promise<ProductPerformanceResponse> {
    try {
      const params = this.buildQueryParams(options);
      const response = await fetch(getApiUrl(`merchant/analytics/products/performance?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get product performance');
      }
    } catch (error: any) {
      console.error('Get product performance error:', error);
      throw new Error(error.message || 'Failed to get product performance');
    }
  }

  /**
   * Get revenue breakdown by various dimensions
   * @param dateRange Date range for analysis
   * @returns RevenueBreakdownResponse with revenue breakdown details
   */
  async getRevenueBreakdown(
    dateRange?: DateRangeFilter
  ): Promise<RevenueBreakdownResponse> {
    try {
      const params = this.buildQueryParams({ timeRange: dateRange });
      const response = await fetch(getApiUrl(`merchant/analytics/revenue/breakdown?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get revenue breakdown');
      }
    } catch (error: any) {
      console.error('Get revenue breakdown error:', error);
      throw new Error(error.message || 'Failed to get revenue breakdown');
    }
  }

  /**
   * Compare analytics metrics between two periods
   * @param currentDateRange Current period
   * @param previousDateRange Previous period for comparison
   * @returns PeriodComparison with growth metrics
   */
  async comparePeriods(
    currentDateRange: DateRange,
    previousDateRange: DateRange
  ): Promise<PeriodComparison> {
    try {
      const params = new URLSearchParams();
      params.append('currentStart', currentDateRange.startDate);
      params.append('currentEnd', currentDateRange.endDate);
      params.append('previousStart', previousDateRange.startDate);
      params.append('previousEnd', previousDateRange.endDate);

      const response = await fetch(getApiUrl(`merchant/analytics/comparison?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to compare periods');
      }
    } catch (error: any) {
      console.error('Compare periods error:', error);
      throw new Error(error.message || 'Failed to compare periods');
    }
  }

  /**
   * Get real-time analytics metrics
   * @returns RealTimeMetrics with live data
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await fetch(getApiUrl('merchant/analytics/realtime'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get real-time metrics');
      }
    } catch (error: any) {
      console.error('Get real-time metrics error:', error);
      throw new Error(error.message || 'Failed to get real-time metrics');
    }
  }

  /**
   * Export analytics data in specified format
   * @param exportRequest Export configuration
   * @returns ExportResponse with download URL
   */
  async exportAnalytics(
    exportRequest: ExportRequest
  ): Promise<ExportResponse> {
    try {
      const response = await fetch(getApiUrl('merchant/analytics/export'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(exportRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to export analytics');
      }
    } catch (error: any) {
      console.error('Export analytics error:', error);
      throw new Error(error.message || 'Failed to export analytics');
    }
  }

  /**
   * Get export download URL (for previously generated exports)
   * @param exportId Export ID from ExportResponse
   * @returns Download URL
   */
  async getExportUrl(exportId: string): Promise<string> {
    try {
      const response = await fetch(getApiUrl(`merchant/analytics/export/${exportId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data?.url) {
        return data.data.url;
      } else {
        throw new Error(data.message || 'Failed to get export URL');
      }
    } catch (error: any) {
      console.error('Get export URL error:', error);
      throw new Error(error.message || 'Failed to get export URL');
    }
  }

  // ========== Helper Methods ==========

  /**
   * Build URL parameters from query options
   * @param options Query options
   * @returns URLSearchParams string
   */
  private buildQueryParams(options?: AnalyticsQueryOptions): string {
    const params = new URLSearchParams();

    if (!options) {
      return '';
    }

    if (options.timeRange) {
      if (options.timeRange.startDate) {
        params.append('startDate', options.timeRange.startDate);
      }
      if (options.timeRange.endDate) {
        params.append('endDate', options.timeRange.endDate);
      }
      if (options.timeRange.preset) {
        params.append('preset', options.timeRange.preset);
      }
    }

    if (options.dateRangePreset) {
      params.append('preset', options.dateRangePreset);
    }

    if (options.granularity) {
      params.append('granularity', options.granularity);
    }

    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    if (options.offset) {
      params.append('offset', options.offset.toString());
    }

    if (options.sortBy) {
      params.append('sortBy', options.sortBy);
    }

    if (options.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }

    if (options.category) {
      params.append('category', options.category);
    }

    if (options.includeComparison !== undefined) {
      params.append('includeComparison', options.includeComparison.toString());
    }

    if (options.includeForecasts !== undefined) {
      params.append('includeForecasts', options.includeForecasts.toString());
    }

    return params.toString();
  }

  /**
   * Build DateRange from preset
   * @param preset Preset date range
   * @returns DateRange object
   */
  buildDateRangeFromPreset(preset: DateRangePreset): DateRange {
    const endDate = new Date();
    const startDate = new Date();

    switch (preset) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '14d':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'custom':
        // Return current date as both start and end, caller should override
        break;
    }

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    };
  }

  /**
   * Format date to YYYY-MM-DD string
   * @param date Date object
   * @returns Formatted date string
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current date in YYYY-MM-DD format
   * @returns Formatted current date
   */
  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  /**
   * Get date N days ago in YYYY-MM-DD format
   * @param days Number of days ago
   * @returns Formatted date string
   */
  getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.formatDate(date);
  }

  /**
   * Parse ISO date string to Date object
   * @param dateString ISO date string (YYYY-MM-DD)
   * @returns Date object
   */
  parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Calculate days between two dates
   * @param startDate Start date string (YYYY-MM-DD)
   * @param endDate End date string (YYYY-MM-DD)
   * @returns Number of days
   */
  getDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get previous period date range (same length as current period)
   * @param currentDateRange Current period
   * @returns Previous period date range
   */
  getPreviousPeriodDateRange(currentDateRange: DateRange): DateRange {
    const periodLength = this.getDaysDifference(
      currentDateRange.startDate,
      currentDateRange.endDate
    );

    const currentStart = new Date(currentDateRange.startDate);
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - periodLength);

    const currentEnd = new Date(currentDateRange.endDate);
    const prevEnd = new Date(currentEnd);
    prevEnd.setDate(prevEnd.getDate() - periodLength);

    return {
      startDate: this.formatDate(prevStart),
      endDate: this.formatDate(prevEnd),
    };
  }

  /**
   * Format currency value
   * @param value Numeric value
   * @param currency Currency code (default: USD)
   * @returns Formatted currency string
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  }

  /**
   * Format percentage
   * @param value Numeric value
   * @param decimalPlaces Number of decimal places (default: 2)
   * @returns Formatted percentage string
   */
  formatPercentage(value: number, decimalPlaces: number = 2): string {
    return `${(value * 100).toFixed(decimalPlaces)}%`;
  }

  /**
   * Format large numbers with K, M, B notation
   * @param value Numeric value
   * @returns Formatted string
   */
  formatCompactNumber(value: number): string {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  /**
   * Get trend direction emoji
   * @param trend Trend direction
   * @returns Emoji string
   */
  getTrendEmoji(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '';
    }
  }

  /**
   * Get risk level color
   * @param riskLevel Risk level
   * @returns Color code
   */
  getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low':
        return '#10b981';  // Green
      case 'medium':
        return '#f59e0b';  // Amber
      case 'high':
        return '#ef4444';  // Red
      default:
        return '#6b7280';  // Gray
    }
  }

  /**
   * Get health status color
   * @param health Health status
   * @returns Color code
   */
  getHealthStatusColor(health: 'excellent' | 'good' | 'fair' | 'poor'): string {
    switch (health) {
      case 'excellent':
        return '#059669';  // Dark Green
      case 'good':
        return '#10b981';  // Green
      case 'fair':
        return '#f59e0b';  // Amber
      case 'poor':
        return '#ef4444';  // Red
      default:
        return '#6b7280';  // Gray
    }
  }

  /**
   * Helper method to get auth token
   */
  private async getAuthToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
