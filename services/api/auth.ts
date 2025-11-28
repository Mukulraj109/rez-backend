import { apiClient } from './index';
import { storageService } from '../storage';
import {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  Merchant
} from '../../types/api';

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ token: string; merchant: Merchant }>('merchant/auth/login', credentials);

      if (response.success && response.data) {
        // Create user object from merchant data for compatibility
        const user: User = {
          id: response.data.merchant.id,
          email: response.data.merchant.email,
          name: response.data.merchant.ownerName,
          role: 'merchant',
          merchantId: response.data.merchant.id,
          isActive: response.data.merchant.isActive || true,
          createdAt: response.data.merchant.createdAt || new Date().toISOString(),
          updatedAt: response.data.merchant.updatedAt || new Date().toISOString()
        };

        // Store authentication data
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(user);
        await storageService.setMerchantData(response.data.merchant);

        return {
          token: response.data.token,
          user: user,
          merchant: response.data.merchant
        };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  // Register new user/merchant
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ token: string; merchant: Merchant }>('merchant/auth/register', userData);

      if (response.success && response.data) {
        // Create user object from merchant data for compatibility
        const user: User = {
          id: response.data.merchant.id,
          email: response.data.merchant.email,
          name: response.data.merchant.ownerName,
          role: 'merchant',
          merchantId: response.data.merchant.id,
          isActive: response.data.merchant.isActive || true,
          createdAt: response.data.merchant.createdAt || new Date().toISOString(),
          updatedAt: response.data.merchant.updatedAt || new Date().toISOString()
        };

        // Store authentication data
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(user);
        await storageService.setMerchantData(response.data.merchant);

        return {
          token: response.data.token,
          user: user,
          merchant: response.data.merchant
        };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  // Refresh authentication token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('merchant/auth/refresh');

      if (response.success && response.data) {
        // Update stored token
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(response.data.user);
        await storageService.setMerchantData(response.data.merchant);

        return response.data;
      } else {
        throw new Error(response.message || 'Token refresh failed');
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      // If refresh fails, clear stored data
      await this.logout();
      throw new Error(error.response?.data?.message || error.message || 'Token refresh failed');
    }
  }

  // Get current user profile
  async getProfile(): Promise<{ user: User; merchant: Merchant }> {
    try {
      const response = await apiClient.get<{ merchant: Merchant }>('merchant/auth/me');

      if (response.success && response.data) {
        // Create user object from merchant data for compatibility
        const user: User = {
          id: response.data.merchant.id,
          email: response.data.merchant.email,
          name: response.data.merchant.ownerName,
          role: 'merchant',
          merchantId: response.data.merchant.id,
          isActive: response.data.merchant.isActive || true,
          createdAt: response.data.merchant.createdAt || new Date().toISOString(),
          updatedAt: response.data.merchant.updatedAt || new Date().toISOString()
        };

        // Update stored user data
        await storageService.setUserData(user);
        await storageService.setMerchantData(response.data.merchant);

        return {
          user: user,
          merchant: response.data.merchant
        };
      } else {
        throw new Error(response.message || 'Failed to get profile');
      }
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get profile');
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>('merchant/auth/profile', updates);

      if (response.success && response.data) {
        // Update stored user data
        await storageService.setUserData(response.data);

        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await apiClient.put('merchant/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to change password');
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if token exists
      const token = await storageService.getAuthToken();
      if (token) {
        try {
          await apiClient.post('merchant/auth/logout');
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }
      }
    } finally {
      // Always clear local storage
      await storageService.logout();
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await storageService.getAuthToken();
    if (!token) return false;

    try {
      // Verify token is still valid
      await this.getProfile();
      return true;
    } catch (error) {
      // If verification fails, clear stored data
      await storageService.logout();
      return false;
    }
  }

  // Get stored user data
  async getStoredUserData(): Promise<User | null> {
    return await storageService.getUserData<User>();
  }

  // Get stored merchant data
  async getStoredMerchantData(): Promise<Merchant | null> {
    return await storageService.getMerchantData<Merchant>();
  }

  // Get stored auth token
  async getStoredToken(): Promise<string | null> {
    return await storageService.getAuthToken();
  }

  // Clear all authentication data
  async clearAuthData(): Promise<void> {
    await storageService.logout();
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await apiClient.post('merchant/auth/forgot-password', { email });

      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to send reset email');
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await apiClient.post('merchant/auth/reset-password', {
        token,
        newPassword
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to reset password');
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await apiClient.post('merchant/auth/verify-email', { token });

      if (!response.success) {
        throw new Error(response.message || 'Failed to verify email');
      }
    } catch (error: any) {
      console.error('Verify email error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to verify email');
    }
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    try {
      const response = await apiClient.post('merchant/auth/resend-verification');

      if (!response.success) {
        throw new Error(response.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to resend verification email');
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService();
export default authService;