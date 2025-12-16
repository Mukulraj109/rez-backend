/**
 * Mall Affiliate Service
 *
 * Handles affiliate click tracking, conversion processing, and cashback management
 * for the ReZ Mall feature.
 */

import { Types } from 'mongoose';
import { MallAffiliateClick, IMallAffiliateClick } from '../models/MallAffiliateClick';
import { MallPurchase, IMallPurchase, PurchaseStatus } from '../models/MallPurchase';
import { MallBrand, IMallBrand } from '../models/MallBrand';
import { UserCashback } from '../models/UserCashback';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';

// Types
interface TrackClickData {
  brandId: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  platform?: 'web' | 'ios' | 'android';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface TrackClickResult {
  clickId: string;
  trackingUrl: string;
  brandName: string;
  cashbackPercentage: number;
}

interface ProcessConversionData {
  clickId: string;
  externalOrderId: string;
  orderAmount: number;
  currency?: string;
  status?: 'pending' | 'confirmed';
  webhookPayload?: Record<string, any>;
}

interface UserCashbackSummary {
  totalEarned: number;
  pending: number;
  credited: number;
  totalClicks: number;
  totalPurchases: number;
  conversionRate: number;
}

class MallAffiliateService {
  /**
   * Track a brand click and generate tracking URL
   */
  async trackClick(data: TrackClickData): Promise<TrackClickResult> {
    try {
      // Find the brand
      const brand = await MallBrand.findById(data.brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      if (!brand.isActive) {
        throw new Error('Brand is not active');
      }

      if (!brand.externalUrl) {
        throw new Error('Brand has no external URL configured');
      }

      // Create click record
      const click = new MallAffiliateClick({
        user: data.userId ? new Types.ObjectId(data.userId) : undefined,
        brand: brand._id,
        sessionId: data.sessionId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referrer: data.referrer,
        platform: data.platform || 'web',
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        brandSnapshot: {
          name: brand.name,
          cashbackPercentage: brand.cashback.percentage,
          maxCashback: brand.cashback.maxAmount,
        },
      });

      await click.save();

      // Update brand analytics
      await brand.recordClick();

      // Generate tracking URL
      const trackingUrl = this.generateTrackingUrl(brand.externalUrl, click.clickId, data.userId);

      console.log(`✅ [AFFILIATE] Click tracked: ${click.clickId} for brand ${brand.name}`);

      return {
        clickId: click.clickId,
        trackingUrl,
        brandName: brand.name,
        cashbackPercentage: brand.cashback.percentage,
      };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Generate tracking URL with affiliate parameters
   */
  generateTrackingUrl(baseUrl: string, clickId: string, userId?: string): string {
    const url = new URL(baseUrl);

    // Add tracking parameters
    url.searchParams.set('ref', 'rez');
    url.searchParams.set('click_id', clickId);
    if (userId) {
      url.searchParams.set('user_id', userId);
    }
    url.searchParams.set('utm_source', 'rez_mall');
    url.searchParams.set('utm_medium', 'affiliate');

    return url.toString();
  }

  /**
   * Process a conversion webhook
   */
  async processConversion(data: ProcessConversionData): Promise<IMallPurchase> {
    try {
      // Find the click
      const click = await MallAffiliateClick.findOne({
        clickId: data.clickId,
        status: 'clicked',
        expiresAt: { $gt: new Date() },
      }).populate('brand');

      if (!click) {
        throw new Error('Invalid or expired click ID');
      }

      // Check for duplicate order
      const existingPurchase = await MallPurchase.findOne({
        externalOrderId: data.externalOrderId,
        brand: click.brand,
      });

      if (existingPurchase) {
        console.log(`⚠️ [AFFILIATE] Duplicate order: ${data.externalOrderId}`);
        return existingPurchase;
      }

      // Get brand for cashback calculation
      const brand = click.brand as unknown as IMallBrand;

      // Calculate cashback
      const cashbackRate = click.brandSnapshot.cashbackPercentage;
      const calculatedCashback = Math.round((data.orderAmount * cashbackRate) / 100);
      const maxCashback = click.brandSnapshot.maxCashback;
      const actualCashback = maxCashback
        ? Math.min(calculatedCashback, maxCashback)
        : calculatedCashback;

      // Create purchase record
      const purchase = new MallPurchase({
        click: click._id,
        user: click.user,
        brand: click.brand,
        externalOrderId: data.externalOrderId,
        orderAmount: data.orderAmount,
        currency: data.currency || 'INR',
        cashbackRate,
        cashbackAmount: calculatedCashback,
        maxCashback,
        actualCashback,
        status: data.status || 'pending',
        verificationDays: 7, // Default 7 days
        webhookPayload: data.webhookPayload,
        webhookReceivedAt: new Date(),
        purchasedAt: new Date(),
      });

      await purchase.save();

      // Mark click as converted
      await click.markAsConverted(purchase._id as Types.ObjectId);

      // Update brand analytics
      await (brand as any).recordPurchase(actualCashback);

      console.log(`✅ [AFFILIATE] Conversion processed: ${purchase.purchaseId}, cashback: ₹${actualCashback}`);

      return purchase;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error processing conversion:', error);
      throw error;
    }
  }

  /**
   * Confirm a pending purchase (called by brand webhook)
   */
  async confirmPurchase(purchaseId: string, reason?: string): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (purchase.status !== 'pending') {
        throw new Error(`Cannot confirm purchase with status: ${purchase.status}`);
      }

      await purchase.updateStatus('confirmed', reason || 'Confirmed by brand', 'webhook');

      console.log(`✅ [AFFILIATE] Purchase confirmed: ${purchaseId}`);

      return purchase;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error confirming purchase:', error);
      throw error;
    }
  }

  /**
   * Reject a purchase (e.g., cancelled order)
   */
  async rejectPurchase(purchaseId: string, reason: string): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (purchase.status === 'credited') {
        throw new Error('Cannot reject credited purchase');
      }

      await purchase.updateStatus('rejected', reason, 'webhook');

      console.log(`❌ [AFFILIATE] Purchase rejected: ${purchaseId}, reason: ${reason}`);

      return purchase;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error rejecting purchase:', error);
      throw error;
    }
  }

  /**
   * Handle refund
   */
  async handleRefund(purchaseId: string, reason: string): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      // If cashback was already credited, we need to deduct it
      if (purchase.status === 'credited' && purchase.cashback) {
        // Mark cashback as cancelled
        await UserCashback.findByIdAndUpdate(purchase.cashback, {
          status: 'cancelled',
        });

        // Deduct from wallet (if already credited)
        // This would need integration with wallet service
        console.log(`⚠️ [AFFILIATE] Refund for credited purchase - manual wallet adjustment may be needed`);
      }

      await purchase.updateStatus('refunded', reason, 'webhook');

      console.log(`💸 [AFFILIATE] Purchase refunded: ${purchaseId}`);

      return purchase;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error handling refund:', error);
      throw error;
    }
  }

  /**
   * Credit cashback for confirmed purchases (called by background job)
   */
  async creditPendingCashback(): Promise<{ credited: number; total: number }> {
    try {
      const readyPurchases = await (MallPurchase as any).getReadyForCredit();

      let credited = 0;
      const total = readyPurchases.length;

      for (const purchase of readyPurchases) {
        try {
          await this.creditCashbackForPurchase(purchase);
          credited++;
        } catch (error) {
          console.error(`Failed to credit cashback for purchase ${purchase.purchaseId}:`, error);
        }
      }

      console.log(`💰 [AFFILIATE] Credited ${credited}/${total} pending cashbacks`);

      return { credited, total };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error in credit pending cashback job:', error);
      throw error;
    }
  }

  /**
   * Credit cashback for a single purchase
   */
  async creditCashbackForPurchase(purchase: IMallPurchase): Promise<void> {
    try {
      if (!purchase.user) {
        throw new Error('Purchase has no associated user');
      }

      // Get brand info
      const brand = await MallBrand.findById(purchase.brand);

      // Create UserCashback entry
      const cashback = await UserCashback.create({
        user: purchase.user,
        amount: purchase.actualCashback,
        cashbackRate: purchase.cashbackRate,
        source: 'special_offer', // Using existing source type for mall purchases
        status: 'credited',
        description: `Cashback from ${brand?.name || 'Mall'} purchase`,
        earnedDate: purchase.purchasedAt,
        creditedDate: new Date(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        metadata: {
          orderAmount: purchase.orderAmount,
          productCategories: ['mall'],
          storeName: brand?.name,
        },
        pendingDays: 0,
        isRedeemed: true,
        redeemedAt: new Date(),
      });

      // Credit to user's wallet
      const user = await User.findById(purchase.user);
      if (user) {
        // Update user wallet balance
        user.wallet.balance += purchase.actualCashback;
        user.wallet.totalEarned += purchase.actualCashback;
        await user.save();

        // Also update Wallet document if exists
        const wallet = await Wallet.findOne({ user: purchase.user });
        if (wallet) {
          wallet.balance.available += purchase.actualCashback;
          wallet.balance.total += purchase.actualCashback;
          wallet.statistics.totalCashback += purchase.actualCashback;
          wallet.statistics.totalEarned += purchase.actualCashback;
          await wallet.save();
        }
      }

      // Update purchase status
      purchase.status = 'credited';
      purchase.creditedAt = new Date();
      purchase.cashback = cashback._id as Types.ObjectId;
      purchase.statusHistory.push({
        status: 'credited',
        timestamp: new Date(),
        reason: 'Cashback credited to wallet',
        updatedBy: 'system',
      });
      await purchase.save();

      console.log(`💰 [AFFILIATE] Credited ₹${purchase.actualCashback} to user ${purchase.user}`);
    } catch (error) {
      console.error('❌ [AFFILIATE] Error crediting cashback:', error);
      throw error;
    }
  }

  /**
   * Get user's click history
   */
  async getUserClicks(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ clicks: IMallAffiliateClick[]; total: number; pages: number }> {
    return (MallAffiliateClick as any).getUserClicks(
      new Types.ObjectId(userId),
      page,
      limit
    );
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchases(
    userId: string,
    status?: PurchaseStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ purchases: IMallPurchase[]; total: number; pages: number }> {
    return (MallPurchase as any).getUserPurchases(
      new Types.ObjectId(userId),
      status,
      page,
      limit
    );
  }

  /**
   * Get user's cashback summary
   */
  async getUserCashbackSummary(userId: string): Promise<UserCashbackSummary> {
    const userObjectId = new Types.ObjectId(userId);

    // Get purchase summary
    const purchaseSummary = await (MallPurchase as any).getUserCashbackSummary(userObjectId);

    // Get click count
    const clickCount = await MallAffiliateClick.countDocuments({ user: userObjectId });

    // Calculate conversion rate
    const conversionRate = clickCount > 0
      ? (purchaseSummary.purchaseCount / clickCount) * 100
      : 0;

    return {
      totalEarned: purchaseSummary.totalEarned,
      pending: purchaseSummary.pending,
      credited: purchaseSummary.credited,
      totalClicks: clickCount,
      totalPurchases: purchaseSummary.purchaseCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Get brand analytics
   */
  async getBrandAnalytics(
    brandId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    clicks: { totalClicks: number; uniqueUsers: number; conversions: number; conversionRate: number };
    purchases: { totalPurchases: number; totalAmount: number; totalCashback: number; averageOrderValue: number };
  }> {
    const brandObjectId = new Types.ObjectId(brandId);

    const [clickStats, purchaseStats] = await Promise.all([
      (MallAffiliateClick as any).getBrandClickAnalytics(brandObjectId, startDate, endDate),
      (MallPurchase as any).getBrandPurchaseAnalytics(brandObjectId, startDate, endDate),
    ]);

    return {
      clicks: clickStats,
      purchases: purchaseStats,
    };
  }

  /**
   * Mark expired clicks (for background job)
   */
  async markExpiredClicks(): Promise<number> {
    return (MallAffiliateClick as any).markExpiredClicks();
  }

  /**
   * Validate click for conversion (check if click exists and is valid)
   */
  async validateClickForConversion(clickId: string): Promise<{
    valid: boolean;
    click?: IMallAffiliateClick;
    error?: string;
  }> {
    const click = await MallAffiliateClick.findOne({ clickId })
      .populate('brand', 'name slug cashback isActive');

    if (!click) {
      return { valid: false, error: 'Click not found' };
    }

    if (click.status === 'converted') {
      return { valid: false, error: 'Click already converted' };
    }

    if (click.status === 'expired') {
      return { valid: false, error: 'Click has expired' };
    }

    if (new Date() > click.expiresAt) {
      return { valid: false, error: 'Click attribution window has passed' };
    }

    return { valid: true, click };
  }
}

export default new MallAffiliateService();
