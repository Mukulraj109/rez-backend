/**
 * Stock Notification Service
 *
 * Handles stock notification subscriptions and notifications
 * Integrates with Twilio for SMS and nodemailer for email
 */

import { StockNotification, IStockNotification } from '../models/StockNotification';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { Types } from 'mongoose';

interface SubscribeParams {
  userId: string;
  productId: string;
  method?: 'email' | 'sms' | 'both' | 'push';
}

interface NotificationPayload {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  newStock: number;
}

/**
 * Stock Notification Service Class
 */
class StockNotificationService {
  private static instance: StockNotificationService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): StockNotificationService {
    if (!StockNotificationService.instance) {
      StockNotificationService.instance = new StockNotificationService();
    }
    return StockNotificationService.instance;
  }

  /**
   * Subscribe user to product stock notifications
   */
  public async subscribeToProduct(params: SubscribeParams): Promise<IStockNotification> {
    const { userId, productId, method = 'push' } = params;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already subscribed
    const existingSubscription = await StockNotification.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      status: 'pending'
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.notificationMethod = method;
      if (method === 'email' || method === 'both') {
        existingSubscription.email = user.email;
      }
      if (method === 'sms' || method === 'both') {
        existingSubscription.phoneNumber = user.phoneNumber;
      }
      await existingSubscription.save();

      console.log(`✅ Updated stock notification subscription for user ${userId} to product ${productId}`);
      return existingSubscription;
    }

    // Create new subscription
    const subscription = new StockNotification({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      email: (method === 'email' || method === 'both') ? user.email : undefined,
      phoneNumber: (method === 'sms' || method === 'both') ? user.phoneNumber : undefined,
      notificationMethod: method,
      status: 'pending',
      product: {
        name: product.name,
        image: product.images[0],
        price: product.pricing.selling
      }
    });

    await subscription.save();

    console.log(`✅ Created stock notification subscription for user ${userId} to product ${productId}`);
    return subscription;
  }

  /**
   * Unsubscribe user from product stock notifications
   */
  public async unsubscribeFromProduct(
    userId: string,
    productId: string
  ): Promise<boolean> {
    const result = await StockNotification.updateMany(
      {
        userId: new Types.ObjectId(userId),
        productId: new Types.ObjectId(productId),
        status: 'pending'
      },
      {
        status: 'cancelled'
      }
    );

    console.log(`✅ Unsubscribed user ${userId} from product ${productId}`);
    return result.modifiedCount > 0;
  }

  /**
   * Get user's active subscriptions
   */
  public async getUserSubscriptions(
    userId: string,
    status?: 'pending' | 'sent' | 'cancelled'
  ): Promise<IStockNotification[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const subscriptions = await StockNotification.find(query)
      .populate('productId', 'name images pricing inventory')
      .sort({ createdAt: -1 })
      .lean();

    return subscriptions;
  }

  /**
   * Check if user is subscribed to a product
   */
  public async isUserSubscribed(userId: string, productId: string): Promise<boolean> {
    const subscription = await StockNotification.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      status: 'pending'
    });

    return !!subscription;
  }

  /**
   * Notify all subscribers when product is back in stock
   * This is called from stockSocketService when stock is restored
   */
  public async notifySubscribers(payload: NotificationPayload): Promise<void> {
    const { productId, productName, productImage, productPrice, newStock } = payload;

    console.log(`📢 Notifying subscribers for product ${productId} - New stock: ${newStock}`);

    // Get all pending subscriptions for this product
    const subscriptions = await StockNotification.find({
      productId: new Types.ObjectId(productId),
      status: 'pending'
    }).populate('userId');

    if (subscriptions.length === 0) {
      console.log(`ℹ️ No pending subscriptions for product ${productId}`);
      return;
    }

    console.log(`📢 Found ${subscriptions.length} subscribers for product ${productId}`);

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        await this.sendNotification(subscription, {
          productName,
          productImage,
          productPrice,
          newStock
        });

        // Mark as sent
        subscription.status = 'sent';
        subscription.notifiedAt = new Date();
        await subscription.save();

        console.log(`✅ Notified user ${subscription.userId} for product ${productId}`);
      } catch (error) {
        console.error(`❌ Failed to notify user ${subscription.userId}:`, error);
      }
    }

    console.log(`✅ Completed notifying ${subscriptions.length} subscribers for product ${productId}`);
  }

  /**
   * Send notification to user based on their preference
   */
  private async sendNotification(
    subscription: IStockNotification,
    data: {
      productName: string;
      productImage: string;
      productPrice: number;
      newStock: number;
    }
  ): Promise<void> {
    const { productName, productImage, productPrice, newStock } = data;
    const user = subscription.userId as any;

    // Create in-app notification
    await Notification.create({
      user: user._id,
      type: 'system',
      title: 'Product Back in Stock!',
      message: `${productName} is back in stock! Hurry, only ${newStock} items available.`,
      metadata: {
        productId: subscription.productId,
        productName,
        productImage,
        productPrice,
        stock: newStock,
        action: 'view_product'
      }
    });

    // Send based on notification method
    switch (subscription.notificationMethod) {
      case 'email':
        await this.sendEmailNotification(subscription, data);
        break;
      case 'sms':
        await this.sendSMSNotification(subscription, data);
        break;
      case 'both':
        await this.sendEmailNotification(subscription, data);
        await this.sendSMSNotification(subscription, data);
        break;
      case 'push':
        // Push notification already handled via in-app notification
        console.log(`📱 Push notification sent to user ${user._id}`);
        break;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    subscription: IStockNotification,
    data: {
      productName: string;
      productImage: string;
      productPrice: number;
      newStock: number;
    }
  ): Promise<void> {
    const { productName, productPrice, newStock } = data;
    const email = subscription.email;

    if (!email) {
      console.log(`⚠️ No email address for subscription ${subscription._id}`);
      return;
    }

    // DEV MODE: Just log the email that would be sent
    console.log(`
📧 [DEV MODE] Email Notification:
───────────────────────────────────────
To: ${email}
Subject: ${productName} is Back in Stock!
───────────────────────────────────────
Hi there!

Great news! The product you were waiting for is back in stock.

Product: ${productName}
Price: ₹${productPrice.toLocaleString('en-IN')}
Available Quantity: ${newStock}

Don't wait - these items sell out fast!

View Product: [Link to product page]

Happy Shopping!
The REZ Team
───────────────────────────────────────
    `);

    // TODO: In production, use nodemailer to send actual email
    // const transporter = nodemailer.createTransporter({...});
    // await transporter.sendMail({...});
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    subscription: IStockNotification,
    data: {
      productName: string;
      productPrice: number;
      newStock: number;
    }
  ): Promise<void> {
    const { productName, productPrice, newStock } = data;
    const phoneNumber = subscription.phoneNumber;

    if (!phoneNumber) {
      console.log(`⚠️ No phone number for subscription ${subscription._id}`);
      return;
    }

    const message = `🎉 ${productName} is back in stock! ₹${productPrice.toLocaleString('en-IN')} - ${newStock} available. Order now on REZ!`;

    // DEV MODE: Just log the SMS that would be sent
    console.log(`
📱 [DEV MODE] SMS Notification:
───────────────────────────────────────
To: ${phoneNumber}
Message: ${message}
───────────────────────────────────────
    `);

    // TODO: In production, use Twilio to send actual SMS
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({...});
  }

  /**
   * Delete a subscription
   */
  public async deleteSubscription(userId: string, notificationId: string): Promise<boolean> {
    const result = await StockNotification.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId)
    });

    console.log(`✅ Deleted subscription ${notificationId} for user ${userId}`);
    return result.deletedCount > 0;
  }

  /**
   * Clean up old sent/cancelled notifications (optional maintenance task)
   */
  public async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await StockNotification.deleteMany({
      status: { $in: ['sent', 'cancelled'] },
      updatedAt: { $lt: cutoffDate }
    });

    console.log(`✅ Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  }
}

// Export singleton instance
const stockNotificationService = StockNotificationService.getInstance();

export default stockNotificationService;

export const {
  subscribeToProduct,
  unsubscribeFromProduct,
  getUserSubscriptions,
  isUserSubscribed,
  notifySubscribers,
  deleteSubscription,
  cleanupOldNotifications
} = stockNotificationService;