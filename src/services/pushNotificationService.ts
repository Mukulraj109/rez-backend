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

    // Validate Twilio credentials format
    if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        console.log('✅ Twilio SMS client initialized');
      } catch (error: any) {
        console.error('❌ Failed to initialize Twilio client:', error.message);
        console.warn('⚠️ SMS notifications will be disabled.');
      }
    } else {
      console.warn('⚠️ Twilio credentials not found or invalid. SMS notifications will be disabled.');
      console.warn('   Tip: TWILIO_ACCOUNT_SID should start with "AC" and TWILIO_AUTH_TOKEN should be set.');
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

      console.log(`✅ [SMS] Sent to ***${to.slice(-4)}: ${result.sid}`);
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

  /**
   * Send queue number assigned notification
   */
  public async sendQueueNumberAssigned(
    storeName: string,
    queueNumber: number,
    visitNumber: string,
    phone: string,
    estimatedWaitTime?: string,
    currentQueueSize?: number
  ): Promise<void> {
    let message = `🎫 Queue Number Assigned!\n\nStore: ${storeName}\nYour Queue #: ${queueNumber}\nVisit #: ${visitNumber}`;

    if (estimatedWaitTime) {
      message += `\nEstimated Wait: ${estimatedWaitTime}`;
    }

    if (currentQueueSize) {
      message += `\nCurrent Queue Size: ${currentQueueSize}`;
    }

    message += `\n\nWe'll notify you when it's your turn. Thank you for using REZ!`;

    await this.sendSMS(phone, message);

    console.log(`🎫 [Notification] Queue number sent for ${visitNumber}`);
  }

  /**
   * Send visit scheduled notification
   */
  public async sendVisitScheduled(
    storeName: string,
    visitNumber: string,
    visitDate: Date,
    visitTime: string,
    phone: string,
    storeAddress?: string
  ): Promise<void> {
    const dateStr = new Date(visitDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let message = `📅 Visit Scheduled Successfully!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\nDate: ${dateStr}\nTime: ${visitTime}`;

    if (storeAddress) {
      message += `\nAddress: ${storeAddress}`;
    }

    message += `\n\nWe look forward to seeing you! Open REZ app to manage your visit.`;

    await this.sendSMS(phone, message);

    console.log(`📅 [Notification] Visit scheduled notification sent for ${visitNumber}`);
  }

  /**
   * Send visit cancelled notification
   */
  public async sendVisitCancelled(
    storeName: string,
    visitNumber: string,
    phone: string,
    reason?: string
  ): Promise<void> {
    let message = `❌ Visit Cancelled\n\nStore: ${storeName}\nVisit #: ${visitNumber} has been cancelled.`;

    if (reason) {
      message += `\nReason: ${reason}`;
    }

    message += `\n\nYou can reschedule anytime through the REZ app.`;

    await this.sendSMS(phone, message);

    console.log(`❌ [Notification] Visit cancellation sent for ${visitNumber}`);
  }

  public async sendVisitCheckedIn(
    storeName: string,
    visitNumber: string,
    phone: string
  ): Promise<void> {
    const message = `✅ You're Checked In!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\n\nYou have been checked in. The store team is ready for you!`;

    await this.sendSMS(phone, message);

    console.log(`✅ [Notification] Visit check-in sent for ${visitNumber}`);
  }

  public async sendVisitCompleted(
    storeName: string,
    visitNumber: string,
    phone: string
  ): Promise<void> {
    const message = `🎉 Visit Complete!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\n\nThank you for visiting! We hope you had a great experience.`;

    await this.sendSMS(phone, message);

    console.log(`🎉 [Notification] Visit completion sent for ${visitNumber}`);
  }

  /**
   * Send gift received notification
   */
  public async sendGiftReceived(
    senderName: string,
    amount: number,
    themeEmoji: string,
    phone: string
  ): Promise<void> {
    const message = `${themeEmoji} You received a gift!\n\n${senderName} sent you ${amount} NC on Nuqta! Open the app to claim your gift before it expires.\n\nOpen REZ app to claim now!`;

    await this.sendSMS(phone, message);

    console.log(`🎁 [Notification] Gift received sent to ***${phone.slice(-4)}`);
  }

  /**
   * Send gift expired notification (to sender)
   */
  public async sendGiftExpiredRefund(
    recipientName: string,
    amount: number,
    phone: string
  ): Promise<void> {
    const message = `💰 Gift Refund\n\nYour gift of ${amount} NC to ${recipientName} was not claimed and has expired. The coins have been returned to your wallet.`;

    await this.sendSMS(phone, message);

    console.log(`💰 [Notification] Gift expiry refund sent to ***${phone.slice(-4)}`);
  }

  /**
   * Send transfer received notification to recipient
   */
  public async sendTransferReceived(
    recipientPhone: string,
    senderName: string,
    amount: number
  ): Promise<void> {
    const message = `You received ${amount} NC from ${senderName}! Open REZ to view your balance.`;

    await this.sendSMS(recipientPhone, message);

    console.log(`💸 [Notification] Transfer received sent to ***${recipientPhone.slice(-4)}`);
  }

  /**
   * Send achievement unlocked notification
   */
  public async sendAchievementUnlocked(
    userPhone: string,
    achievementName: string,
    reward: number
  ): Promise<void> {
    const message = `Achievement unlocked: ${achievementName}! You earned ${reward} NC. Keep going!`;

    await this.sendSMS(userPhone, message);

    console.log(`🏅 [Notification] Achievement unlocked sent to ***${userPhone.slice(-4)}`);
  }

  /**
   * Send challenge completed notification
   */
  public async sendChallengeCompleted(
    userPhone: string,
    challengeName: string,
    reward: number
  ): Promise<void> {
    const message = `Challenge complete: ${challengeName}! Claim your ${reward} NC reward.`;

    await this.sendSMS(userPhone, message);

    console.log(`🎯 [Notification] Challenge completed sent to ***${userPhone.slice(-4)}`);
  }

  /**
   * Send tournament ending soon notification
   */
  public async sendTournamentEndingSoon(
    userPhone: string,
    tournamentName: string,
    hoursLeft: number
  ): Promise<void> {
    const message = `${tournamentName} tournament ends in ${hoursLeft}h! Check your rank now.`;

    await this.sendSMS(userPhone, message);

    console.log(`🏆 [Notification] Tournament ending soon sent to ***${userPhone.slice(-4)}`);
  }

  /**
   * Send coins expiring soon notification
   */
  public async sendCoinsExpiringSoon(
    userPhone: string,
    amount: number,
    expiryDate: string
  ): Promise<void> {
    const message = `${amount} NC expires on ${expiryDate}. Use them before they're gone!`;

    await this.sendSMS(userPhone, message);

    console.log(`⏰ [Notification] Coins expiring soon sent to ***${userPhone.slice(-4)}`);
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
  sendQueueNumberAssigned,
  sendVisitScheduled,
  sendVisitCancelled,
  sendVisitCheckedIn,
  sendVisitCompleted,
  sendTransferReceived,
  sendAchievementUnlocked,
  sendChallengeCompleted,
  sendTournamentEndingSoon,
  sendCoinsExpiringSoon,
} = pushNotificationService;
