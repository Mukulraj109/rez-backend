"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Menu Routes
const express_1 = __importDefault(require("express"));
const menuController_1 = require("../controllers/menuController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes - Menu viewing
router.get('/store/:storeId', menuController_1.getStoreMenu);
router.get('/items/:itemId', menuController_1.getMenuItem);
router.get('/search', menuController_1.searchMenuItems);
// Protected routes - Menu management (store owners/admins only)
router.post('/store/:storeId', auth_1.authenticate, menuController_1.createOrUpdateMenu);
router.post('/items', auth_1.authenticate, menuController_1.addMenuItem);
router.put('/items/:itemId', auth_1.authenticate, menuController_1.updateMenuItem);
router.delete('/items/:itemId', auth_1.authenticate, menuController_1.deleteMenuItem);
// Protected routes - Pre-orders
router.post('/pre-orders', auth_1.authenticate, menuController_1.createPreOrder);
router.get('/pre-orders/user', auth_1.authenticate, menuController_1.getUserPreOrders);
router.get('/pre-orders/:preOrderId', auth_1.authenticate, menuController_1.getPreOrder);
router.put('/pre-orders/:preOrderId/cancel', auth_1.authenticate, menuController_1.cancelPreOrder);
exports.default = router;
