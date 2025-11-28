import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { authService } from '../services/api/auth';
import { socketService } from '../services/api/socket';
import { teamService } from '../services/api/team';
import { User, Merchant, LoginRequest, RegisterRequest } from '../types/api';
import { Permission, MerchantRole } from '../types/team';

// Types
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  merchant: Merchant | null;
  user: User | null;
  token: string | null;
  error: string | null;
  permissions: Permission[];
  role: MerchantRole | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { merchant: Merchant; user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_MERCHANT'; payload: Merchant }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'UPDATE_PERMISSIONS'; payload: { permissions: Permission[]; role: MerchantRole } };

interface AuthContextType {
  state: AuthState;
  token: string | null;
  user: User | null;
  merchant: Merchant | null;
  permissions: Permission[];
  role: MerchantRole | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateMerchant: (merchant: Merchant) => void;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for stored token
  merchant: null,
  user: null,
  token: null,
  error: null,
  permissions: [],
  role: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        merchant: action.payload.merchant,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        merchant: null,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      console.log('🔄 LOGOUT action dispatched - updating auth state');
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        merchant: null,
        user: null,
        token: null,
        error: null,
        permissions: [],
        role: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_MERCHANT':
      return {
        ...state,
        merchant: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'UPDATE_PERMISSIONS':
      return {
        ...state,
        permissions: action.payload.permissions,
        role: action.payload.role,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored token on app start
  useEffect(() => {
    checkStoredToken();
  }, []);

  const checkStoredToken = async () => {
    try {
      console.log('🔍 Checking stored authentication...');
      
      // First clear any invalid tokens from previous sessions
      await clearInvalidTokens();
      
      // Check if user is authenticated via auth service
      const isAuthenticated = await authService.isAuthenticated();
      
      if (isAuthenticated) {
        // Get stored data
        const [user, merchant, token] = await Promise.all([
          authService.getStoredUserData(),
          authService.getStoredMerchantData(),
          authService.getStoredToken()
        ]);
        
        if (user && merchant && token) {
          console.log('✅ Valid stored authentication found');
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, merchant, token }
          });
          
          // Load permissions
          try {
            await refreshPermissions();
          } catch (permError) {
            console.warn('⚠️ Failed to load permissions:', permError);
          }

          // Initialize socket connection (optional - app works without it)
          try {
            await socketService.connect();
            await socketService.joinMerchantDashboard();
            if (__DEV__) {
              console.log('✅ [Socket] Connection established');
            }
          } catch (socketError) {
            // Silently fail - WebSocket is optional
            if (__DEV__) {
              console.warn('⚠️ [Socket] Connection failed (non-critical)');
            }
          }
        } else {
          console.warn('❌ Incomplete stored data, logging out');
          await authService.clearAuthData();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        console.log('❌ No valid authentication found');
        await authService.clearAuthData();
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('❌ Error checking stored authentication:', error);
      await authService.clearAuthData();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear invalid tokens that might cause 401 errors
  const clearInvalidTokens = async () => {
    try {
      // TEMPORARILY DISABLED: Don't clear tokens on startup while debugging race condition
      console.log('🧹 Token clearing on startup disabled for debugging...');
      
      /* DISABLED FOR DEBUGGING
      // This will be called on app startup to clear any problematic tokens
      console.log('🧹 Forcibly clearing all tokens on startup to prevent 401 errors...');
      
      // TEMPORARILY: Clear all auth data on every app startup
      // This is a safety measure for the current token validation issues
      // TODO: Remove this when token validation is working properly
      await authService.clearAuthData();
      console.log('✅ All authentication data cleared');
      */
    } catch (error) {
      console.error('Error clearing invalid tokens:', error);
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      console.log('🔐 Attempting login for:', email);
      
      // Call backend API for authentication
      const authResponse = await authService.login({ email, password });
      
      console.log('✅ Login successful');
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: authResponse.user,
          merchant: authResponse.merchant,
          token: authResponse.token
        }
      });
      
      // Add small delay to ensure all auth data is properly stored
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load permissions
      try {
        await refreshPermissions();
      } catch (permError) {
        console.warn('⚠️ Failed to load permissions (continuing anyway):', permError);
      }

      // Initialize socket connection after successful login (optional)
      try {
        await socketService.connect();
        await socketService.joinMerchantDashboard();
        if (__DEV__) {
          console.log('✅ [Socket] Connection established');
        }
      } catch (socketError) {
        // Silently fail - WebSocket is optional
        if (__DEV__) {
          console.warn('⚠️ [Socket] Connection failed (non-critical)');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Login failed'
      });
    }
  };

  const register = async (data: RegisterRequest) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      console.log('📝 Attempting registration for:', data.email);
      
      // Call backend API for registration
      const authResponse = await authService.register(data);
      
      console.log('✅ Registration successful');
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: authResponse.user,
          merchant: authResponse.merchant,
          token: authResponse.token
        }
      });
      
      // Add small delay to ensure all auth data is properly stored
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load permissions
      try {
        await refreshPermissions();
      } catch (permError) {
        console.warn('⚠️ Failed to load permissions (continuing anyway):', permError);
      }

      // Initialize socket connection after successful registration (optional)
      try {
        await socketService.connect();
        await socketService.joinMerchantDashboard();
        if (__DEV__) {
          console.log('✅ [Socket] Connection established');
        }
      } catch (socketError) {
        // Silently fail - WebSocket is optional
        if (__DEV__) {
          console.warn('⚠️ [Socket] Connection failed (non-critical)');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Registration failed'
      });
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Context: Starting logout process...');
      
      // Disconnect socket
      console.log('🔌 Disconnecting socket...');
      socketService.disconnect();
      
      // Call backend logout and clear storage
      console.log('🔐 Calling auth service logout...');
      await authService.logout();
      
      console.log('📤 Dispatching LOGOUT action...');
      dispatch({ type: 'LOGOUT' });
      
      // Force navigation to login immediately
      console.log('🚀 Redirecting to login page...');
      router.replace('/(auth)/login');
      
      console.log('✅ Context: Logout completed successfully');
    } catch (error) {
      console.error('❌ Context: Error during logout:', error);
      // Always dispatch logout even if API call fails
      console.log('📤 Dispatching LOGOUT action (after error)...');
      dispatch({ type: 'LOGOUT' });
      
      // Force navigation to login even after error
      console.log('🚀 Redirecting to login page (after error)...');
      router.replace('/(auth)/login');
      
      console.log('✅ Context: Emergency logout completed');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateMerchant = (merchant: Merchant) => {
    dispatch({ type: 'UPDATE_MERCHANT', payload: merchant });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const refreshProfile = async () => {
    try {
      console.log('🔄 Refreshing profile...');
      const profileData = await authService.getProfile();
      
      dispatch({ type: 'UPDATE_USER', payload: profileData.user });
      dispatch({ type: 'UPDATE_MERCHANT', payload: profileData.merchant });
      
      console.log('✅ Profile refreshed');
    } catch (error: any) {
      console.error('❌ Failed to refresh profile:', error.message);
      // If profile data is missing, logout
      if (error.message.includes('No profile data found')) {
        await logout();
      }
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      console.log('🔒 Changing password...');
      await authService.changePassword(currentPassword, newPassword);
      console.log('✅ Password changed successfully');
    } catch (error: any) {
      console.error('❌ Failed to change password:', error.message);
      throw error;
    }
  };

  const refreshPermissions = async () => {
    try {
      console.log('🔄 Refreshing permissions...');
      const userTeam = await teamService.getCurrentUserPermissions();

      dispatch({
        type: 'UPDATE_PERMISSIONS',
        payload: {
          permissions: userTeam.permissions,
          role: userTeam.role
        }
      });

      console.log('✅ Permissions refreshed');
    } catch (error: any) {
      console.error('❌ Failed to refresh permissions:', error.message);
      // Don't throw error - permissions are optional
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return state.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => state.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => state.permissions.includes(permission));
  };

  const value: AuthContextType = {
    state,
    token: state.token,
    user: state.user,
    merchant: state.merchant,
    permissions: state.permissions,
    role: state.role,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    clearError,
    updateMerchant,
    updateUser,
    refreshProfile,
    refreshPermissions,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}