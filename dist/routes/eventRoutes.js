"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get('/', eventController_1.getAllEvents);
router.get('/featured', eventController_1.getFeaturedEvents);
router.get('/search', eventController_1.searchEvents);
router.get('/category/:category', eventController_1.getEventsByCategory);
router.get('/:id', eventController_1.getEventById);
router.post('/:id/share', eventController_1.shareEvent);
// Protected routes (require authentication)
router.post('/:id/book', auth_1.authenticate, eventController_1.bookEventSlot);
router.get('/my-bookings', auth_1.authenticate, eventController_1.getUserBookings);
router.delete('/bookings/:bookingId', auth_1.authenticate, eventController_1.cancelBooking);
router.post('/:id/favorite', auth_1.authenticate, eventController_1.toggleEventFavorite);
router.get('/:id/analytics', auth_1.authenticate, eventController_1.getEventAnalytics);
exports.default = router;
