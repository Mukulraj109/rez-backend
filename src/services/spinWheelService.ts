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
 */
export async function createSpinSession(userId: string): Promise<any> {
  // Check eligibility
  const eligibility = await checkEligibility(userId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Not eligible to spin');
  }

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

  // Award prize
  await awardSpinPrize(session.user.toString(), result);

  // Update session
  session.status = 'completed';
  session.completedAt = new Date();
  session.reward = {
    [result.type]: result.value
  };
  session.metadata = {
    ...session.metadata,
    segment: prizeConfig?.segment || 1,
    prize: result.prize
  };

  await session.save();

  return {
    sessionId: session._id,
    prize: result.prize,
    segment: prizeConfig?.segment || 1,
    type: result.type,
    value: result.value,
    reward: session.reward
  };
}

/**
 * Award the spin prize to user
 */
export async function awardSpinPrize(userId: string, prize: SpinResult): Promise<void> {
  if (prize.type === 'coins') {
    // Award coins via CoinTransaction
    await CoinTransaction.createTransaction(
      userId,
      'earned',
      prize.value,
      'spin_wheel',
      `Won ${prize.value} coins from Spin Wheel`
    );
  } else if (prize.type === 'cashback') {
    // TODO: Implement cashback awarding
    console.log(`Awarded ${prize.value}% cashback to user ${userId}`);
  } else if (prize.type === 'discount') {
    // TODO: Implement discount coupon creation
    console.log(`Awarded ${prize.value}% discount to user ${userId}`);
  } else if (prize.type === 'voucher') {
    // TODO: Implement voucher awarding
    console.log(`Awarded ₹${prize.value} voucher to user ${userId}`);
  }
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
