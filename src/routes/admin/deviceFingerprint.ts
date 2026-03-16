import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, requireOperator } from '../../middleware/auth';
import * as deviceFingerprintService from '../../services/deviceFingerprintService';
import { logger } from '../../config/logger';

const router = Router();

// All routes require admin auth
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/devices — List devices with pagination + risk filter
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const riskLevel = req.query.riskLevel as string | undefined;
    const isBlocked = req.query.isBlocked !== undefined
      ? req.query.isBlocked === 'true'
      : undefined;
    const search = req.query.search as string | undefined;

    const result = await deviceFingerprintService.listDevices({
      page,
      limit,
      riskLevel,
      isBlocked,
      search,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[Admin Devices] List error:', error);
    res.status(500).json({ success: false, message: 'Failed to list devices' });
  }
});

/**
 * GET /api/admin/devices/:hash — Device detail with full history
 */
router.get('/:hash', async (req: Request, res: Response) => {
  try {
    const device = await deviceFingerprintService.getDeviceHistory(req.params.hash);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, data: { device } });
  } catch (error: any) {
    logger.error('[Admin Devices] Detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch device details' });
  }
});

/**
 * GET /api/admin/devices/:hash/overlap — Merchant overlap analysis
 */
router.get('/:hash/overlap', async (req: Request, res: Response) => {
  try {
    const device = await deviceFingerprintService.getDeviceHistory(req.params.hash);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({
      success: true,
      data: {
        deviceHash: device.deviceHash,
        merchantsAccessed: device.merchantsAccessed,
        totalMerchants: device.merchantsAccessed.length,
        users: device.users,
      },
    });
  } catch (error: any) {
    logger.error('[Admin Devices] Overlap error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overlap data' });
  }
});

/**
 * POST /api/admin/devices/:hash/block — Manual block (operator+)
 */
router.post('/:hash/block', requireOperator, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }

    await deviceFingerprintService.blockDevice(req.params.hash, reason, req.userId || 'unknown');
    logger.info('🔒 [Admin Devices] Device blocked', { hash: req.params.hash, adminId: req.userId, reason });
    res.json({ success: true, message: 'Device blocked successfully' });
  } catch (error: any) {
    logger.error('[Admin Devices] Block error:', error);
    res.status(500).json({ success: false, message: 'Failed to block device' });
  }
});

/**
 * POST /api/admin/devices/:hash/unblock — Manual unblock (operator+)
 */
router.post('/:hash/unblock', requireOperator, async (req: Request, res: Response) => {
  try {
    await deviceFingerprintService.unblockDevice(req.params.hash, req.userId || 'unknown');
    logger.info('🔓 [Admin Devices] Device unblocked', { hash: req.params.hash, adminId: req.userId });
    res.json({ success: true, message: 'Device unblocked successfully' });
  } catch (error: any) {
    logger.error('[Admin Devices] Unblock error:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock device' });
  }
});

/**
 * GET /api/admin/merchants/:id/devices — Devices for a specific merchant
 */
router.get('/merchants/:id/devices', async (req: Request, res: Response) => {
  try {
    const result = await deviceFingerprintService.getMerchantDeviceOverlap(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[Admin Devices] Merchant devices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant devices' });
  }
});

/**
 * GET /api/admin/devices/user/:userId — Devices for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const devices = await deviceFingerprintService.getUserDevices(req.params.userId);
    res.json({ success: true, data: { devices } });
  } catch (error: any) {
    logger.error('[Admin Devices] User devices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user devices' });
  }
});

export default router;
