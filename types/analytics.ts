// Analytics date range types
export type DateRangePreset = '7d' | '14d' | '30d' | '90d' | '1y' | 'custom';

export interface DateRange {
  startDate: string; // ISO 8601 format (YYYY-MM-DD)
  endDate: string;   // ISO 8601 format (YYYY-MM-DD)
}

export interface DateRangeFilter extends DateRange {
  preset?: DateRangePreset;
}

// Sales Forecast Types
export interface SalesForecast {
  period: string;          // e.g., "2024-01-15"
  forecasted: number;      // Forecasted sales amount
  confidence: number;      // 0-100, confidence level
  actual?: number;         // Actual sales if available
  variance?: number;       // Difference between forecast and actual
  lower: number;           // Lower bound of confidence interval
  upper: number;           // Upper bound of confidence interval
  trend: 'up' | 'down' | 'stable';
}

export interface SalesForecastResponse {
  timeRange: DateRange;
  forecastDays: number;    // 7, 30, 60, or 90
  method: 'arima' | 'exponential_smoothing' | 'linear_regression' | 'ml_ensemble';
  accuracy: number;        // Historical accuracy percentage
  forecasts: SalesForecast[];
  summary: {
    averageForecast: number;
    totalForecast: number;
    trend: 'up' | 'down' | 'stable';
    growthRate: number;
  };
  metadata?: {
    seasonalityDetected: boolean;
    volatility: 'low' | 'medium' | 'high';
    dataPoints: number;
  };
}

// Inventory/Stockout Prediction Types
export interface StockoutPrediction {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  dailyAvgUsage: number;
  daysUntilStockout: number | null; // null if won't stockout
  confidence: number;               // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  predictedStockoutDate?: string;   // ISO 8601 format
  recommendedReorderQty: number;
  recommendedReorderDate: string;
  lead_time_days: number;
}

export interface InventoryStockoutResponse {
  timeRange: DateRange;
  totalProducts: number;
  productsAtRisk: number;
  highRisk: StockoutPrediction[];
  mediumRisk: StockoutPrediction[];
  safeStock: StockoutPrediction[];
  summary: {
    averageDaysToStockout: number;
    totalReorderValue: number;
    criticalItems: number;
  };
  recommendations: {
    urgentReorders: string[];          // Product IDs needing immediate reorder
    optimizeStockLevels: string[];     // Product IDs with sub-optimal levels
  };
}

// Customer Insights Types
export interface CustomerLifetimeValue {
  customerId: string;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  estimatedLTV: number;
  purchaseFrequency: number;  // orders per month
  lastPurchaseDate?: string;
  nextPredictedPurchase?: string;
  segment: 'high_value' | 'medium_value' | 'low_value' | 'churned';
}

export interface CustomerRetention {
  cohortDate: string;
  cohortSize: number;
  retention: Array<{
    day: number;
    percentage: number;
    count: number;
  }>;
  avgRetentionRate: number;
}

export interface ChurnPrediction {
  customerId: string;
  email: string;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  churnProbability: number;  // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];         // Factors contributing to churn risk
  recommendedActions: string[]; // Suggested retention strategies
}

export interface CustomerInsights {
  timeRange: DateRange;
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  churnedCustomers: number;

  ltv: {
    averageLTV: number;
    highValueCount: number;
    highValueThreshold: number;
    ltv90Days: CustomerLifetimeValue[];
  };

  retention: {
    overallRetentionRate: number;
    cohorts: CustomerRetention[];
    repeatCustomerRate: number;
    repeatCustomerCount: number;
  };

  churn: {
    churnRate: number;
    churnedCount: number;
    atRiskCount: number;
    predictions: ChurnPrediction[];
  };

  segments: {
    highValue: number;
    mediumValue: number;
    lowValue: number;
    dormant: number;
    new: number;
  };

  summary: {
    averageCustomerAge: number;  // days as customer
    avgOrdersPerCustomer: number;
    avgSpendPerCustomer: number;
    topSegment: string;
  };
}

// Seasonal Trend Analysis Types
export interface SeasonalTrend {
  season: string;            // e.g., "Q1 2024", "Winter"
  year: number;
  dataPoints: Array<{
    period: string;          // e.g., "2024-01-15"
    value: number;
    index: number;           // Seasonality index (1.0 = average)
  }>;
  average: number;
  peak: number;
  trough: number;
  volatility: number;        // Standard deviation
}

export interface TrendAnalysis {
  category?: string;
  trend: 'up' | 'down' | 'stable' | 'cyclic';
  strength: number;          // 0-100, how strong the trend
  seasonality: number;       // 0-100, seasonality strength
  cyclicity: number;         // 0-100, cyclical pattern strength
  growthRate: number;        // percentage per period
}

export interface SeasonalTrendResponse {
  timeRange: DateRange;
  dataType: 'sales' | 'orders' | 'customers' | 'products';
  granularity: 'daily' | 'weekly' | 'monthly';

  seasonalTrends: SeasonalTrend[];

  byCategory: Array<{
    category: string;
    trends: SeasonalTrend[];
    analysis: TrendAnalysis;
  }>;

  overallAnalysis: TrendAnalysis;

  peaks: Array<{
    period: string;
    value: number;
    dayOfWeek?: string;
    seasonalIndex: number;
  }>;

  troughs: Array<{
    period: string;
    value: number;
    dayOfWeek?: string;
    seasonalIndex: number;
  }>;

  predictions: {
    nextSeason: string;
    expectedTrend: 'up' | 'down' | 'stable';
    expectedValue: number;
    confidence: number;
  };
}

// Product Performance Analytics
export interface ProductPerformance {
  productId: string;
  productName: string;
  sku: string;
  category: string;

  sales: {
    quantity: number;
    revenue: number;
    trend: number;           // percentage change
    avgUnitPrice: number;
  };

  inventory: {
    currentStock: number;
    stockTurnovers: number;  // times per period
    avgDaysToSell: number;
    outOfStockDays: number;
  };

  customer: {
    uniqueBuyers: number;
    repeatBuyerRate: number;
    avgRating: number;
    reviewCount: number;
  };

  profitability: {
    grossProfit: number;
    netProfit: number;
    marginPercentage: number;
    roas: number;            // Return on ad spend if tracked
  };

  performance: {
    rank: number;            // ranking in category
    ranking: 'top_tier' | 'mid_tier' | 'low_tier';
    health: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface ProductPerformanceResponse {
  timeRange: DateRange;
  totalProducts: number;
  analyzedProducts: number;

  byPerformance: {
    topPerformers: ProductPerformance[];
    middlePerformers: ProductPerformance[];
    underperformers: ProductPerformance[];
  };

  byCategory: Array<{
    category: string;
    productCount: number;
    totalSales: number;
    totalRevenue: number;
    topProduct: ProductPerformance;
  }>;

  summary: {
    totalSalesQty: number;
    totalRevenue: number;
    avgProductRevenue: number;
    avgMargin: number;
    topCategory: string;
  };
}

// Revenue Breakdown Types
export interface RevenueBreakdown {
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;

  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    growthRate: number;
  }>;

  byCustomerSegment: Array<{
    segment: string;
    amount: number;
    percentage: number;
    customerCount: number;
    avgOrderValue: number;
  }>;

  byChannel?: Array<{
    channel: string;
    amount: number;
    percentage: number;
  }>;

  refunds: {
    totalAmount: number;
    percentage: number;
    count: number;
    avgRefund: number;
  };

  netRevenue: number;
}

export interface RevenueBreakdownResponse {
  timeRange: DateRange;
  totalRevenue: number;
  breakdown: RevenueBreakdown;

  trends: Array<{
    period: string;
    revenue: number;
    breakdown: RevenueBreakdown;
  }>;

  comparison?: {
    previousPeriod: number;
    growth: number;
    growthPercentage: number;
  };
}

// Analytics Overview/Summary
export interface AnalyticsOverview {
  timeRange: DateRange;
  generatedAt: string;

  sales: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    revenueGrowth: number;
  };

  customers: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    churnRate: number;
    retentionRate: number;
  };

  inventory: {
    totalProductValue: number;
    stockTurnoverRate: number;
    outOfStockCount: number;
    lowStockCount: number;
  };

  profitability: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    cogs: number;
  };

  health: {
    overallScore: number;  // 0-100
    trend: 'up' | 'down' | 'stable';
    alerts: Array<{
      severity: 'low' | 'medium' | 'high';
      title: string;
      description: string;
    }>;
  };
}

// Export Types
export interface ExportRequest {
  format: 'csv' | 'excel' | 'pdf';
  reportTypes: Array<'overview' | 'sales_forecast' | 'inventory' | 'customers' | 'trends' | 'products' | 'revenue'>;
  timeRange?: DateRange;
  includeCharts?: boolean;
  includeComparisons?: boolean;
}

export interface ExportResponse {
  exportId: string;
  filename: string;
  url: string;
  fileSize: number;
  format: string;
  createdAt: string;
  expiresAt: string;
}

// Analytics Query Options
export interface AnalyticsQueryOptions {
  timeRange?: DateRange;
  dateRangePreset?: DateRangePreset;
  granularity?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  includeComparison?: boolean;
  includeForecasts?: boolean;
}

// Comparison Response
export interface PeriodComparison {
  current: {
    startDate: string;
    endDate: string;
    revenue: number;
    orders: number;
    customers: number;
  };
  previous: {
    startDate: string;
    endDate: string;
    revenue: number;
    orders: number;
    customers: number;
  };
  change: {
    revenue: number;
    revenuePercentage: number;
    orders: number;
    ordersPercentage: number;
    customers: number;
    customersPercentage: number;
  };
}

// Real-time Analytics
export interface RealTimeMetrics {
  lastUpdated: string;
  onlineCustomers: number;
  ordersInProgress: number;
  avgResponseTime: number;
  systemHealth: 'healthy' | 'degraded' | 'offline';
  recentTransactions: Array<{
    orderId: string;
    amount: number;
    timestamp: string;
    status: string;
  }>;
}

// Helper type for common analytics response
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
