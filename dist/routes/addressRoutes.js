"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const addressController_1 = require("../controllers/addressController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Address CRUD routes
router.get('/', addressController_1.getUserAddresses);
router.get('/:id', addressController_1.getAddressById);
router.post('/', addressController_1.createAddress);
router.put('/:id', addressController_1.updateAddress);
router.delete('/:id', addressController_1.deleteAddress);
router.patch('/:id/default', addressController_1.setDefaultAddress);
exports.default = router;
