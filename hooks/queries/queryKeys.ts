/**
 * Query Keys Factory
 * Centralized query key management for React Query
 * Ensures consistency and enables invalidation of related queries
 */

export const queryKeys = {
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    data: () => [...queryKeys.dashboard.all, 'data'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
    activity: (limit?: number) => [...queryKeys.dashboard.all, 'activity', limit] as const,
    topProducts: (limit?: number, period?: string) =>
      [...queryKeys.dashboard.all, 'topProducts', limit, period] as const,
    salesData: (period?: string) => [...queryKeys.dashboard.all, 'salesData', period] as const,
    lowStock: () => [...queryKeys.dashboard.all, 'lowStock'] as const,
  },

  // Product queries
  products: {
    all: ['products'] as const,
    list: (filters?: any) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
    categories: () => [...queryKeys.products.all, 'categories'] as const,
    search: (query: string, filters?: any) =>
      [...queryKeys.products.all, 'search', query, filters] as const,
    byCategory: (categoryId: string) =>
      [...queryKeys.products.all, 'byCategory', categoryId] as const,
    stock: (id: string) => [...queryKeys.products.all, 'stock', id] as const,
    lowStock: () => [...queryKeys.products.all, 'lowStock'] as const,
  },

  // Order queries
  orders: {
    all: ['orders'] as const,
    list: (filters?: any) => [...queryKeys.orders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    pending: () => [...queryKeys.orders.all, 'pending'] as const,
    completed: () => [...queryKeys.orders.all, 'completed'] as const,
    cancelled: () => [...queryKeys.orders.all, 'cancelled'] as const,
    analytics: (period?: string) => [...queryKeys.orders.all, 'analytics', period] as const,
    byStatus: (status: string) => [...queryKeys.orders.all, 'byStatus', status] as const,
    timeline: (orderId: string) => [...queryKeys.orders.all, 'timeline', orderId] as const,
  },

  // Cashback queries
  cashback: {
    all: ['cashback'] as const,
    list: (filters?: any) => [...queryKeys.cashback.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.cashback.all, 'detail', id] as const,
    pending: () => [...queryKeys.cashback.all, 'pending'] as const,
    paid: () => [...queryKeys.cashback.all, 'paid'] as const,
    requests: () => [...queryKeys.cashback.all, 'requests'] as const,
    analytics: (period?: string) => [...queryKeys.cashback.all, 'analytics', period] as const,
    rules: () => [...queryKeys.cashback.all, 'rules'] as const,
  },

  // User/Auth queries
  auth: {
    all: ['auth'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    merchant: () => [...queryKeys.auth.all, 'merchant'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
    settings: () => [...queryKeys.auth.all, 'settings'] as const,
  },

  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    revenue: (period?: string) => [...queryKeys.analytics.all, 'revenue', period] as const,
    customers: (period?: string) => [...queryKeys.analytics.all, 'customers', period] as const,
    trending: () => [...queryKeys.analytics.all, 'trending'] as const,
    reports: (type?: string) => [...queryKeys.analytics.all, 'reports', type] as const,
  },

  // Upload queries
  uploads: {
    all: ['uploads'] as const,
    status: (uploadId: string) => [...queryKeys.uploads.all, 'status', uploadId] as const,
    history: () => [...queryKeys.uploads.all, 'history'] as const,
  },

  // Notification queries
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: any) => [...queryKeys.notifications.all, 'list', filters] as const,
    infinite: (filters?: any) => [...queryKeys.notifications.all, 'infinite', filters] as const,
    detail: (id: string) => [...queryKeys.notifications.all, 'detail', id] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    unreadList: () => [...queryKeys.notifications.all, 'unreadList'] as const,
    byType: (type: string) => [...queryKeys.notifications.all, 'byType', type] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
    stats: () => [...queryKeys.notifications.all, 'stats'] as const,
  },

  // Category queries
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },

  // Audit Log queries
  audit: {
    all: ['audit'] as const,
    list: (filters?: any) => [...queryKeys.audit.all, 'list', filters] as const,
    resourceHistory: (resourceType: string, resourceId: string) =>
      [...queryKeys.audit.all, 'resourceHistory', resourceType, resourceId] as const,
    timeline: (options?: any) => [...queryKeys.audit.all, 'timeline', options] as const,
    todayActivities: () => [...queryKeys.audit.all, 'todayActivities'] as const,
    recentActivities: (limit?: number) =>
      [...queryKeys.audit.all, 'recentActivities', limit] as const,
    activitySummary: (startDate?: string, endDate?: string) =>
      [...queryKeys.audit.all, 'activitySummary', startDate, endDate] as const,
    criticalActivities: (limit?: number) =>
      [...queryKeys.audit.all, 'criticalActivities', limit] as const,
    activityHeatmap: (startDate?: string, endDate?: string) =>
      [...queryKeys.audit.all, 'activityHeatmap', startDate, endDate] as const,
    search: (searchTerm: string, filters?: any) =>
      [...queryKeys.audit.all, 'search', searchTerm, filters] as const,
    statistics: (startDate?: string, endDate?: string) =>
      [...queryKeys.audit.all, 'statistics', startDate, endDate] as const,
    userActivity: (userId: string, options?: any) =>
      [...queryKeys.audit.all, 'userActivity', userId, options] as const,
    export: (filters?: any) => [...queryKeys.audit.all, 'export', filters] as const,
    complianceReport: (framework?: string) =>
      [...queryKeys.audit.all, 'complianceReport', framework] as const,
    retentionStats: () => [...queryKeys.audit.all, 'retentionStats'] as const,
    archivedLogs: () => [...queryKeys.audit.all, 'archivedLogs'] as const,
  },
};

// Helper function to get all related query keys for invalidation
export const getRelatedKeys = (baseKey: string) => {
  return Object.entries(queryKeys).reduce((acc, [key, value]) => {
    if (key === baseKey && typeof value === 'object') {
      acc.push(value.all);
    }
    return acc;
  }, [] as any[]);
};
