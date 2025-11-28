import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageKeys {
  AUTH_TOKEN: 'auth_token';
  USER_DATA: 'user_data';
  MERCHANT_DATA: 'merchant_data';
  DASHBOARD_CACHE: 'dashboard_cache';
  SETTINGS: 'app_settings';
}

const STORAGE_KEYS: StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  MERCHANT_DATA: 'merchant_data',
  DASHBOARD_CACHE: 'dashboard_cache',
  SETTINGS: 'app_settings',
};

class StorageService {
  // Generic storage methods with custom keys
  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (value === null || value === undefined) {
        await AsyncStorage.removeItem(key);
        return;
      }
      const stringValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Storage Error - Failed to set ${key}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const stringValue = await AsyncStorage.getItem(key);
      if (stringValue === null) return null;
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error(`Storage Error - Failed to get ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Storage Error - Failed to remove ${key}:`, error);
      throw error;
    }
  }

  // Predefined key storage methods
  async setItem<T>(key: keyof StorageKeys, value: T): Promise<void> {
    try {
       if (value === null || value === undefined) {
        // If value is invalid, remove the item
        await AsyncStorage.removeItem(STORAGE_KEYS[key]);
        return;
      }
      const stringValue = JSON.stringify(value);
      await AsyncStorage.setItem(STORAGE_KEYS[key], stringValue);
    } catch (error) {
      console.error(`Storage Error - Failed to set ${key}:`, error);
      throw error;
    }
  }

  async getItem<T>(key: keyof StorageKeys): Promise<T | null> {
    try {
      const stringValue = await AsyncStorage.getItem(STORAGE_KEYS[key]);
      if (stringValue === null) return null;
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error(`Storage Error - Failed to get ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: keyof StorageKeys): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS[key]);
    } catch (error) {
      console.error(`Storage Error - Failed to remove ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage Error - Failed to clear storage:', error);
      throw error;
    }
  }

  // Specific auth-related methods
  async setAuthToken(token: string): Promise<void> {
    try {
      // Store token directly as string without JSON.stringify to avoid quote issues
      console.log('🔐 STORAGE DEBUG: Setting auth token, length:', token.length);
      console.log('🔐 STORAGE DEBUG: Token first char:', JSON.stringify(token.charAt(0)));
      console.log('🔐 STORAGE DEBUG: Token last char:', JSON.stringify(token.charAt(token.length-1)));
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      
      // Verify storage immediately
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('🔐 STORAGE DEBUG: Token stored successfully, retrieved length:', stored?.length);
      console.log('🔐 STORAGE DEBUG: Storage verification match:', token === stored);
    } catch (error) {
      console.error('Storage Error - Failed to set auth token:', error);
      throw error;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      // Get token directly as string without JSON.parse to avoid quote issues
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      if (token) {
        console.log('🔐 STORAGE DEBUG: Retrieved auth token, length:', token.length);
        console.log('🔐 STORAGE DEBUG: Retrieved first char:', JSON.stringify(token.charAt(0)));
        console.log('🔐 STORAGE DEBUG: Retrieved last char:', JSON.stringify(token.charAt(token.length-1)));
        console.log('🔐 STORAGE DEBUG: Token preview:', token.substring(0, 20) + '...');
      } else {
        console.log('🔐 STORAGE DEBUG: No token found in storage');
      }
      
      return token;
    } catch (error) {
      console.error('Storage Error - Failed to get auth token:', error);
      return null;
    }
  }

  async removeAuthToken(): Promise<void> {
    await this.removeItem('AUTH_TOKEN');
  }

  // User data methods
  async setUserData(userData: any): Promise<void> {
    await this.setItem('USER_DATA', userData);
  }

  async getUserData<T>(): Promise<T | null> {
    return await this.getItem<T>('USER_DATA');
  }

  async removeUserData(): Promise<void> {
    await this.removeItem('USER_DATA');
  }

  // Merchant data methods
  async setMerchantData(merchantData: any): Promise<void> {
    await this.setItem('MERCHANT_DATA', merchantData);
  }

  async getMerchantData<T>(): Promise<T | null> {
    return await this.getItem<T>('MERCHANT_DATA');
  }

  async removeMerchantData(): Promise<void> {
    await this.removeItem('MERCHANT_DATA');
  }

  // Dashboard cache methods
  async setDashboardCache(data: any): Promise<void> {
    await this.setItem('DASHBOARD_CACHE', {
      data,
      timestamp: Date.now(),
    });
  }

  async getDashboardCache<T>(): Promise<{ data: T; timestamp: number } | null> {
    return await this.getItem<{ data: T; timestamp: number }>('DASHBOARD_CACHE');
  }

  async removeDashboardCache(): Promise<void> {
    await this.removeItem('DASHBOARD_CACHE');
  }

  // Settings methods
  async setSettings(settings: any): Promise<void> {
    await this.setItem('SETTINGS', settings);
  }

  async getSettings<T>(): Promise<T | null> {
    return await this.getItem<T>('SETTINGS');
  }

  // Logout - clear all auth-related data
  async logout(): Promise<void> {
    console.log('🧹 Clearing all authentication storage...');
    await this.removeAuthToken();
    await this.removeUserData();
    await this.removeMerchantData();
    await this.removeDashboardCache();
  }

  // Force clear all storage (for debugging)
  async forceClearAll(): Promise<void> {
    console.log('🗑️ Force clearing ALL storage...');
    await this.clear();
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAuthToken();
    return token !== null;
  }
}

// Create and export singleton instance
export const storageService = new StorageService();
export default storageService;