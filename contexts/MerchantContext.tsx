import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product, Order, CashbackRequest } from '../../../shared/types';

// Types
interface MerchantState {
  products: Product[];
  orders: Order[];
  cashbackRequests: CashbackRequest[];
  analytics: {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    pendingCashback: number;
  };
  isLoading: boolean;
  error: string | null;
}

type MerchantAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'SET_CASHBACK_REQUESTS'; payload: CashbackRequest[] }
  | { type: 'UPDATE_CASHBACK_REQUEST'; payload: CashbackRequest }
  | { type: 'SET_ANALYTICS'; payload: MerchantState['analytics'] };

interface MerchantContextType {
  state: MerchantState;
  // Product actions
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  // Order actions
  loadOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  // Cashback actions
  loadCashbackRequests: () => Promise<void>;
  approveCashback: (requestId: string, amount: number) => Promise<void>;
  rejectCashback: (requestId: string, reason: string) => Promise<void>;
  // Analytics
  loadAnalytics: () => Promise<void>;
  // Error handling
  clearError: () => void;
}

// Initial state
const initialState: MerchantState = {
  products: [],
  orders: [],
  cashbackRequests: [],
  analytics: {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    pendingCashback: 0,
  },
  isLoading: false,
  error: null,
};

// Reducer
function merchantReducer(state: MerchantState, action: MerchantAction): MerchantState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, isLoading: false };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload, isLoading: false };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => 
          o.id === action.payload.id ? action.payload : o
        )
      };
    case 'SET_CASHBACK_REQUESTS':
      return { ...state, cashbackRequests: action.payload, isLoading: false };
    case 'UPDATE_CASHBACK_REQUEST':
      return {
        ...state,
        cashbackRequests: state.cashbackRequests.map(r => 
          r.id === action.payload.id ? action.payload : r
        )
      };
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload, isLoading: false };
    default:
      return state;
  }
}

// Context
const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

// Provider
export function MerchantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(merchantReducer, initialState);

  // Product actions
  const loadProducts = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Mock data - replace with actual API call
      const mockProducts: Product[] = [
        {
          id: '1',
          merchantId: 'merchant-1',
          name: 'Sample Product',
          description: 'This is a sample product',
          sku: 'SAMPLE-001',
          category: 'Electronics',
          price: 99.99,
          currency: 'USD',
          inventory: {
            stock: 10,
            lowStockThreshold: 5,
            trackInventory: true,
            allowBackorders: false,
            reservedStock: 0
          },
          images: [],
          tags: ['sample', 'test'],
          searchKeywords: ['sample', 'product'],
          status: 'active',
          visibility: 'public',
          cashback: {
            percentage: 5,
            isActive: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      dispatch({ type: 'SET_PRODUCTS', payload: mockProducts });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Mock API call - replace with actual implementation
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      // Mock API call - replace with actual implementation
      const updatedProduct = { ...product, updatedAt: new Date() };
      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      // Mock API call - replace with actual implementation
      dispatch({ type: 'DELETE_PRODUCT', payload: productId });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Order actions
  const loadOrders = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Mock data - replace with actual API call
      const mockOrders: Order[] = [];
      dispatch({ type: 'SET_ORDERS', payload: mockOrders });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      // Mock API call - replace with actual implementation
      const orderIndex = state.orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        const updatedOrder = { ...state.orders[orderIndex], status, updatedAt: new Date() };
        dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Cashback actions
  const loadCashbackRequests = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Mock data - replace with actual API call
      const mockRequests: CashbackRequest[] = [];
      dispatch({ type: 'SET_CASHBACK_REQUESTS', payload: mockRequests });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const approveCashback = async (requestId: string, amount: number) => {
    try {
      // Mock API call - replace with actual implementation
      const requestIndex = state.cashbackRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        const updatedRequest = {
          ...state.cashbackRequests[requestIndex],
          status: 'approved' as const,
          approvedAmount: amount,
          updatedAt: new Date()
        };
        dispatch({ type: 'UPDATE_CASHBACK_REQUEST', payload: updatedRequest });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const rejectCashback = async (requestId: string, reason: string) => {
    try {
      // Mock API call - replace with actual implementation
      const requestIndex = state.cashbackRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        const updatedRequest = {
          ...state.cashbackRequests[requestIndex],
          status: 'rejected' as const,
          rejectionReason: reason,
          updatedAt: new Date()
        };
        dispatch({ type: 'UPDATE_CASHBACK_REQUEST', payload: updatedRequest });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Analytics
  const loadAnalytics = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('📊 Loading analytics (using dashboard metrics instead of separate endpoint)...');
      
      // TEMPORARILY: Use existing dashboard metrics instead of separate analytics API
      // This avoids network errors while the analytics endpoint has connectivity issues
      const { dashboardService } = await import('../services/api/dashboard');
      const metricsData = await dashboardService.getMetrics();
      
      // Transform metrics data to match our analytics structure
      const transformedAnalytics = {
        totalRevenue: metricsData.totalRevenue || 0,
        totalOrders: metricsData.totalOrders || 0,
        pendingOrders: metricsData.pendingOrders || 0,
        pendingCashback: metricsData.pendingCashback || 0,
      };
      
      console.log('✅ Analytics loaded successfully (from metrics):', transformedAnalytics);
      dispatch({ type: 'SET_ANALYTICS', payload: transformedAnalytics });
    } catch (error: any) {
      console.error('❌ Error fetching analytics:', error);
      
      // Fallback to basic data if API fails
      const fallbackAnalytics = {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        pendingCashback: 0
      };
      dispatch({ type: 'SET_ANALYTICS', payload: fallbackAnalytics });
      // Don't dispatch error since this is not critical
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value: MerchantContextType = {
    state,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    loadOrders,
    updateOrderStatus,
    loadCashbackRequests,
    approveCashback,
    rejectCashback,
    loadAnalytics,
    clearError,
  };

  return (
    <MerchantContext.Provider value={value}>
      {children}
    </MerchantContext.Provider>
  );
}

// Hook
export function useMerchant() {
  const context = useContext(MerchantContext);
  if (context === undefined) {
    throw new Error('useMerchant must be used within a MerchantProvider');
  }
  return context;
}