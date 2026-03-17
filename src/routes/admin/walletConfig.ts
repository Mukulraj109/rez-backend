import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { WalletConfig } from '../../models/WalletConfig';
import { invalidateWalletConfigCache } from '../../services/walletCacheService';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/wallet-config
 * @desc    Get wallet configuration singleton
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const config = await WalletConfig.getOrCreate();
    res.json({ success: true, data: config });
}));

/**
 * @route   PUT /api/admin/wallet-config
 * @desc    Update wallet configuration
 * @access  Admin
 */
router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const config = await WalletConfig.getOrCreate();
    const allowedFields = [
      'transferLimits', 'giftLimits', 'rechargeConfig',
      'expiryConfig', 'commissionRate', 'coinConversion', 'fraudThresholds',
      'redemptionConfig', 'habitLoopConfig', 'coinExpiryConfig', 'coinRules'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (config as any)[field] = { ...(config as any)[field]?.toObject?.() || (config as any)[field], ...req.body[field] };
        config.markModified(field);
      }
    }

    await config.save();

    // Invalidate cached config so all services pick up new values immediately
    await invalidateWalletConfigCache().catch(() => {});

    res.json({ success: true, data: config, message: 'Wallet config updated' });
}));

export default router;
