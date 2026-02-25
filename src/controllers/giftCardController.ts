import { Request, Response } from 'express';
import { GiftCard, UserGiftCard } from '../models/GiftCard';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logTransaction } from '../models/TransactionAuditLog';
import mongoose from 'mongoose';
import { validateAmount } from '../utils/walletValidation';
import { checkVelocity } from '../services/walletVelocityService';

/**
 * @desc    Get gift card catalog
 * @route   GET /api/wallet/gift-cards/catalog
 * @access  Private
 */
export const getCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { category, search } = req.query;

  const query: any = { isActive: true };
  if (category && category !== 'all') query.category = category;
  if (search) query.$text = { $search: search as string };

  const giftCards = await GiftCard.find(query)
    .select('-__v')
    .sort({ cashbackPercentage: -1 })
    .lean();

  const categories = await GiftCard.distinct('category', { isActive: true });

  sendSuccess(res, { giftCards, categories }, 'Gift card catalog retrieved');
});

/**
 * @desc    Purchase a gift card
 * @route   POST /api/wallet/gift-cards/purchase
 * @access  Private
 */
export const purchaseGiftCard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { giftCardId, amount } = req.body;

  if (!userId) return sendError(res, 'User not authenticated', 401);
  if (!giftCardId) return sendBadRequest(res, 'Gift card ID is required');
  const amountCheck = validateAmount(amount, { fieldName: 'Gift card amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  // Velocity check
  const velocityResult = await checkVelocity(userId, 'spend');
  if (!velocityResult.allowed) {
    return sendBadRequest(res, `Gift card purchase rate limit exceeded. Try again in ${Math.ceil(velocityResult.resetInSeconds / 60)} minutes.`);
  }

  // Find gift card template
  const giftCard = await GiftCard.findOne({ _id: giftCardId, isActive: true });
  if (!giftCard) return sendBadRequest(res, 'Gift card not available');

  // Validate denomination
  if (!giftCard.denominations.includes(validatedAmount)) {
    return sendBadRequest(res, `Invalid amount. Available: ${giftCard.denominations.join(', ')}`);
  }

  // Check wallet balance
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) return sendError(res, 'Wallet not found', 404);
  if (wallet.isFrozen) return sendBadRequest(res, 'Wallet is frozen');
  if (wallet.balance.available < validatedAmount) return sendBadRequest(res, 'Insufficient balance');

  // Calculate cashback upfront so debit + cashback can be atomic
  const cashback = Math.floor(validatedAmount * giftCard.cashbackPercentage / 100);
  const netDebit = validatedAmount - cashback;

  // Deduct from wallet atomically (debit + cashback in single write)
  const debitResult = await Wallet.findOneAndUpdate(
    {
      _id: wallet._id,
      isFrozen: false,
      'balance.available': { $gte: validatedAmount }
    },
    {
      $inc: {
        'balance.available': -netDebit,
        'balance.total': -netDebit,
        ...(cashback > 0 ? { 'balance.cashback': cashback } : {}),
        'statistics.totalSpent': validatedAmount,
        ...(cashback > 0 ? { 'statistics.totalCashback': cashback } : {})
      },
      $set: { lastTransactionAt: new Date() }
    },
    { new: true }
  );

  if (!debitResult) return sendBadRequest(res, 'Insufficient balance or wallet is frozen');

  // Create user gift card
  const userGiftCard = await UserGiftCard.create({
    user: userId,
    giftCard: giftCard._id,
    amount: validatedAmount,
    balance: validatedAmount,
    expiresAt: new Date(Date.now() + giftCard.validityDays * 24 * 60 * 60 * 1000),
    status: 'active'
  });

  // Update gift card stats
  await GiftCard.findByIdAndUpdate(giftCard._id, { $inc: { totalIssued: 1 } });

  // Audit log
  logTransaction({
    userId: new mongoose.Types.ObjectId(userId),
    walletId: wallet._id as mongoose.Types.ObjectId,
    walletType: 'user',
    operation: 'debit',
    amount: validatedAmount,
    balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
    balanceAfter: { total: debitResult.balance.total, available: debitResult.balance.available, pending: 0, cashback: 0 },
    reference: { type: 'other', id: String(userGiftCard._id), description: `Purchased ${giftCard.name} gift card` }
  });

  // Create CoinTransaction (source of truth for auto-sync)
  try {
    await CoinTransaction.createTransaction(
      userId,
      'spent',
      netDebit,
      'purchase',
      `Purchased ${giftCard.name} gift card`,
      { giftCardId: giftCard._id, userGiftCardId: userGiftCard._id, cashback }
    );
  } catch (ctxError) {
    console.error('❌ [GIFT-CARD] Failed to create CoinTransaction:', ctxError);
  }

  sendSuccess(res, {
    userGiftCard: {
      id: String(userGiftCard._id),
      giftCardName: giftCard.name,
      giftCardLogo: giftCard.logo,
      giftCardColor: giftCard.color,
      amount: validatedAmount,
      balance: validatedAmount,
      expiresAt: userGiftCard.expiresAt,
      status: 'active',
      cashbackEarned: cashback,
    }
  }, `Gift card purchased! ${cashback > 0 ? `+${cashback} NC cashback earned.` : ''}`);
});

/**
 * @desc    Get user's purchased gift cards
 * @route   GET /api/wallet/gift-cards/mine
 * @access  Private
 */
export const getMyGiftCards = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status } = req.query;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  const query: any = { user: userId };
  if (status && status !== 'all') query.status = status;

  const cards = await UserGiftCard.find(query)
    .sort({ createdAt: -1 })
    .populate('giftCard', 'name logo color category')
    .lean();

  // Mask codes — only show last 4 chars
  const maskedCards = cards.map((card: any) => ({
    ...card,
    code: '****-****-' + (card.code?.slice(-4) || '????'),
    pin: card.pin ? '****' : undefined,
  }));

  sendSuccess(res, { giftCards: maskedCards }, 'Gift cards retrieved');
});

/**
 * @desc    Reveal gift card code (sensitive — could add OTP gate)
 * @route   GET /api/wallet/gift-cards/:id/reveal
 * @access  Private
 */
export const revealGiftCardCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  const card = await UserGiftCard.findOne({ _id: id, user: userId });
  if (!card) return sendBadRequest(res, 'Gift card not found');

  // Reveal decrypted code
  const code = (card as any).revealCode();

  sendSuccess(res, { code, pin: card.pin ? 'Contact support for PIN' : undefined }, 'Code revealed');
});
