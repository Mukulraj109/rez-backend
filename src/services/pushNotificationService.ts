/**
 * Push Notification Service
 *
 * Handles sending push notifications for order updates using Twilio (SMS)
 * and can be extended to support FCM/APNS for mobile push notifications
 */

import twilio from 'twilio';

interface NotificationPayload {
  userId: string;
  phone: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

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

class PushNotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private static instance: PushNotificationService;

  private constructor() {
    // Initialize Twilio client if credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      console.log('✅ Twilio SMS client initialized');
    } else {
      console.warn('⚠️ Twilio credentials not found. SMS notifications will be disabled.');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      console.log('📱 [SMS] Twilio not configured. Would send:', message);
      return false;
    }

    try {
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioPhone) {
        console.error('❌ [SMS] Twilio phone number not configured');
        return false;
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        to,
        from: twilioPhone,
      });

      console.log(`✅ [SMS] Sent to ${to}: ${result.sid}`);
      return true;
    } catch (error: any) {
      console.error('❌ [SMS] Failed to send:', error.message);
      return false;
    }
  }

  /**
   * Send push notification (to be implemented with FCM/APNS)
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    // TODO: Implement FCM/APNS push notifications
    console.log('📱 [Push] Would send push notification:', {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
    });
    return true;
  }

  /**
   * Send order confirmed notification
   */
  public async sendOrderConfirmed(data: OrderNotificationData, phone: string): Promise<void> {
    const message = `✅ Your order #${data.orderNumber} has been confirmed! We're preparing your items. Track your order: ${data.trackingUrl || 'Open REZ app'}`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Order confirmed sent for ${data.orderNumber}`);
  }

  /**
   * Send order out for delivery notification
   */
  public async sendOrderOutForDelivery(
    data: OrderNotificationData,
    phone: string
  ): Promise<void> {
    let message = `🚚 Your order #${data.orderNumber} is out for delivery!`;

    if (data.deliveryPartner) {
      message += ` Delivery partner: ${data.deliveryPartner.name} (${data.deliveryPartner.phone})`;
    }

    if (data.estimatedDelivery) {
      const time = new Date(data.estimatedDelivery).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      message += ` ETA: ${time}`;
    }

    message += ` Track: ${data.trackingUrl || 'Open REZ app'}`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Out for delivery sent for ${data.orderNumber}`);
  }

  /**
   * Send order delivered notification
   */
  public async sendOrderDelivered(data: OrderNotificationData, phone: string): Promise<void> {
    const message = `✅ Your order #${data.orderNumber} has been delivered successfully! Thank you for shopping with REZ. Rate your experience in the app.`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Order delivered sent for ${data.orderNumber}`);
  }

  /**
   * Send order cancelled notification
   */
  public async sendOrderCancelled(
    data: OrderNotificationData,
    phone: string,
    reason?: string
  ): Promise<void> {
    let message = `❌ Your order #${data.orderNumber} has been cancelled.`;

    if (reason) {
      message += ` Reason: ${reason}`;
    }

    message += ` Any payment will be refunded within 5-7 business days.`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Order cancelled sent for ${data.orderNumber}`);
  }

  /**
   * Send order refunded notification
   */
  public async sendOrderRefunded(
    data: OrderNotificationData,
    phone: string,
    refundAmount: number
  ): Promise<void> {
    const message = `💰 Refund processed for order #${data.orderNumber}. Amount: ₹${refundAmount} has been credited to your original payment method. It may take 5-7 business days to reflect.`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Refund notification sent for ${data.orderNumber}`);
  }

  /**
   * Send delivery partner assigned notification
   */
  public async sendDeliveryPartnerAssigned(
    data: OrderNotificationData,
    phone: string
  ): Promise<void> {
    if (!data.deliveryPartner) return;

    const message = `🚴 Delivery partner assigned for order #${data.orderNumber}! ${data.deliveryPartner.name} (${data.deliveryPartner.phone}) will deliver your order. Track in the app.`;

    await this.sendSMS(phone, message);

    console.log(`📦 [Notification] Delivery partner assigned sent for ${data.orderNumber}`);
  }

  /**
   * Send general order update notification
   */
  public async sendOrderUpdate(
    orderNumber: string,
    phone: string,
    title: string,
    message: string
  ): Promise<void> {
    const fullMessage = `${title}\nOrder #${orderNumber}: ${message}`;

    await this.sendSMS(phone, fullMessage);

    console.log(`📦 [Notification] Order update sent for ${orderNumber}`);
  }
}

// Export singleton instance
const pushNotificationService = PushNotificationService.getInstance();

export default pushNotificationService;

// Export individual functions for easier use
export const {
  sendOrderConfirmed,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendOrderCancelled,
  sendOrderRefunded,
  sendDeliveryPartnerAssigned,
  sendOrderUpdate,
} = pushNotificationService;
