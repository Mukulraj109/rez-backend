import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl } from '../../config/api';

// Use environment-aware API URL
const API_BASE_URL = getApiUrl();
const API_TIMEOUT = API_CONFIG.TIMEOUT;

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

interface PaginatedResponse<T = any> {
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

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isTokenInvalid: boolean = false;

  constructor() {
    // Ensure baseURL doesn't end with slash for proper URL joining
    const baseURL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Skip auth requests if token is known to be invalid
        // Allow logout requests even when token is invalid
        if (this.isTokenInvalid && !config.url?.includes('/auth/')) {
          return Promise.reject(new Error('Token is invalid, please login again'));
        }

        // Add small delay to ensure AsyncStorage operations complete
        // This helps prevent race conditions with token storage
        await new Promise(resolve => setTimeout(resolve, 50));

        const token = await AsyncStorage.getItem('auth_token');

        if (token && !this.isTokenInvalid) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // For FormData, remove Content-Type to let axios set it with boundary
        if (config.data instanceof FormData || 
            (config.data && typeof config.data === 'object' && config.data.constructor?.name === 'FormData')) {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle common responses
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error) => {
        // Handle token expiration/invalidation
        if (error.response?.status === 401) {
          this.isTokenInvalid = true;

          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          await AsyncStorage.removeItem('merchant_data');
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.get<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  // Generic POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    
    // Check if data is FormData (works for both web and React Native)
    const isFormData = data instanceof FormData || 
                      (typeof FormData !== 'undefined' && data instanceof FormData) ||
                      (data && typeof data === 'object' && data.constructor?.name === 'FormData');
    
    // If data is FormData, configure request to send as multipart/form-data
    let requestConfig: AxiosRequestConfig = { ...config };
    
    if (isFormData) {
      // For FormData:
      // 1. Interceptor will add Authorization header
      // 2. Interceptor will remove Content-Type (so axios sets it with boundary)
      // 3. We just need to prevent JSON transformation
      requestConfig = {
        ...config,
        // Prevent axios from transforming FormData - return as-is
        transformRequest: [(data) => {
          // If it's FormData, return it without transformation
          if (data instanceof FormData || (data && typeof data === 'object' && data.constructor?.name === 'FormData')) {
            return data;
          }
          // For other data types, use default JSON transformation
          return JSON.stringify(data);
        }],
      };
    }
    
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(cleanUrl, data, requestConfig);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Generic PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const baseURL = this.axiosInstance.defaults.baseURL || '';
    const fullUrl = `${baseURL}/${cleanUrl}`;
    
    console.log('🔵 [API Client] PUT Request:', fullUrl);
    console.log('🔵 [API Client] PUT Data:', JSON.stringify(data, null, 2));
    
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(cleanUrl, data, config);
      console.log('🟢 [API Client] PUT Response:', {
        status: response.status,
        url: cleanUrl,
        hasData: !!response.data,
        success: response.data?.success
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [API Client] PUT Error:', {
        url: cleanUrl,
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data
      });
      throw error;
    }
  }

  // Generic DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.delete<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  // Paginated GET request
  async getPaginated<T = any>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    const response = await this.axiosInstance.get<PaginatedResponse<T>>(url, config);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.axiosInstance.get('/health');
    return response.data;
  }

  // Reset token invalid flag (called after successful login/register)
  resetTokenStatus(): void {
    this.isTokenInvalid = false;
  }

  // Get the axios instance for custom requests
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export type { ApiResponse, PaginatedResponse };
export default apiClient;

// Export all API services
export * from './auth';
export * from './products';
export * from './orders';
export * from './cashback';
export * from './uploads';
export * from './onboarding';
export * from './dashboard';
export * from './analytics';
export * from './audit';
export * from './notifications';
export * from './documents';
export * from './sync';
export * from './profile';
export * from './reviews';
export * from './stores';
export * from './offers';
export * from './discounts';