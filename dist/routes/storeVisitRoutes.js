"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storeVisitController_1 = require("../controllers/storeVisitController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protected routes - require authentication
router.post('/schedule', auth_1.authenticate, storeVisitController_1.scheduleStoreVisit);
router.post('/queue', auth_1.optionalAuth, storeVisitController_1.getQueueNumber); // Optional auth for walk-ins
router.get('/user', auth_1.authenticate, storeVisitController_1.getUserStoreVisits);
router.get('/:visitId', auth_1.authenticate, storeVisitController_1.getStoreVisit);
router.get('/store/:storeId', auth_1.authenticate, storeVisitController_1.getStoreVisits);
router.put('/:visitId/cancel', auth_1.authenticate, storeVisitController_1.cancelStoreVisit);
// Public routes - no authentication required
router.get('/queue-status/:storeId', storeVisitController_1.getCurrentQueueStatus);
router.get('/availability/:storeId', storeVisitController_1.checkStoreAvailability);
exports.default = router;
