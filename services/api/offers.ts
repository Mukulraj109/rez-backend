import { getApiUrl } from '../../config/api';
import { storageService } from '../storage';

export interface StoreOffer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: 'mega' | 'student' | 'new_arrival' | 'trending' | 'food' | 'fashion' | 'electronics' | 'general';
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  store: {
    id: string;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  restrictions: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    applicableOn?: string[];
    excludedProducts?: string[];
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  metadata: {
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    priority: number;
    tags: string[];
    featured?: boolean;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferRequest {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: 'mega' | 'student' | 'new_arrival' | 'trending' | 'food' | 'fashion' | 'electronics' | 'general';
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  storeId: string;
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    applicableOn?: string[];
    excludedProducts?: string[];
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  metadata?: {
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    priority?: number;
    tags?: string[];
    featured?: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class OffersService {
  private get baseUrl() {
    return getApiUrl('merchant/offers');
  }

  private async getAuthToken(): Promise<string> {
    const token = await storageService.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    return token;
  }

  // Get all offers for a store
  async getStoreOffers(storeId: string): Promise<ApiResponse<{ deals: StoreOffer[] }>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}?store=${storeId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          deals: data.data?.items || data.data || []
        }
      };
    } catch (error: any) {
      console.error('[OFFERS SERVICE] Error fetching store offers:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch store offers',
        error: error.message
      };
    }
  }

  // Create a new offer
  async createOffer(offerData: CreateOfferRequest): Promise<ApiResponse<StoreOffer>> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('[OFFERS SERVICE] Error creating offer:', error);
      return {
        success: false,
        message: error.message || 'Failed to create offer',
        error: error.message
      };
    }
  }

  // Update an offer
  async updateOffer(offerId: string, offerData: Partial<CreateOfferRequest>): Promise<ApiResponse<StoreOffer>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/${offerId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('[OFFERS SERVICE] Error updating offer:', error);
      return {
        success: false,
        message: error.message || 'Failed to update offer',
        error: error.message
      };
    }
  }

  // Delete an offer
  async deleteOffer(offerId: string): Promise<ApiResponse<void>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/${offerId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Offer deleted successfully'
      };
    } catch (error: any) {
      console.error('[OFFERS SERVICE] Error deleting offer:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete offer',
        error: error.message
      };
    }
  }

  // Get a single offer by ID
  async getOfferById(offerId: string): Promise<ApiResponse<StoreOffer>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/${offerId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('[OFFERS SERVICE] Error fetching offer:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch offer',
        error: error.message
      };
    }
  }
}

export const offersService = new OffersService();

