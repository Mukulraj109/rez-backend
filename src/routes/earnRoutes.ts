import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendBadRequest, sendError } from '../utils/response';

const router = Router();

// All earn routes require authentication
router.use(authenticate);

/**
 * GET /api/earn/nearby?lat=...&lng=...&radius=10&limit=20
 * Returns stores near a location with earning opportunities.
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, limit } = req.query;

    if (!lat || !lng) {
      return sendBadRequest(res, 'lat and lng query parameters are required');
    }

    const nearbyEarnService = (await import('../services/nearbyEarnService')).default;
    const stores = await nearbyEarnService.getStoresNearby(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseFloat(radius as string) : 10,
      limit ? parseInt(limit as string, 10) : 20
    );

    sendSuccess(res, { stores });
  } catch (error: any) {
    console.error('[EARN] Error fetching nearby stores:', error);
    sendError(res, error.message || 'Failed to fetch nearby stores');
  }
});

export default router;
