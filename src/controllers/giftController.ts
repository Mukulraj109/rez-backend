import { Request, Response } from 'express';
import { CoinGift } from '../models/CoinGift';
import { Wallet } from '../models/Wallet';
import { WalletConfig } from '../models/WalletConfig';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from '../services/ledgerService';
import mongoose from 'mongoose';
import { validateAmount } from '../utils/walletValidation';
import { checkVelocity } from '../services/walletVelocityService';
import { createServiceLogger } from '../config/logger';
import pushNotificationService from '../services/pushNotificationService';
import { giftSendTotal, giftClaimTotal, giftSendDuration, walletGiftAmount } from '../config/walletMetrics';

const logger = createServiceLogger('coin-gift');

/**
 * @desc    Get gift configuration (themes, denominations, limits)
 * @route   GET /api/wallet/gift/config
 * @access  Private
 */
export const getGiftConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await WalletConfig.getOrCreate();

  const activeThemes = (config.giftLimits.themes || [])
    .filter((t: any) => t.isActive)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((t: any) => ({
      id: t.id,
      label: t.label,
      emoji: t.emoji,
      colors: t.colors,
      tags: t.tags || [],
    }));

  sendSuccess(res, {
    themes: activeThemes,
    denominations: config.giftLimits.denominations || [50, 100, 250, 500, 1000, 2000],
    limits: {
      min: config.giftLimits.minAmount,
      max: config.giftLimits.perGiftMax,
      dailyMax: config.giftLimits.dailyMax,
      maxPerDay: config.giftLimits.maxGiftsPerDay,
      otpAbove: config.giftLimits.requireOtpAbove,
    },
    features: {
      scheduledDelivery: config.giftLimits.scheduledDeliveryEnabled ?? false,
      messageMaxLength: config.giftLimits.messageMaxLength ?? 150,
    },
  }, 'Gift configuration retrieved');
});

/**
 * @desc    Validate a gift recipient by phone number
 * @route   POST /api/wallet/gift/validate-recipient
 * @access  Private
 */
export const validateRecipient = asyncHandler(async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { phone } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);
  if (!phone) return sendBadRequest(res, 'Phone number is required');

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return sendBadRequest(res, 'Invalid phone number format');
  }

  const recipient = await User.findOne({ phoneNumber: { $regex: digitsOnly.slice(-10) + '$' } })
    .select('_id fullName phoneNumber')
    .lean();

  if (!recipient) {
    // Always return 200 to prevent phone enumeration
    return sendSuccess(res, { exists: false, isSelf: false }, 'Recipient lookup complete');
  }

  const isSelf = String(recipient._id) === senderId;

  // Mask name for privacy: "Mohammed Rahil" → "M***d R***l"
  let maskedName = '';
  if (recipient.fullName) {
    maskedName = recipient.fullName
      .split(' ')
      .map((word: string) => {
        if (word.length <= 2) return word;
        return word[0] + '***' + word[word.length - 1];
      })
      .join(' ');
  }

  sendSuccess(res, {
    exists: true,
    name: maskedName,
    isSelf,
  }, 'Recipient lookup complete');
});

/**
 * @desc    Send a coin gift
 * @route   POST /api/wallet/gift/send
 * @access  Private
 */
export const sendGift = asyncHandler(async (req: Request, res: Response) => {
  const endTimer = giftSendDuration.startTimer();
  const senderId = (req as any).userId;
  const { recipientPhone, recipientId, amount, coinType, theme, message, deliveryType, scheduledAt, idempotencyKey } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);
  const amountCheck = validateAmount(amount, { fieldName: 'Gift amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;
  if (!theme) return sendBadRequest(res, 'Gift theme is required');

  // Basic message moderation
  if (message) {
    const lowerMsg = message.toLowerCase();
    const blockedPatterns = [
      /\b(fuck|shit|ass|bitch|damn|dick|bastard|cunt|whore|slut)\b/i,
      /\b(kill|murder|die|threat|bomb|attack)\b/i,
    ];
    const isBlocked = blockedPatterns.some(p => p.test(lowerMsg));
    if (isBlocked) {
      return sendBadRequest(res, 'Gift message contains inappropriate content. Please revise.');
    }
  }

  // Idempotency check — handle duplicate/stuck/failed states
  if (idempotencyKey) {
    const existing = await CoinGift.findOne({ sender: senderId, idempotencyKey });
    if (existing) {
      // Already completed/delivered/claimed — return as duplicate
      if (['delivered', 'claimed'].includes(existing.status)) {
        return sendSuccess(res, {
          giftId: String(existing._id),
          status: existing.status,
          amount: existing.amount,
          theme: existing.theme,
          duplicate: true,
        });
      }
      // Failed/cancelled/expired — clear key so user can retry fresh
      if (['failed', 'cancelled', 'expired'].includes(existing.status)) {
        existing.idempotencyKey = undefined;
        await existing.save();
        // Fall through to create a new gift
      } else if (existing.status === 'pending') {
        // Pending (scheduled) — return as duplicate
        return sendSuccess(res, {
          giftId: String(existing._id),
          status: existing.status,
          amount: existing.amount,
          theme: existing.theme,
          duplicate: true,
        });
      }
    }
  }

  const config = await WalletConfig.getOrCreate();

  // Validate limits
  if (validatedAmount < config.giftLimits.minAmount) {
    return sendBadRequest(res, `Minimum gift amount is ${config.giftLimits.minAmount} NC`);
  }
  if (validatedAmount > config.giftLimits.perGiftMax) {
    return sendBadRequest(res, `Maximum gift amount is ${config.giftLimits.perGiftMax} NC`);
  }

  // Find recipient
  let recipient;
  if (recipientId) {
    recipient = await User.findById(recipientId);
  } else if (recipientPhone) {
    recipient = await User.findOne({ phoneNumber: recipientPhone });
  }
  if (!recipient) return sendBadRequest(res, 'Recipient not found');
  if (String(recipient._id) === senderId) return sendBadRequest(res, 'Cannot gift to yourself');

  // Check sender wallet balance
  const senderWallet = await Wallet.findOne({ user: senderId });
  if (!senderWallet) return sendError(res, 'Wallet not found', 404);
  if (senderWallet.isFrozen) return sendBadRequest(res, 'Your wallet is frozen');

  // Velocity check — prevent rapid-fire abuse
  const velocityCheck = await checkVelocity(senderId, 'gift');
  if (!velocityCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Gift rate limit exceeded. Try again later.',
    });
  }

  const effectiveCoinType = coinType || 'nuqta';
  if (effectiveCoinType === 'nuqta') {
    if (senderWallet.balance.available < validatedAmount) {
      return sendBadRequest(res, 'Insufficient Nuqta Coin balance');
    }
  }

  // Check daily gift count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayGiftCount = await CoinGift.countDocuments({
    sender: senderId,
    createdAt: { $gte: todayStart },
    status: { $nin: ['failed', 'cancelled'] },
  });
  if (todayGiftCount >= config.giftLimits.maxGiftsPerDay) {
    return sendBadRequest(res, `Daily gift limit of ${config.giftLimits.maxGiftsPerDay} gifts reached`);
  }

  // Debit sender wallet atomically
  const debitResult = await Wallet.findOneAndUpdate(
    {
      _id: senderWallet._id,
      isFrozen: false,
      'balance.available': { $gte: validatedAmount }
    },
    {
      $inc: {
        'balance.available': -validatedAmount,
        'balance.total': -validatedAmount,
        'statistics.totalSpent': validatedAmount
      },
      $set: { lastTransactionAt: new Date() }
    },
    { new: true }
  );

  if (!debitResult) {
    return sendBadRequest(res, 'Insufficient balance or wallet is frozen');
  }

  // Determine delivery timing
  const isScheduled = deliveryType === 'scheduled' && scheduledAt;
  if (isScheduled) {
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return sendBadRequest(res, 'Scheduled date must be in the future');
    }
    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (scheduledDate > maxDate) {
      return sendBadRequest(res, 'Scheduled date cannot be more than 30 days in the future');
    }
  }
  const initialStatus = isScheduled ? 'pending' : 'delivered';

  // Create gift
  const gift = await CoinGift.create({
    sender: senderId,
    recipient: recipient._id,
    amount: validatedAmount,
    coinType: effectiveCoinType,
    theme,
    message: message?.trim(),
    deliveryType: isScheduled ? 'scheduled' : 'instant',
    scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
    status: initialStatus,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to claim
    idempotencyKey: idempotencyKey || undefined,
  });

  // Coins are held in platform_float until claimed or expired

  // Audit log
  logTransaction({
    userId: new mongoose.Types.ObjectId(senderId),
    walletId: senderWallet._id as mongoose.Types.ObjectId,
    walletType: 'user',
    operation: 'debit',
    amount: validatedAmount,
    balanceBefore: { total: senderWallet.balance.total, available: senderWallet.balance.available, pending: 0, cashback: 0 },
    balanceAfter: { total: debitResult.balance.total, available: debitResult.balance.available, pending: 0, cashback: 0 },
    reference: { type: 'other', id: String(gift._id), description: `Gift to ${recipient.fullName || recipient.phoneNumber}` }
  });

  // Create CoinTransaction (source of truth for auto-sync) + capture ID
  try {
    const senderTx = await CoinTransaction.createTransaction(
      senderId,
      'spent',
      validatedAmount,
      'transfer',
      `Gift sent to ${recipient.fullName || recipient.phoneNumber}`,
      { giftId: gift._id, recipientId: recipient._id, theme }
    );
    // Populate senderTxId on gift record
    gift.senderTxId = senderTx._id as mongoose.Types.ObjectId;
    await gift.save();
  } catch (ctxError) {
    logger.error('Failed to create sender CoinTransaction', ctxError, { giftId: String(gift._id) });
  }

  // Double-entry ledger: debit sender wallet → credit platform_float
  try {
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    await ledgerService.recordEntry({
      debitAccount: { type: 'user_wallet', id: new mongoose.Types.ObjectId(senderId) },
      creditAccount: { type: 'platform_float', id: platformFloatId },
      amount: validatedAmount,
      coinType: (effectiveCoinType as any) || 'nuqta',
      operationType: 'gift',
      referenceId: String(gift._id),
      referenceModel: 'CoinGift',
      metadata: {
        description: `Gift sent to ${recipient.fullName || recipient.phoneNumber}`,
        idempotencyKey: idempotencyKey || undefined,
      },
    });
  } catch (ledgerError) {
    logger.error('Failed to create send ledger entry', ledgerError, { giftId: String(gift._id) });
  }

  // Send push notification for instant delivery (scheduled gifts notified by giftDeliveryJob)
  if (!isScheduled && recipient.phoneNumber) {
    try {
      const sender = await User.findById(senderId).select('fullName').lean();
      const senderDisplayName = sender?.fullName || 'Someone';
      const themeEmoji = theme === 'birthday' ? '🎂'
        : theme === 'love' ? '💝'
        : theme === 'thanks' ? '🙏'
        : theme === 'congrats' ? '🎉'
        : theme === 'christmas' ? '🎄'
        : '🎁';
      await pushNotificationService.sendGiftReceived(
        senderDisplayName,
        validatedAmount,
        themeEmoji,
        recipient.phoneNumber
      );
    } catch (notifErr) {
      logger.error('Failed to send gift notification', notifErr, { giftId: String(gift._id) });
    }
  }

  // Record Prometheus metrics
  endTimer();
  giftSendTotal.inc({ status: 'success', theme: theme || 'unknown' });
  walletGiftAmount.observe({ coinType: effectiveCoinType }, validatedAmount);

  logger.info('Gift sent successfully', {
    giftId: String(gift._id),
    senderId,
    recipientId: String(recipient._id),
    amount: validatedAmount,
    theme,
    deliveryType: isScheduled ? 'scheduled' : 'instant',
  });

  sendSuccess(res, {
    giftId: String(gift._id),
    status: gift.status,
    recipientName: recipient.fullName || recipient.phoneNumber,
    amount: validatedAmount,
    theme,
    expiresAt: gift.expiresAt,
  }, isScheduled ? 'Gift scheduled successfully' : 'Gift sent successfully');
});

/**
 * @desc    Get received gifts
 * @route   GET /api/wallet/gift/received
 * @access  Private
 */
export const getReceivedGifts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const gifts = await CoinGift.find({
    recipient: userId,
    $or: [
      { status: 'claimed' }, // Claimed gifts always visible
      { status: 'delivered', expiresAt: { $gte: new Date() } }, // Unclaimed only if not expired
    ],
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'fullName phoneNumber profile.avatar')
    .limit(50)
    .lean();

  sendSuccess(res, { gifts }, 'Received gifts retrieved');
});

/**
 * @desc    Claim a received gift
 * @route   POST /api/wallet/gift/:id/claim
 * @access  Private
 */
export const claimGift = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  // Atomic claim — prevents double-claim race condition
  // Single findOneAndUpdate transitions status 'delivered' → 'claimed' atomically
  const gift = await CoinGift.findOneAndUpdate(
    {
      _id: id,
      recipient: userId,
      status: 'delivered',
      expiresAt: { $gte: new Date() }
    },
    {
      $set: { status: 'claimed', claimedAt: new Date() }
    },
    { new: true }
  );

  if (!gift) {
    // Check if it was expired vs already claimed vs not found
    const existing = await CoinGift.findOne({ _id: id, recipient: userId });
    if (!existing) return sendBadRequest(res, 'Gift not found');
    if (existing.status === 'claimed') return sendBadRequest(res, 'Gift already claimed');
    if (existing.expiresAt < new Date()) {
      // Mark as expired if not already
      if (existing.status !== 'expired') {
        await CoinGift.updateOne({ _id: id }, { $set: { status: 'expired' } });
      }
      return sendBadRequest(res, 'Gift has expired');
    }
    return sendBadRequest(res, 'Gift not available for claiming');
  }

  // Credit recipient wallet atomically — capture result for accurate audit log
  const recipientWallet = await Wallet.findOne({ user: userId });
  if (!recipientWallet) return sendError(res, 'Wallet not found', 404);

  const creditResult = await Wallet.findOneAndUpdate(
    { _id: recipientWallet._id },
    {
      $inc: {
        'balance.available': gift.amount,
        'balance.total': gift.amount,
        'statistics.totalEarned': gift.amount
      },
      $set: { lastTransactionAt: new Date() }
    },
    { new: true }
  );

  // Audit log — use actual balances from before/after
  logTransaction({
    userId: new mongoose.Types.ObjectId(userId),
    walletId: recipientWallet._id as mongoose.Types.ObjectId,
    walletType: 'user',
    operation: 'credit',
    amount: gift.amount,
    balanceBefore: { total: recipientWallet.balance.total, available: recipientWallet.balance.available, pending: 0, cashback: 0 },
    balanceAfter: {
      total: creditResult?.balance.total ?? recipientWallet.balance.total + gift.amount,
      available: creditResult?.balance.available ?? recipientWallet.balance.available + gift.amount,
      pending: 0,
      cashback: 0,
    },
    reference: { type: 'other', id: String(gift._id), description: `Gift claimed from ${gift.sender}` }
  });

  // Create CoinTransaction (source of truth for auto-sync) + capture ID
  try {
    const recipientTx = await CoinTransaction.createTransaction(
      userId,
      'earned',
      gift.amount,
      'transfer',
      `Gift received from a friend`,
      { giftId: gift._id, senderId: gift.sender }
    );
    // Populate recipientTxId on gift record
    gift.recipientTxId = recipientTx._id as mongoose.Types.ObjectId;
    await gift.save();
  } catch (ctxError) {
    logger.error('Failed to create recipient CoinTransaction', ctxError, { giftId: String(gift._id) });
  }

  // Double-entry ledger: debit platform_float → credit recipient wallet
  try {
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    await ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: platformFloatId },
      creditAccount: { type: 'user_wallet', id: new mongoose.Types.ObjectId(userId) },
      amount: gift.amount,
      coinType: (gift.coinType as any) || 'nuqta',
      operationType: 'gift',
      referenceId: String(gift._id),
      referenceModel: 'CoinGift',
      metadata: {
        description: `Gift claimed by recipient`,
      },
    });
  } catch (ledgerError) {
    logger.error('Failed to create claim ledger entry', ledgerError, { giftId: String(gift._id) });
  }

  giftClaimTotal.inc({ status: 'success' });

  sendSuccess(res, {
    giftId: String(gift._id),
    amount: gift.amount,
    status: 'claimed',
  }, 'Gift claimed successfully!');

  logger.info('Gift claimed successfully', {
    giftId: String(gift._id),
    recipientId: userId,
    senderId: String(gift.sender),
    amount: gift.amount,
  });
});

/**
 * @desc    Get sent gifts
 * @route   GET /api/wallet/gift/sent
 * @access  Private
 */
export const getSentGifts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const gifts = await CoinGift.find({ sender: userId })
    .sort({ createdAt: -1 })
    .populate('recipient', 'fullName phoneNumber profile.avatar')
    .limit(50)
    .lean();

  sendSuccess(res, { gifts }, 'Sent gifts retrieved');
});
