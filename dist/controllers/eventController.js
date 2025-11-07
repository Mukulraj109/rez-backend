"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEventAnalytics = exports.getEventAnalytics = exports.shareEvent = exports.getRelatedEvents = exports.toggleEventFavorite = exports.cancelBooking = exports.confirmBooking = exports.getUserBookings = exports.bookEventSlot = exports.getFeaturedEvents = exports.searchEvents = exports.getEventsByCategory = exports.getEventById = exports.getAllEvents = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const Payment_1 = __importDefault(require("../models/Payment"));
const asyncHandler_1 = require("../middleware/asyncHandler");
const paymentGatewayService_1 = __importDefault(require("../services/paymentGatewayService"));
// @desc    Get all published events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, location, date, limit = 20, offset = 0, featured, upcoming, sortBy = 'date' } = req.query;
    // Build query
    const query = { status: 'published' };
    if (category) {
        query.category = category;
    }
    if (location) {
        query['location.city'] = new RegExp(location, 'i');
    }
    if (date) {
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.date = {
            $gte: targetDate,
            $lt: nextDay
        };
    }
    if (featured === 'true') {
        query.featured = true;
    }
    if (upcoming === 'true') {
        query.date = { $gte: new Date() };
    }
    // Build sort
    let sort = { date: 1 };
    switch (sortBy) {
        case 'date':
            sort = { date: 1 };
            break;
        case 'popularity':
            sort = { 'analytics.views': -1 };
            break;
        case 'price':
            sort = { 'price.amount': 1 };
            break;
        case 'featured':
            sort = { featured: -1, priority: -1, date: 1 };
            break;
    }
    const events = await models_1.Event.find(query)
        .sort(sort)
        .limit(Number(limit))
        .skip(Number(offset))
        .lean();
    const total = await models_1.Event.countDocuments(query);
    res.json({
        success: true,
        data: {
            events,
            total,
            hasMore: Number(offset) + events.length < total,
            limit: Number(limit),
            offset: Number(offset)
        }
    });
});
// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Validate that id is a valid MongoDB ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid event ID format'
        });
    }
    const event = await models_1.Event.findById(id);
    if (!event) {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    if (event.status !== 'published') {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    // Increment view count
    await event.incrementViews();
    res.json({
        success: true,
        data: event
    });
});
// @desc    Get events by category
// @route   GET /api/events/category/:category
// @access  Public
exports.getEventsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const events = await models_1.Event.find({
        category: new RegExp(category, 'i'),
        status: 'published'
    })
        .sort({ date: 1 })
        .limit(Number(limit))
        .skip(Number(offset))
        .lean();
    const total = await models_1.Event.countDocuments({
        category: new RegExp(category, 'i'),
        status: 'published'
    });
    res.json({
        success: true,
        data: {
            events,
            total,
            hasMore: Number(offset) + events.length < total
        }
    });
});
// @desc    Search events
// @route   GET /api/events/search
// @access  Public
exports.searchEvents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q, category, location, date, priceMin, priceMax, isOnline, limit = 20, offset = 0 } = req.query;
    // Build search query
    const query = { status: 'published' };
    if (q) {
        query.$text = { $search: q };
    }
    if (category) {
        query.category = new RegExp(category, 'i');
    }
    if (location) {
        query['location.city'] = new RegExp(location, 'i');
    }
    if (date) {
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.date = {
            $gte: targetDate,
            $lt: nextDay
        };
    }
    if (priceMin || priceMax) {
        query['price.amount'] = {};
        if (priceMin)
            query['price.amount'].$gte = Number(priceMin);
        if (priceMax)
            query['price.amount'].$lte = Number(priceMax);
    }
    if (isOnline !== undefined) {
        query.isOnline = isOnline === 'true';
    }
    // Build sort - prioritize text search score if searching
    let sort = { date: 1 };
    if (q) {
        sort = { score: { $meta: 'textScore' }, date: 1 };
    }
    const events = await models_1.Event.find(query, q ? { score: { $meta: 'textScore' } } : {})
        .sort(sort)
        .limit(Number(limit))
        .skip(Number(offset))
        .lean();
    const total = await models_1.Event.countDocuments(query);
    // Get search suggestions
    const suggestions = await models_1.Event.distinct('category', { status: 'published' });
    res.json({
        success: true,
        data: {
            events,
            total,
            hasMore: Number(offset) + events.length < total,
            suggestions
        }
    });
});
// @desc    Get featured events for homepage
// @route   GET /api/events/featured
// @access  Public
exports.getFeaturedEvents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    const events = await models_1.Event.find({
        featured: true,
        status: 'published',
        date: { $gte: new Date() }
    })
        .sort({ priority: -1, date: 1 })
        .limit(Number(limit))
        .lean();
    res.json({
        success: true,
        data: events
    });
});
// @desc    Book event slot
// @route   POST /api/events/:id/book
// @access  Private
exports.bookEventSlot = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { slotId, attendeeInfo } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    // Find event
    const event = await models_1.Event.findById(id);
    if (!event || event.status !== 'published') {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    // Check if event is in the future
    if (event.date < new Date()) {
        return res.status(400).json({
            success: false,
            message: 'Cannot book past events'
        });
    }
    // Check if user already booked this event
    // Allow re-booking if previous booking failed (cancelled) or if pending booking has no payment info
    const existingBooking = await models_1.EventBooking.findOne({
        eventId: id,
        userId,
        status: { $in: ['pending', 'confirmed'] }
    });
    if (existingBooking) {
        // If booking is confirmed, user can't book again
        if (existingBooking.status === 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'You have already booked this event'
            });
        }
        // If booking is pending, check if it has payment info
        // If no payment info, we can reuse this booking and create payment
        if (existingBooking.status === 'pending') {
            // Check if this is a paid event
            if (!event.price.isFree && event.price.amount > 0) {
                // For paid events with pending booking, we'll create payment for existing booking
                // Delete the old booking and create a new one to ensure fresh payment intent
                console.log('🔄 [EVENT BOOKING] Found existing pending booking, deleting and creating new one');
                await models_1.EventBooking.findByIdAndDelete(existingBooking._id);
            }
            else {
                // For free events, pending booking shouldn't exist, but if it does, delete it
                console.log('🔄 [EVENT BOOKING] Found existing pending booking for free event, deleting');
                await models_1.EventBooking.findByIdAndDelete(existingBooking._id);
            }
        }
    }
    // Handle slot-based events
    if (event.availableSlots && event.availableSlots.length > 0) {
        if (!slotId) {
            return res.status(400).json({
                success: false,
                message: 'Slot ID is required for this event'
            });
        }
        const slot = event.availableSlots.find(s => s.id === slotId);
        if (!slot || !slot.available) {
            return res.status(400).json({
                success: false,
                message: 'Selected slot is not available'
            });
        }
        if (slot.bookedCount >= slot.maxCapacity) {
            return res.status(400).json({
                success: false,
                message: 'Selected slot is fully booked'
            });
        }
        // Update slot booking count
        slot.bookedCount += 1;
        await event.save();
    }
    // Generate booking reference before creating booking
    const generateBookingReference = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `EVT${timestamp}${random}`;
    };
    // Create booking
    const booking = new models_1.EventBooking({
        eventId: id,
        userId,
        slotId,
        amount: event.price.amount,
        currency: event.price.currency,
        attendeeInfo,
        bookingReference: generateBookingReference(), // Explicitly set booking reference
        status: event.price.isFree ? 'confirmed' : 'pending' // Free events are confirmed immediately
    });
    await booking.save();
    // Increment event booking count
    await event.incrementBookings();
    // For paid events, create Stripe payment intent
    let paymentData = null;
    if (!event.price.isFree && event.price.amount > 0) {
        try {
            // Normalize currency: convert symbol to ISO code (e.g., ₹ -> inr)
            const normalizeCurrency = (currency) => {
                const currencyMap = {
                    '₹': 'inr',
                    '$': 'usd',
                    '€': 'eur',
                    '£': 'gbp',
                    '¥': 'jpy',
                    'INR': 'inr',
                    'USD': 'usd',
                    'EUR': 'eur',
                    'GBP': 'gbp',
                    'JPY': 'jpy',
                };
                const normalized = currencyMap[currency] || currency.toLowerCase();
                return normalized;
            };
            const normalizedCurrency = normalizeCurrency(event.price.currency || '₹');
            console.log('💳 [EVENT BOOKING] Creating payment intent for paid event:', {
                amount: event.price.amount,
                originalCurrency: event.price.currency,
                normalizedCurrency,
                bookingId: booking._id.toString()
            });
            const paymentResponse = await paymentGatewayService_1.default.initiatePayment({
                amount: event.price.amount,
                currency: normalizedCurrency,
                paymentMethod: 'stripe',
                paymentMethodType: 'card',
                userDetails: {
                    name: attendeeInfo?.name || '',
                    email: attendeeInfo?.email || '',
                    phone: attendeeInfo?.phone || '',
                },
                metadata: {
                    eventId: id,
                    bookingId: booking._id.toString(),
                    userId: userId.toString(),
                    eventTitle: event.title,
                    slotId: slotId || '',
                },
            }, userId.toString());
            console.log('💳 [EVENT BOOKING] Payment response received:', {
                paymentId: paymentResponse.paymentId,
                hasGatewayResponse: !!paymentResponse.gatewayResponse,
                hasClientSecret: !!paymentResponse.gatewayResponse?.clientSecret
            });
            if (!paymentResponse.gatewayResponse || !paymentResponse.gatewayResponse.clientSecret) {
                throw new Error('Payment gateway did not return client secret');
            }
            paymentData = {
                paymentIntentId: paymentResponse.gatewayResponse?.paymentIntentId || paymentResponse.paymentId,
                clientSecret: paymentResponse.gatewayResponse?.clientSecret || '',
                sessionId: paymentResponse.paymentUrl ? paymentResponse.paymentUrl.split('/').pop() : null,
            };
            console.log('✅ [EVENT BOOKING] Payment intent created successfully:', {
                paymentIntentId: paymentData.paymentIntentId,
                hasClientSecret: !!paymentData.clientSecret
            });
        }
        catch (paymentError) {
            console.error('❌ [EVENT BOOKING] Failed to create payment intent:', {
                error: paymentError.message,
                stack: paymentError.stack,
                bookingId: booking._id.toString()
            });
            // For paid events, we need payment info - throw error instead of silently failing
            throw new Error(`Failed to create payment intent: ${paymentError.message || 'Payment gateway error'}`);
        }
    }
    res.status(201).json({
        success: true,
        data: {
            booking,
            payment: paymentData, // Include payment info for paid events
        },
        message: event.price.isFree
            ? 'Event booked successfully'
            : 'Booking created. Please complete payment to confirm your booking.'
    });
});
// @desc    Get user's event bookings
// @route   GET /api/events/my-bookings
// @access  Private
exports.getUserBookings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { status, limit = 20, offset = 0 } = req.query;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const query = { userId };
    if (status) {
        query.status = status;
    }
    const bookings = await models_1.EventBooking.find(query)
        .populate('eventId')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset))
        .lean();
    const total = await models_1.EventBooking.countDocuments(query);
    res.json({
        success: true,
        data: {
            bookings,
            total,
            hasMore: Number(offset) + bookings.length < total
        }
    });
});
// @desc    Confirm booking after payment
// @route   PUT /api/events/bookings/:bookingId/confirm
// @access  Private
exports.confirmBooking = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    const { paymentIntentId } = req.body;
    console.log('🔍 [EVENT BOOKING] Confirm booking request:', {
        bookingId,
        userId,
        paymentIntentId,
        body: req.body
    });
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const booking = await models_1.EventBooking.findOne({
        _id: bookingId,
        userId
    });
    if (!booking) {
        console.error('❌ [EVENT BOOKING] Booking not found:', { bookingId, userId });
        return res.status(404).json({
            success: false,
            message: 'Booking not found'
        });
    }
    console.log('📋 [EVENT BOOKING] Booking found:', {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus
    });
    if (booking.status === 'confirmed') {
        console.log('✅ [EVENT BOOKING] Booking already confirmed');
        return res.json({
            success: true,
            message: 'Booking is already confirmed',
            data: { booking }
        });
    }
    if (booking.status === 'cancelled') {
        console.error('❌ [EVENT BOOKING] Cannot confirm cancelled booking');
        return res.status(400).json({
            success: false,
            message: 'Cannot confirm a cancelled booking'
        });
    }
    // Verify payment if paymentIntentId is provided (optional - for immediate confirmation)
    // Note: Payment might not be marked as completed yet if called immediately after payment
    // The webhook will also update the status as a backup
    if (paymentIntentId) {
        try {
            const payment = await Payment_1.default.findOne({
                $or: [
                    { paymentId: paymentIntentId },
                    { 'gatewayResponse.paymentIntentId': paymentIntentId }
                ],
                user: userId
            });
            // If payment exists, log it but don't block confirmation
            // Payment status might still be 'pending' if called immediately after payment
            if (payment) {
                console.log('✅ [EVENT BOOKING] Payment found for confirmation:', {
                    paymentId: payment.paymentId,
                    status: payment.status,
                    bookingId
                });
            }
            else {
                console.warn('⚠️ [EVENT BOOKING] Payment not found yet, but confirming booking anyway:', paymentIntentId);
                // Continue anyway - payment might not be saved yet or webhook will handle it
            }
        }
        catch (error) {
            console.error('❌ [EVENT BOOKING] Error verifying payment:', error);
            // Continue anyway if payment verification fails - webhook will handle it
        }
    }
    // Update booking status to confirmed
    try {
        booking.status = 'confirmed';
        if (booking.paymentStatus) {
            booking.paymentStatus = 'completed';
        }
        await booking.save();
        console.log('✅ [EVENT BOOKING] Booking confirmed successfully:', {
            bookingId: booking._id,
            status: booking.status,
            paymentStatus: booking.paymentStatus
        });
        res.json({
            success: true,
            message: 'Booking confirmed successfully',
            data: { booking }
        });
    }
    catch (error) {
        console.error('❌ [EVENT BOOKING] Error saving booking:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to confirm booking',
            error: error.errors || error
        });
    }
});
// @desc    Cancel event booking
// @route   DELETE /api/events/bookings/:bookingId
// @access  Private
exports.cancelBooking = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const booking = await models_1.EventBooking.findOne({
        _id: bookingId,
        userId
    });
    if (!booking) {
        return res.status(404).json({
            success: false,
            message: 'Booking not found'
        });
    }
    if (booking.status === 'cancelled') {
        return res.status(400).json({
            success: false,
            message: 'Booking is already cancelled'
        });
    }
    // Update slot availability if applicable
    if (booking.slotId) {
        const event = await models_1.Event.findById(booking.eventId);
        if (event && event.availableSlots) {
            const slot = event.availableSlots.find(s => s.id === booking.slotId);
            if (slot) {
                slot.bookedCount = Math.max(0, slot.bookedCount - 1);
                await event.save();
            }
        }
    }
    await booking.cancel('Cancelled by user');
    res.json({
        success: true,
        message: 'Booking cancelled successfully'
    });
});
// @desc    Toggle event favorite
// @route   POST /api/events/:id/favorite
// @access  Private
exports.toggleEventFavorite = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    // This would typically interact with a UserFavorites model
    // For now, we'll just increment the favorites count
    const event = await models_1.Event.findById(id);
    if (!event) {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    await event.incrementFavorites();
    res.json({
        success: true,
        message: 'Event favorited successfully'
    });
});
// @desc    Get related events
// @route   GET /api/events/:id/related
// @access  Public
exports.getRelatedEvents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { limit = 6 } = req.query;
    try {
        const event = await models_1.Event.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        // Find related events based on:
        // 1. Same category (highest priority)
        // 2. Same location (secondary)
        const categoryQuery = { category: event.category, _id: { $ne: id }, status: 'published' };
        const locationQuery = event.location?.city
            ? { 'location.city': event.location.city, _id: { $ne: id }, status: 'published' }
            : null;
        // Get events from same category first
        const categoryEvents = await models_1.Event.find(categoryQuery)
            .limit(Number(limit))
            .sort({ date: 1, 'analytics.views': -1 })
            .lean();
        // If not enough events, add events from same location
        let relatedEvents = [...categoryEvents];
        if (relatedEvents.length < Number(limit) && locationQuery) {
            const locationEvents = await models_1.Event.find(locationQuery)
                .limit(Number(limit) - relatedEvents.length)
                .sort({ date: 1, 'analytics.views': -1 })
                .lean();
            relatedEvents = [
                ...relatedEvents,
                ...locationEvents.filter((e) => !relatedEvents.some((re) => re._id.toString() === e._id.toString()))
            ];
        }
        // Limit to requested count
        relatedEvents = relatedEvents.slice(0, Number(limit));
        res.json({
            success: true,
            data: relatedEvents,
            message: 'Related events retrieved successfully'
        });
    }
    catch (error) {
        console.error('❌ [RELATED EVENTS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get related events'
        });
    }
});
// @desc    Share event
// @route   POST /api/events/:id/share
// @access  Public
exports.shareEvent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const event = await models_1.Event.findById(id);
    if (!event) {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    await event.incrementShares();
    res.json({
        success: true,
        message: 'Event share recorded'
    });
});
// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Private (Admin/Organizer)
exports.getEventAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const event = await models_1.Event.findById(id);
    if (!event) {
        return res.status(404).json({
            success: false,
            message: 'Event not found'
        });
    }
    // Get booking statistics
    const bookingStats = await models_1.EventBooking.aggregate([
        { $match: { eventId: event._id } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
    res.json({
        success: true,
        data: {
            event: {
                id: event._id,
                title: event.title,
                analytics: event.analytics
            },
            bookingStats
        }
    });
});
// @desc    Track event analytics events
// @route   POST /api/events/analytics/track
// @access  Public (optional auth)
exports.trackEventAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { events } = req.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Events array is required'
        });
    }
    try {
        // Process each event
        const results = await Promise.allSettled(events.map(async (eventData) => {
            const { eventId, eventType, metadata } = eventData;
            if (!eventId || !eventType) {
                return { success: false, message: 'Missing eventId or eventType' };
            }
            const event = await models_1.Event.findById(eventId);
            if (!event) {
                return { success: false, message: `Event ${eventId} not found` };
            }
            // Update analytics based on event type
            switch (eventType) {
                case 'view':
                    await event.incrementViews();
                    break;
                case 'favorite':
                    await event.incrementFavorites();
                    break;
                case 'unfavorite':
                    // Decrement favorites (if needed, you might want to add a method for this)
                    if (event.analytics.favorites > 0) {
                        event.analytics.favorites -= 1;
                        await event.save();
                    }
                    break;
                case 'share':
                    await event.incrementShares();
                    break;
                case 'booking_start':
                case 'booking_complete':
                    // These are tracked separately via bookings, but we can log them
                    // The actual booking count is updated when booking is created
                    break;
                case 'slot_select':
                case 'payment_start':
                case 'payment_complete':
                case 'payment_failed':
                case 'add_to_cart':
                    // These are informational events, no direct analytics update needed
                    break;
                default:
                    // Unknown event type, but we'll still accept it
                    break;
            }
            return { success: true, eventId, eventType };
        }));
        // Count successes and failures
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        res.json({
            success: true,
            message: `Processed ${successful} of ${events.length} events`,
            processed: successful,
            failed
        });
    }
    catch (error) {
        console.error('❌ [EVENT ANALYTICS] Error tracking events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track events',
            error: error.message
        });
    }
});
