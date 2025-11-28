import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineService } from '../services/offline';

export interface NetworkStatus {
  isConnected: boolean;
  connectionType: string;
  isReachable: boolean;
  hasInternetConnection: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  lastConnectedAt: Date | null;
  syncStatus: {
    isSyncing: boolean;
    pendingActions: number;
    lastSyncAt: Date | null;
    syncErrors: string[];
  };
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    connectionType: 'unknown',
    isReachable: true,
    hasInternetConnection: true,
    connectionQuality: 'unknown',
    lastConnectedAt: null,
    syncStatus: {
      isSyncing: false,
      pendingActions: 0,
      lastSyncAt: null,
      syncErrors: [],
    },
  });

  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Determine connection quality based on connection type and details
  const getConnectionQuality = (state: NetInfoState): 'excellent' | 'good' | 'poor' | 'unknown' => {
    if (!state.isConnected) return 'unknown';

    switch (state.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        // Check cellular generation if available
        if (state.details && 'cellularGeneration' in state.details) {
          const generation = state.details.cellularGeneration;
          if (generation === '4g' || generation === '5g') return 'excellent';
          if (generation === '3g') return 'good';
          return 'poor';
        }
        return 'good';
      case 'ethernet':
        return 'excellent';
      case 'bluetooth':
        return 'poor';
      default:
        return 'unknown';
    }
  };

  // Update sync status
  const updateSyncStatus = async () => {
    try {
      const cacheInfo = await offlineService.getCacheInfo();
      setNetworkStatus(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          pendingActions: cacheInfo.pendingActions,
          lastSyncAt: cacheInfo.lastSync,
        },
      }));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  // Perform sync when network is restored
  const performSync = async () => {
    if (isSyncing || !networkStatus.isConnected) return;

    setIsSyncing(true);
    setSyncErrors([]);

    try {
      setNetworkStatus(prev => ({
        ...prev,
        syncStatus: { ...prev.syncStatus, isSyncing: true },
      }));

      const result = await offlineService.syncOfflineActions();
      
      console.log(`✅ Sync completed: ${result.successful} successful, ${result.failed} failed`);

      if (result.failed > 0) {
        setSyncErrors([`${result.failed} actions failed to sync`]);
      }

      setNetworkStatus(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          isSyncing: false,
          lastSyncAt: new Date(),
          syncErrors: result.failed > 0 ? [`${result.failed} actions failed to sync`] : [],
        },
      }));

      // Update pending actions count
      await updateSyncStatus();

    } catch (error) {
      console.error('❌ Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      setSyncErrors([errorMessage]);
      
      setNetworkStatus(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          isSyncing: false,
          syncErrors: [errorMessage],
        },
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync trigger
  const triggerSync = async (): Promise<boolean> => {
    if (!networkStatus.isConnected) {
      console.warn('Cannot sync while offline');
      return false;
    }

    await performSync();
    return true;
  };

  // Clear sync errors
  const clearSyncErrors = () => {
    setSyncErrors([]);
    setNetworkStatus(prev => ({
      ...prev,
      syncStatus: { ...prev.syncStatus, syncErrors: [] },
    }));
  };

  // Get human-readable status
  const getStatusMessage = (): string => {
    if (!networkStatus.isConnected) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (networkStatus.syncStatus.pendingActions > 0) {
      return `${networkStatus.syncStatus.pendingActions} pending actions`;
    }
    return 'Online';
  };

  // Get connection type display name
  const getConnectionTypeDisplay = (): string => {
    switch (networkStatus.connectionType) {
      case 'wifi': return 'Wi-Fi';
      case 'cellular': return 'Cellular';
      case 'ethernet': return 'Ethernet';
      case 'bluetooth': return 'Bluetooth';
      case 'wimax': return 'WiMAX';
      case 'vpn': return 'VPN';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    let lastConnectedTime: Date | null = null;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isCurrentlyConnected = state.isConnected ?? false;
      const wasConnected = networkStatus.isConnected;

      // Track when we were last connected
      if (isCurrentlyConnected && !wasConnected) {
        lastConnectedTime = new Date();
      }

      setNetworkStatus(prev => ({
        ...prev,
        isConnected: isCurrentlyConnected,
        connectionType: state.type,
        isReachable: state.isInternetReachable ?? false,
        hasInternetConnection: state.isInternetReachable ?? false,
        connectionQuality: getConnectionQuality(state),
        lastConnectedAt: isCurrentlyConnected ? lastConnectedTime : prev.lastConnectedAt,
      }));

      // If we just came back online, perform sync
      if (isCurrentlyConnected && !wasConnected) {
        console.log('🌐 Network restored, performing sync...');
        performSync();
      }
    });

    // Initial network state check
    NetInfo.fetch().then((state) => {
      setNetworkStatus(prev => ({
        ...prev,
        isConnected: state.isConnected ?? false,
        connectionType: state.type,
        isReachable: state.isInternetReachable ?? false,
        hasInternetConnection: state.isInternetReachable ?? false,
        connectionQuality: getConnectionQuality(state),
        lastConnectedAt: state.isConnected ? new Date() : null,
      }));
    });

    // Update sync status periodically
    const syncStatusInterval = setInterval(updateSyncStatus, 30000); // Every 30 seconds

    // Initial sync status update
    updateSyncStatus();

    return () => {
      unsubscribe();
      clearInterval(syncStatusInterval);
    };
  }, []);

  return {
    ...networkStatus,
    isSyncing,
    syncErrors,
    triggerSync,
    clearSyncErrors,
    getStatusMessage,
    getConnectionTypeDisplay,
    // Helper methods
    isOnline: networkStatus.isConnected && networkStatus.hasInternetConnection,
    isOffline: !networkStatus.isConnected || !networkStatus.hasInternetConnection,
    hasGoodConnection: networkStatus.connectionQuality === 'excellent' || networkStatus.connectionQuality === 'good',
    canSync: networkStatus.isConnected && networkStatus.hasInternetConnection && !isSyncing,
  };
};