/**
 * Admin Routes - Privé
 *
 * Manages Privé offers, vouchers, user reputation, and analytics.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getVouchers,
  invalidateVoucher,
  extendVoucher,
  issueVoucher,
  getUserReputation,
  overrideUserReputation,
  recalculateUserReputation,
  getAnalytics,
} from '../../controllers/admin/priveAdminController';
import {
  getSmartSpendItems,
  createSmartSpendItem,
  updateSmartSpendItem,
  deleteSmartSpendItem,
  toggleSmartSpendItemStatus,
  reorderSmartSpendItems,
  getSmartSpendAnalytics,
} from '../../controllers/admin/smartSpendAdminController';
import { Product } from '../../models/Product';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ─── Offers ──────────────────────────────────────────────────────────────────
router.get('/offers', getOffers);
router.post('/offers', createOffer);
router.put('/offers/:id', updateOffer);
router.delete('/offers/:id', deleteOffer);
router.patch('/offers/:id/status', toggleOfferStatus);

// ─── Vouchers ────────────────────────────────────────────────────────────────
router.get('/vouchers', getVouchers);
router.post('/vouchers', issueVoucher);
router.patch('/vouchers/:id/invalidate', invalidateVoucher);
router.patch('/vouchers/:id/extend', extendVoucher);

// ─── User Reputation ─────────────────────────────────────────────────────────
router.get('/users/:userId/reputation', getUserReputation);
router.patch('/users/:userId/reputation', overrideUserReputation);
router.post('/users/:userId/recalculate', recalculateUserReputation);

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ─── Smart Spend ────────────────────────────────────────────────────────────
router.get('/smart-spend', getSmartSpendItems);
router.get('/smart-spend/analytics', getSmartSpendAnalytics);
router.post('/smart-spend', createSmartSpendItem);
router.put('/smart-spend/reorder', reorderSmartSpendItems);
router.put('/smart-spend/:id', updateSmartSpendItem);
router.delete('/smart-spend/:id', deleteSmartSpendItem);
router.patch('/smart-spend/:id/status', toggleSmartSpendItemStatus);

// ─── Review Eligibility ─────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/review-eligible-products
 * List products with Privé review eligibility
 */
router.get('/review-eligible-products', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = { isPriveReviewEligible: true, isActive: true, isDeleted: { $ne: true } };

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('name images pricing store isPriveReviewEligible priveReviewRewardCoins')
      .populate('store', 'name logo')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  sendSuccess(res, {
    products,
    pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
  });
}));

/**
 * PUT /api/admin/prive/products/:productId/review-eligibility
 * Toggle product Privé review eligibility
 */
router.put('/products/:productId/review-eligibility', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { isPriveReviewEligible, priveReviewRewardCoins } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (typeof isPriveReviewEligible === 'boolean') {
    product.isPriveReviewEligible = isPriveReviewEligible;
  }
  if (typeof priveReviewRewardCoins === 'number' && priveReviewRewardCoins >= 0 && priveReviewRewardCoins <= 500) {
    product.priveReviewRewardCoins = priveReviewRewardCoins;
  }

  await product.save();

  sendSuccess(res, { product }, 'Product review eligibility updated');
}));

export default router;
