import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Product, Order, CashbackRequest } from '../types/api';

export interface OfflineAction {
  id: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'UPDATE_ORDER' | 'APPROVE_CASHBACK' | 'REJECT_CASHBACK';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface CachedData {
  products: Product[];
  orders: Order[];
  cashbackRequests: CashbackRequest[];
  lastSync: number;
  expiresAt: number;
}

class OfflineService {
  private readonly CACHE_KEY = 'app_cache';
  private readonly OFFLINE_ACTIONS_KEY = 'offline_actions';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  
  constructor() {
    this.initializeNetworkListener();
  }

  // Initialize network listener
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log('🌐 Network status changed:', this.isOnline ? 'Online' : 'Offline');
      
      // If we just came back online, sync pending actions
      if (wasOffline && this.isOnline) {
        console.log('🔄 Network restored, syncing offline actions...');
        this.syncOfflineActions();
      }
    });
  }

  // Check if device is online
  async isDeviceOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  // Cache data for offline access
  async cacheData(data: Partial<CachedData>): Promise<void> {
    try {
      const existingCache = await this.getCachedData();
      const now = Date.now();
      
      const updatedCache: CachedData = {
        ...existingCache,
        ...data,
        lastSync: now,
        expiresAt: now + this.CACHE_DURATION,
      };

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(updatedCache));
      console.log('💾 Data cached successfully');
    } catch (error) {
      console.error('❌ Error caching data:', error);
    }
  }

  // Get cached data
  async getCachedData(): Promise<CachedData> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return this.getEmptyCache();
      }

      const data: CachedData = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > data.expiresAt) {
        console.log('⏰ Cache expired, returning empty cache');
        return this.getEmptyCache();
      }

      return data;
    } catch (error) {
      console.error('❌ Error getting cached data:', error);
      return this.getEmptyCache();
    }
  }

  // Check if cache is valid and not expired
  async isCacheValid(): Promise<boolean> {
    try {
      const cache = await this.getCachedData();
      return Date.now() < cache.expiresAt && cache.lastSync > 0;
    } catch {
      return false;
    }
  }

  // Get empty cache structure
  private getEmptyCache(): CachedData {
    return {
      products: [],
      orders: [],
      cashbackRequests: [],
      lastSync: 0,
      expiresAt: 0,
    };
  }

  // Queue an action for when device comes back online
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingActions = await this.getOfflineActions();
      existingActions.push(offlineAction);
      
      await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(existingActions));
      console.log('📤 Queued offline action:', action.type);
    } catch (error) {
      console.error('❌ Error queuing offline action:', error);
    }
  }

  // Get pending offline actions
  async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const actions = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      return actions ? JSON.parse(actions) : [];
    } catch (error) {
      console.error('❌ Error getting offline actions:', error);
      return [];
    }
  }

  // Sync pending offline actions when back online
  async syncOfflineActions(): Promise<{ successful: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return { successful: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let successful = 0;
    let failed = 0;

    try {
      const actions = await this.getOfflineActions();
      console.log(`🔄 Syncing ${actions.length} offline actions...`);

      for (const action of actions) {
        try {
          await this.executeOfflineAction(action);
          successful++;
          console.log('✅ Successfully synced action:', action.type);
        } catch (error) {
          console.error('❌ Failed to sync action:', action.type, error);
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            console.log('🚫 Max retries reached for action:', action.type);
            failed++;
          } else {
            // Keep action for retry
            console.log(`🔄 Will retry action (${action.retryCount}/${action.maxRetries}):`, action.type);
          }
        }
      }

      // Remove successful actions and failed actions that exceeded max retries
      const remainingActions = actions.filter(action => 
        action.retryCount < action.maxRetries && !this.wasActionSuccessful(action.id)
      );
      
      await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(remainingActions));
      
      console.log(`🎯 Sync complete: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }

    return { successful, failed };
  }

  // Execute a single offline action
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    // This would normally make the actual API call
    // For now, we'll simulate the API call
    console.log(`🚀 Executing offline action: ${action.method} ${action.endpoint}`, action.data);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate success/failure (90% success rate)
    if (Math.random() > 0.1) {
      // Success - mark action as successful
      await this.markActionAsSuccessful(action.id);
    } else {
      // Failure - throw error to trigger retry logic
      throw new Error('Simulated API failure');
    }
  }

  // Mark action as successful (in a real app, this might be tracked differently)
  private successfulActions: Set<string> = new Set();
  
  private async markActionAsSuccessful(actionId: string): Promise<void> {
    this.successfulActions.add(actionId);
  }

  private wasActionSuccessful(actionId: string): boolean {
    return this.successfulActions.has(actionId);
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.CACHE_KEY, this.OFFLINE_ACTIONS_KEY]);
      this.successfulActions.clear();
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  // Get cache info for debugging
  async getCacheInfo(): Promise<{
    cacheSize: number;
    pendingActions: number;
    lastSync: Date | null;
    isExpired: boolean;
  }> {
    try {
      const cache = await this.getCachedData();
      const actions = await this.getOfflineActions();
      
      return {
        cacheSize: cache.products.length + cache.orders.length + cache.cashbackRequests.length,
        pendingActions: actions.length,
        lastSync: cache.lastSync > 0 ? new Date(cache.lastSync) : null,
        isExpired: Date.now() > cache.expiresAt,
      };
    } catch {
      return {
        cacheSize: 0,
        pendingActions: 0,
        lastSync: null,
        isExpired: true,
      };
    }
  }

  // Helper methods for specific data types
  async getCachedProducts(): Promise<Product[]> {
    const cache = await this.getCachedData();
    return cache.products || [];
  }

  async getCachedOrders(): Promise<Order[]> {
    const cache = await this.getCachedData();
    return cache.orders || [];
  }

  async getCachedCashbackRequests(): Promise<CashbackRequest[]> {
    const cache = await this.getCachedData();
    return cache.cashbackRequests || [];
  }

  // Queue specific action types
  async queueProductCreate(productData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'CREATE_PRODUCT',
      endpoint: '/api/products',
      method: 'POST',
      data: productData,
      maxRetries: 3,
    });
  }

  async queueProductUpdate(productId: string, productData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'UPDATE_PRODUCT',
      endpoint: `/api/products/${productId}`,
      method: 'PUT',
      data: productData,
      maxRetries: 3,
    });
  }

  async queueProductDelete(productId: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'DELETE_PRODUCT',
      endpoint: `/api/products/${productId}`,
      method: 'DELETE',
      maxRetries: 3,
    });
  }

  async queueOrderUpdate(orderId: string, orderData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'UPDATE_ORDER',
      endpoint: `/api/orders/${orderId}`,
      method: 'PUT',
      data: orderData,
      maxRetries: 5, // Orders are more critical
    });
  }

  async queueCashbackApproval(cashbackId: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'APPROVE_CASHBACK',
      endpoint: `/api/cashback/${cashbackId}/approve`,
      method: 'PUT',
      maxRetries: 5, // Financial operations are critical
    });
  }

  async queueCashbackRejection(cashbackId: string, reason?: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'REJECT_CASHBACK',
      endpoint: `/api/cashback/${cashbackId}/reject`,
      method: 'PUT',
      data: { reason },
      maxRetries: 5,
    });
  }
}

// Create and export singleton instance
export const offlineService = new OfflineService();
export default offlineService;