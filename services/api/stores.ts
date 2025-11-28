import { apiClient } from './index';

export interface StoreLocation {
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  deliveryRadius?: number;
  landmark?: string;
}

export interface StoreContact {
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
}

export interface StoreHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface StoreOperationalInfo {
  hours?: StoreHours;
  deliveryTime?: string;
  minimumOrder?: number;
  deliveryFee?: number;
  freeDeliveryAbove?: number;
  acceptsWalletPayment?: boolean;
  paymentMethods?: string[];
}

export interface StoreOffers {
  cashback?: number;
  minOrderAmount?: number;
  maxCashback?: number;
  isPartner?: boolean;
  partnerLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface Store {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  location: StoreLocation;
  contact: StoreContact;
  operationalInfo: StoreOperationalInfo;
  offers: StoreOffers;
  tags?: string[];
  isActive: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  merchantId: string;
  ratings: {
    average: number;
    count: number;
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  };
  analytics: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    repeatCustomers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreData {
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  category: string;
  location: StoreLocation;
  contact?: StoreContact;
  operationalInfo?: StoreOperationalInfo;
  offers?: StoreOffers;
  tags?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateStoreData extends Partial<CreateStoreData> {}

class StoreService {
  /**
   * Get all stores for the merchant
   */
  async getStores(params?: { isActive?: boolean; search?: string }): Promise<{ data: Store[]; count: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.isActive !== undefined) {
        queryParams.append('isActive', params.isActive.toString());
      }
      if (params?.search) {
        queryParams.append('search', params.search);
      }

      const queryString = queryParams.toString();
      const url = queryString ? `merchant/stores?${queryString}` : 'merchant/stores';
      
      const response = await apiClient.get<any>(url);
      
      // Backend returns: { success: true, message: '...', data: Store[], count: number }
      // apiClient.get returns response.data which is the backend response object
      // So: response = { success, message, data: Store[], count }
      // Therefore: response.data = Store[] (the array)
      let stores: Store[] = [];
      let count = 0;
      
      if (Array.isArray(response.data)) {
        stores = response.data;
        count = response.count || stores.length;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        stores = Array.isArray((response.data as any).data) ? (response.data as any).data : [];
        count = (response.data as any).count || response.count || stores.length;
      }
      
      return {
        data: stores,
        count: count
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get stores');
    }
  }

  /**
   * Get active store
   */
  async getActiveStore(): Promise<Store> {
    try {
      const response = await apiClient.get<any>('merchant/stores/active');
      // Backend returns: { success: true, message: '...', data: Store }
      // apiClient.get returns response.data which is the backend response object
      // So: response = { success, message, data: Store }
      // Therefore: response.data = Store (the store object)
      if (!response.data) {
        throw new Error('No active store found');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get active store');
    }
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<Store> {
    try {
      const response = await apiClient.get<any>(`merchant/stores/${storeId}`);
      if (!response.data) {
        throw new Error('Store not found');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get store');
    }
  }

  /**
   * Create a new store
   */
  async createStore(storeData: CreateStoreData): Promise<Store> {
    try {
      const response = await apiClient.post<any>('merchant/stores', storeData);
      if (!response.data) {
        throw new Error('Failed to create store');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create store');
    }
  }

  /**
   * Update store
   */
  async updateStore(storeId: string, storeData: UpdateStoreData): Promise<Store> {
    try {
      const response = await apiClient.put<any>(`merchant/stores/${storeId}`, storeData);
      
      if (!response.data) {
        throw new Error('Failed to update store');
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update store');
    }
  }

  /**
   * Delete/deactivate store
   */
  async deleteStore(storeId: string): Promise<void> {
    try {
      await apiClient.delete(`merchant/stores/${storeId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete store');
    }
  }

  /**
   * Activate store (set as active)
   */
  async activateStore(storeId: string): Promise<Store> {
    try {
      const response = await apiClient.post<any>(`merchant/stores/${storeId}/activate`);
      if (!response.data) {
        throw new Error('Failed to activate store');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to activate store');
    }
  }
}

export const storeService = new StoreService();
export default storeService;

