/**
 * Push Notification Service
 *
 * Handles sending push notifications for order updates using Twilio (SMS)
 * and can be extended to support FCM/APNS for mobile push notifications
 */
interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    status: string;
    deliveryPartner?: {
        name: string;
        phone: string;
    };
    estimatedDelivery?: Date;
    trackingUrl?: string;
}
declare class PushNotificationService {
    private twilioClient;
    private static instance;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): PushNotificationService;
    /**
     * Send SMS notification via Twilio
     */
    private sendSMS;
    /**
     * Send push notification (to be implemented with FCM/APNS)
     */
    private sendPushNotification;
    /**
     * Send order confirmed notification
     */
    sendOrderConfirmed(data: OrderNotificationData, phone: string): Promise<void>;
    /**
     * Send order out for delivery notification
     */
    sendOrderOutForDelivery(data: OrderNotificationData, phone: string): Promise<void>;
    /**
     * Send order delivered notification
     */
    sendOrderDelivered(data: OrderNotificationData, phone: string): Promise<void>;
    /**
     * Send order cancelled notification
     */
    sendOrderCancelled(data: OrderNotificationData, phone: string, reason?: string): Promise<void>;
    /**
     * Send order refunded notification
     */
    sendOrderRefunded(data: OrderNotificationData, phone: string, refundAmount: number): Promise<void>;
    /**
     * Send delivery partner assigned notification
     */
    sendDeliveryPartnerAssigned(data: OrderNotificationData, phone: string): Promise<void>;
    /**
     * Send general order update notification
     */
    sendOrderUpdate(orderNumber: string, phone: string, title: string, message: string): Promise<void>;
    /**
     * Send queue number assigned notification
     */
    sendQueueNumberAssigned(storeName: string, queueNumber: number, visitNumber: string, phone: string, estimatedWaitTime?: string, currentQueueSize?: number): Promise<void>;
    /**
     * Send visit scheduled notification
     */
    sendVisitScheduled(storeName: string, visitNumber: string, visitDate: Date, visitTime: string, phone: string, storeAddress?: string): Promise<void>;
    /**
     * Send visit cancelled notification
     */
    sendVisitCancelled(storeName: string, visitNumber: string, phone: string, reason?: string): Promise<void>;
}
declare const pushNotificationService: PushNotificationService;
export default pushNotificationService;
export declare const sendOrderConfirmed: (data: OrderNotificationData, phone: string) => Promise<void>, sendOrderOutForDelivery: (data: OrderNotificationData, phone: string) => Promise<void>, sendOrderDelivered: (data: OrderNotificationData, phone: string) => Promise<void>, sendOrderCancelled: (data: OrderNotificationData, phone: string, reason?: string) => Promise<void>, sendOrderRefunded: (data: OrderNotificationData, phone: string, refundAmount: number) => Promise<void>, sendDeliveryPartnerAssigned: (data: OrderNotificationData, phone: string) => Promise<void>, sendOrderUpdate: (orderNumber: string, phone: string, title: string, message: string) => Promise<void>, sendQueueNumberAssigned: (storeName: string, queueNumber: number, visitNumber: string, phone: string, estimatedWaitTime?: string, currentQueueSize?: number) => Promise<void>, sendVisitScheduled: (storeName: string, visitNumber: string, visitDate: Date, visitTime: string, phone: string, storeAddress?: string) => Promise<void>, sendVisitCancelled: (storeName: string, visitNumber: string, phone: string, reason?: string) => Promise<void>;
