"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAvailability = exports.cancelConsultation = exports.getStoreConsultations = exports.getConsultation = exports.getUserConsultations = exports.createConsultation = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Consultation_1 = __importDefault(require("../models/Consultation"));
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
// @desc    Create new consultation booking
// @route   POST /api/consultations
// @access  Private
exports.createConsultation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const { storeId, consultationType, consultationDate, consultationTime, duration = 30, patientName, patientAge, patientPhone, patientEmail, reasonForConsultation, medicalHistory } = req.body;
    console.log('📋 [CONSULTATION] Creating consultation:', {
        userId,
        storeId,
        consultationType,
        consultationDate,
        consultationTime,
        patientName,
        patientAge
    });
    // Validate required fields
    if (!storeId || !consultationType || !consultationDate || !consultationTime ||
        !patientName || !patientAge || !patientPhone || !reasonForConsultation) {
        return (0, response_1.sendError)(res, 'Missing required fields', 400);
    }
    // Validate patient age
    if (typeof patientAge !== 'number' || patientAge <= 0 || patientAge > 150) {
        return (0, response_1.sendError)(res, 'Patient age must be a positive number between 1 and 150', 400);
    }
    // Validate storeId format
    if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
        return (0, response_1.sendError)(res, 'Invalid store ID format', 400);
    }
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error('❌ [CONSULTATION] Store not found:', storeId);
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check if store supports consultations
        if (store.bookingType !== 'CONSULTATION' && store.bookingType !== 'HYBRID') {
            return (0, response_1.sendError)(res, 'This store does not offer consultation services', 400);
        }
        // Validate consultation type is supported by store
        if (store.consultationTypes && store.consultationTypes.length > 0) {
            if (!store.consultationTypes.includes(consultationType)) {
                return (0, response_1.sendError)(res, `Consultation type "${consultationType}" not available. Available types: ${store.consultationTypes.join(', ')}`, 400);
            }
        }
        // Check if consultation date is in the future
        const selectedDate = new Date(consultationDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (selectedDate < now) {
            return (0, response_1.sendError)(res, 'Consultation date must be in the future', 400);
        }
        // Create consultation
        const consultation = new Consultation_1.default({
            storeId,
            userId,
            consultationType,
            consultationDate: selectedDate,
            consultationTime,
            duration,
            patientName,
            patientAge,
            patientPhone,
            patientEmail,
            reasonForConsultation,
            medicalHistory,
            status: 'pending'
        });
        await consultation.save();
        console.log('✅ [CONSULTATION] Consultation created:', {
            consultationNumber: consultation.consultationNumber,
            consultationId: consultation._id
        });
        // Populate store and user details
        await consultation.populate('storeId', 'name location contact');
        await consultation.populate('userId', 'name phoneNumber email');
        return (0, response_1.sendCreated)(res, consultation, 'Consultation booked successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error creating consultation:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to create consultation', 500);
    }
});
// @desc    Get user's consultations
// @route   GET /api/consultations/user
// @access  Private
exports.getUserConsultations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const { status, limit = 20, offset = 0 } = req.query;
    console.log('📋 [CONSULTATION] Fetching user consultations:', {
        userId,
        status,
        limit,
        offset
    });
    try {
        const query = { userId };
        if (status) {
            query.status = status;
        }
        const consultations = await Consultation_1.default.find(query)
            .populate('storeId', 'name location contact consultationTypes')
            .sort({ consultationDate: -1, createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset))
            .lean();
        const total = await Consultation_1.default.countDocuments(query);
        console.log('✅ [CONSULTATION] Found consultations:', {
            count: consultations.length,
            total
        });
        return (0, response_1.sendSuccess)(res, {
            consultations,
            total,
            hasMore: Number(offset) + consultations.length < total,
            limit: Number(limit),
            offset: Number(offset)
        }, 'Consultations retrieved successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error fetching user consultations:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch consultations', 500);
    }
});
// @desc    Get consultation by ID
// @route   GET /api/consultations/:consultationId
// @access  Private
exports.getConsultation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { consultationId } = req.params;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(consultationId)) {
        return (0, response_1.sendError)(res, 'Invalid consultation ID format', 400);
    }
    console.log('📋 [CONSULTATION] Fetching consultation:', {
        consultationId,
        userId
    });
    try {
        const consultation = await Consultation_1.default.findOne({
            _id: consultationId,
            userId
        })
            .populate('storeId', 'name location contact consultationTypes bookingConfig')
            .populate('userId', 'name phoneNumber email');
        if (!consultation) {
            console.error('❌ [CONSULTATION] Consultation not found:', consultationId);
            return (0, response_1.sendNotFound)(res, 'Consultation not found');
        }
        console.log('✅ [CONSULTATION] Consultation found:', {
            consultationNumber: consultation.consultationNumber,
            status: consultation.status
        });
        return (0, response_1.sendSuccess)(res, consultation, 'Consultation retrieved successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error fetching consultation:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch consultation', 500);
    }
});
// @desc    Get store's consultations
// @route   GET /api/consultations/store/:storeId
// @access  Private
exports.getStoreConsultations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { storeId } = req.params;
    const { date, status, limit = 50, offset = 0 } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
        return (0, response_1.sendError)(res, 'Invalid store ID format', 400);
    }
    console.log('📋 [CONSULTATION] Fetching store consultations:', {
        storeId,
        date,
        status,
        userId
    });
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        const query = { storeId };
        if (status) {
            query.status = status;
        }
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.consultationDate = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        const consultations = await Consultation_1.default.find(query)
            .populate('userId', 'name phoneNumber email')
            .sort({ consultationDate: 1, consultationTime: 1 })
            .limit(Number(limit))
            .skip(Number(offset))
            .lean();
        const total = await Consultation_1.default.countDocuments(query);
        console.log('✅ [CONSULTATION] Found store consultations:', {
            count: consultations.length,
            total
        });
        return (0, response_1.sendSuccess)(res, {
            consultations,
            total,
            hasMore: Number(offset) + consultations.length < total,
            limit: Number(limit),
            offset: Number(offset)
        }, 'Store consultations retrieved successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error fetching store consultations:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch store consultations', 500);
    }
});
// @desc    Cancel consultation
// @route   PUT /api/consultations/:consultationId/cancel
// @access  Private
exports.cancelConsultation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { consultationId } = req.params;
    const { reason } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(consultationId)) {
        return (0, response_1.sendError)(res, 'Invalid consultation ID format', 400);
    }
    console.log('📋 [CONSULTATION] Cancelling consultation:', {
        consultationId,
        userId,
        reason
    });
    try {
        const consultation = await Consultation_1.default.findOne({
            _id: consultationId,
            userId
        });
        if (!consultation) {
            console.error('❌ [CONSULTATION] Consultation not found:', consultationId);
            return (0, response_1.sendNotFound)(res, 'Consultation not found');
        }
        if (consultation.status === 'cancelled') {
            return (0, response_1.sendError)(res, 'Consultation is already cancelled', 400);
        }
        if (consultation.status === 'completed') {
            return (0, response_1.sendError)(res, 'Cannot cancel a completed consultation', 400);
        }
        // Update status to cancelled
        await consultation.updateStatus('cancelled');
        if (reason) {
            consultation.notes = `Cancellation reason: ${reason}`;
            await consultation.save();
        }
        console.log('✅ [CONSULTATION] Consultation cancelled:', {
            consultationNumber: consultation.consultationNumber
        });
        return (0, response_1.sendSuccess)(res, consultation, 'Consultation cancelled successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error cancelling consultation:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to cancel consultation', 500);
    }
});
// @desc    Check available time slots for consultation
// @route   GET /api/consultations/availability/:storeId
// @access  Public
exports.checkAvailability = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { date, consultationType } = req.query;
    if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
        return (0, response_1.sendError)(res, 'Invalid store ID format', 400);
    }
    if (!date) {
        return (0, response_1.sendError)(res, 'Date parameter is required', 400);
    }
    console.log('📋 [CONSULTATION] Checking availability:', {
        storeId,
        date,
        consultationType
    });
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check if store supports consultations
        if (store.bookingType !== 'CONSULTATION' && store.bookingType !== 'HYBRID') {
            return (0, response_1.sendError)(res, 'This store does not offer consultation services', 400);
        }
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        // Get all consultations for the specified date
        const query = {
            storeId,
            consultationDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'confirmed', 'in_progress'] }
        };
        if (consultationType) {
            query.consultationType = consultationType;
        }
        const bookedConsultations = await Consultation_1.default.find(query)
            .select('consultationTime duration')
            .lean();
        // Generate available time slots based on store working hours
        const workingHours = store.bookingConfig?.workingHours || {
            start: '09:00',
            end: '21:00'
        };
        const slotDuration = store.bookingConfig?.slotDuration || 30;
        const availableSlots = [];
        const bookedSlots = bookedConsultations.map(c => c.consultationTime);
        // Generate slots from working hours
        const [startHour, startMin] = workingHours.start.split(':').map(Number);
        const [endHour, endMin] = workingHours.end.split(':').map(Number);
        let currentHour = startHour;
        let currentMin = startMin;
        while (currentHour < endHour ||
            (currentHour === endHour && currentMin < endMin)) {
            const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
            if (!bookedSlots.includes(timeSlot)) {
                availableSlots.push(timeSlot);
            }
            currentMin += slotDuration;
            if (currentMin >= 60) {
                currentHour += Math.floor(currentMin / 60);
                currentMin = currentMin % 60;
            }
        }
        console.log('✅ [CONSULTATION] Availability checked:', {
            totalSlots: availableSlots.length,
            bookedSlots: bookedSlots.length
        });
        return (0, response_1.sendSuccess)(res, {
            date: targetDate,
            availableSlots,
            bookedSlots,
            slotDuration,
            workingHours,
            consultationTypes: store.consultationTypes || []
        }, 'Availability retrieved successfully');
    }
    catch (error) {
        console.error('❌ [CONSULTATION] Error checking availability:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to check availability', 500);
    }
});
