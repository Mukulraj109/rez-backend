import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { liabilityService } from '../services/liabilityService';
import { InvoiceService } from '../services/InvoiceService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('merchant-liability');
const router = Router();

router.use(authMiddleware);

/**
 * GET /api/merchant/liability
 * Merchant views own liability records (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { cycleId, campaignId, status, page, limit } = req.query;

    const result = await liabilityService.getStatement(String(merchantId), {
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
 * GET /api/merchant/liability/statement/:cycleId
 * Merchant downloads own liability statement PDF
 */
router.get('/statement/:cycleId', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { cycleId } = req.params;

    const pdfBuffer = await InvoiceService.generateLiabilityStatement(String(merchantId), cycleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liability-statement-${cycleId}.pdf`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to generate liability statement', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate statement' });
  }
});

export default router;
