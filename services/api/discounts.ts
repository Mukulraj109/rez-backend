import { apiClient, ApiResponse } from './index';
import { getApiUrl } from '../../config/api';

export interface MerchantDiscount {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  storeId?: string;
  store?: {
    _id: string;
    name: string;
    slug?: string;
  };
  scope: 'merchant' | 'store';
  merchantId: string;
  applicableOn: 'bill_payment' | 'card_payment';
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser: number;
  usedCount: number;
  isActive: boolean;
  priority: number;
  restrictions?: {
    isOfflineOnly?: boolean;
    notValidAboveStoreDiscount?: boolean;
    singleVoucherPerBill?: boolean;
  };
  metadata?: {
    displayText?: string;
    icon?: string;
    backgroundColor?: string;
  };
  // Card Offer Specific Fields
  paymentMethod?: 'upi' | 'card' | 'all';
  cardType?: 'credit' | 'debit' | 'all';
  bankNames?: string[];
  cardBins?: string[];
  createdBy: string;
  createdByType: 'merchant';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountRequest {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  storeId?: string; // If provided, scope = 'store', else scope = 'merchant'
  applicableOn: 'bill_payment' | 'card_payment';
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  priority?: number;
  restrictions?: {
    isOfflineOnly?: boolean;
    notValidAboveStoreDiscount?: boolean;
    singleVoucherPerBill?: boolean;
  };
  metadata?: {
    displayText?: string;
    icon?: string;
    backgroundColor?: string;
    cardImageUrl?: string;
    bankLogoUrl?: string;
    offerBadge?: string;
  };
  // Card Offer Specific Fields
  paymentMethod?: 'upi' | 'card' | 'all';
  cardType?: 'credit' | 'debit' | 'all';
  bankNames?: string[];
  cardBins?: string[];
}

export interface UpdateDiscountRequest extends Partial<CreateDiscountRequest> {}

export interface DiscountAnalytics {
  discount: {
    _id: string;
    name: string;
    type: string;
    value: number;
    scope: string;
    storeId?: string;
  };
  usage: {
    totalUses: number;
    usageLimit: number | null;
    usageLimitPerUser: number;
    remainingUses: number | null;
  };
  validity: {
    validFrom: string;
    validUntil: string;
    isCurrentlyValid: boolean;
  };
  status: {
    isActive: boolean;
    priority: number;
  };
}

export interface DiscountListResponse {
  discounts: MerchantDiscount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class DiscountsService {
  private get baseUrl() {
    return getApiUrl('merchant/discounts');
  }

  /**
   * Get all discounts for merchant
   */
  async getDiscounts(params?: {
    storeId?: string;
    scope?: 'merchant' | 'store';
    isActive?: boolean;
    paymentMethod?: 'upi' | 'card' | 'all';
    applicableOn?: 'bill_payment' | 'card_payment';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<DiscountListResponse>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.scope) queryParams.append('scope', params.scope);
      if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      if (params?.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
      if (params?.applicableOn) queryParams.append('applicableOn', params.applicableOn);
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));

      const url = queryParams.toString() 
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      const response = await apiClient.get<{ discounts: MerchantDiscount[]; pagination: any }>(url);
      
      return {
        success: response.success,
        data: {
          discounts: response.data?.discounts || [],
          pagination: response.data?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        },
        message: response.message
      };
    } catch (error: any) {
      console.error('[DISCOUNTS SERVICE] Error fetching discounts:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch discounts',
        error: error.message
      };
    }
  }

  /**
   * Get single discount by ID
   */
  async getDiscountById(id: string): Promise<ApiResponse<MerchantDiscount>> {
    try {
      const response = await apiClient.get<MerchantDiscount>(`${this.baseUrl}/${id}`);
      return response;
    } catch (error: any) {
      console.error(`[DISCOUNTS SERVICE] Error fetching discount ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch discount',
        error: error.message
      };
    }
  }

  /**
   * Create new discount
   */
  async createDiscount(discountData: CreateDiscountRequest): Promise<ApiResponse<MerchantDiscount>> {
    try {
      const response = await apiClient.post<MerchantDiscount>(this.baseUrl, discountData);
      return response;
    } catch (error: any) {
      console.error('[DISCOUNTS SERVICE] Error creating discount:', error);
      return {
        success: false,
        message: error.message || 'Failed to create discount',
        error: error.message
      };
    }
  }

  /**
   * Update existing discount
   */
  async updateDiscount(
    id: string,
    discountData: UpdateDiscountRequest
  ): Promise<ApiResponse<MerchantDiscount>> {
    try {
      const response = await apiClient.put<MerchantDiscount>(`${this.baseUrl}/${id}`, discountData);
      return response;
    } catch (error: any) {
      console.error(`[DISCOUNTS SERVICE] Error updating discount ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to update discount',
        error: error.message
      };
    }
  }

  /**
   * Delete discount (soft delete)
   */
  async deleteDiscount(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
      return response;
    } catch (error: any) {
      console.error(`[DISCOUNTS SERVICE] Error deleting discount ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to delete discount',
        error: error.message
      };
    }
  }

  /**
   * Get discount analytics
   */
  async getDiscountAnalytics(id: string): Promise<ApiResponse<DiscountAnalytics>> {
    try {
      const response = await apiClient.get<DiscountAnalytics>(`${this.baseUrl}/${id}/analytics`);
      return response;
    } catch (error: any) {
      console.error(`[DISCOUNTS SERVICE] Error fetching discount analytics ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch discount analytics',
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
export const discountsService = new DiscountsService();
export default discountsService;


