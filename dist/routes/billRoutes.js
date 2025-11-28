"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billController_1 = require("../controllers/billController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// User routes
router.post('/upload', upload_1.uploadProfileImage.single('billImage'), billController_1.uploadBill);
router.get('/', billController_1.getUserBills);
router.get('/statistics', billController_1.getBillStatistics);
router.get('/:billId', billController_1.getBillById);
router.post('/:billId/resubmit', upload_1.uploadProfileImage.single('billImage'), billController_1.resubmitBill);
// Admin routes
router.get('/admin/pending', billController_1.getPendingBills);
router.get('/admin/statistics', billController_1.getVerificationStatistics);
router.get('/admin/users/:userId/fraud-history', billController_1.getUserFraudHistory);
router.post('/:billId/approve', billController_1.approveBill);
router.post('/:billId/reject', billController_1.rejectBill);
exports.default = router;
