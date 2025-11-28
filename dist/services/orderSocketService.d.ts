/**
 * Order Socket Service
 *
 * This service manages real-time order tracking updates using Socket.IO.
 * It provides functions to emit order-related events to connected clients.
 */
import { Server as SocketIOServer } from 'socket.io';
/**
 * Order Event Names
 */
export declare enum OrderSocketEvent {
    ORDER_CREATED = "order:created",
    ORDER_STATUS_UPDATED = "order:status_updated",
    ORDER_CONFIRMED = "order:confirmed",
    ORDER_PREPARING = "order:preparing",
    ORDER_READY = "order:ready",
    ORDER_DISPATCHED = "order:dispatched",
    ORDER_OUT_FOR_DELIVERY = "order:out_for_delivery",
    ORDER_DELIVERED = "order:delivered",
    ORDER_CANCELLED = "order:cancelled",
    ORDER_LOCATION_UPDATED = "order:location_updated",
    ORDER_PARTNER_ASSIGNED = "order:partner_assigned",
    ORDER_PARTNER_ARRIVED = "order:partner_arrived",
    ORDER_TIMELINE_UPDATED = "order:timeline_updated",
    SUBSCRIBE_ORDER = "subscribe:order",
    UNSUBSCRIBE_ORDER = "unsubscribe:order"
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
    distanceToDestination?: number;
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
declare class OrderSocketService {
    private io;
    private static instance;
    private constructor();
    /**
     * Get singleton instance of OrderSocketService
     */
    static getInstance(): OrderSocketService;
    /**
     * Initialize the Socket.IO server
     * @param io - Socket.IO server instance
     */
    initialize(io: SocketIOServer): void;
    /**
     * Setup socket event handlers
     */
    private setupSocketHandlers;
    /**
     * Emit order status update event
     */
    emitOrderStatusUpdate(payload: OrderStatusUpdatePayload): void;
    /**
     * Emit order location update event (for delivery tracking)
     */
    emitOrderLocationUpdate(payload: OrderLocationUpdatePayload): void;
    /**
     * Emit delivery partner assigned event
     */
    emitPartnerAssigned(payload: OrderPartnerAssignedPayload): void;
    /**
     * Emit delivery partner arrived event
     */
    emitPartnerArrived(orderId: string, orderNumber: string): void;
    /**
     * Emit order timeline update event
     */
    emitTimelineUpdate(payload: OrderTimelineUpdatePayload): void;
    /**
     * Emit order delivered event
     */
    emitOrderDelivered(payload: OrderDeliveredPayload): void;
    /**
     * Emit order created event (to user)
     */
    emitOrderCreated(userId: string, orderData: any): void;
    /**
     * Get the Socket.IO server instance
     */
    getIO(): SocketIOServer | null;
    /**
     * Emit to a specific user
     */
    emitToUser(userId: string, event: string, data: any): void;
    /**
     * Emit to a specific order room
     */
    emitToOrder(orderId: string, event: string, data: any): void;
}
declare const orderSocketService: OrderSocketService;
export default orderSocketService;
export declare const initialize: (io: SocketIOServer) => void, emitOrderStatusUpdate: (payload: OrderStatusUpdatePayload) => void, emitOrderLocationUpdate: (payload: OrderLocationUpdatePayload) => void, emitPartnerAssigned: (payload: OrderPartnerAssignedPayload) => void, emitPartnerArrived: (orderId: string, orderNumber: string) => void, emitTimelineUpdate: (payload: OrderTimelineUpdatePayload) => void, emitOrderDelivered: (payload: OrderDeliveredPayload) => void, emitOrderCreated: (userId: string, orderData: any) => void, emitToUser: (userId: string, event: string, data: any) => void, emitToOrder: (orderId: string, event: string, data: any) => void, getIO: () => SocketIOServer | null;
