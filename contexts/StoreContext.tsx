import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { storeService, Store } from '../services/api/stores';
import { storageService } from '../services/storage';

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  isLoading: boolean;
  error: string | null;
  refreshStores: () => Promise<void>;
  setActiveStore: (store: Store) => Promise<void>;
  createStore: (storeData: any) => Promise<Store>;
  updateStore: (storeId: string, storeData: any) => Promise<Store>;
  deleteStore: (storeId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const ACTIVE_STORE_KEY = 'active_store_id';

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load stores from API
   */
  const loadStores = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await storeService.getStores();
      const loadedStores = response.data || [];
      
      setStores(loadedStores);

      // If we have stores but no active store, try to load active store
      if (loadedStores.length > 0) {
        // Check if we have an active store in state
        const currentActiveStoreId = activeStore?._id;
        const activeStoreInList = loadedStores.find(s => s._id === currentActiveStoreId);
        
        // If active store is not in the list or doesn't exist, load it
        if (!activeStoreInList && !activeStore) {
          await loadActiveStore(loadedStores);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  }, [activeStore?._id]); // Only depend on activeStore._id to avoid infinite loops

  /**
   * Load active store
   */
  const loadActiveStore = useCallback(async (storesList?: Store[]) => {
    try {
      const availableStores = storesList || stores;
      
      // First try to get from storage
      const storedStoreId = await storageService.getItem(ACTIVE_STORE_KEY);
      
      if (storedStoreId) {
        // Check if stored store is in the available stores list
        const storedStore = availableStores.find(s => s._id === storedStoreId);
        if (storedStore) {
          setActiveStoreState(storedStore);
          return;
        }
        
        // Try to fetch the store by ID
        try {
          const store = await storeService.getStoreById(storedStoreId);
          setActiveStoreState(store);
          return;
        } catch (err) {
          // Store ID in storage might be invalid, try to get active store from API
        }
      }

      // Get active store from API
      try {
        const store = await storeService.getActiveStore();
        setActiveStoreState(store);
        
        // Save to storage
        if (store) {
          await storageService.setItem(ACTIVE_STORE_KEY, store._id);
        }
        return;
      } catch (apiErr) {
        // No active store from API, will use first available store
      }
      
      // If no active store from API, use first store if available
      if (availableStores.length > 0) {
        setActiveStoreState(availableStores[0]);
        await storageService.setItem(ACTIVE_STORE_KEY, availableStores[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load active store:', err);
      // If no active store, use first store if available
      const availableStores = storesList || stores;
      if (availableStores.length > 0) {
        setActiveStoreState(availableStores[0]);
        await storageService.setItem(ACTIVE_STORE_KEY, availableStores[0]._id);
      }
    }
  }, [stores]);

  /**
   * Refresh stores list
   */
  const refreshStores = useCallback(async () => {
    await loadStores();
  }, [loadStores]);

  /**
   * Set active store
   */
  const setActiveStore = useCallback(async (store: Store) => {
    try {
      setError(null);
      
      // Activate store on backend
      await storeService.activateStore(store._id);
      
      // Update local state
      setActiveStoreState(store);
      
      // Save to storage
      await storageService.setItem(ACTIVE_STORE_KEY, store._id);
      
      // Refresh stores to get updated status
      await loadStores();
    } catch (err: any) {
      setError(err.message || 'Failed to set active store');
      throw err;
    }
  }, [loadStores]);

  /**
   * Create new store
   */
  const createStore = useCallback(async (storeData: any): Promise<Store> => {
    try {
      setError(null);
      const newStore = await storeService.createStore(storeData);
      
      // Refresh stores list
      await loadStores();
      
      // If this is the first store, set it as active
      if (stores.length === 0) {
        await setActiveStore(newStore);
      }
      
      return newStore;
    } catch (err: any) {
      setError(err.message || 'Failed to create store');
      throw err;
    }
  }, [stores.length, loadStores, setActiveStore]);

  /**
   * Update store
   */
  const updateStore = useCallback(async (storeId: string, storeData: any): Promise<Store> => {
    try {
      setError(null);
      const updatedStore = await storeService.updateStore(storeId, storeData);
      
      // Update in stores list
      setStores(prevStores => {
        const updated = prevStores.map(store => 
          store._id === storeId ? updatedStore : store
        );
        return updated;
      });
      
      // Update active store if it's the one being updated
      if (activeStore?._id === storeId) {
        setActiveStoreState(updatedStore);
      }
      
      return updatedStore;
    } catch (err: any) {
      console.error('❌ [StoreContext] updateStore error:', err);
      console.error('❌ [StoreContext] Error message:', err.message);
      setError(err.message || 'Failed to update store');
      throw err;
    }
  }, [activeStore]);

  /**
   * Delete store
   */
  const deleteStore = useCallback(async (storeId: string): Promise<void> => {
    try {
      setError(null);
      await storeService.deleteStore(storeId);
      
      // Remove from stores list
      setStores(prevStores => prevStores.filter(store => store._id !== storeId));
      
      // If deleted store was active, set first available store as active
      if (activeStore?._id === storeId) {
        const remainingStores = stores.filter(store => store._id !== storeId);
        if (remainingStores.length > 0) {
          await setActiveStore(remainingStores[0]);
        } else {
          setActiveStoreState(null);
          await storageService.removeItem(ACTIVE_STORE_KEY);
        }
      }
    } catch (err: any) {
      console.error('Failed to delete store:', err);
      setError(err.message || 'Failed to delete store');
      throw err;
    }
  }, [activeStore, stores, setActiveStore]);

  // Load stores on mount
  useEffect(() => {
    loadStores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load active store when stores are loaded (but not if we already have one)
  useEffect(() => {
    if (stores.length > 0 && !activeStore) {
      loadActiveStore(stores);
    }
  }, [stores.length]); // Only depend on stores.length to avoid infinite loops

  const value: StoreContextType = {
    stores,
    activeStore,
    isLoading,
    error,
    refreshStores,
    setActiveStore,
    createStore,
    updateStore,
    deleteStore
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

