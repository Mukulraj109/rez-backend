import { Router } from 'express';
import shareController from '../controllers/shareController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route for tracking clicks (no auth required)
router.get('/click/:trackingCode', shareController.trackClick.bind(shareController));

// Protected routes
router.use(authenticate);

router.get('/content', shareController.getShareableContent.bind(shareController));
router.post('/track', shareController.createShare.bind(shareController));
router.post('/conversion', shareController.trackConversion.bind(shareController));
router.get('/history', shareController.getShareHistory.bind(shareController));
router.get('/stats', shareController.getShareStats.bind(shareController));
router.get('/daily-limits', shareController.getDailyLimits.bind(shareController));

export default router;
