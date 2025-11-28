import { OrderStatus, PaymentMethod, QueryOptions, DateRangeFilter } from './api';

export interface OrderFilters extends QueryOptions, DateRangeFilter {
  status?: OrderStatus;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  merchantId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  tracking: {
    number?: string;
    carrier?: string;
    url?: string;
  };
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  tax: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  image?: string;
  variants?: Array<{
    name: string;
    value: string;
  }>;
}

export interface CreateOrderRequest {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  shipping?: {
    method: string;
    cost: number;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  payment: {
    method: PaymentMethod;
    details?: Record<string, any>;
  };
  notes?: string;
  tags?: string[];
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string;
  };
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  tracking?: {
    number: string;
    carrier: string;
    url?: string;
  };
  notes?: string;
  tags?: string[];
  estimatedDelivery?: string;
}

export interface OrderStatusUpdate {
  status: OrderStatus;
  notes?: string;
  notifyCustomer?: boolean;
  tracking?: {
    number: string;
    carrier: string;
  };
}

export interface BulkOrderUpdate {
  orderIds: string[];
  action: 'status_update' | 'add_tags' | 'remove_tags' | 'export';
  data: {
    status?: OrderStatus;
    tags?: string[];
    format?: 'csv' | 'excel' | 'pdf';
  };
}

export interface OrderAnalytics {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  statusBreakdown: Array<{
    status: OrderStatus;
    count: number;
    percentage: number;
    revenue: number;
  }>;
  timeAnalysis: {
    daily: Array<{
      date: string;
      orders: number;
      revenue: number;
    }>;
    weekly: Array<{
      week: string;
      orders: number;
      revenue: number;
    }>;
    monthly: Array<{
      month: string;
      orders: number;
      revenue: number;
    }>;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    name: string;
    orders: number;
    revenue: number;
    lastOrder: string;
  }>;
  paymentMethods: Array<{
    method: PaymentMethod;
    count: number;
    percentage: number;
    revenue: number;
  }>;
  geographicDistribution: Array<{
    region: string;
    orders: number;
    revenue: number;
    percentage: number;
  }>;
  performanceMetrics: {
    averageProcessingTime: number;
    averageShippingTime: number;
    averageDeliveryTime: number;
    orderFulfillmentRate: number;
    returnRate: number;
  };
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: OrderStatus;
    dateRange?: {
      start: string;
      end: string;
    };
    search?: string;
  };
}

// Order events for real-time updates
export interface OrderEvent {
  id: string;
  orderId: string;
  type: 'created' | 'updated' | 'status_changed' | 'payment_updated' | 'shipped' | 'delivered' | 'cancelled';
  data: Partial<Order>;
  timestamp: string;
  merchantId: string;
}