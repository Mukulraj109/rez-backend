/**
 * Admin Routes - Bank Offers
 * CRUD for BankOffer model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import BankOffer from '../../models/BankOffer';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/bank-offers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.bankName) filter.bankName = { $regex: req.query.bankName, $options: 'i' };
    if (req.query.cardType) filter.cardType = req.query.cardType;
    if (req.query.search) {
      filter.$or = [
        { bankName: { $regex: req.query.search, $options: 'i' } },
        { offerTitle: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [offers, total] = await Promise.all([
      BankOffer.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      BankOffer.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      offers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Bank offers fetched');
  } catch (error) {
    console.error('[Admin] Error fetching bank offers:', error);
    return sendError(res, 'Failed to fetch bank offers', 500);
  }
});

/**
 * GET /api/admin/bank-offers/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const offer = await BankOffer.findById(req.params.id).lean();
    if (!offer) return sendError(res, 'Bank offer not found', 404);
    return sendSuccess(res, offer, 'Bank offer fetched');
  } catch (error) {
    console.error('[Admin] Error fetching bank offer:', error);
    return sendError(res, 'Failed to fetch bank offer', 500);
  }
});

/**
 * POST /api/admin/bank-offers
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { bankName, offerTitle, discountPercentage, maxDiscount, minTransactionAmount, cardType, validFrom, validUntil, terms } = req.body;

    if (!bankName || !offerTitle || discountPercentage === undefined || !maxDiscount || !minTransactionAmount || !cardType || !validFrom || !validUntil || !terms) {
      return sendError(res, 'bankName, offerTitle, discountPercentage, maxDiscount, minTransactionAmount, cardType, validFrom, validUntil, terms are required', 400);
    }

    const offer = await BankOffer.create({
      ...req.body,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
    });

    return sendSuccess(res, offer, 'Bank offer created');
  } catch (error) {
    console.error('[Admin] Error creating bank offer:', error);
    return sendError(res, 'Failed to create bank offer', 500);
  }
});

/**
 * PUT /api/admin/bank-offers/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const offer = await BankOffer.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!offer) return sendError(res, 'Bank offer not found', 404);
    return sendSuccess(res, offer, 'Bank offer updated');
  } catch (error) {
    console.error('[Admin] Error updating bank offer:', error);
    return sendError(res, 'Failed to update bank offer', 500);
  }
});

/**
 * PATCH /api/admin/bank-offers/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const offer = await BankOffer.findById(req.params.id);
    if (!offer) return sendError(res, 'Bank offer not found', 404);
    offer.isActive = !offer.isActive;
    await offer.save();
    return sendSuccess(res, offer, `Bank offer ${offer.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling bank offer:', error);
    return sendError(res, 'Failed to toggle bank offer', 500);
  }
});

/**
 * DELETE /api/admin/bank-offers/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const offer = await BankOffer.findByIdAndDelete(req.params.id);
    if (!offer) return sendError(res, 'Bank offer not found', 404);
    return sendSuccess(res, null, 'Bank offer deleted');
  } catch (error) {
    console.error('[Admin] Error deleting bank offer:', error);
    return sendError(res, 'Failed to delete bank offer', 500);
  }
});

export default router;
