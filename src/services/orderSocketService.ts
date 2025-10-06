/**
 * Order Socket Service
 *
 * This service manages real-time order tracking updates using Socket.IO.
 * It provides functions to emit order-related events to connected clients.
 */

import { Server as SocketIOServer } from 'socket.io';
import { SocketRoom } from '../types/socket';

/**
 * Order Event Names
 */
export enum OrderSocketEvent {
  // Order status events
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_UPDATED = 'order:status_updated',
  ORDER_CONFIRMED = 'order:confirmed',
  ORDER_PREPARING = 'order:preparing',
  ORDER_READY = 'order:ready',
  ORDER_DISPATCHED = 'order:dispatched',
  ORDER_OUT_FOR_DELIVERY = 'order:out_for_delivery',
  ORDER_DELIVERED = 'order:delivered',
  ORDER_CANCELLED = 'order:cancelled',

  // Location tracking events
  ORDER_LOCATION_UPDATED = 'order:location_updated',

  // Delivery partner events
  ORDER_PARTNER_ASSIGNED = 'order:partner_assigned',
  ORDER_PARTNER_ARRIVED = 'order:partner_arrived',

  // Timeline events
  ORDER_TIMELINE_UPDATED = 'order:timeline_updated',

  // Subscription events (client -> server)
  SUBSCRIBE_ORDER = 'subscribe:order',
  UNSUBSCRIBE_ORDER = 'unsubscribe:order',
}

/**
 * Payload Interfaces
 */

export interface OrderStatusUpdatePayload {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  message: string;
  timestamp: Date;
  estimatedDeliveryTime?: Date;
  metadata?: any;
}

export interface OrderLocationUpdatePayload {
  orderId: string;
  orderNumber: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deliveryPartner: {
    name: string;
    phone: string;
    vehicle?: string;
    photoUrl?: string;
  };
  estimatedArrival?: Date;
  distanceToDestination?: number; // in meters
  timestamp: Date;
}

export interface OrderPartnerAssignedPayload {
  orderId: string;
  orderNumber: string;
  deliveryPartner: {
    id: string;
    name: string;
    phone: string;
    vehicle?: string;
    vehicleNumber?: string;
    photoUrl?: string;
    rating?: number;
  };
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  timestamp: Date;
}

export interface OrderTimelineUpdatePayload {
  orderId: string;
  orderNumber: string;
  timeline: Array<{
    status: string;
    message: string;
    timestamp: Date;
    updatedBy?: string;
    metadata?: any;
  }>;
  timestamp: Date;
}

export interface OrderDeliveredPayload {
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
  deliveredTo?: string;
  signature?: string;
  photoUrl?: string;
  otp?: string;
  feedback?: {
    rating?: number;
    comment?: string;
  };
  timestamp: Date;
}

/**
 * Order Socket Service Class
 * Manages all order-related real-time communications
 */
class OrderSocketService {
  private io: SocketIOServer | null = null;
  private static instance: OrderSocketService;

  private constructor() {}

  /**
   * Get singleton instance of OrderSocketService
   */
  public static getInstance(): OrderSocketService {
    if (!OrderSocketService.instance) {
      OrderSocketService.instance = new OrderSocketService();
    }
    return OrderSocketService.instance;
  }

  /**
   * Initialize the Socket.IO server
   * @param io - Socket.IO server instance
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupSocketHandlers();
    console.log('✅ Order Socket Service initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`📡 Client connected to order updates: ${socket.id}`);

      // Handle client subscribing to specific order
      socket.on(OrderSocketEvent.SUBSCRIBE_ORDER, (data: { orderId: string; userId?: string }) => {
        const orderRoom = SocketRoom.order(data.orderId);
        socket.join(orderRoom);
        console.log(`👤 Client ${socket.id} subscribed to order: ${data.orderId}`);

        // Also join user room if userId provided
        if (data.userId) {
          socket.join(SocketRoom.user(data.userId));
        }
      });

      // Handle client unsubscribing from specific order
      socket.on(OrderSocketEvent.UNSUBSCRIBE_ORDER, (data: { orderId: string }) => {
        const orderRoom = SocketRoom.order(data.orderId);
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
  public emitOrderStatusUpdate(payload: OrderStatusUpdatePayload): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit order status update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);

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
  public emitOrderLocationUpdate(payload: OrderLocationUpdatePayload): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit order location update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_LOCATION_UPDATED, payload);

    console.log(`📍 Order location updated: ${payload.orderNumber} at (${payload.location.latitude}, ${payload.location.longitude})`);
  }

  /**
   * Emit delivery partner assigned event
   */
  public emitPartnerAssigned(payload: OrderPartnerAssignedPayload): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit partner assigned event.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PARTNER_ASSIGNED, payload);

    console.log(`🚴 Delivery partner assigned to order ${payload.orderNumber}: ${payload.deliveryPartner.name}`);
  }

  /**
   * Emit delivery partner arrived event
   */
  public emitPartnerArrived(orderId: string, orderNumber: string): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit partner arrived event.');
      return;
    }

    const orderRoom = SocketRoom.order(orderId);
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
  public emitTimelineUpdate(payload: OrderTimelineUpdatePayload): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit timeline update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_TIMELINE_UPDATED, payload);

    console.log(`⏱️ Order timeline updated: ${payload.orderNumber}`);
  }

  /**
   * Emit order delivered event
   */
  public emitOrderDelivered(payload: OrderDeliveredPayload): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit order delivered event.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DELIVERED, payload);

    console.log(`✅ Order delivered: ${payload.orderNumber}`);
  }

  /**
   * Emit order created event (to user)
   */
  public emitOrderCreated(userId: string, orderData: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit order created event.');
      return;
    }

    const userRoom = SocketRoom.user(userId);
    this.io.to(userRoom).emit(OrderSocketEvent.ORDER_CREATED, {
      ...orderData,
      timestamp: new Date(),
    });

    console.log(`🆕 New order created for user ${userId}: ${orderData.orderNumber}`);
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Emit to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit to user.');
      return;
    }

    const userRoom = SocketRoom.user(userId);
    this.io.to(userRoom).emit(event, data);
  }

  /**
   * Emit to a specific order room
   */
  public emitToOrder(orderId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized. Cannot emit to order.');
      return;
    }

    const orderRoom = SocketRoom.order(orderId);
    this.io.to(orderRoom).emit(event, data);
  }
}

// Add order room to SocketRoom if not exists
if (!(SocketRoom as any).order) {
  (SocketRoom as any).order = (orderId: string) => `order-${orderId}`;
}

// Export singleton instance
const orderSocketService = OrderSocketService.getInstance();

export default orderSocketService;

// Export individual functions for easier use
export const {
  initialize,
  emitOrderStatusUpdate,
  emitOrderLocationUpdate,
  emitPartnerAssigned,
  emitPartnerArrived,
  emitTimelineUpdate,
  emitOrderDelivered,
  emitOrderCreated,
  emitToUser,
  emitToOrder,
  getIO,
} = orderSocketService;
