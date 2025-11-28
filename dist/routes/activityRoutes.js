"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityController_1 = require("../controllers/activityController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Activity routes
router.get('/', activityController_1.getUserActivities);
router.get('/summary', activityController_1.getActivitySummary);
router.get('/:id', activityController_1.getActivityById);
router.post('/', activityController_1.createActivity);
router.post('/batch', activityController_1.batchCreateActivities);
router.delete('/:id', activityController_1.deleteActivity);
router.delete('/', activityController_1.clearAllActivities);
exports.default = router;
