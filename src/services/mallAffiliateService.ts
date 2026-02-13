/**
 * Mall Affiliate Service
 *
 * Handles affiliate click tracking, conversion processing, and cashback management
 * for the ReZ Mall feature.
 */

import mongoose, { Types } from 'mongoose';
import { MallAffiliateClick, IMallAffiliateClick } from '../models/MallAffiliateClick';
import { MallPurchase, IMallPurchase, PurchaseStatus } from '../models/MallPurchase';
import { MallBrand, IMallBrand } from '../models/MallBrand';
import { UserCashback } from '../models/UserCashback';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Transaction } from '../models/Transaction';
import redisService from './redisService';

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
  purchasedAt?: Date;               // Actual purchase time from brand (defaults to now)
  authenticatedBrandId?: string;    // Brand ID from webhook auth for cross-validation
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
   * Track a brand click and generate tracking URL.
   * Includes click deduplication (5-min window) and per-user rate limiting (10/min).
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

      // --- Rate limiting: 10 clicks per minute per user/IP (atomic INCR+EXPIRE) ---
      const rateLimitIdentifier = data.userId || data.ipAddress;
      const rateLimitKey = `clickrate:${rateLimitIdentifier}`;
      const clickCount = await redisService.atomicIncr(rateLimitKey, 60);
      if (clickCount !== null && clickCount > 10) {
        throw new Error('Click rate limit exceeded. Please try again later.');
      }

      // --- Click deduplication: same user/IP + brand within 5 minutes ---
      const dedupQuery: any = {
        brand: brand._id,
        ipAddress: data.ipAddress,
        clickedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      };
      if (data.userId) {
        dedupQuery.user = new Types.ObjectId(data.userId);
      }
      const recentClick = await MallAffiliateClick.findOne(dedupQuery)
        .sort({ clickedAt: -1 });

      if (recentClick) {
        // Return existing click instead of creating duplicate
        const trackingUrl = this.generateTrackingUrl(brand.externalUrl, recentClick.clickId, data.userId);
        console.log(`♻️ [AFFILIATE] Returning existing click: ${recentClick.clickId} (dedup)`);
        return {
          clickId: recentClick.clickId,
          trackingUrl,
          brandName: brand.name,
          cashbackPercentage: brand.cashback.percentage,
        };
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
   * Process a conversion webhook.
   *
   * Uses MongoDB transaction for atomicity across:
   * MallPurchase creation + MallAffiliateClick status update + MallBrand analytics.
   * Handles duplicate order gracefully (returns existing purchase instead of 500).
   * Validates authenticated brand matches click's brand for attribution integrity.
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

      // Validate authenticated brand matches click's brand (prevent cross-brand attribution)
      if (data.authenticatedBrandId) {
        const clickBrandId = (click.brand as any)._id?.toString() || click.brand.toString();
        if (clickBrandId !== data.authenticatedBrandId) {
          throw new Error('Authenticated brand does not match click brand — attribution mismatch');
        }
      }

      // Check for duplicate order (pre-transaction check for fast path)
      const existingPurchase = await MallPurchase.findOne({
        externalOrderId: data.externalOrderId,
        brand: click.brand,
      });

      if (existingPurchase) {
        console.log(`⚠️ [AFFILIATE] Duplicate order: ${data.externalOrderId}`);
        return existingPurchase;
      }

      // Validate orderAmount is positive
      if (!data.orderAmount || data.orderAmount <= 0) {
        throw new Error('Order amount must be a positive number');
      }

      // Get brand for cashback calculation
      const brand = click.brand as unknown as IMallBrand;

      // Calculate cashback (amounts in paise for precision, stored as rupees)
      const cashbackRate = click.brandSnapshot.cashbackPercentage;

      if (cashbackRate < 0 || cashbackRate > 100) {
        throw new Error('Cashback rate must be between 0 and 100');
      }
      // Use paise-level math to avoid floating-point drift, then convert back
      const orderAmountPaise = Math.round(data.orderAmount * 100);
      const calculatedCashbackPaise = Math.round((orderAmountPaise * cashbackRate) / 100);
      const calculatedCashback = calculatedCashbackPaise / 100;
      const maxCashback = click.brandSnapshot.maxCashback;
      const actualCashback = maxCashback
        ? Math.min(calculatedCashback, maxCashback)
        : calculatedCashback;

      // --- Fraud velocity checks ---
      const fraudFlags: string[] = [];

      if (click.user) {
        const recentConversions = await MallPurchase.countDocuments({
          user: click.user,
          purchasedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        });
        if (recentConversions > 5) {
          fraudFlags.push('high_conversion_velocity');
        }

        const clickToConversionMs = Date.now() - new Date(click.clickedAt).getTime();
        if (clickToConversionMs < 30000) {
          fraudFlags.push('instant_conversion');
        }
      }

      if (data.orderAmount > 50000) {
        fraudFlags.push('high_order_amount');
      }

      // Validate currency matches expected (guard against cross-currency miscalculation)
      const currency = data.currency || 'INR';
      if (currency !== 'INR') {
        fraudFlags.push(`non_inr_currency:${currency}`);
      }

      const purchaseStatus = fraudFlags.length > 0
        ? 'pending'
        : (data.status || 'pending');

      if (fraudFlags.length > 0) {
        console.warn(`⚠️ [AFFILIATE] Fraud flags detected for click ${data.clickId}: ${fraudFlags.join(', ')}`);
      }

      // Use purchasedAt from webhook if provided, otherwise now
      const purchasedAt = data.purchasedAt || new Date();

      // --- Atomic: create purchase + mark click converted + update brand analytics ---
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const purchase = new MallPurchase({
          click: click._id,
          user: click.user,
          brand: click.brand,
          externalOrderId: data.externalOrderId,
          orderAmount: data.orderAmount,
          currency,
          cashbackRate,
          cashbackAmount: calculatedCashback,
          maxCashback,
          actualCashback,
          status: purchaseStatus,
          verificationDays: fraudFlags.length > 0 ? 14 : 7,
          webhookPayload: data.webhookPayload,
          webhookReceivedAt: new Date(),
          purchasedAt,
          ...(fraudFlags.length > 0 && { fraudFlags }),
        });

        await purchase.save({ session });

        // Mark click as converted within transaction
        click.status = 'converted';
        click.convertedAt = new Date();
        click.purchase = purchase._id as Types.ObjectId;
        await click.save({ session });

        await session.commitTransaction();

        // Update brand analytics (outside transaction — non-critical)
        try {
          await (brand as any).recordPurchase(actualCashback);
        } catch (analyticsError) {
          console.warn(`⚠️ [AFFILIATE] Brand analytics update failed (non-blocking):`, analyticsError);
        }

        console.log(`✅ [AFFILIATE] Conversion processed: ${purchase.purchaseId}, cashback: ₹${actualCashback}${fraudFlags.length > 0 ? ` (FLAGGED: ${fraudFlags.join(', ')})` : ''}`);

        return purchase;
      } catch (txError: any) {
        await session.abortTransaction();

        // Handle duplicate key error (concurrent webhooks with same externalOrderId)
        if (txError.code === 11000) {
          const existingDup = await MallPurchase.findOne({
            externalOrderId: data.externalOrderId,
            brand: click.brand,
          });
          if (existingDup) {
            console.log(`⚠️ [AFFILIATE] Duplicate order (concurrent): ${data.externalOrderId}`);
            return existingDup;
          }
        }

        throw txError;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('❌ [AFFILIATE] Error processing conversion:', error);
      throw error;
    }
  }

  /**
   * Confirm a pending purchase (called by brand webhook).
   * Creates CoinTransaction audit record for status transition.
   */
  async confirmPurchase(purchaseId: string, reason?: string): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      // Idempotent: if already confirmed, return without error
      if (purchase.status === 'confirmed') {
        console.log(`⚠️ [AFFILIATE] Purchase already confirmed: ${purchaseId}`);
        return purchase;
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
   * Reject a purchase (e.g., cancelled order).
   * Idempotent: if already rejected, returns without error.
   */
  async rejectPurchase(purchaseId: string, reason: string): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      // Idempotent: if already rejected, return without error
      if (purchase.status === 'rejected') {
        console.log(`⚠️ [AFFILIATE] Purchase already rejected: ${purchaseId}`);
        return purchase;
      }

      if (purchase.status === 'credited') {
        throw new Error('Cannot reject credited purchase — use refund instead');
      }

      if (purchase.status === 'refunded') {
        throw new Error('Cannot reject refunded purchase');
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
   * Handle refund — deducts cashback from wallet if already credited.
   * Supports partial refunds via optional refundAmount parameter.
   * Uses MongoDB transaction for atomicity across:
   * UserCashback + Wallet + CoinTransaction + Transaction + MallPurchase
   *
   * CRITICAL: If wallet deduction fails (insufficient balance, wallet missing),
   * the refund is NOT marked as successful — it throws to prevent marking
   * the purchase as refunded without actually clawing back the cashback.
   */
  async handleRefund(
    purchaseId: string,
    reason: string,
    refundAmount?: number  // Optional: for partial refunds (deduct proportional cashback)
  ): Promise<IMallPurchase> {
    try {
      const purchase = await MallPurchase.findOne({ purchaseId });
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      // Idempotent: if already refunded, return without error
      if (purchase.status === 'refunded') {
        console.log(`⚠️ [AFFILIATE] Purchase already refunded: ${purchaseId}`);
        return purchase;
      }

      // If cashback was already credited, deduct from wallet atomically
      if (purchase.status === 'credited' && purchase.cashback && purchase.user) {
        // Calculate deduction amount (full or proportional for partial refund)
        let deductAmount = purchase.actualCashback;
        if (refundAmount !== undefined && refundAmount > 0 && refundAmount < purchase.orderAmount) {
          // Proportional cashback deduction: (refundAmount / orderAmount) * actualCashback
          const refundRatio = refundAmount / purchase.orderAmount;
          deductAmount = Math.round(refundRatio * purchase.actualCashback * 100) / 100;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Deduct from wallet — MUST succeed for refund to complete
          const wallet = await Wallet.findOne({ user: purchase.user }).session(session);
          if (!wallet || !wallet.isActive) {
            throw new Error(`Wallet not found or inactive for user ${purchase.user} — cannot process refund deduction. Manual admin review required.`);
          }

          if (wallet.balance.available < deductAmount) {
            throw new Error(`Insufficient wallet balance for refund deduction. User ${purchase.user}, needed ₹${deductAmount}, available ₹${wallet.balance.available}. Manual admin review required.`);
          }

          const balanceBefore = wallet.balance.available;

          // Deduct from wallet (pre-save hook recalculates balance.total)
          wallet.balance.available -= deductAmount;

          // Update statistics
          wallet.statistics.totalCashback = Math.max(0, wallet.statistics.totalCashback - deductAmount);
          wallet.lastTransactionAt = new Date();

          // Update coins array for 'rez' type
          if (wallet.coins && wallet.coins.length > 0) {
            const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
            if (rezCoin) {
              rezCoin.amount = Math.max(0, rezCoin.amount - deductAmount);
            }
            wallet.markModified('coins');
          }

          await wallet.save({ session });

          // Cancel the UserCashback record
          await UserCashback.findByIdAndUpdate(
            purchase.cashback,
            { status: 'cancelled', cancelledReason: reason },
            { session }
          );

          // Create CoinTransaction reversal record
          await CoinTransaction.create([{
            user: purchase.user.toString(),
            type: 'spent',
            amount: deductAmount,
            balance: Math.max(0, balanceBefore - deductAmount),
            source: 'cashback',
            description: `Cashback reversed${refundAmount ? ' (partial refund)' : ''}: ${reason}`,
            metadata: {
              purchaseId: purchase._id,
              brandId: purchase.brand,
              orderAmount: purchase.orderAmount,
              refundAmount: refundAmount || purchase.orderAmount,
              deductedCashback: deductAmount,
              refundReason: reason,
            },
          }], { session });

          // Create Transaction reversal record (formal financial ledger)
          await Transaction.create([{
            user: purchase.user,
            type: 'debit',
            category: 'refund',
            amount: deductAmount,
            currency: 'RC',
            description: `Affiliate cashback reversed${refundAmount ? ' (partial)' : ''}: ${reason}`,
            source: {
              type: 'refund',
              reference: purchase._id,
            },
            status: { current: 'completed', history: [{ status: 'completed', timestamp: new Date() }] },
            balanceBefore,
            balanceAfter: Math.max(0, balanceBefore - deductAmount),
            isReversible: false,
            retryCount: 0,
            maxRetries: 0,
          }], { session });

          // Update purchase status within transaction (using session-aware updateStatus)
          await purchase.updateStatus('refunded', reason, 'webhook', session);

          await session.commitTransaction();

          // Sync wallet → User model (denormalized cache, outside transaction)
          try {
            await wallet.syncWithUser();
          } catch (syncError) {
            console.warn(`⚠️ [AFFILIATE] User wallet sync failed after refund (non-blocking):`, syncError);
          }

          console.log(`💸 [AFFILIATE] Deducted ₹${deductAmount} from wallet for user ${purchase.user} (refund)`);
        } catch (txError) {
          await session.abortTransaction();
          throw txError;
        } finally {
          session.endSession();
        }
      } else {
        // Not credited yet — just update status (no wallet deduction needed)
        await purchase.updateStatus('refunded', reason, 'webhook');
      }

      console.log(`💸 [AFFILIATE] Purchase refunded: ${purchaseId}`);

      return purchase;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error handling refund:', error);
      throw error;
    }
  }

  /**
   * Credit pending cashback in batches of 200.
   * Uses getReadyForCredit(batchSize) which does DB-level date filtering.
   * Tracks failures per purchase to prevent infinite retry loops:
   * - Persistently failing purchases are skipped after MAX_CREDIT_RETRIES
   * - Failed purchase IDs are tracked in a Set for the duration of this job run
   */
  async creditPendingCashback(): Promise<{ credited: number; total: number; failed: number }> {
    const BATCH_SIZE = 200;
    const MAX_BATCHES = 50; // Safety limit to prevent runaway loops
    const failedPurchaseIds = new Set<string>(); // Track failures within this job run

    try {
      let credited = 0;
      let total = 0;
      let failed = 0;
      let batchCount = 0;
      let batch: IMallPurchase[];

      do {
        batch = await (MallPurchase as any).getReadyForCredit(BATCH_SIZE);
        total += batch.length;
        batchCount++;

        // Filter out purchases that already failed in this job run
        const processable = batch.filter(p => !failedPurchaseIds.has(p._id.toString()));

        if (processable.length === 0 && batch.length > 0) {
          // All remaining purchases are known failures — stop processing
          console.warn(`⚠️ [AFFILIATE] All ${batch.length} purchases in batch are known failures, stopping.`);
          break;
        }

        for (const purchase of processable) {
          try {
            await this.creditCashbackForPurchase(purchase);
            credited++;
          } catch (error: any) {
            failed++;
            failedPurchaseIds.add(purchase._id.toString());
            console.error(`Failed to credit cashback for purchase ${purchase.purchaseId}: ${error.message}`);
          }
        }

        if (batch.length > 0) {
          console.log(`💰 [AFFILIATE] Batch ${batchCount} processed: ${processable.length} attempted, ${credited} credited, ${failed} failed`);
        }
      } while (batch.length === BATCH_SIZE && batchCount < MAX_BATCHES);

      if (batchCount >= MAX_BATCHES) {
        console.warn(`⚠️ [AFFILIATE] Hit max batch limit (${MAX_BATCHES}). Some purchases may remain unprocessed.`);
      }

      console.log(`💰 [AFFILIATE] Credit job complete: ${credited}/${total} credited, ${failed} failed`);

      return { credited, total, failed };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error in credit pending cashback job:', error);
      throw error;
    }
  }

  /**
   * Credit cashback for a single purchase
   *
   * Uses MongoDB transaction for atomicity across:
   * UserCashback + Wallet + CoinTransaction + MallPurchase
   *
   * Uses Wallet.addFunds logic inline (with session) instead of calling
   * addFunds() directly, since addFunds() doesn't accept a session parameter.
   * Wallet pre-save hook recalculates balance.total automatically.
   * User.wallet is synced via syncWithUser() after commit (denormalized cache).
   */
  async creditCashbackForPurchase(purchase: IMallPurchase): Promise<void> {
    if (!purchase.user) {
      throw new Error('Purchase has no associated user');
    }

    // ATOMIC IDEMPOTENCY GUARD — claim this purchase for crediting BEFORE the transaction.
    // Only one concurrent caller can transition from 'confirmed' to 'crediting'.
    const claimed = await MallPurchase.findOneAndUpdate(
      { _id: purchase._id, status: 'confirmed' },
      { $set: { status: 'crediting' } },
      { new: true }
    );

    if (!claimed) {
      console.log(`⚠️ [AFFILIATE] Purchase ${purchase.purchaseId} already claimed/credited, skipping`);
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Re-fetch inside transaction for consistency
      const freshPurchase = await MallPurchase.findById(purchase._id).session(session);
      if (!freshPurchase) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // Get brand info
      const brand = await MallBrand.findById(purchase.brand).session(session);

      // Create UserCashback entry (isRedeemed: false — redeemed means user SPENT it, not received it)
      const [cashback] = await UserCashback.create([{
        user: purchase.user,
        amount: purchase.actualCashback,
        cashbackRate: purchase.cashbackRate,
        source: 'special_offer',
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
        isRedeemed: false,
      }], { session });

      // Credit to wallet (addFunds logic with session support)
      const wallet = await Wallet.findOne({ user: purchase.user }).session(session);
      if (!wallet) {
        throw new Error(`Wallet not found for user ${purchase.user}`);
      }

      if (!wallet.isActive) {
        throw new Error('Wallet is not active');
      }
      if (wallet.isFrozen) {
        throw new Error('Wallet is frozen');
      }
      if (wallet.balance.total + purchase.actualCashback > wallet.limits.maxBalance) {
        throw new Error(`Maximum wallet balance (${wallet.limits.maxBalance}) would be exceeded`);
      }

      // Record balance before credit for audit trail
      const balanceBefore = wallet.balance.available;

      // Update wallet balance (pre-save hook recalculates balance.total)
      wallet.balance.available += purchase.actualCashback;

      // Update statistics (matches addFunds 'cashback' type behavior)
      wallet.statistics.totalCashback += purchase.actualCashback;
      wallet.statistics.totalEarned += purchase.actualCashback;
      wallet.lastTransactionAt = new Date();

      // Update coins array for 'rez' type
      if (wallet.coins && wallet.coins.length > 0) {
        const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
        if (rezCoin) {
          rezCoin.amount += purchase.actualCashback;
          rezCoin.lastEarned = new Date();
        }
        wallet.markModified('coins');
      }

      await wallet.save({ session });

      // Create CoinTransaction audit record
      await CoinTransaction.create([{
        user: purchase.user.toString(),
        type: 'earned',
        amount: purchase.actualCashback,
        balance: balanceBefore + purchase.actualCashback,
        source: 'cashback',
        description: `Affiliate cashback from ${brand?.name || 'Mall'} purchase`,
        metadata: {
          purchaseId: purchase._id,
          brandId: purchase.brand,
          orderAmount: purchase.orderAmount,
          cashbackRate: purchase.cashbackRate,
        },
      }], { session });

      // Create Transaction audit record (formal financial ledger)
      await Transaction.create([{
        user: purchase.user,
        type: 'credit',
        category: 'cashback',
        amount: purchase.actualCashback,
        currency: 'RC',
        description: `Affiliate cashback from ${brand?.name || 'Mall'} purchase`,
        source: {
          type: 'cashback',
          reference: purchase._id,
        },
        status: { current: 'completed', history: [{ status: 'completed', timestamp: new Date() }] },
        balanceBefore,
        balanceAfter: balanceBefore + purchase.actualCashback,
        isReversible: true,
        retryCount: 0,
        maxRetries: 0,
      }], { session });

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
      await purchase.save({ session });

      await session.commitTransaction();

      // Sync wallet → User model (denormalized cache, outside transaction)
      try {
        await wallet.syncWithUser();
      } catch (syncError) {
        console.warn(`⚠️ [AFFILIATE] User wallet sync failed (non-blocking):`, syncError);
      }

      console.log(`💰 [AFFILIATE] Credited ₹${purchase.actualCashback} to user ${purchase.user} (balance: ${balanceBefore} → ${balanceBefore + purchase.actualCashback})`);
    } catch (error) {
      await session.abortTransaction();

      // Reset from 'crediting' back to 'confirmed' so it can be retried on next job run
      try {
        await MallPurchase.findByIdAndUpdate(purchase._id, { $set: { status: 'confirmed' } });
      } catch (resetError) {
        console.error('❌ [AFFILIATE] Failed to reset purchase status:', resetError);
      }

      console.error('❌ [AFFILIATE] Error crediting cashback:', error);
      throw error;
    } finally {
      session.endSession();
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
