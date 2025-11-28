import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';
import {
  CashbackRequest,
  CashbackMetrics,
  CashbackFilters
} from '../../types/api';

export interface CashbackListResponse {
  requests: CashbackRequest[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApproveCashbackRequest {
  approvedAmount: number;
  paymentMethod?: string;
  notes?: string;
}

export interface RejectCashbackRequest {
  rejectionReason: string;
  notes?: string;
}

export interface BulkCashbackAction {
  requestIds: string[];
  action: 'approve' | 'reject' | 'mark_paid';
  approvedAmount?: number;
  rejectionReason?: string;
  paymentMethod?: string;
  notes?: string;
}

class CashbackService {
  // Get cashback requests with filtering and pagination
  async getCashbackRequests(filters?: CashbackFilters): Promise<CashbackListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
        if (filters.status) params.append('status', filters.status);
        if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
        if (filters.customerId) params.append('customerId', filters.customerId);
        if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
        if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
        if (filters.dateStart) params.append('dateStart', filters.dateStart);
        if (filters.dateEnd) params.append('dateEnd', filters.dateEnd);
      }

      const response = await fetch(getApiUrl(`merchant/cashback?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get cashback requests');
      }
    } catch (error: any) {
      console.error('Get cashback requests error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get cashback requests');
    }
  }

  // Get single cashback request by ID
  async getCashbackRequest(requestId: string): Promise<CashbackRequest> {
    try {
      const response = await fetch(getApiUrl(`merchant/cashback/${requestId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get cashback request');
      }
    } catch (error: any) {
      console.error('Get cashback request error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get cashback request');
    }
  }

  // Create new cashback request
  async createCashbackRequest(requestData: any): Promise<CashbackRequest> {
    try {
      const response = await fetch(getApiUrl('merchant/cashback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create cashback request');
      }
    } catch (error: any) {
      console.error('Create cashback request error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create cashback request');
    }
  }

  // Approve cashback request
  async approveCashbackRequest(requestId: string, approvalData: ApproveCashbackRequest): Promise<CashbackRequest> {
    try {
      const response = await fetch(getApiUrl(`merchant/cashback/${requestId}/approve`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(approvalData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to approve cashback request');
      }
    } catch (error: any) {
      console.error('Approve cashback request error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to approve cashback request');
    }
  }

  // Reject cashback request
  async rejectCashbackRequest(requestId: string, rejectionData: RejectCashbackRequest): Promise<CashbackRequest> {
    try {
      const response = await fetch(getApiUrl(`merchant/cashback/${requestId}/reject`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(rejectionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to reject cashback request');
      }
    } catch (error: any) {
      console.error('Reject cashback request error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to reject cashback request');
    }
  }

  // Mark cashback as paid
  async markCashbackPaid(requestId: string, paymentData: any): Promise<CashbackRequest> {
    try {
      const response = await fetch(getApiUrl(`merchant/cashback/${requestId}/mark-paid`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to mark cashback as paid');
      }
    } catch (error: any) {
      console.error('Mark cashback paid error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to mark cashback as paid');
    }
  }

  // Bulk action on cashback requests
  async bulkCashbackAction(bulkAction: BulkCashbackAction): Promise<{ successful: number; failed: number; errors: any[] }> {
    try {
      const response = await fetch(getApiUrl('merchant/cashback/bulk-action'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(bulkAction)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to perform bulk cashback action');
      }
    } catch (error: any) {
      console.error('Bulk cashback action error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to perform bulk cashback action');
    }
  }

  // Get cashback metrics
  async getCashbackMetrics(dateRange?: { startDate: string; endDate: string }): Promise<CashbackMetrics> {
    try {
      const params = dateRange ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : '';
      const response = await fetch(getApiUrl(`merchant/cashback/metrics${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get cashback metrics');
      }
    } catch (error: any) {
      console.error('Get cashback metrics error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get cashback metrics');
    }
  }

  // Get metrics (alias for compatibility)
  async getMetrics(dateRange?: { startDate: string; endDate: string }): Promise<CashbackMetrics> {
    return this.getCashbackMetrics(dateRange);
  }

  // Create sample data (alias for compatibility)
  async createSampleData(count: number = 10): Promise<{ message: string }> {
    try {
      await this.generateSampleCashback(count);
      return { message: 'Sample cashback requests created successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Generate sample cashback requests (for testing)
  async generateSampleCashback(count: number = 10): Promise<CashbackRequest[]> {
    try {
      const response = await fetch(getApiUrl('merchant/cashback/generate-sample'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ count })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to generate sample cashback requests');
      }
    } catch (error: any) {
      console.error('Generate sample cashback error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to generate sample cashback requests');
    }
  }

  // Export cashback requests
  async exportCashback(filters?: CashbackFilters, format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<{ url: string; filename: string }> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.flaggedOnly) params.append('flaggedOnly', 'true');
      }

      const response = await fetch(getApiUrl(`merchant/cashback/export?${params}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to export cashback requests');
      }
    } catch (error: any) {
      console.error('Export cashback error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to export cashback requests');
    }
  }

  // Get cashback status options
  getCashbackStatusOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'Pending', value: 'pending', color: '#f59e0b' },
      { label: 'Approved', value: 'approved', color: '#10b981' },
      { label: 'Rejected', value: 'rejected', color: '#ef4444' },
      { label: 'Paid', value: 'paid', color: '#6366f1' },
      { label: 'Expired', value: 'expired', color: '#6b7280' }
    ];
  }

  // Get risk level options
  getRiskLevelOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'Low Risk', value: 'low', color: '#10b981' },
      { label: 'Medium Risk', value: 'medium', color: '#f59e0b' },
      { label: 'High Risk', value: 'high', color: '#ef4444' }
    ];
  }

  // Get cashback analytics
  async getAnalytics(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        getApiUrl(`merchant/cashback/analytics?${params.toString()}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get cashback analytics');
      }
    } catch (error: any) {
      console.error('Get cashback analytics error:', error);
      
      // Return fallback analytics data instead of throwing error
      const fallbackAnalytics = {
        totalRequests: 0,
        totalAmount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
        statusBreakdown: {
          pending: 0,
          approved: 0,
          rejected: 0,
          paid: 0,
          expired: 0
        },
        averageProcessingTime: 0,
        topCustomers: []
      };
      
      console.warn('Using fallback cashback analytics due to API error');
      return fallbackAnalytics;
    }
  }
  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const cashbackService = new CashbackService();
export default cashbackService;