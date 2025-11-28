/**
 * Predictive Analytics Service
 *
 * Provides sales forecasting, demand prediction, and trend analysis
 * using simple statistical methods (moving averages, linear regression).
 */
export interface SalesForecast {
    forecastDays: number;
    historical: Array<{
        date: string;
        revenue: number;
        orders: number;
    }>;
    forecast: Array<{
        date: string;
        predictedRevenue: number;
        predictedOrders: number;
        confidenceLower: number;
        confidenceUpper: number;
    }>;
    totalPredictedRevenue: number;
    averageDailyRevenue: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    accuracy: number;
}
export interface StockoutPrediction {
    productId: string;
    productName: string;
    currentStock: number;
    dailyAverageSales: number;
    predictedStockoutDate: Date | null;
    daysUntilStockout: number | null;
    recommendedReorderQuantity: number;
    recommendedReorderDate: Date | null;
    priority: 'critical' | 'high' | 'medium' | 'low';
}
export interface SeasonalTrend {
    period: string;
    type: 'monthly' | 'weekly' | 'daily';
    trends: Array<{
        period: string;
        averageRevenue: number;
        averageOrders: number;
        peakDay?: string;
        index: number;
    }>;
    insights: string[];
}
export interface DemandForecast {
    productId: string;
    productName: string;
    currentStock: number;
    nextWeekDemand: number;
    nextMonthDemand: number;
    recommendedStock: number;
    reorderPoint: number;
    economicOrderQuantity: number;
}
export declare class PredictiveAnalyticsService {
    /**
     * Forecast sales for the next N days
     */
    static forecastSales(storeId: string, days?: number): Promise<SalesForecast>;
    /**
     * Predict when a product will run out of stock
     */
    static predictStockout(productId: string): Promise<StockoutPrediction>;
    /**
     * Analyze seasonal trends
     */
    static analyzeSeasonalTrends(storeId: string, type?: 'monthly' | 'weekly' | 'daily'): Promise<SeasonalTrend>;
    /**
     * Forecast demand for a specific product
     */
    static forecastDemand(productId: string): Promise<DemandForecast>;
    /**
     * Helper: Fill missing days with zero values
     */
    private static fillMissingDays;
    /**
     * Helper: Calculate Mean Absolute Percentage Error
     */
    private static calculateMAPE;
    /**
     * Helper: Get period name
     */
    private static getPeriodName;
}
