import { CashbackStatus, RiskLevel, QueryOptions, DateRangeFilter } from './api';

export interface CashbackFilters extends QueryOptions, DateRangeFilter {
  status?: CashbackStatus;
  riskLevel?: RiskLevel;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
  flaggedOnly?: boolean;
}

export interface CashbackRequest {
  id: string;
  merchantId: string;
  customerId: string;
  orderId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinDate: string;
    totalOrders: number;
    totalSpent: number;
  };
  order: {
    id: string;
    orderNumber: string;
    total: number;
    date: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  requestedAmount: number;
  approvedAmount?: number;
  reason: string;
  status: CashbackStatus;
  riskAssessment: {
    level: RiskLevel;
    score: number;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }>;
    flagged: boolean;
    flagReasons: string[];
  };
  review: {
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    autoApproved: boolean;
    rejectionReason?: string;
  };
  payment: {
    method?: 'bank_transfer' | 'store_credit' | 'refund_to_original' | 'digital_wallet';
    details?: Record<string, any>;
    processedAt?: string;
    transactionId?: string;
    fee?: number;
  };
  timeline: Array<{
    timestamp: string;
    event: string;
    description: string;
    user?: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateCashbackRequest {
  customerId: string;
  orderId: string;
  requestedAmount: number;
  reason: string;
  customerEmail?: string;
  attachments?: Array<{
    name: string;
    type: string;
    data: string; // base64 encoded
  }>;
}

export interface ApproveCashbackRequest {
  approvedAmount: number;
  notes?: string;
  paymentMethod: 'bank_transfer' | 'store_credit' | 'refund_to_original' | 'digital_wallet';
  paymentDetails?: Record<string, any>;
  notifyCustomer?: boolean;
}

export interface RejectCashbackRequest {
  rejectionReason: string;
  notes?: string;
  notifyCustomer?: boolean;
}

export interface MarkCashbackPaidRequest {
  transactionId: string;
  paymentMethod: string;
  actualAmount: number;
  fee?: number;
  notes?: string;
}

export interface BulkCashbackAction {
  requestIds: string[];
  action: 'approve' | 'reject' | 'mark_paid' | 'export';
  data: {
    approvedAmount?: number;
    rejectionReason?: string;
    paymentMethod?: string;
    notes?: string;
    format?: 'csv' | 'excel' | 'pdf';
  };
}

export interface CashbackMetrics {
  summary: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    paidRequests: number;
    totalRequestedAmount: number;
    totalApprovedAmount: number;
    totalPaidAmount: number;
    averageRequestAmount: number;
    averageApprovedAmount: number;
    approvalRate: number;
    averageProcessingTime: number;
  };
  riskAnalysis: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    flaggedCount: number;
    averageRiskScore: number;
    riskDistribution: Array<{
      level: RiskLevel;
      count: number;
      percentage: number;
      totalAmount: number;
    }>;
  };
  timeAnalysis: {
    daily: Array<{
      date: string;
      requests: number;
      approved: number;
      amount: number;
    }>;
    weekly: Array<{
      week: string;
      requests: number;
      approved: number;
      amount: number;
    }>;
    monthly: Array<{
      month: string;
      requests: number;
      approved: number;
      amount: number;
    }>;
  };
  topReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
    averageAmount: number;
    approvalRate: number;
  }>;
  customerAnalysis: {
    topCustomers: Array<{
      customerId: string;
      name: string;
      requests: number;
      totalAmount: number;
      approvalRate: number;
    }>;
    customerTiers: Array<{
      tier: string;
      requests: number;
      averageAmount: number;
      approvalRate: number;
    }>;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    totalAmount: number;
    averageFee: number;
  }>;
}

export interface CashbackAnalytics {
  trends: {
    requestTrend: Array<{
      period: string;
      requests: number;
      amount: number;
      approvalRate: number;
    }>;
    seasonality: Array<{
      month: string;
      requests: number;
      amount: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
  predictiveAnalysis: {
    expectedRequests: number;
    expectedAmount: number;
    riskForecast: {
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
    };
  };
  benchmarks: {
    industryAverageApprovalRate: number;
    industryAverageProcessingTime: number;
    yourPerformance: {
      approvalRate: number;
      processingTime: number;
      customerSatisfaction: number;
    };
  };
  recommendations: Array<{
    type: 'risk_reduction' | 'process_improvement' | 'customer_satisfaction';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }>;
}

export interface CashbackListResponse {
  requests: CashbackRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: CashbackStatus;
    riskLevel?: RiskLevel;
    dateRange?: {
      start: string;
      end: string;
    };
    flaggedOnly?: boolean;
    search?: string;
  };
}

// Cashback events for real-time updates
export interface CashbackEvent {
  id: string;
  requestId: string;
  type: 'created' | 'approved' | 'rejected' | 'paid' | 'expired' | 'reviewed' | 'flagged';
  data: Partial<CashbackRequest>;
  timestamp: string;
  merchantId: string;
  riskLevel?: RiskLevel;
}