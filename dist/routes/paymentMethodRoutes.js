"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethodController_1 = require("../controllers/paymentMethodController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Payment method CRUD routes
router.get('/', paymentMethodController_1.getUserPaymentMethods);
router.get('/:id', paymentMethodController_1.getPaymentMethodById);
router.post('/', paymentMethodController_1.createPaymentMethod);
router.put('/:id', paymentMethodController_1.updatePaymentMethod);
router.delete('/:id', paymentMethodController_1.deletePaymentMethod);
router.patch('/:id/default', paymentMethodController_1.setDefaultPaymentMethod);
exports.default = router;
