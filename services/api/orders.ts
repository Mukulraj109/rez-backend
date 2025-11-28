import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  OrderAnalytics,
  OrderFilters
} from '../../types/api';

export interface OrderSearchParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  orderNumber?: string;
  storeId?: string;
  sortBy?: 'createdAt' | 'total' | 'status' | 'orderNumber';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
  notifyCustomer?: boolean;
}

export interface BulkOrderActionRequest {
  orderIds: string[];
  action: 'confirm' | 'prepare' | 'ready' | 'deliver' | 'cancel';
  notes?: string;
  notifyCustomers?: boolean;
}

export interface OrderListResponse {
  orders: Order[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

class OrdersService {
  private get baseUrl() {
    return getApiUrl('merchant/orders');
  }

  // Get orders with filtering and pagination
  async getOrders(params: OrderSearchParams = {}): Promise<OrderListResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      // Filter out empty strings and null/undefined values
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}?${searchParams.toString()}`;
      console.log('📦 [ORDERS] Fetching orders from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('📦 [ORDERS] API Error Response:', errorData);
        } catch (e) {
          const errorText = await response.text();
          console.error('📦 [ORDERS] API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log('📦 [ORDERS SERVICE] Raw API response:', JSON.stringify(data, null, 2));
      console.log('📦 [ORDERS SERVICE] Response success:', data.success);
      console.log('📦 [ORDERS SERVICE] Response data:', data.data);
      
      if (data.success && data.data) {
        console.log('📦 [ORDERS SERVICE] Orders in response:', data.data.orders);
        console.log('📦 [ORDERS SERVICE] Orders count:', data.data.orders?.length);
        if (data.data.orders && data.data.orders.length > 0) {
          console.log('📦 [ORDERS SERVICE] First order from API:', JSON.stringify(data.data.orders[0], null, 2));
          console.log('📦 [ORDERS SERVICE] First order keys:', Object.keys(data.data.orders[0]));
        }
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get orders');
      }
    } catch (error: any) {
      console.error('📦 [ORDERS] Get orders error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get orders');
    }
  }

  // Get single order by ID
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const url = `${this.baseUrl}/${orderId}`;
      console.log('📦 [ORDERS SERVICE] Fetching order by ID from:', url);
      console.log('📦 [ORDERS SERVICE] Order ID:', orderId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('📦 [ORDERS SERVICE] API Error Response:', JSON.stringify(errorData, null, 2));
          
          // Extract error message from various possible structures
          // Try message first (most common)
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          // Then try error object
          else if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.error.error) {
              errorMessage = errorData.error.error;
            } else if (typeof errorData.error === 'object') {
              // Try to extract message from nested error object
              const nestedMessage = errorData.error.message || errorData.error.error || errorData.error.msg;
              if (nestedMessage) {
                errorMessage = nestedMessage;
              } else {
                // If no message found, stringify the error object
                const errorStr = JSON.stringify(errorData.error);
                if (errorStr !== '{}' && errorStr.length < 200) {
                  errorMessage = `Error: ${errorStr}`;
                }
              }
            }
          }
          
          // If still default, use the full error data as fallback
          if (errorMessage === `HTTP ${response.status}: ${response.statusText}`) {
            const fullError = JSON.stringify(errorData);
            if (fullError.length < 500) {
              errorMessage = fullError;
            } else {
              errorMessage = errorData.message || errorData.error?.message || 'Order not found or access denied';
            }
          }
          
          console.error('📦 [ORDERS SERVICE] Extracted error message:', errorMessage);
        } catch (e) {
          const errorText = await response.text();
          console.error('📦 [ORDERS SERVICE] API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📦 [ORDERS SERVICE] Raw API response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log('📦 [ORDERS SERVICE] Order data:', JSON.stringify(data.data, null, 2));
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get order');
      }
    } catch (error: any) {
      console.error('📦 [ORDERS SERVICE] Get order error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get order');
    }
  }

  // Update order status
  async updateOrderStatus(
    orderId: string, 
    updateData: UpdateOrderStatusRequest
  ): Promise<Order> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (error: any) {
      console.error('Update order status error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update order status');
    }
  }

  // Perform bulk action on multiple orders
  async bulkAction(actionData: BulkOrderActionRequest): Promise<{
    results: Array<{ success: boolean; orderId: string; message?: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/bulk-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(actionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to perform bulk action');
      }
    } catch (error: any) {
      console.error('Bulk action error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to perform bulk action');
    }
  }

  // Get order analytics
  async getAnalytics(dateStart?: string, dateEnd?: string): Promise<OrderAnalytics> {
    try {
      console.log('📊 Order analytics endpoint not implemented in backend, using dashboard metrics instead');
      
      // TEMPORARILY: Use dashboard metrics to provide analytics data
      // since /api/orders/analytics endpoint doesn't exist in backend
      const { dashboardService } = await import('./dashboard');
      const metricsData = await dashboardService.getMetrics();
      
      // Transform metrics to analytics format
      const analyticsData: OrderAnalytics = {
        totalOrders: metricsData.totalOrders || 0,
        totalRevenue: metricsData.totalRevenue || 0,
        averageOrderValue: metricsData.averageOrderValue || 0,
        statusBreakdown: {
          pending: metricsData.pendingOrders || 0,
          confirmed: metricsData.completedOrders || 0,
          preparing: 0,
          ready: 0,
          out_for_delivery: 0,
          delivered: metricsData.completedOrders || 0,
          cancelled: metricsData.cancelledOrders || 0,
          refunded: 0
        },
        revenueGrowth: metricsData.revenueGrowth || 0,
        orderGrowth: metricsData.ordersGrowth || 0,
        topProducts: metricsData.topSellingProducts || []
      };
      
      console.log('✅ Order analytics generated from dashboard metrics');
      return analyticsData;
    } catch (error: any) {
      console.error('Get order analytics error:', error);
      
      // Return fallback analytics data instead of throwing error
      const fallbackAnalytics: OrderAnalytics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusBreakdown: {
          pending: 0,
          confirmed: 0,
          preparing: 0,
          ready: 0,
          out_for_delivery: 0,
          delivered: 0,
          cancelled: 0,
          refunded: 0
        },
        revenueGrowth: 0,
        orderGrowth: 0,
        topProducts: []
      };
      
      console.warn('Using fallback order analytics due to API error');
      return fallbackAnalytics;
    }
  }

  // Create sample orders for development/testing
  async createSampleData(): Promise<{ message: string; merchantId: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sample-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({})
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create sample orders');
      }
    } catch (error: any) {
      console.error('Create sample orders error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create sample orders');
    }
  }

  // Get orders with comprehensive filters
  async searchOrders(filters: OrderFilters): Promise<OrderListResponse> {
    const params: OrderSearchParams = {
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      customerId: filters.customerId,
      orderNumber: filters.orderNumber,
      sortBy: filters.sortBy || 'created',
      sortOrder: filters.sortOrder || 'desc',
      page: filters.page || 1,
      limit: filters.limit || 20,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd
    };

    return this.getOrders(params);
  }

  // Get recent orders (shortcut for dashboard)
  async getRecentOrders(limit: number = 10): Promise<Order[]> {
    const result = await this.getOrders({
      sortBy: 'created',
      sortOrder: 'desc',
      limit,
      page: 1
    });
    
    return result.orders || [];
  }

  // Get orders by status (shortcut)
  async getOrdersByStatus(
    status: OrderStatus, 
    page: number = 1, 
    limit: number = 20
  ): Promise<OrderListResponse> {
    return this.getOrders({
      status,
      page,
      limit,
      sortBy: 'created',
      sortOrder: 'desc'
    });
  }

  // Get pending orders count
  async getPendingOrdersCount(): Promise<number> {
    const result = await this.getOrdersByStatus('pending', 1, 1);
    return result.totalCount || 0;
  }

  // Cancel order
  async cancelOrder(orderId: string, notes?: string): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'cancelled',
      notes,
      notifyCustomer: true
    });
  }

  // Confirm order
  async confirmOrder(orderId: string, notes?: string): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'confirmed',
      notes,
      notifyCustomer: true
    });
  }

  // Mark order as delivered
  async deliverOrder(orderId: string, notes?: string): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'delivered',
      notes,
      notifyCustomer: true
    });
  }

  // Get order status options
  getOrderStatusOptions(): Array<{ label: string; value: OrderStatus; color: string }> {
    return [
      { label: 'Pending', value: 'pending', color: '#f59e0b' },
      { label: 'Confirmed', value: 'confirmed', color: '#3b82f6' },
      { label: 'Preparing', value: 'preparing', color: '#8b5cf6' },
      { label: 'Ready', value: 'ready', color: '#06b6d4' },
      { label: 'Out for Delivery', value: 'out_for_delivery', color: '#0ea5e9' },
      { label: 'Delivered', value: 'delivered', color: '#10b981' },
      { label: 'Cancelled', value: 'cancelled', color: '#ef4444' },
      { label: 'Refunded', value: 'refunded', color: '#6b7280' }
    ];
  }

  // Get order summary metrics
  async getOrderSummary(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  }> {
    try {
      const analytics = await this.getAnalytics();
      
      return {
        total: analytics.totalOrders || 0,
        pending: analytics.statusBreakdown?.pending || 0,
        confirmed: analytics.statusBreakdown?.confirmed || 0,
        preparing: analytics.statusBreakdown?.preparing || 0,
        ready: analytics.statusBreakdown?.ready || 0,
        outForDelivery: analytics.statusBreakdown?.out_for_delivery || 0,
        delivered: analytics.statusBreakdown?.delivered || 0,
        cancelled: analytics.statusBreakdown?.cancelled || 0,
        refunded: analytics.statusBreakdown?.refunded || 0
      };
    } catch (error) {
      console.error('Failed to get order summary:', error);
      // Return default values
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        outForDelivery: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0
      };
    }
  }
  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const ordersService = new OrdersService();
export default ordersService;