import { MiniGame } from '../models/MiniGame';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

interface SpinResult {
  prize: string;
  type: 'coins' | 'cashback' | 'discount' | 'voucher';
  value: number;
}

interface SpinReward {
  segment: number;
  prize: string;
  type: 'coins' | 'cashback' | 'discount' | 'voucher';
  value: number;
  weight: number;
  color: string;
}

const SPIN_WHEEL_PRIZES: SpinReward[] = [
  { segment: 1, prize: '50 Coins', type: 'coins', value: 50, weight: 20, color: '#10B981' },
  { segment: 2, prize: '100 Coins', type: 'coins', value: 100, weight: 15, color: '#3B82F6' },
  { segment: 3, prize: '5% Cashback', type: 'cashback', value: 5, weight: 15, color: '#F59E0B' },
  { segment: 4, prize: '200 Coins', type: 'coins', value: 200, weight: 10, color: '#10B981' },
  { segment: 5, prize: '10% Discount', type: 'discount', value: 10, weight: 15, color: '#EC4899' },
  { segment: 6, prize: '500 Coins', type: 'coins', value: 500, weight: 5, color: '#8B5CF6' },
  { segment: 7, prize: '₹50 Voucher', type: 'voucher', value: 50, weight: 10, color: '#F59E0B' },
  { segment: 8, prize: '1000 Coins', type: 'coins', value: 1000, weight: 2, color: '#EF4444' }
];

const COOLDOWN_HOURS = 24;

/**
 * Check if user is eligible to spin the wheel
 */
export async function checkEligibility(userId: string): Promise<{
  eligible: boolean;
  nextAvailableAt?: Date;
  reason?: string;
}> {
  const lastSpin = await MiniGame.findOne({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed'
  }).sort({ completedAt: -1 });

  if (!lastSpin || !lastSpin.completedAt) {
    return { eligible: true };
  }

  const nextAvailable = new Date(lastSpin.completedAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
  const now = new Date();

  if (now < nextAvailable) {
    return {
      eligible: false,
      nextAvailableAt: nextAvailable,
      reason: `Cooldown active. Next spin available at ${nextAvailable.toLocaleString()}`
    };
  }

  return { eligible: true };
}

/**
 * Create a new spin wheel session
 *
 * ✅ FIX: Removed cooldown check - daily limit is now checked in spinWheel endpoint
 * This function just creates a session record. Eligibility is checked by the caller.
 */
export async function createSpinSession(userId: string): Promise<any> {
  // ✅ REMOVED: Cooldown eligibility check (lines 70-73)
  // The spinWheel endpoint now checks daily limit (3 spins per day) before calling this
  // This prevents the conflict between 24h cooldown and daily reset at midnight

  // Expire old active sessions
  await MiniGame.updateMany(
    {
      user: userId,
      gameType: 'spin_wheel',
      status: 'active'
    },
    {
      status: 'expired'
    }
  );

  // Create new session (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const session = await MiniGame.create({
    user: userId,
    gameType: 'spin_wheel',
    status: 'active',
    expiresAt,
    metadata: {
      created: new Date()
    }
  });

  return {
    sessionId: session._id,
    expiresAt,
    prizes: SPIN_WHEEL_PRIZES.map(p => ({
      segment: p.segment,
      prize: p.prize,
      color: p.color
    }))
  };
}

/**
 * Select a prize based on weighted probability
 */
export async function selectPrize(): Promise<SpinResult> {
  const totalWeight = SPIN_WHEEL_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let random = Math.random() * totalWeight;

  for (const prize of SPIN_WHEEL_PRIZES) {
    random -= prize.weight;
    if (random <= 0) {
      return {
        prize: prize.prize,
        type: prize.type,
        value: prize.value
      };
    }
  }

  // Fallback to first prize
  return {
    prize: SPIN_WHEEL_PRIZES[0].prize,
    type: SPIN_WHEEL_PRIZES[0].type,
    value: SPIN_WHEEL_PRIZES[0].value
  };
}

/**
 * Spin the wheel and award prize
 */
export async function spin(sessionId: string): Promise<any> {
  const session = await MiniGame.findById(sessionId);

  if (!session) {
    throw new Error('Spin session not found');
  }

  if (session.status === 'completed') {
    throw new Error('Spin already completed');
  }

  if (session.status === 'expired') {
    throw new Error('Spin session has expired');
  }

  // Check if session expired
  if (new Date() > session.expiresAt) {
    session.status = 'expired';
    await session.save();
    throw new Error('Spin session has expired');
  }

  // Select prize
  const result = await selectPrize();

  // Find segment number
  const prizeConfig = SPIN_WHEEL_PRIZES.find(p => p.prize === result.prize);

  // Award prize and get coupon metadata (if applicable)
  const couponMetadata = await awardSpinPrize(session.user.toString(), result);

  // Update session
  session.status = 'completed';
  session.completedAt = new Date();
  session.reward = {
    [result.type]: result.value
  };
  session.metadata = {
    ...session.metadata,
    segment: prizeConfig?.segment || 1,
    prize: result.prize,
    // ✅ NEW: Store coupon metadata in session for history
    couponMetadata: couponMetadata || null
  };

  await session.save();

  return {
    sessionId: session._id,
    prize: result.prize,
    segment: prizeConfig?.segment || 1,
    type: result.type,
    value: result.value,
    reward: session.reward,
    // ✅ NEW: Include coupon metadata for frontend display
    couponMetadata: couponMetadata || null
  };
}

/**
 * Award the spin prize to user
 * Returns coupon metadata for frontend display (or null for coins)
 */
export async function awardSpinPrize(userId: string, prize: SpinResult): Promise<any | null> {
  if (prize.type === 'coins') {
    // ✅ FIX: Award coins to BOTH CoinTransaction AND Wallet (for sync)
    // This ensures both homepage (uses Wallet) and gamification (uses CoinTransaction) show correct balance

    // 1. Add to CoinTransaction (for gamification tracking)
    await CoinTransaction.createTransaction(
      userId,
      'earned',
      prize.value,
      'spin_wheel',
      `Won ${prize.value} coins from Spin Wheel`
    );

    // 2. Add to Wallet rez coins (for homepage display)
    const { Wallet } = await import('../models/Wallet');
    const wallet = await Wallet.findOne({ user: userId });

    if (wallet) {
      // Find or create rez coin entry
      let rezCoin = wallet.coins.find(c => c.type === 'rez');

      if (!rezCoin) {
        // Create new rez coin entry
        wallet.coins.push({
          type: 'rez',
          amount: prize.value,
          isActive: true,
          earnedDate: new Date(),
          color: '#00C06A'
        });
      } else {
        // Update existing rez coin amount
        rezCoin.amount += prize.value;
      }

      // Update balance and statistics
      wallet.balance.available += prize.value;
      wallet.balance.total += prize.value;
      wallet.statistics.totalEarned += prize.value;
      wallet.lastTransactionAt = new Date();

      await wallet.save();
      console.log(`💰 [SPIN_WHEEL] Added ${prize.value} coins to wallet. New balance: ${wallet.balance.total}`);
    } else {
      console.warn(`⚠️ [SPIN_WHEEL] Wallet not found for user ${userId}, skipping wallet update`);
    }

    // Coins don't have coupon metadata
    return null;
  } else if (prize.type === 'cashback') {
    // ✅ NEW: Award cashback with smart store assignment (always store-wide for better UX)
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
    const validFrom = new Date();

    // Get random store (always store-wide for cashback)
    const applicability = await getCouponApplicability(true); // Force store-wide

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'cashback',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'cashback',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create cashback coupon with store assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_CB_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'PERCENTAGE',
      discountValue: prize.value,
      minOrderValue: 100, // Minimum ₹100 order
      maxDiscountCap: prize.value === 5 ? 50 : prize.value === 10 ? 100 : 200,
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: [
        `Valid for 30 days from date of winning`,
        applicabilityText,
        'Minimum order value of ₹100',
        'Cashback will be credited to wallet after delivery',
        'Cannot be combined with other offers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'cashback', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: false, // Cashback is always store-wide
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: null,
        productId: null,
        productImage: null
      }
    });

    // Assign coupon to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    console.log(`✅ [SPIN_WHEEL] Awarded ${prize.value}% cashback coupon to user ${userId}`);
    console.log(`   📍 ${applicabilityText}`);
    console.log(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  } else if (prize.type === 'discount') {
    // ✅ NEW: Award discount with smart store/product assignment
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
    const validFrom = new Date();

    // Get random store/product assignment
    const applicability = await getCouponApplicability(false); // Allow product-specific

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'discount',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'discount',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create discount coupon with proper assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_${prize.value}OFF_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'PERCENTAGE',
      discountValue: prize.value,
      minOrderValue: applicability.isProductSpecific ? 0 : 200, // No minimum for product-specific
      maxDiscountCap: prize.value === 10 ? 100 : prize.value === 15 ? 150 : 250,
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: applicability.isProductSpecific && applicability.productId ? [applicability.productId] : [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: [
        `Valid for 30 days from date of winning`,
        applicabilityText,
        applicability.isProductSpecific ? 'Valid only on the specified product' : `Minimum order value of ₹200`,
        'Cannot be combined with other offers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'discount', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: applicability.isProductSpecific,
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: applicability.productName || null,
        productId: applicability.productId || null,
        productImage: applicability.productImage || null
      }
    });

    // Assign coupon to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    console.log(`✅ [SPIN_WHEEL] Awarded ${prize.value}% discount coupon to user ${userId}`);
    console.log(`   📍 ${applicabilityText}`);
    console.log(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  } else if (prize.type === 'voucher') {
    // ✅ NEW: Award voucher with smart store assignment (always store-wide)
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 60); // 60 days validity for vouchers
    const validFrom = new Date();

    // Get random store (always store-wide for vouchers)
    const applicability = await getCouponApplicability(true); // Force store-wide

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'voucher',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'voucher',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create voucher with store assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_VCH${prize.value}_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'FIXED',
      discountValue: prize.value,
      minOrderValue: prize.value * 2, // Minimum 2x voucher value
      maxDiscountCap: prize.value, // Fixed amount
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 10, // Higher priority for vouchers
      status: 'active',
      termsAndConditions: [
        `Valid for 60 days from date of winning`,
        applicabilityText,
        `Minimum order value of ₹${prize.value * 2}`,
        'Cannot be combined with other vouchers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'voucher', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: false, // Vouchers are always store-wide
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: null,
        productId: null,
        productImage: null
      }
    });

    // Assign voucher to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    console.log(`✅ [SPIN_WHEEL] Awarded ₹${prize.value} voucher to user ${userId}`);
    console.log(`   📍 ${applicabilityText}`);
    console.log(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  }

  // Fallback - should never reach here
  return null;
}

/**
 * Get user's spin wheel history
 */
export async function getSpinHistory(userId: string, limit: number = 10): Promise<any[]> {
  const sessions = await MiniGame.find({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed'
  })
    .sort({ completedAt: -1 })
    .limit(limit);

  return sessions.map(s => ({
    id: s._id,
    completedAt: s.completedAt,
    prize: s.metadata?.prize,
    segment: s.metadata?.segment,
    reward: s.reward
  }));
}

/**
 * Get spin wheel statistics for user
 */
export async function getSpinStats(userId: string): Promise<any> {
  const sessions = await MiniGame.find({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed'
  });

  const totalSpins = sessions.length;
  let totalCoinsWon = 0;
  let totalCashbackWon = 0;
  let totalDiscountsWon = 0;
  let totalVouchersWon = 0;

  sessions.forEach(session => {
    if (session.reward?.coins) totalCoinsWon += session.reward.coins;
    if (session.reward?.cashback) totalCashbackWon += session.reward.cashback;
    if (session.reward?.discount) totalDiscountsWon += session.reward.discount;
    if (session.reward?.voucher) totalVouchersWon += 1;
  });

  const eligibility = await checkEligibility(userId);

  return {
    totalSpins,
    totalCoinsWon,
    totalCashbackWon,
    totalDiscountsWon,
    totalVouchersWon,
    eligibility
  };
}

export default {
  checkEligibility,
  createSpinSession,
  selectPrize,
  spin,
  awardSpinPrize,
  getSpinHistory,
  getSpinStats
};
