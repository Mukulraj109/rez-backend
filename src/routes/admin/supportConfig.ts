import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { SupportConfig } from '../../models/SupportConfig';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/support-config
 * @desc    Get support configuration singleton
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await SupportConfig.getOrCreate();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch support config' });
  }
});

/**
 * @route   PUT /api/admin/support-config
 * @desc    Update support configuration
 * @access  Admin
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const config = await SupportConfig.getOrCreate();

    // Array fields: replace entirely
    const arrayFields = ['phoneNumbers', 'categories'];
    for (const field of arrayFields) {
      if (req.body[field] !== undefined) {
        (config as any)[field] = req.body[field];
        config.markModified(field);
      }
    }

    // Nested object with array: supportHours (replace sub-fields)
    if (req.body.supportHours !== undefined) {
      if (req.body.supportHours.timezone !== undefined) {
        config.supportHours.timezone = req.body.supportHours.timezone;
      }
      if (req.body.supportHours.schedule !== undefined) {
        config.supportHours.schedule = req.body.supportHours.schedule;
      }
      if (req.body.supportHours.holidays !== undefined) {
        config.supportHours.holidays = req.body.supportHours.holidays;
      }
      config.markModified('supportHours');
    }

    // Object fields: spread merge
    const objectFields = ['callbackSettings', 'queueStatus'];
    for (const field of objectFields) {
      if (req.body[field] !== undefined) {
        const existing = (config as any)[field]?.toObject?.() || (config as any)[field] || {};
        (config as any)[field] = { ...existing, ...req.body[field] };
        config.markModified(field);
      }
    }

    await config.save();

    res.json({ success: true, data: config, message: 'Support config updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update support config' });
  }
});

export default router;
