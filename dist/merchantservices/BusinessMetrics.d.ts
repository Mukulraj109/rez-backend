export interface DashboardMetrics {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    averageOrderValue: number;
    totalOrders: number;
    monthlyOrders: number;
    ordersGrowth: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    topSellingProducts: Array<{
        productId: string;
        name: string;
        totalSold: number;
        revenue: number;
    }>;
    totalCustomers: number;
    monthlyCustomers: number;
    customerGrowth: number;
    returningCustomers: number;
    totalCashbackPaid: number;
    monthlyCashbackPaid: number;
    pendingCashback: number;
    cashbackROI: number;
    averageOrderProcessingTime: number;
    customerSatisfactionScore: number;
    inventoryTurnover: number;
    profitMargin: number;
}
export interface TimeSeriesData {
    date: string;
    revenue: number;
    orders: number;
    items: number;
    customers: number;
    cashback: number;
}
export interface CategoryPerformance {
    categoryId: string;
    categoryName: string;
    revenue: number;
    orders: number;
    products: number;
    growth: number;
}
export interface CustomerInsights {
    newCustomers: number;
    returningCustomers: number;
    customerLifetimeValue: number;
    averageOrdersPerCustomer: number;
    topCustomers: Array<{
        customerId: string;
        name: string;
        totalSpent: number;
        orderCount: number;
    }>;
}
export declare class BusinessMetricsService {
    static getDashboardMetrics(merchantId: string, storeId?: string): Promise<DashboardMetrics>;
    static getTimeSeriesData(merchantId: string, days?: number, storeId?: string): Promise<TimeSeriesData[]>;
    static getCategoryPerformance(merchantId: string, storeId?: string): Promise<CategoryPerformance[]>;
    static getCustomerInsights(merchantId: string, storeId?: string): Promise<CustomerInsights>;
    static getBusinessInsights(merchantId: string, storeId?: string): Promise<{
        insights: string[];
        recommendations: string[];
        alerts: string[];
    }>;
}
