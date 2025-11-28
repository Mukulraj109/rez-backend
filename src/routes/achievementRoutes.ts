import { Router } from 'express';
import {
  getUserAchievements,
  getUnlockedAchievements,
  getAchievementProgress,
  initializeUserAchievements,
  updateAchievementProgress,
  recalculateAchievements
} from '../controllers/achievementController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Achievement routes
router.get('/', getUserAchievements);
router.get('/unlocked', getUnlockedAchievements);
router.get('/progress', getAchievementProgress);
router.post('/initialize', initializeUserAchievements);
router.put('/update-progress', updateAchievementProgress);
router.post('/recalculate', recalculateAchievements);

export default router;