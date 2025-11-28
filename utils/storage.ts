import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web-compatible storage wrapper
class StorageManager {
  private isWeb = Platform.OS === 'web';

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb && typeof window !== 'undefined') {
        // Use localStorage on web as fallback
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          console.warn('AsyncStorage failed on web, falling back to localStorage:', error);
          return localStorage.getItem(key);
        }
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb && typeof window !== 'undefined') {
        // Use localStorage on web as fallback
        try {
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.warn('AsyncStorage failed on web, falling back to localStorage:', error);
          localStorage.setItem(key, value);
        }
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb && typeof window !== 'undefined') {
        // Use localStorage on web as fallback
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.warn('AsyncStorage failed on web, falling back to localStorage:', error);
          localStorage.removeItem(key);
        }
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isWeb && typeof window !== 'undefined') {
        try {
          await AsyncStorage.clear();
        } catch (error) {
          console.warn('AsyncStorage failed on web, falling back to localStorage:', error);
          localStorage.clear();
        }
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
}

export const storage = new StorageManager();