// Dashboard metrics types
export interface DashboardMetrics {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  orders: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  cashback: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalAmount: number;
    pendingAmount: number;
    averageProcessingTime: number;
  };
  customers: {
    total: number;
    active: number;
    new: number;
    returning: number;
    churnRate: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  };
}

export interface DashboardOverview {
  todayStats: {
    revenue: number;
    orders: number;
    newCustomers: number;
    cashbackRequests: number;
  };
  weeklyStats: {
    revenue: number[];
    orders: number[];
    customers: number[];
  };
  alerts: {
    lowStock: number;
    pendingOrders: number;
    pendingCashback: number;
    systemIssues: number;
  };
  recentActivity?: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'cashback' | 'product' | 'customer' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  amount?: number;
  customerName?: string;
  orderId?: string;
}

export interface RevenueAnalytics {
  timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year';
  data: {
    period: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
  }[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    growth: number;
    projectedRevenue: number;
  };
  breakdown: {
    byPaymentMethod: Array<{
      method: string;
      amount: number;
      percentage: number;
    }>;
    byCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    byRegion: Array<{
      region: string;
      amount: number;
      percentage: number;
    }>;
  };
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  sales: {
    quantity: number;
    revenue: number;
    growth: number;
  };
  rating: {
    average: number;
    count: number;
  };
  stock: {
    current: number;
    low: boolean;
  };
  image?: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardAnalytics {
  performanceMetrics: {
    conversionRate: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    repeatCustomerRate: number;
    cartAbandonmentRate: number;
  };
  trends: {
    salesTrend: Array<{
      date: string;
      sales: number;
      orders: number;
    }>;
    customerTrend: Array<{
      date: string;
      newCustomers: number;
      activeCustomers: number;
    }>;
    cashbackTrend: Array<{
      date: string;
      requests: number;
      approved: number;
      amount: number;
    }>;
  };
  comparisons: {
    periodOverPeriod: {
      revenue: number;
      orders: number;
      customers: number;
      cashback: number;
    };
    yearOverYear: {
      revenue: number;
      orders: number;
      customers: number;
      cashback: number;
    };
  };
  forecasts: {
    nextMonthRevenue: number;
    nextMonthOrders: number;
    quarterProjection: number;
    yearProjection: number;
  };
}

export interface DashboardNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Real-time dashboard data structure
export interface RealTimeDashboardData {
  metrics: DashboardMetrics;
  overview: DashboardOverview;
  notifications: DashboardNotification[];
  lastUpdated: string;
}

// Dashboard export data structure
export interface DashboardExportData {
  exportId: string;
  type: 'pdf' | 'excel' | 'csv';
  url: string;
  size: number;
  generatedAt: string;
  expiresAt: string;
}