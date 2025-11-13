"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const consultationController_1 = require("../controllers/consultationController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get('/availability/:storeId', consultationController_1.checkAvailability);
// Protected routes (require authentication)
router.post('/', auth_1.authenticate, consultationController_1.createConsultation);
router.get('/user', auth_1.authenticate, consultationController_1.getUserConsultations);
router.get('/store/:storeId', auth_1.authenticate, consultationController_1.getStoreConsultations);
router.get('/:consultationId', auth_1.authenticate, consultationController_1.getConsultation);
router.put('/:consultationId/cancel', auth_1.authenticate, consultationController_1.cancelConsultation);
exports.default = router;
