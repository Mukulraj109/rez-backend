import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { liabilityService } from '../../services/liabilityService';
import { InvoiceService } from '../../services/InvoiceService';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('admin-merchant-liability');
const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/merchant-liability/:merchantId
 * View merchant liability records (paginated)
 */
router.get('/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { cycleId, campaignId, status, page, limit } = req.query;

    const result = await liabilityService.getStatement(merchantId, {
      cycleId: cycleId as string,
      campaignId: campaignId as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Failed to get merchant liability', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to get liability' });
  }
});

/**
 * POST /api/admin/merchant-liability/:merchantId/settle
 * Admin triggers settlement for a specific cycle
 */
router.post('/:merchantId/settle', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { cycleId, dryRun, autoDebit } = req.body;

    if (!cycleId) {
      return res.status(400).json({ success: false, message: 'cycleId is required' });
    }

    const result = await liabilityService.settleCycle(merchantId, cycleId, {
      dryRun: dryRun === true,
      autoDebit: autoDebit !== false, // default true
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Failed to settle merchant liability', error);
    return res.status(500).json({ success: false, message: error.message || 'Settlement failed' });
  }
});

/**
 * GET /api/admin/merchant-liability/:merchantId/statement/:cycleId
 * Download PDF liability statement
 */
router.get('/:merchantId/statement/:cycleId', async (req: Request, res: Response) => {
  try {
    const { merchantId, cycleId } = req.params;

    const pdfBuffer = await InvoiceService.generateLiabilityStatement(merchantId, cycleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liability-${merchantId}-${cycleId}.pdf`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to generate liability statement', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate statement' });
  }
});

export default router;
