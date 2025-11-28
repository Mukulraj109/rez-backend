"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const achievementController_1 = require("../controllers/achievementController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Achievement routes
router.get('/', achievementController_1.getUserAchievements);
router.get('/unlocked', achievementController_1.getUnlockedAchievements);
router.get('/progress', achievementController_1.getAchievementProgress);
router.post('/initialize', achievementController_1.initializeUserAchievements);
router.put('/update-progress', achievementController_1.updateAchievementProgress);
router.post('/recalculate', achievementController_1.recalculateAchievements);
exports.default = router;
