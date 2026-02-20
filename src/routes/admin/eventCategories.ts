import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import EventCategory from '../../models/EventCategory';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/event-categories
 * @desc    List all event categories
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;
    if (req.query.featured === 'true') filter.featured = true;

    const categories = await EventCategory.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, data: { categories } });
  } catch (error: any) {
    console.error('[Admin EventCategories] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/admin/event-categories
 * @desc    Create event category
 * @access  Admin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, icon, color, gradient, description, isActive, sortOrder, featured, parentCategory } = req.body;

    if (!name || !slug || !icon) {
      return res.status(400).json({ success: false, message: 'name, slug, and icon are required' });
    }

    // Check slug uniqueness
    const existing = await EventCategory.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category with this slug already exists' });
    }

    const category = await EventCategory.create({
      name,
      slug: slug.toLowerCase(),
      icon,
      color: color || '#A855F7',
      gradient: gradient || ['#FAF5FF', '#FDF2F8'],
      description,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
      featured: featured || false,
      parentCategory: parentCategory || null,
      createdBy: (req as any).user._id || (req as any).user.id,
    });

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Event category created successfully',
    });
  } catch (error: any) {
    console.error('[Admin EventCategories] Error creating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/admin/event-categories/reorder
 * @desc    Bulk reorder categories
 * @access  Admin
 * NOTE: This route MUST be defined before /:id to avoid 'reorder' being captured as an :id param
 */
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { order } = req.body; // Array of { id, sortOrder }
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array' });
    }

    const bulkOps = order.map((item: { id: string; sortOrder: number }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id) },
        update: { sortOrder: item.sortOrder },
      },
    }));

    await EventCategory.bulkWrite(bulkOps);

    res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (error: any) {
    console.error('[Admin EventCategories] Error reordering:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/admin/event-categories/:id
 * @desc    Update event category
 * @access  Admin
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const allowedFields = ['name', 'slug', 'icon', 'color', 'gradient', 'description', 'isActive', 'sortOrder', 'featured', 'parentCategory'];
    const update: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    // If updating slug, check uniqueness
    if (update.slug) {
      update.slug = update.slug.toLowerCase();
      const existing = await EventCategory.findOne({ slug: update.slug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Category with this slug already exists' });
      }
    }

    const category = await EventCategory.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      data: { category },
      message: 'Event category updated successfully',
    });
  } catch (error: any) {
    console.error('[Admin EventCategories] Error updating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/admin/event-categories/:id
 * @desc    Soft-delete (deactivate) event category
 * @access  Admin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await EventCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      data: { category },
      message: 'Event category deactivated successfully',
    });
  } catch (error: any) {
    console.error('[Admin EventCategories] Error deleting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
