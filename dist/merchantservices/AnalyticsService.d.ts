/**
 * Analytics Service
 *
 * Provides real-time analytics calculations using MongoDB aggregation pipelines.
 * Replaces all mock data with actual database calculations.
 */
export interface SalesOverview {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalItems: number;
    previousPeriodRevenue: number;
    previousPeriodOrders: number;
    revenueGrowth: number;
    ordersGrowth: number;
    period: {
        start: Date;
        end: Date;
    };
}
export interface RevenueTrendData {
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    items: number;
}
export interface TopProduct {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    averagePrice: number;
}
export interface CategoryPerformance {
    categoryId: string;
    categoryName: string;
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    averageOrderValue: number;
    revenueShare: number;
}
export interface CustomerInsight {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageOrdersPerCustomer: number;
    customerLifetimeValue: number;
    repeatCustomerRate: number;
    topCustomers: Array<{
        userId: string;
        userName: string;
        totalOrders: number;
        totalSpent: number;
        lastOrderDate: Date;
    }>;
}
export interface InventoryStatus {
    totalProducts: number;
    inStockProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    overstockedProducts: number;
    lowStockItems: Array<{
        productId: string;
        productName: string;
        currentStock: number;
        lowStockThreshold: number;
        reorderLevel: number;
    }>;
    outOfStockItems: Array<{
        productId: string;
        productName: string;
        lastSoldDate?: Date;
    }>;
}
export declare class AnalyticsService {
    /**
     * Get sales overview for a date range
     */
    static getSalesOverview(storeId: string, startDate: Date, endDate: Date): Promise<SalesOverview>;
    /**
     * Get revenue trends grouped by period
     */
    static getRevenueTrends(storeId: string, period: 'daily' | 'weekly' | 'monthly', days?: number): Promise<RevenueTrendData[]>;
    /**
     * Get top selling products
     */
    static getTopSellingProducts(storeId: string, limit?: number, sortBy?: 'quantity' | 'revenue', startDate?: Date, endDate?: Date): Promise<TopProduct[]>;
    /**
     * Get category performance
     */
    static getCategoryPerformance(storeId: string, startDate?: Date, endDate?: Date): Promise<CategoryPerformance[]>;
    /**
     * Get customer insights
     */
    static getCustomerInsights(storeId: string, startDate?: Date, endDate?: Date): Promise<CustomerInsight>;
    /**
     * Get inventory status
     */
    static getInventoryStatus(storeId: string): Promise<InventoryStatus>;
    /**
     * Get sales by time of day
     */
    static getSalesByTimeOfDay(storeId: string): Promise<Array<{
        hour: number;
        revenue: number;
        orders: number;
    }>>;
    /**
     * Get sales by day of week
     */
    static getSalesByDayOfWeek(storeId: string): Promise<Array<{
        dayOfWeek: number;
        dayName: string;
        revenue: number;
        orders: number;
    }>>;
    /**
     * Get payment method breakdown
     */
    static getPaymentMethodBreakdown(storeId: string, startDate?: Date, endDate?: Date): Promise<Array<{
        method: string;
        revenue: number;
        orders: number;
        percentage: number;
    }>>;
}
