"use strict";
/**
 * Order Socket Service
 *
 * This service manages real-time order tracking updates using Socket.IO.
 * It provides functions to emit order-related events to connected clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.emitToOrder = exports.emitToUser = exports.emitOrderCreated = exports.emitOrderDelivered = exports.emitTimelineUpdate = exports.emitPartnerArrived = exports.emitPartnerAssigned = exports.emitOrderLocationUpdate = exports.emitOrderStatusUpdate = exports.initialize = exports.OrderSocketEvent = void 0;
const socket_1 = require("../types/socket");
/**
 * Order Event Names
 */
var OrderSocketEvent;
(function (OrderSocketEvent) {
    // Order status events
    OrderSocketEvent["ORDER_CREATED"] = "order:created";
    OrderSocketEvent["ORDER_STATUS_UPDATED"] = "order:status_updated";
    OrderSocketEvent["ORDER_CONFIRMED"] = "order:confirmed";
    OrderSocketEvent["ORDER_PREPARING"] = "order:preparing";
    OrderSocketEvent["ORDER_READY"] = "order:ready";
    OrderSocketEvent["ORDER_DISPATCHED"] = "order:dispatched";
    OrderSocketEvent["ORDER_OUT_FOR_DELIVERY"] = "order:out_for_delivery";
    OrderSocketEvent["ORDER_DELIVERED"] = "order:delivered";
    OrderSocketEvent["ORDER_CANCELLED"] = "order:cancelled";
    // Location tracking events
    OrderSocketEvent["ORDER_LOCATION_UPDATED"] = "order:location_updated";
    // Delivery partner events
    OrderSocketEvent["ORDER_PARTNER_ASSIGNED"] = "order:partner_assigned";
    OrderSocketEvent["ORDER_PARTNER_ARRIVED"] = "order:partner_arrived";
    // Timeline events
    OrderSocketEvent["ORDER_TIMELINE_UPDATED"] = "order:timeline_updated";
    // Subscription events (client -> server)
    OrderSocketEvent["SUBSCRIBE_ORDER"] = "subscribe:order";
    OrderSocketEvent["UNSUBSCRIBE_ORDER"] = "unsubscribe:order";
})(OrderSocketEvent || (exports.OrderSocketEvent = OrderSocketEvent = {}));
/**
 * Order Socket Service Class
 * Manages all order-related real-time communications
 */
class OrderSocketService {
    constructor() {
        this.io = null;
    }
    /**
     * Get singleton instance of OrderSocketService
     */
    static getInstance() {
        if (!OrderSocketService.instance) {
            OrderSocketService.instance = new OrderSocketService();
        }
        return OrderSocketService.instance;
    }
    /**
     * Initialize the Socket.IO server
     * @param io - Socket.IO server instance
     */
    initialize(io) {
        this.io = io;
        this.setupSocketHandlers();
        console.log('✅ Order Socket Service initialized');
    }
    /**
     * Setup socket event handlers
     */
    setupSocketHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            console.log(`📡 Client connected to order updates: ${socket.id}`);
            // Handle client subscribing to specific order
            socket.on(OrderSocketEvent.SUBSCRIBE_ORDER, (data) => {
                const orderRoom = socket_1.SocketRoom.order(data.orderId);
                socket.join(orderRoom);
                console.log(`👤 Client ${socket.id} subscribed to order: ${data.orderId}`);
                // Also join user room if userId provided
                if (data.userId) {
                    socket.join(socket_1.SocketRoom.user(data.userId));
                }
            });
            // Handle client unsubscribing from specific order
            socket.on(OrderSocketEvent.UNSUBSCRIBE_ORDER, (data) => {
                const orderRoom = socket_1.SocketRoom.order(data.orderId);
                socket.leave(orderRoom);
                console.log(`👤 Client ${socket.id} unsubscribed from order: ${data.orderId}`);
            });
            socket.on('disconnect', () => {
                console.log(`📡 Client disconnected from order updates: ${socket.id}`);
            });
        });
    }
    /**
     * Emit order status update event
     */
    emitOrderStatusUpdate(payload) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit order status update.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(payload.orderId);
        // Emit to order-specific room
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_STATUS_UPDATED, payload);
        // Emit specific status events
        switch (payload.status) {
            case 'confirmed':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_CONFIRMED, payload);
                break;
            case 'preparing':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PREPARING, payload);
                break;
            case 'ready':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_READY, payload);
                break;
            case 'dispatched':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DISPATCHED, payload);
                break;
            case 'out_for_delivery':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_OUT_FOR_DELIVERY, payload);
                break;
            case 'delivered':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DELIVERED, payload);
                break;
            case 'cancelled':
                this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_CANCELLED, payload);
                break;
        }
        console.log(`📦 Order status updated: ${payload.orderNumber} -> ${payload.status}`);
    }
    /**
     * Emit order location update event (for delivery tracking)
     */
    emitOrderLocationUpdate(payload) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit order location update.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(payload.orderId);
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_LOCATION_UPDATED, payload);
        console.log(`📍 Order location updated: ${payload.orderNumber} at (${payload.location.latitude}, ${payload.location.longitude})`);
    }
    /**
     * Emit delivery partner assigned event
     */
    emitPartnerAssigned(payload) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit partner assigned event.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(payload.orderId);
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PARTNER_ASSIGNED, payload);
        console.log(`🚴 Delivery partner assigned to order ${payload.orderNumber}: ${payload.deliveryPartner.name}`);
    }
    /**
     * Emit delivery partner arrived event
     */
    emitPartnerArrived(orderId, orderNumber) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit partner arrived event.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(orderId);
        const payload = {
            orderId,
            orderNumber,
            timestamp: new Date(),
            message: 'Delivery partner has arrived at your location',
        };
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PARTNER_ARRIVED, payload);
        console.log(`🎯 Delivery partner arrived for order ${orderNumber}`);
    }
    /**
     * Emit order timeline update event
     */
    emitTimelineUpdate(payload) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit timeline update.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(payload.orderId);
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_TIMELINE_UPDATED, payload);
        console.log(`⏱️ Order timeline updated: ${payload.orderNumber}`);
    }
    /**
     * Emit order delivered event
     */
    emitOrderDelivered(payload) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit order delivered event.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(payload.orderId);
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DELIVERED, payload);
        console.log(`✅ Order delivered: ${payload.orderNumber}`);
    }
    /**
     * Emit order created event (to user)
     */
    emitOrderCreated(userId, orderData) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit order created event.');
            return;
        }
        const userRoom = socket_1.SocketRoom.user(userId);
        this.io.to(userRoom).emit(OrderSocketEvent.ORDER_CREATED, {
            ...orderData,
            timestamp: new Date(),
        });
        console.log(`🆕 New order created for user ${userId}: ${orderData.orderNumber}`);
    }
    /**
     * Get the Socket.IO server instance
     */
    getIO() {
        return this.io;
    }
    /**
     * Emit to a specific user
     */
    emitToUser(userId, event, data) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit to user.');
            return;
        }
        const userRoom = socket_1.SocketRoom.user(userId);
        this.io.to(userRoom).emit(event, data);
    }
    /**
     * Emit to a specific order room
     */
    emitToOrder(orderId, event, data) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit to order.');
            return;
        }
        const orderRoom = socket_1.SocketRoom.order(orderId);
        this.io.to(orderRoom).emit(event, data);
    }
}
// Add order room to SocketRoom if not exists
if (!socket_1.SocketRoom.order) {
    socket_1.SocketRoom.order = (orderId) => `order-${orderId}`;
}
// Export singleton instance
const orderSocketService = OrderSocketService.getInstance();
exports.default = orderSocketService;
// Export individual functions for easier use
exports.initialize = orderSocketService.initialize, exports.emitOrderStatusUpdate = orderSocketService.emitOrderStatusUpdate, exports.emitOrderLocationUpdate = orderSocketService.emitOrderLocationUpdate, exports.emitPartnerAssigned = orderSocketService.emitPartnerAssigned, exports.emitPartnerArrived = orderSocketService.emitPartnerArrived, exports.emitTimelineUpdate = orderSocketService.emitTimelineUpdate, exports.emitOrderDelivered = orderSocketService.emitOrderDelivered, exports.emitOrderCreated = orderSocketService.emitOrderCreated, exports.emitToUser = orderSocketService.emitToUser, exports.emitToOrder = orderSocketService.emitToOrder, exports.getIO = orderSocketService.getIO;
