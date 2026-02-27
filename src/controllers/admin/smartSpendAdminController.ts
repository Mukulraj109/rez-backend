/**
 * Smart Spend Admin Controller
 *
 * Admin CRUD endpoints for managing the Privé Smart Spend marketplace catalog.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import SmartSpendItem from '../../models/SmartSpendItem';
import { Store } from '../../models/Store';
import { Product } from '../../models/Product';
import { sendSuccess, sendError } from '../../utils/response';

// ─── List Items ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/smart-spend
 * Paginated Smart Spend items with filters
 */
export const getSmartSpendItems = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status === 'active') {
      filter.isActive = true;
    } else if (req.query.status === 'inactive') {
      filter.isActive = false;
    }

    if (req.query.itemType && ['store', 'product'].includes(req.query.itemType as string)) {
      filter.itemType = req.query.itemType;
    }

    if (req.query.section) {
      filter.sectionLabel = req.query.section;
    }

    if (req.query.tier) {
      filter.tierRequired = req.query.tier;
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    if (req.query.search) {
      filter.$or = [
        { displayTitle: { $regex: req.query.search, $options: 'i' } },
        { sectionLabel: { $regex: req.query.search, $options: 'i' } },
        { badgeText: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      SmartSpendItem.find(filter)
        .populate('store', 'name slug logo rating location isVerified status')
        .populate({
          path: 'product',
          select: 'name images pricing store status',
          populate: { path: 'store', select: 'name slug logo' },
        })
        .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SmartSpendItem.countDocuments(filter),
    ]);

    // Enrich with analytics rates
    const enrichedItems = items.map((item) => ({
      ...item,
      ctr: item.views > 0 ? Math.round((item.clicks / item.views) * 10000) / 100 : 0,
      conversionRate: item.clicks > 0 ? Math.round((item.purchases / item.clicks) * 10000) / 100 : 0,
    }));

    // Get distinct sections for filter dropdown
    const sections = await SmartSpendItem.distinct('sectionLabel', { sectionLabel: { $ne: null } });

    return sendSuccess(res, {
      items: enrichedItems,
      sections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Smart Spend items fetched');
  } catch (error) {
    console.error('[Admin SmartSpend] Error fetching items:', error);
    return sendError(res, 'Failed to fetch Smart Spend items', 500);
  }
};

// ─── Create Item ───────────────────────────────────────────────────────────────

/**
 * POST /api/admin/prive/smart-spend
 * Create a new Smart Spend item
 */
export const createSmartSpendItem = async (req: Request, res: Response) => {
  try {
    const {
      itemType,
      store,
      product,
      coinRewardRate,
      coinDisplayText,
    } = req.body;

    // Validate required fields
    if (!itemType || !coinDisplayText) {
      return sendError(res, 'Missing required fields: itemType, coinDisplayText', 400);
    }

    // Validate entity reference
    if (itemType === 'store') {
      if (!store) return sendError(res, 'Store ID is required for store items', 400);
      if (!Types.ObjectId.isValid(store)) return sendError(res, 'Invalid store ID', 400);
      const storeExists = await Store.findById(store).select('_id').lean();
      if (!storeExists) return sendError(res, 'Store not found', 404);
    } else if (itemType === 'product') {
      if (!product) return sendError(res, 'Product ID is required for product items', 400);
      if (!Types.ObjectId.isValid(product)) return sendError(res, 'Invalid product ID', 400);
      const productExists = await Product.findById(product).select('_id').lean();
      if (!productExists) return sendError(res, 'Product not found', 404);
    } else {
      return sendError(res, 'Invalid itemType. Must be "store" or "product"', 400);
    }

    // Check for duplicate curation
    const existingQuery: any = { itemType };
    if (itemType === 'store') existingQuery.store = store;
    if (itemType === 'product') existingQuery.product = product;
    const existing = await SmartSpendItem.findOne(existingQuery).lean();
    if (existing) {
      return sendError(res, 'This item is already in the Smart Spend catalog', 409);
    }

    // Convert dates if present
    const data = { ...req.body };
    if (data.startsAt) data.startsAt = new Date(data.startsAt);
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);

    const item = await SmartSpendItem.create(data);

    // Populate references for response
    const populated = await SmartSpendItem.findById(item._id)
      .populate('store', 'name slug logo rating location isVerified')
      .populate({
        path: 'product',
        select: 'name images pricing store',
        populate: { path: 'store', select: 'name slug logo' },
      })
      .lean();

    return sendSuccess(res, populated, 'Smart Spend item created', 201);
  } catch (error: any) {
    console.error('[Admin SmartSpend] Error creating item:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create Smart Spend item', 500);
  }
};

// ─── Update Item ───────────────────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/smart-spend/:id
 * Update a Smart Spend item
 */
export const updateSmartSpendItem = async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid item ID', 400);
    }

    const updates = { ...req.body };
    if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

    // Don't allow changing itemType/store/product after creation
    delete updates.itemType;
    delete updates.store;
    delete updates.product;

    const item = await SmartSpendItem.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('store', 'name slug logo rating location isVerified')
      .populate({
        path: 'product',
        select: 'name images pricing store',
        populate: { path: 'store', select: 'name slug logo' },
      });

    if (!item) {
      return sendError(res, 'Smart Spend item not found', 404);
    }

    return sendSuccess(res, item, 'Smart Spend item updated');
  } catch (error: any) {
    console.error('[Admin SmartSpend] Error updating item:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to update Smart Spend item', 500);
  }
};

// ─── Delete Item ───────────────────────────────────────────────────────────────

/**
 * DELETE /api/admin/prive/smart-spend/:id
 * Soft delete (set isActive=false)
 */
export const deleteSmartSpendItem = async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid item ID', 400);
    }

    const item = await SmartSpendItem.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!item) {
      return sendError(res, 'Smart Spend item not found', 404);
    }

    return sendSuccess(res, item, 'Smart Spend item deactivated');
  } catch (error) {
    console.error('[Admin SmartSpend] Error deleting item:', error);
    return sendError(res, 'Failed to delete Smart Spend item', 500);
  }
};

// ─── Toggle Status ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/prive/smart-spend/:id/status
 * Toggle item active/inactive
 */
export const toggleSmartSpendItemStatus = async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid item ID', 400);
    }

    const item = await SmartSpendItem.findById(req.params.id);
    if (!item) {
      return sendError(res, 'Smart Spend item not found', 404);
    }

    item.isActive = !item.isActive;
    await item.save();

    return sendSuccess(res, {
      _id: item._id,
      isActive: item.isActive,
    }, `Smart Spend item ${item.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin SmartSpend] Error toggling status:', error);
    return sendError(res, 'Failed to toggle item status', 500);
  }
};

// ─── Reorder Items ─────────────────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/smart-spend/reorder
 * Bulk update sort order for drag-and-drop reordering
 */
export const reorderSmartSpendItems = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Items array is required with { id, sortOrder } entries', 400);
    }

    const bulkOps = items.map((entry: { id: string; sortOrder: number }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(entry.id) },
        update: { $set: { sortOrder: entry.sortOrder } },
      },
    }));

    await SmartSpendItem.bulkWrite(bulkOps);

    return sendSuccess(res, { updated: items.length }, 'Smart Spend items reordered');
  } catch (error) {
    console.error('[Admin SmartSpend] Error reordering items:', error);
    return sendError(res, 'Failed to reorder Smart Spend items', 500);
  }
};

// ─── Analytics ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/smart-spend/analytics
 * Aggregate analytics across Smart Spend items
 */
export const getSmartSpendAnalytics = async (req: Request, res: Response) => {
  try {
    const [totals] = await SmartSpendItem.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          activeItems: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalViews: { $sum: '$views' },
          totalClicks: { $sum: '$clicks' },
          totalPurchases: { $sum: '$purchases' },
        },
      },
    ]);

    const bySection = await SmartSpendItem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$sectionLabel',
          count: { $sum: 1 },
          views: { $sum: '$views' },
          clicks: { $sum: '$clicks' },
          purchases: { $sum: '$purchases' },
        },
      },
      { $sort: { purchases: -1 } },
    ]);

    const topItems = await SmartSpendItem.find({ isActive: true })
      .populate('store', 'name slug logo')
      .populate('product', 'name images')
      .sort({ purchases: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, {
      totals: totals || {
        totalItems: 0,
        activeItems: 0,
        totalViews: 0,
        totalClicks: 0,
        totalPurchases: 0,
      },
      bySection,
      topItems,
    }, 'Smart Spend analytics fetched');
  } catch (error) {
    console.error('[Admin SmartSpend] Error fetching analytics:', error);
    return sendError(res, 'Failed to fetch Smart Spend analytics', 500);
  }
};
