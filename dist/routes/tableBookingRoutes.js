"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tableBookingController_1 = require("../controllers/tableBookingController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public route - Check table availability
router.get('/availability/:storeId', tableBookingController_1.checkAvailability);
// Protected routes - require authentication
router.use(auth_1.authenticate);
// Create new table booking
router.post('/', tableBookingController_1.createTableBooking);
// Get user's table bookings
router.get('/user', tableBookingController_1.getUserTableBookings);
// Get specific booking by ID
router.get('/:bookingId', tableBookingController_1.getTableBooking);
// Get store's table bookings (for store owners/admin)
router.get('/store/:storeId', tableBookingController_1.getStoreTableBookings);
// Cancel table booking
router.put('/:bookingId/cancel', tableBookingController_1.cancelTableBooking);
exports.default = router;
