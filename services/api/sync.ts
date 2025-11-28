import { apiClient } from './index';
import { getApiUrl } from '../../config/api';

// ==================== TYPES ====================

export interface SyncOptions {
    syncTypes?: ('products' | 'orders' | 'cashback' | 'merchant')[];
    batchSize?: number;
    forceFullSync?: boolean;
}

export interface SyncResult {
    success: boolean;
    syncedAt: Date;
    syncTypes: string[];
    counts: {
        products?: number;
        orders?: number;
        cashback?: number;
        merchant?: number;
    };
    errors?: any[];
    duration?: number;
}

export interface SyncStatus {
    lastSync?: {
        syncedAt: Date;
        success: boolean;
        syncTypes: string[];
        counts: Record<string, number>;
    };
    autoSync?: {
        enabled: boolean;
        intervalMinutes: number;
        nextSync: Date;
    };
    merchantId: string;
}

export interface SyncHistoryItem {
    syncedAt: Date;
    success: boolean;
    syncTypes: string[];
    counts: Record<string, number>;
    duration: number;
    errors?: any[];
}

export interface SyncHealth {
    service: string;
    uptime: number;
    timestamp: Date;
    stats: {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageDuration: number;
    };
    merchantStatus: SyncStatus;
}

// ==================== SERVICE ====================

class SyncService {
    /**
     * Trigger manual sync to customer app
     * @param options - Sync configuration options
     */
    async triggerSync(options?: SyncOptions): Promise<SyncResult> {
        try {
            const response = await apiClient.post<SyncResult>('/merchant/sync/trigger', options || {});

            if (response.success && response.data) {
                console.log('✅ Sync completed successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Sync failed');
            }
        } catch (error: any) {
            console.error('Trigger sync error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to trigger sync');
        }
    }

    /**
     * Get current sync status for merchant
     */
    async getSyncStatus(): Promise<SyncStatus> {
        try {
            const response = await apiClient.get<SyncStatus>('/merchant/sync/status');

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get sync status');
            }
        } catch (error: any) {
            console.error('Get sync status error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get sync status');
        }
    }

    /**
     * Get sync history for merchant
     * @param limit - Number of history items to retrieve (default: 10)
     */
    async getSyncHistory(limit: number = 10): Promise<SyncHistoryItem[]> {
        try {
            const response = await apiClient.get<SyncHistoryItem[]>(`/merchant/sync/history?limit=${limit}`);

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get sync history');
            }
        } catch (error: any) {
            console.error('Get sync history error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get sync history');
        }
    }

    /**
     * Schedule automatic sync at regular intervals
     * @param intervalMinutes - Sync interval in minutes (5-1440)
     */
    async scheduleAutoSync(intervalMinutes: number): Promise<{ merchantId: string; intervalMinutes: number; nextSync: Date }> {
        try {
            if (intervalMinutes < 5 || intervalMinutes > 1440) {
                throw new Error('Interval must be between 5 minutes and 24 hours');
            }

            const response = await apiClient.post<{ merchantId: string; intervalMinutes: number; nextSync: Date }>(
                '/merchant/sync/schedule',
                { intervalMinutes }
            );

            if (response.success && response.data) {
                console.log(`✅ Auto-sync scheduled every ${intervalMinutes} minutes`);
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to schedule auto-sync');
            }
        } catch (error: any) {
            console.error('Schedule auto-sync error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to schedule auto-sync');
        }
    }

    /**
     * Clear/disable automatic sync
     */
    async clearAutoSync(): Promise<void> {
        try {
            const response = await apiClient.delete('/merchant/sync/schedule');

            if (response.success) {
                console.log('✅ Auto-sync cleared');
            } else {
                throw new Error(response.message || 'Failed to clear auto-sync');
            }
        } catch (error: any) {
            console.error('Clear auto-sync error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to clear auto-sync');
        }
    }

    /**
     * Sync only products to customer app
     * @param batchSize - Number of products per batch (default: 100)
     */
    async syncProducts(batchSize: number = 100): Promise<SyncResult> {
        try {
            const response = await apiClient.post<SyncResult>('/merchant/sync/products', { batchSize });

            if (response.success && response.data) {
                console.log('✅ Products synced successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to sync products');
            }
        } catch (error: any) {
            console.error('Sync products error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to sync products');
        }
    }

    /**
     * Sync only orders to customer app
     * @param batchSize - Number of orders per batch (default: 100)
     */
    async syncOrders(batchSize: number = 100): Promise<SyncResult> {
        try {
            const response = await apiClient.post<SyncResult>('/merchant/sync/orders', { batchSize });

            if (response.success && response.data) {
                console.log('✅ Orders synced successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to sync orders');
            }
        } catch (error: any) {
            console.error('Sync orders error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to sync orders');
        }
    }

    /**
     * Sync only cashback data to customer app
     * @param batchSize - Number of cashback records per batch (default: 100)
     */
    async syncCashback(batchSize: number = 100): Promise<SyncResult> {
        try {
            const response = await apiClient.post<SyncResult>('/merchant/sync/cashback', { batchSize });

            if (response.success && response.data) {
                console.log('✅ Cashback data synced successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to sync cashback');
            }
        } catch (error: any) {
            console.error('Sync cashback error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to sync cashback');
        }
    }

    /**
     * Sync merchant profile to customer app
     */
    async syncMerchantProfile(): Promise<SyncResult> {
        try {
            const response = await apiClient.post<SyncResult>('/merchant/sync/merchant', { batchSize: 1 });

            if (response.success && response.data) {
                console.log('✅ Merchant profile synced successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to sync merchant profile');
            }
        } catch (error: any) {
            console.error('Sync merchant profile error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to sync merchant profile');
        }
    }

    /**
     * Get sync service health status
     */
    async getSyncHealth(): Promise<SyncHealth> {
        try {
            const response = await apiClient.get<SyncHealth>('/merchant/sync/health');

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get sync health');
            }
        } catch (error: any) {
            console.error('Get sync health error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get sync health');
        }
    }

    /**
     * Get overall sync statistics
     */
    async getSyncStatistics(): Promise<{ totalSyncs: number; successfulSyncs: number; failedSyncs: number; averageDuration: number }> {
        try {
            const response = await apiClient.get<{ totalSyncs: number; successfulSyncs: number; failedSyncs: number; averageDuration: number }>(
                '/merchant/sync/statistics'
            );

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get sync statistics');
            }
        } catch (error: any) {
            console.error('Get sync statistics error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get sync statistics');
        }
    }

    /**
     * Format sync status for display
     */
    formatSyncStatus(status: SyncStatus): string {
        if (!status.lastSync) {
            return 'Never synced';
        }

        const lastSyncDate = new Date(status.lastSync.syncedAt);
        const now = new Date();
        const diffMs = now.getTime() - lastSyncDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
            return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    /**
     * Get sync status badge color
     */
    getSyncStatusColor(status: SyncStatus): string {
        if (!status.lastSync) {
            return '#6b7280'; // Gray - never synced
        }

        const lastSyncDate = new Date(status.lastSync.syncedAt);
        const now = new Date();
        const diffHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        if (!status.lastSync.success) {
            return '#ef4444'; // Red - last sync failed
        } else if (diffHours > 24) {
            return '#f59e0b'; // Amber - synced more than 24h ago
        } else {
            return '#10b981'; // Green - recently synced
        }
    }
}

// Create and export singleton instance
export const syncService = new SyncService();
export default syncService;
