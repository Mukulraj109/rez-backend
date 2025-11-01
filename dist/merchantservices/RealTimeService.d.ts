import { Server as SocketIOServer } from 'socket.io';
export interface RealTimeEvent {
    type: 'order_created' | 'order_updated' | 'cashback_created' | 'cashback_updated' | 'product_updated' | 'metrics_updated';
    merchantId?: string;
    data: any;
    timestamp: Date;
}
export declare class RealTimeService {
    private static instance;
    private io;
    private metricsUpdateInterval;
    constructor(io: SocketIOServer);
    static getInstance(io: SocketIOServer): RealTimeService;
    private setupEventHandlers;
    private sendInitialDashboardData;
    private getDashboardOverview;
    private getNotifications;
    private startMetricsUpdater;
    emitOrderEvent(merchantId: string, event: RealTimeEvent): void;
    emitCashbackEvent(merchantId: string, event: RealTimeEvent): void;
    emitProductEvent(merchantId: string, event: RealTimeEvent): void;
    private updateMerchantMetrics;
    broadcastSystemNotification(notification: {
        type: 'info' | 'warning' | 'error' | 'success';
        title: string;
        message: string;
        merchantIds?: string[];
    }): void;
    sendLiveChartData(merchantId: string, period?: number): Promise<void>;
    getConnectionStats(): {
        totalConnections: any;
        totalRooms: any;
        merchantDashboards: number;
        activeSubscriptions: {
            metrics: number;
            orders: number;
            cashback: number;
        };
    };
    cleanup(): void;
}
export declare function emitOrderUpdate(merchantId: string, order: any, action: 'created' | 'updated'): void;
export declare function emitCashbackUpdate(merchantId: string, cashback: any, action: 'created' | 'updated'): void;
export declare function emitProductUpdate(merchantId: string, product: any, stockChanged?: boolean): void;
