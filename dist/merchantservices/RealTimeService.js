"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeService = void 0;
exports.emitOrderUpdate = emitOrderUpdate;
exports.emitCashbackUpdate = emitCashbackUpdate;
exports.emitProductUpdate = emitProductUpdate;
const BusinessMetrics_1 = require("./BusinessMetrics");
const MerchantOrder_1 = require("../models/MerchantOrder");
const Cashback_1 = require("../models/Cashback");
const MerchantProduct_1 = require("../models/MerchantProduct");
class RealTimeService {
    constructor(io) {
        this.metricsUpdateInterval = null;
        this.io = io;
        this.setupEventHandlers();
        this.startMetricsUpdater();
    }
    static getInstance(io) {
        if (!RealTimeService.instance) {
            RealTimeService.instance = new RealTimeService(io);
        }
        return RealTimeService.instance;
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Real-time client connected:', socket.id);
            // Handle merchant room joining
            socket.on('join-merchant-dashboard', (merchantId) => {
                socket.join(`merchant-${merchantId}`);
                socket.join(`dashboard-${merchantId}`);
                console.log(`Merchant ${merchantId} joined dashboard room`);
                // Send initial dashboard data
                this.sendInitialDashboardData(merchantId, socket.id);
            });
            // Handle real-time data subscriptions
            socket.on('subscribe-metrics', (merchantId) => {
                socket.join(`metrics-${merchantId}`);
                console.log(`Subscribed to metrics for merchant ${merchantId}`);
            });
            socket.on('subscribe-orders', (merchantId) => {
                socket.join(`orders-${merchantId}`);
                console.log(`Subscribed to orders for merchant ${merchantId}`);
            });
            socket.on('subscribe-cashback', (merchantId) => {
                socket.join(`cashback-${merchantId}`);
                console.log(`Subscribed to cashback for merchant ${merchantId}`);
            });
            socket.on('unsubscribe-all', () => {
                // Leave all rooms except the default socket room
                const rooms = Array.from(socket.rooms);
                rooms.forEach(room => {
                    if (room !== socket.id) {
                        socket.leave(room);
                    }
                });
                console.log(`Client ${socket.id} unsubscribed from all rooms`);
            });
            socket.on('disconnect', () => {
                console.log('Real-time client disconnected:', socket.id);
            });
        });
    }
    async sendInitialDashboardData(merchantId, socketId) {
        try {
            const [metrics, overview, notifications] = await Promise.all([
                BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId),
                this.getDashboardOverview(merchantId),
                this.getNotifications(merchantId)
            ]);
            this.io.to(socketId).emit('initial-dashboard-data', {
                metrics,
                overview,
                notifications,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Error sending initial dashboard data:', error);
        }
    }
    async getDashboardOverview(merchantId) {
        const [totalProducts, totalOrders, pendingOrders, totalCashback] = await Promise.all([
            MerchantProduct_1.ProductModel.countByMerchant(merchantId),
            MerchantOrder_1.OrderModel.countByMerchant(merchantId),
            MerchantOrder_1.OrderModel.countByStatus(merchantId, 'pending'),
            Cashback_1.CashbackModel.getMetrics(merchantId)
        ]);
        return {
            totalProducts,
            totalOrders,
            pendingOrders,
            pendingCashback: totalCashback.totalPendingRequests
        };
    }
    async getNotifications(merchantId) {
        const [lowStockProducts, pendingOrders, pendingCashback] = await Promise.all([
            MerchantProduct_1.ProductModel.findLowStock(merchantId),
            MerchantOrder_1.OrderModel.findByStatus(merchantId, 'pending'),
            (async () => {
                const result = await Cashback_1.CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
                return result.requests || [];
            })()
        ]);
        const notifications = [];
        if (lowStockProducts.length > 0) {
            notifications.push({
                id: 'low_stock',
                type: 'warning',
                title: 'Low Stock Alert',
                message: `${lowStockProducts.length} product(s) are running low on stock`,
                count: lowStockProducts.length
            });
        }
        if (pendingOrders.length > 0) {
            notifications.push({
                id: 'pending_orders',
                type: 'info',
                title: 'Pending Orders',
                message: `${pendingOrders.length} order(s) require processing`,
                count: pendingOrders.length
            });
        }
        if (pendingCashback.length > 0) {
            notifications.push({
                id: 'high_risk_cashback',
                type: 'error',
                title: 'High-Risk Cashback',
                message: `${pendingCashback.length} cashback request(s) flagged for review`,
                count: pendingCashback.length
            });
        }
        return notifications;
    }
    startMetricsUpdater() {
        // Update metrics every 30 seconds for connected merchants
        this.metricsUpdateInterval = setInterval(async () => {
            const connectedRooms = this.io.sockets.adapter.rooms;
            const merchantRooms = new Set();
            // Find all merchant dashboard rooms
            for (const [roomName] of connectedRooms) {
                if (roomName.startsWith('dashboard-')) {
                    const merchantId = roomName.replace('dashboard-', '');
                    merchantRooms.add(merchantId);
                }
            }
            // Update metrics for each connected merchant
            for (const merchantId of merchantRooms) {
                try {
                    const [metrics, overview, notifications] = await Promise.all([
                        BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId),
                        this.getDashboardOverview(merchantId),
                        this.getNotifications(merchantId)
                    ]);
                    this.io.to(`dashboard-${merchantId}`).emit('metrics-updated', {
                        metrics,
                        overview,
                        notifications,
                        timestamp: new Date()
                    });
                    // Also send to metrics subscribers
                    this.io.to(`metrics-${merchantId}`).emit('live-metrics', {
                        metrics,
                        timestamp: new Date()
                    });
                }
                catch (error) {
                    console.error(`Error updating metrics for merchant ${merchantId}:`, error);
                }
            }
        }, 30000); // 30 seconds
    }
    // Public methods to emit real-time events
    emitOrderEvent(merchantId, event) {
        this.io.to(`orders-${merchantId}`).emit('order-event', event);
        this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
        // Trigger metrics update
        this.updateMerchantMetrics(merchantId);
    }
    emitCashbackEvent(merchantId, event) {
        this.io.to(`cashback-${merchantId}`).emit('cashback-event', event);
        this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
        // Trigger metrics update
        this.updateMerchantMetrics(merchantId);
    }
    emitProductEvent(merchantId, event) {
        this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
        // Trigger metrics update if stock-related
        if (event.type === 'product_updated' && event.data.stockChanged) {
            this.updateMerchantMetrics(merchantId);
        }
    }
    async updateMerchantMetrics(merchantId) {
        try {
            const [metrics, overview, notifications] = await Promise.all([
                BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId),
                this.getDashboardOverview(merchantId),
                this.getNotifications(merchantId)
            ]);
            this.io.to(`dashboard-${merchantId}`).emit('metrics-updated', {
                metrics,
                overview,
                notifications,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error(`Error updating metrics for merchant ${merchantId}:`, error);
        }
    }
    // Broadcast system-wide notifications
    broadcastSystemNotification(notification) {
        if (notification.merchantIds) {
            // Send to specific merchants
            notification.merchantIds.forEach(merchantId => {
                this.io.to(`dashboard-${merchantId}`).emit('system-notification', {
                    ...notification,
                    timestamp: new Date()
                });
            });
        }
        else {
            // Broadcast to all connected clients
            this.io.emit('system-notification', {
                ...notification,
                timestamp: new Date()
            });
        }
    }
    // Send live time series data for charts
    async sendLiveChartData(merchantId, period = 24) {
        try {
            const timeSeriesData = await BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, period);
            this.io.to(`dashboard-${merchantId}`).emit('live-chart-data', {
                timeSeriesData,
                period,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error(`Error sending live chart data for merchant ${merchantId}:`, error);
        }
    }
    // Performance monitoring
    getConnectionStats() {
        const sockets = this.io.sockets.sockets;
        const rooms = this.io.sockets.adapter.rooms;
        const stats = {
            totalConnections: sockets.size,
            totalRooms: rooms.size,
            merchantDashboards: 0,
            activeSubscriptions: {
                metrics: 0,
                orders: 0,
                cashback: 0
            }
        };
        for (const [roomName, room] of rooms) {
            if (roomName.startsWith('dashboard-')) {
                stats.merchantDashboards++;
            }
            else if (roomName.startsWith('metrics-')) {
                stats.activeSubscriptions.metrics++;
            }
            else if (roomName.startsWith('orders-')) {
                stats.activeSubscriptions.orders++;
            }
            else if (roomName.startsWith('cashback-')) {
                stats.activeSubscriptions.cashback++;
            }
        }
        return stats;
    }
    // Cleanup method
    cleanup() {
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
            this.metricsUpdateInterval = null;
        }
    }
}
exports.RealTimeService = RealTimeService;
// Helper functions to emit events from other parts of the application
function emitOrderUpdate(merchantId, order, action) {
    if (global.io) {
        const realTimeService = RealTimeService.getInstance(global.io);
        realTimeService.emitOrderEvent(merchantId, {
            type: action === 'created' ? 'order_created' : 'order_updated',
            merchantId,
            data: order,
            timestamp: new Date()
        });
    }
}
function emitCashbackUpdate(merchantId, cashback, action) {
    if (global.io) {
        const realTimeService = RealTimeService.getInstance(global.io);
        realTimeService.emitCashbackEvent(merchantId, {
            type: action === 'created' ? 'cashback_created' : 'cashback_updated',
            merchantId,
            data: cashback,
            timestamp: new Date()
        });
    }
}
function emitProductUpdate(merchantId, product, stockChanged = false) {
    if (global.io) {
        const realTimeService = RealTimeService.getInstance(global.io);
        realTimeService.emitProductEvent(merchantId, {
            type: 'product_updated',
            merchantId,
            data: { ...product, stockChanged },
            timestamp: new Date()
        });
    }
}
