// Base API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  ownerName: string;
  businessName: string;
  phone: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
  merchant: Merchant;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  verificationStatus?: string;
  settings?: {
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Common enums
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial';
export type CashbackStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'expired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet' | 'cash' | 'other';

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  merchantId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  pricing: {
    subtotal: number;
    tax: number;
    delivery: number;
    totalAmount: number;
  };
  delivery: {
    method: 'pickup' | 'delivery';
    address?: string;
    estimatedTime?: string;
  };
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  store?: {
    _id: string;
    name: string;
    location?: {
      city?: string;
      state?: string;
    };
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  customizations?: string[];
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  revenueGrowth: number;
  orderGrowth: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  orderNumber?: string;
  sortBy?: 'created' | 'updated' | 'total' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Cashback types
export interface CashbackRequest {
  id: string;
  requestNumber: string;
  merchantId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    orderDate: string;
  };
  requestedAmount: number;
  approvedAmount?: number;
  status: CashbackStatus;
  riskScore: number;
  flaggedForReview: boolean;
  reason?: string;
  notes?: string;
  submittedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashbackMetrics {
  totalRequests: number;
  totalPendingRequests: number;
  totalApprovedRequests: number;
  totalRejectedRequests: number;
  totalPaidRequests: number;
  totalRequestedAmount: number;
  totalPendingAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  averageProcessingTime: number;
  highRiskRequests: number;
  autoApprovedToday: number;
  manualReviewRequired: number;
}

export interface CashbackFilters {
  status?: CashbackStatus;
  riskLevel?: 'low' | 'medium' | 'high';
  customerId?: string;
  orderNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'created' | 'amount' | 'risk' | 'processed';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Product types
export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  sku?: string;
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    inStock: boolean;
  };
  images: string[];
  isActive: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  merchantId: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
  search?: string;
  storeId?: string; // Store filter for multi-store support
  sortBy?: 'name' | 'price' | 'created' | 'updated' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Request options for filtering and pagination
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface OrderFilters extends QueryOptions, DateRangeFilter {
  status?: OrderStatus;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CashbackFilters extends QueryOptions, DateRangeFilter {
  status?: CashbackStatus;
  riskLevel?: RiskLevel;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
  flaggedOnly?: boolean;
}

export interface ProductFilters extends QueryOptions {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

// Health check response
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
}