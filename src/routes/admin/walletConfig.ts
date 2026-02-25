import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { WalletConfig } from '../../models/WalletConfig';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/wallet-config
 * @desc    Get wallet configuration singleton
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await WalletConfig.getOrCreate();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch wallet config' });
  }
});

/**
 * @route   PUT /api/admin/wallet-config
 * @desc    Update wallet configuration
 * @access  Admin
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const config = await WalletConfig.getOrCreate();
    const allowedFields = [
      'transferLimits', 'giftLimits', 'rechargeConfig',
      'expiryConfig', 'commissionRate', 'coinConversion', 'fraudThresholds'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (config as any)[field] = { ...(config as any)[field]?.toObject?.() || (config as any)[field], ...req.body[field] };
        config.markModified(field);
      }
    }

    await config.save();

    res.json({ success: true, data: config, message: 'Wallet config updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update wallet config' });
  }
});

export default router;
