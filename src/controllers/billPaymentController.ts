import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { BillProvider, BILL_TYPES, BillType } from '../models/BillProvider';
import { BillPayment } from '../models/BillPayment';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendPaginated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import crypto from 'crypto';

// ============================================
// BILL TYPE METADATA (icons/labels for frontend)
// ============================================

const BILL_TYPE_META: Record<BillType, { label: string; icon: string; color: string }> = {
  electricity: { label: 'Electricity', icon: 'flash-outline', color: '#F59E0B' },
  water: { label: 'Water', icon: 'water-outline', color: '#3B82F6' },
  gas: { label: 'Gas', icon: 'flame-outline', color: '#EF4444' },
  internet: { label: 'Internet', icon: 'wifi-outline', color: '#8B5CF6' },
  mobile_postpaid: { label: 'Mobile', icon: 'phone-portrait-outline', color: '#D97706' },
  broadband: { label: 'Broadband', icon: 'tv-outline', color: '#EC4899' },
  dth: { label: 'DTH', icon: 'radio-outline', color: '#06B6D4' },
  landline: { label: 'Landline', icon: 'call-outline', color: '#6366F1' },
};

// ============================================
// GET /api/bill-payments/types
// Returns distinct bill types with metadata + provider counts
// ============================================

export const getBillTypes = asyncHandler(async (req: Request, res: Response) => {
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();
  const cacheKey = `bill-payments:types:${region || 'all'}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  // Build match filter: region-specific + global (empty region)
  const matchFilter: any = { isActive: true };
  if (region) {
    matchFilter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  // Aggregate provider counts per type
  const counts = await BillProvider.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) {
    countMap[c._id] = c.count;
  }

  const types = BILL_TYPES.map((type) => ({
    id: type,
    ...BILL_TYPE_META[type],
    providerCount: countMap[type] || 0,
  }));

  await redisService.set(cacheKey, types, 300).catch((err) => logger.warn('[BillPayment] Cache set for bill types failed', { error: err.message }));

  sendSuccess(res, types);
});

// ============================================
// GET /api/bill-payments/providers?type=electricity&page=1&limit=10
// Returns paginated providers for a given bill type
// ============================================

export const getProviders = asyncHandler(async (req: Request, res: Response) => {
  const { type, page = '1', limit = '10' } = req.query;

  if (!type || !BILL_TYPES.includes(type as BillType)) {
    throw new AppError('Valid bill type is required', 400);
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const cacheKey = `bill-payments:providers:${region || 'all'}:${type}:${pageNum}:${limitNum}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const query: any = { type: type as BillType, isActive: true };
  if (region) {
    query.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  const [providers, total] = await Promise.all([
    BillProvider.find(query)
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    BillProvider.countDocuments(query),
  ]);

  const data = {
    providers,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };

  await redisService.set(cacheKey, data, 300).catch((err) => logger.warn('[BillPayment] Cache set for providers failed', { error: err.message }));

  sendSuccess(res, data);
});

// ============================================
// POST /api/bill-payments/fetch-bill
// Validates provider + customer number, returns bill info
// (Simulated — in production this would call the utility provider API)
// ============================================

export const fetchBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { providerId, customerNumber } = req.body;

  if (!providerId || !customerNumber) {
    throw new AppError('Provider ID and customer number are required', 400);
  }

  const provider = await BillProvider.findOne({
    _id: providerId,
    isActive: true,
  }).lean();

  if (!provider) {
    return sendNotFound(res, 'Provider not found');
  }

  // In production, this would call the actual utility API.
  // For now, return a structured response with provider info.
  // Amount is deterministic based on customerNumber hash so the same
  // number always returns the same amount (avoids random confusion).
  const hash = crypto.createHash('md5').update(customerNumber).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16);
  const amount = 500 + (numericHash % 4500); // 500–4999

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);

  const billInfo = {
    provider: {
      _id: provider._id,
      name: provider.name,
      code: provider.code,
      logo: provider.logo,
      type: provider.type,
    },
    customerNumber,
    amount,
    dueDate: dueDate.toISOString(),
    cashbackPercent: provider.cashbackPercent,
    cashbackAmount: Math.round((amount * provider.cashbackPercent) / 100),
  };

  sendSuccess(res, billInfo, 'Bill fetched successfully');
});

// ============================================
// POST /api/bill-payments/pay
// Creates a BillPayment record, calculates cashback
// ============================================

export const payBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { providerId, customerNumber, amount } = req.body;

  if (!providerId || !customerNumber || !amount) {
    throw new AppError('Provider ID, customer number, and amount are required', 400);
  }

  if (amount <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }

  const provider = await BillProvider.findOne({
    _id: providerId,
    isActive: true,
  }).lean();

  if (!provider) {
    return sendNotFound(res, 'Provider not found');
  }

  const cashbackAmount = Math.round((amount * provider.cashbackPercent) / 100);
  const transactionRef = `BP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const payment = await BillPayment.create({
    userId: req.user._id,
    provider: provider._id,
    billType: provider.type,
    customerNumber,
    amount,
    cashbackAmount,
    status: 'completed',
    transactionRef,
    paidAt: new Date(),
  });

  logger.info(`[BILL_PAYMENT] Payment completed: ${transactionRef}, user=${req.user._id}, amount=${amount}, cashback=${cashbackAmount}`);

  // Invalidate history cache
  await redisService.delPattern(`bill-payments:history:${req.user._id}:*`).catch((err) => logger.warn('[BillPayment] Cache invalidation for payment history failed', { error: err.message }));

  // Populate provider for response
  const populated = await BillPayment.findById(payment._id)
    .populate('provider', 'name code logo type')
    .lean();

  sendSuccess(res, populated, 'Bill paid successfully', 201);
});

// ============================================
// GET /api/bill-payments/history?page=1&limit=10&billType=electricity
// Returns user's past payments, paginated
// ============================================

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { page = '1', limit = '10', billType } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

  const cacheKey = `bill-payments:history:${req.user._id}:${billType || 'all'}:${pageNum}:${limitNum}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const query: any = { userId: req.user._id };
  if (billType && BILL_TYPES.includes(billType as BillType)) {
    query.billType = billType;
  }

  const [payments, total] = await Promise.all([
    BillPayment.find(query)
      .populate('provider', 'name code logo type')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    BillPayment.countDocuments(query),
  ]);

  const data = {
    payments,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };

  await redisService.set(cacheKey, data, 60).catch((err) => logger.warn('[BillPayment] Cache set for payment history failed', { error: err.message }));

  sendSuccess(res, data);
});
