"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCashbackStatusUpdate = exports.createProductAvailabilityUpdate = exports.createOrderStatusTimeline = exports.CrossAppSyncService = void 0;
const SyncService_1 = require("./SyncService");
class CrossAppSyncService {
    // Initialize cross-app sync
    static initialize() {
        // Process update queue every 5 seconds
        setInterval(() => {
            this.processUpdateQueue();
        }, 5000);
        console.log('🔄 Cross-app sync service initialized');
    }
    // Register customer app webhook URL for a merchant
    static registerCustomerAppWebhook(merchantId, webhookUrl) {
        this.customerAppWebhooks.set(merchantId, webhookUrl);
        console.log(`🔗 Registered customer app webhook for merchant ${merchantId}`);
    }
    // Send order status update to customer app
    static async sendOrderStatusUpdate(merchantId, orderId, customerId, update) {
        const crossAppUpdate = {
            type: 'order_status',
            merchantId,
            customerId,
            orderId,
            data: update,
            timestamp: new Date(),
            source: 'merchant_app'
        };
        // Add to queue for processing
        this.updateQueue.push(crossAppUpdate);
        // Also emit real-time event to merchant app
        if (global.realTimeService) {
            global.realTimeService.emitOrderEvent(merchantId, {
                type: 'order_updated',
                merchantId,
                data: { orderId, customerId, statusUpdate: update },
                timestamp: new Date()
            });
        }
        console.log(`📦 Queued order status update for order ${orderId}`);
    }
    // Send product availability update to customer app
    static async sendProductUpdate(merchantId, productId, update) {
        const crossAppUpdate = {
            type: 'product_update',
            merchantId,
            productId,
            data: update,
            timestamp: new Date(),
            source: 'merchant_app'
        };
        this.updateQueue.push(crossAppUpdate);
        // Emit real-time event to merchant app
        if (global.realTimeService) {
            global.realTimeService.emitProductEvent(merchantId, {
                type: 'product_updated',
                merchantId,
                data: { productId, availabilityUpdate: update },
                timestamp: new Date()
            });
        }
        console.log(`📦 Queued product update for product ${productId}`);
    }
    // Send cashback status update to customer app
    static async sendCashbackUpdate(merchantId, customerId, update) {
        const crossAppUpdate = {
            type: 'cashback_update',
            merchantId,
            customerId,
            data: update,
            timestamp: new Date(),
            source: 'merchant_app'
        };
        this.updateQueue.push(crossAppUpdate);
        // Emit real-time event to merchant app
        if (global.realTimeService) {
            global.realTimeService.emitCashbackEvent(merchantId, {
                type: 'cashback_updated',
                merchantId,
                data: { customerId, cashbackUpdate: update },
                timestamp: new Date()
            });
        }
        console.log(`💰 Queued cashback update for request ${update.requestId}`);
    }
    // Process the update queue
    static async processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        try {
            // Process updates in batches
            const batch = this.updateQueue.splice(0, 10);
            for (const update of batch) {
                await this.processUpdate(update);
            }
            if (batch.length > 0) {
                console.log(`✅ Processed ${batch.length} cross-app updates`);
            }
        }
        catch (error) {
            console.error('Error processing update queue:', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    // Process individual update
    static async processUpdate(update) {
        try {
            const webhookUrl = this.customerAppWebhooks.get(update.merchantId);
            if (webhookUrl) {
                // Send to customer app webhook
                await this.sendToCustomerApp(webhookUrl, update);
            }
            else {
                // Log that no webhook is configured
                console.log(`⚠️ No customer app webhook configured for merchant ${update.merchantId}`);
            }
            // Always trigger sync to ensure consistency
            await this.triggerSyncForUpdate(update);
        }
        catch (error) {
            console.error(`Error processing update ${update.type}:`, error);
            // Re-queue failed updates (with retry limit)
            if (!update.data._retryCount || update.data._retryCount < 3) {
                update.data._retryCount = (update.data._retryCount || 0) + 1;
                this.updateQueue.push(update);
            }
        }
    }
    // Send update to customer app via webhook
    static async sendToCustomerApp(webhookUrl, update) {
        // In a real implementation, this would make an HTTP request
        // For now, we'll simulate the webhook call
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        const payload = {
            event: update.type,
            merchantId: update.merchantId,
            customerId: update.customerId,
            orderId: update.orderId,
            productId: update.productId,
            data: update.data,
            timestamp: update.timestamp,
            source: update.source
        };
        console.log(`📡 Simulated webhook to customer app: ${update.type} for merchant ${update.merchantId}`);
        // In real implementation:
        // const response = await fetch(webhookUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'X-Webhook-Source': 'merchant-app',
        //     'X-Merchant-ID': update.merchantId,
        //   },
        //   body: JSON.stringify(payload),
        // });
        //
        // if (!response.ok) {
        //   throw new Error(`Webhook failed with status ${response.status}`);
        // }
    }
    // Trigger appropriate sync based on update type
    static async triggerSyncForUpdate(update) {
        try {
            let syncTypes = [];
            switch (update.type) {
                case 'order_status':
                    syncTypes = ['orders'];
                    break;
                case 'product_update':
                    syncTypes = ['products'];
                    break;
                case 'cashback_update':
                    syncTypes = ['cashback'];
                    break;
                case 'merchant_update':
                    syncTypes = ['merchant'];
                    break;
            }
            if (syncTypes.length > 0) {
                await SyncService_1.SyncService.syncToCustomerApp({
                    merchantId: update.merchantId,
                    syncTypes,
                    batchSize: 50
                });
            }
        }
        catch (error) {
            console.error('Error triggering sync for update:', error);
        }
    }
    // Handle incoming updates from customer app
    static async handleCustomerAppUpdate(update) {
        console.log(`📱 Received update from customer app: ${update.type}`);
        // Process based on update type
        switch (update.type) {
            case 'order_status':
                await this.handleCustomerOrderUpdate(update);
                break;
            case 'cashback_update':
                await this.handleCustomerCashbackUpdate(update);
                break;
            default:
                console.log(`Unknown update type from customer app: ${update.type}`);
        }
        // Emit real-time event to merchant app
        if (global.realTimeService) {
            global.realTimeService.emitOrderEvent(update.merchantId, {
                type: update.type === 'order_status' ? 'order_updated' : 'cashback_updated',
                merchantId: update.merchantId,
                data: update.data,
                timestamp: new Date()
            });
        }
    }
    // Handle order updates from customer app (e.g., customer initiated returns)
    static async handleCustomerOrderUpdate(update) {
        const { orderId, data } = update;
        // Update order in merchant database
        // This would integrate with your OrderModel
        console.log(`🔄 Processing customer order update for order ${orderId}`);
        // Example: Handle return requests, delivery confirmations, etc.
        // await OrderModel.updateStatus(orderId, data.newStatus, data.statusMessage);
    }
    // Handle cashback updates from customer app
    static async handleCustomerCashbackUpdate(update) {
        const { data } = update;
        console.log(`💰 Processing customer cashback update for request ${data.requestId}`);
        // This might be notifications about cashback usage, disputes, etc.
    }
    // Get sync status across apps
    static getCrossAppSyncStatus(merchantId) {
        const hasWebhook = this.customerAppWebhooks.has(merchantId);
        const queueSize = this.updateQueue.filter(u => u.merchantId === merchantId).length;
        return {
            merchantId,
            hasCustomerAppWebhook: hasWebhook,
            webhookUrl: hasWebhook ? this.customerAppWebhooks.get(merchantId) : null,
            pendingUpdates: queueSize,
            isProcessing: this.isProcessing,
            lastSync: SyncService_1.SyncService.getSyncStatus(merchantId).lastSync,
        };
    }
    // Get cross-app statistics
    static getCrossAppStatistics() {
        const totalUpdates = this.updateQueue.length;
        const updatesByType = this.updateQueue.reduce((acc, update) => {
            acc[update.type] = (acc[update.type] || 0) + 1;
            return acc;
        }, {});
        return {
            totalPendingUpdates: totalUpdates,
            updatesByType,
            registeredWebhooks: this.customerAppWebhooks.size,
            isProcessing: this.isProcessing,
        };
    }
    // Cleanup method
    static cleanup() {
        this.updateQueue.length = 0;
        this.customerAppWebhooks.clear();
        console.log('🧹 Cross-app sync service cleaned up');
    }
    // Method needed by merchant-profile route
    static async sendMerchantUpdate(merchantId, updateData) {
        try {
            // Broadcast to real-time service if available
            if (global.realTimeService) {
                global.realTimeService.sendMerchantUpdate(merchantId, {
                    type: 'merchant_update',
                    merchantId,
                    data: updateData,
                    timestamp: new Date()
                });
            }
            // Log for debugging
            console.log('Merchant update sent:', { merchantId, updateData });
        }
        catch (error) {
            console.error('Failed to send merchant update:', error);
        }
    }
}
exports.CrossAppSyncService = CrossAppSyncService;
CrossAppSyncService.customerAppWebhooks = new Map();
CrossAppSyncService.updateQueue = [];
CrossAppSyncService.isProcessing = false;
// Helper functions for common update scenarios
// Order status progression helper
const createOrderStatusTimeline = (currentStatus, newStatus, message, location) => {
    const timestamp = new Date();
    const statusMessages = {
        'pending': 'Order received and being processed',
        'confirmed': 'Order confirmed by merchant',
        'preparing': 'Order is being prepared',
        'ready': 'Order is ready for pickup/delivery',
        'shipped': 'Order has been shipped',
        'out_for_delivery': 'Order is out for delivery',
        'delivered': 'Order has been delivered',
        'cancelled': 'Order has been cancelled',
        'returned': 'Order has been returned',
    };
    return {
        status: newStatus,
        timestamp,
        message: message || statusMessages[newStatus] || 'Status updated',
        location
    };
};
exports.createOrderStatusTimeline = createOrderStatusTimeline;
// Product availability helper
const createProductAvailabilityUpdate = (productId, currentStock, newStock, price, oldPrice) => {
    return {
        productId,
        inStock: newStock > 0,
        quantity: newStock,
        priceChanged: price !== undefined && oldPrice !== undefined && price !== oldPrice,
        newPrice: price,
        backInStockDate: newStock <= 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined, // 7 days estimate
    };
};
exports.createProductAvailabilityUpdate = createProductAvailabilityUpdate;
// Cashback status helper
const createCashbackStatusUpdate = (requestId, orderId, customerId, oldStatus, newStatus, approvedAmount, rejectionReason) => {
    const timeline = {
        status: newStatus,
        timestamp: new Date(),
        message: getCashbackStatusMessage(newStatus, rejectionReason),
        amount: approvedAmount
    };
    return {
        requestId,
        orderId,
        customerId,
        oldStatus,
        newStatus,
        approvedAmount,
        rejectionReason,
        timeline: [timeline]
    };
};
exports.createCashbackStatusUpdate = createCashbackStatusUpdate;
function getCashbackStatusMessage(status, rejectionReason) {
    const messages = {
        'pending': 'Cashback request submitted for review',
        'under_review': 'Cashback request is being reviewed',
        'approved': 'Cashback request has been approved',
        'rejected': rejectionReason || 'Cashback request has been rejected',
        'paid': 'Cashback has been paid to your account',
        'disputed': 'Cashback request is under dispute',
    };
    return messages[status] || 'Cashback status updated';
}
