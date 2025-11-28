"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAvailability = exports.cancelTableBooking = exports.getStoreTableBookings = exports.getTableBooking = exports.getUserTableBookings = exports.createTableBooking = void 0;
const mongoose_1 = require("mongoose");
const TableBooking_1 = require("../models/TableBooking");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
// Create new table booking
const createTableBooking = async (req, res) => {
    try {
        const userId = req.userId;
        const { storeId, bookingDate, bookingTime, partySize, customerName, customerPhone, customerEmail, specialRequests } = req.body;
        console.log('📅 [TABLE BOOKING] Creating new booking:', {
            userId,
            storeId,
            bookingDate,
            bookingTime,
            partySize
        });
        // Validate required fields
        if (!storeId || !bookingDate || !bookingTime || !partySize || !customerName || !customerPhone) {
            console.error('❌ [TABLE BOOKING] Missing required fields');
            return (0, response_1.sendBadRequest)(res, 'All required fields must be provided');
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error('❌ [TABLE BOOKING] Store not found:', storeId);
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Validate booking date is not in the past
        const bookingDateTime = new Date(bookingDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
        if (bookingDateTime < now) {
            console.error('❌ [TABLE BOOKING] Booking date is in the past');
            return (0, response_1.sendBadRequest)(res, 'Booking date cannot be in the past');
        }
        // Validate party size
        if (partySize < 1 || partySize > 50) {
            console.error('❌ [TABLE BOOKING] Invalid party size:', partySize);
            return (0, response_1.sendBadRequest)(res, 'Party size must be between 1 and 50');
        }
        // Create booking
        const booking = new TableBooking_1.TableBooking({
            storeId: new mongoose_1.Types.ObjectId(storeId),
            userId: new mongoose_1.Types.ObjectId(userId),
            bookingDate: bookingDateTime,
            bookingTime,
            partySize,
            customerName,
            customerPhone,
            customerEmail,
            specialRequests,
            status: 'pending'
        });
        await booking.save();
        console.log('✅ [TABLE BOOKING] Booking created:', booking.bookingNumber);
        // Populate booking for response
        const populatedBooking = await TableBooking_1.TableBooking.findById(booking._id)
            .populate('storeId', 'name logo location contact')
            .populate('userId', 'profile.firstName profile.lastName phoneNumber email');
        return (0, response_1.sendCreated)(res, populatedBooking, 'Table booking created successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error creating booking:', error);
        return (0, response_1.sendError)(res, `Failed to create booking: ${error.message}`, 500);
    }
};
exports.createTableBooking = createTableBooking;
// Get user's table bookings
const getUserTableBookings = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, page = 1, limit = 20 } = req.query;
        console.log('📅 [TABLE BOOKING] Getting user bookings:', {
            userId,
            status,
            page,
            limit
        });
        const query = { userId: new mongoose_1.Types.ObjectId(userId) };
        if (status) {
            query.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const bookings = await TableBooking_1.TableBooking.find(query)
            .populate('storeId', 'name logo location contact')
            .sort({ bookingDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await TableBooking_1.TableBooking.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        console.log('✅ [TABLE BOOKING] Found bookings:', bookings.length);
        return (0, response_1.sendSuccess)(res, {
            bookings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Bookings retrieved successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error getting user bookings:', error);
        return (0, response_1.sendError)(res, `Failed to retrieve bookings: ${error.message}`, 500);
    }
};
exports.getUserTableBookings = getUserTableBookings;
// Get table booking by ID
const getTableBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.userId;
        console.log('📅 [TABLE BOOKING] Getting booking:', bookingId);
        const booking = await TableBooking_1.TableBooking.findOne({
            _id: bookingId,
            userId: new mongoose_1.Types.ObjectId(userId)
        })
            .populate('storeId', 'name logo location contact')
            .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
            .lean();
        if (!booking) {
            console.error('❌ [TABLE BOOKING] Booking not found:', bookingId);
            return (0, response_1.sendNotFound)(res, 'Booking not found');
        }
        console.log('✅ [TABLE BOOKING] Booking found:', booking.bookingNumber);
        return (0, response_1.sendSuccess)(res, booking, 'Booking retrieved successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error getting booking:', error);
        return (0, response_1.sendError)(res, `Failed to retrieve booking: ${error.message}`, 500);
    }
};
exports.getTableBooking = getTableBooking;
// Get store's table bookings (for store owners)
const getStoreTableBookings = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { date, status, page = 1, limit = 50 } = req.query;
        console.log('📅 [TABLE BOOKING] Getting store bookings:', {
            storeId,
            date,
            status,
            page,
            limit
        });
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error('❌ [TABLE BOOKING] Store not found:', storeId);
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        const query = { storeId: new mongoose_1.Types.ObjectId(storeId) };
        // Filter by date if provided
        if (date) {
            const bookingDate = new Date(date);
            const startOfDay = new Date(bookingDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(bookingDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.bookingDate = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const bookings = await TableBooking_1.TableBooking.find(query)
            .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
            .sort({ bookingDate: 1, bookingTime: 1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await TableBooking_1.TableBooking.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        console.log('✅ [TABLE BOOKING] Found store bookings:', bookings.length);
        return (0, response_1.sendSuccess)(res, {
            bookings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Store bookings retrieved successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error getting store bookings:', error);
        return (0, response_1.sendError)(res, `Failed to retrieve store bookings: ${error.message}`, 500);
    }
};
exports.getStoreTableBookings = getStoreTableBookings;
// Cancel table booking
const cancelTableBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.userId;
        const { reason } = req.body;
        console.log('📅 [TABLE BOOKING] Cancelling booking:', bookingId);
        const booking = await TableBooking_1.TableBooking.findOne({
            _id: bookingId,
            userId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!booking) {
            console.error('❌ [TABLE BOOKING] Booking not found:', bookingId);
            return (0, response_1.sendNotFound)(res, 'Booking not found');
        }
        // Check if booking can be cancelled
        if (booking.status === 'cancelled') {
            console.error('❌ [TABLE BOOKING] Booking already cancelled');
            return (0, response_1.sendBadRequest)(res, 'Booking is already cancelled');
        }
        if (booking.status === 'completed') {
            console.error('❌ [TABLE BOOKING] Cannot cancel completed booking');
            return (0, response_1.sendBadRequest)(res, 'Cannot cancel a completed booking');
        }
        // Update booking status
        booking.status = 'cancelled';
        await booking.save();
        console.log('✅ [TABLE BOOKING] Booking cancelled:', booking.bookingNumber);
        // Populate booking for response
        const populatedBooking = await TableBooking_1.TableBooking.findById(booking._id)
            .populate('storeId', 'name logo location contact')
            .populate('userId', 'profile.firstName profile.lastName phoneNumber email');
        return (0, response_1.sendSuccess)(res, populatedBooking, 'Booking cancelled successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error cancelling booking:', error);
        return (0, response_1.sendError)(res, `Failed to cancel booking: ${error.message}`, 500);
    }
};
exports.cancelTableBooking = cancelTableBooking;
// Check table availability
const checkAvailability = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { date } = req.query;
        console.log('📅 [TABLE BOOKING] Checking availability:', {
            storeId,
            date
        });
        if (!date) {
            return (0, response_1.sendBadRequest)(res, 'Date is required');
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error('❌ [TABLE BOOKING] Store not found:', storeId);
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Get bookings for the specified date
        const bookingDate = new Date(date);
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);
        const bookings = await TableBooking_1.TableBooking.find({
            storeId: new mongoose_1.Types.ObjectId(storeId),
            bookingDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'confirmed'] }
        }).select('bookingTime partySize status').lean();
        console.log('✅ [TABLE BOOKING] Found bookings for date:', bookings.length);
        // Generate time slots (example: 9 AM to 10 PM, every hour)
        const timeSlots = [];
        for (let hour = 9; hour <= 22; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            // Count bookings for this time slot
            const bookingsAtTime = bookings.filter(b => b.bookingTime === time);
            const totalPartySize = bookingsAtTime.reduce((sum, b) => sum + b.partySize, 0);
            // Assume max capacity of 100 people per time slot (adjust based on actual store capacity)
            const maxCapacity = 100;
            const available = totalPartySize < maxCapacity;
            const remainingCapacity = maxCapacity - totalPartySize;
            timeSlots.push({
                time,
                available,
                remainingCapacity,
                bookingsCount: bookingsAtTime.length
            });
        }
        return (0, response_1.sendSuccess)(res, {
            date: bookingDate,
            storeId,
            storeName: store.name,
            timeSlots,
            totalBookings: bookings.length
        }, 'Availability checked successfully');
    }
    catch (error) {
        console.error('❌ [TABLE BOOKING] Error checking availability:', error);
        return (0, response_1.sendError)(res, `Failed to check availability: ${error.message}`, 500);
    }
};
exports.checkAvailability = checkAvailability;
