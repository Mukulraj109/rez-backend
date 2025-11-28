"use strict";
// ServiceAppointment Controller
// Handles service appointment booking API endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableSlots = exports.checkAvailability = exports.cancelServiceAppointment = exports.getStoreServiceAppointments = exports.getServiceAppointment = exports.getUserServiceAppointments = exports.createServiceAppointment = void 0;
const mongoose_1 = require("mongoose");
const ServiceAppointment_1 = require("../models/ServiceAppointment");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
/**
 * Create new service appointment
 * POST /api/service-appointments
 */
const createServiceAppointment = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        const { storeId, serviceType, appointmentDate, appointmentTime, duration, customerName, customerPhone, customerEmail, specialInstructions, } = req.body;
        // Validate required fields
        if (!storeId || !serviceType || !appointmentDate || !appointmentTime || !customerName || !customerPhone) {
            (0, response_1.sendError)(res, 'Missing required fields', 400);
            return;
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            (0, response_1.sendNotFound)(res, 'Store not found');
            return;
        }
        // Verify store type supports appointments
        const storeTypeField = store.type;
        if (storeTypeField && storeTypeField !== 'SERVICE') {
            (0, response_1.sendError)(res, 'This store does not support service appointments', 400);
            return;
        }
        // Check availability
        const isAvailable = await ServiceAppointment_1.ServiceAppointment.checkAvailability(new mongoose_1.Types.ObjectId(storeId), new Date(appointmentDate), appointmentTime, duration || 60);
        if (!isAvailable) {
            (0, response_1.sendError)(res, 'This time slot is not available. Please choose another time.', 409);
            return;
        }
        // Generate appointment number
        const appointmentNumber = await ServiceAppointment_1.ServiceAppointment.generateAppointmentNumber();
        // Create appointment
        const appointment = await ServiceAppointment_1.ServiceAppointment.create({
            appointmentNumber,
            store: new mongoose_1.Types.ObjectId(storeId),
            user: new mongoose_1.Types.ObjectId(userId),
            serviceType,
            appointmentDate: new Date(appointmentDate),
            appointmentTime,
            duration: duration || 60,
            customerName,
            customerPhone,
            customerEmail,
            specialInstructions,
            status: 'pending',
        });
        // Populate store and user details
        const populatedAppointment = await ServiceAppointment_1.ServiceAppointment.findById(appointment._id)
            .populate('store', 'name logo location contact')
            .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');
        console.log(`✅ [SERVICE APPOINTMENT] Created appointment ${appointmentNumber} for store ${storeId}`);
        (0, response_1.sendCreated)(res, populatedAppointment, 'Service appointment created successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error creating appointment:', error);
        (0, response_1.sendError)(res, 'Failed to create service appointment', 500);
    }
};
exports.createServiceAppointment = createServiceAppointment;
/**
 * Get user's service appointments
 * GET /api/service-appointments/user
 */
const getUserServiceAppointments = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        const { status } = req.query;
        const query = { user: new mongoose_1.Types.ObjectId(userId) };
        if (status) {
            query.status = status;
        }
        const appointments = await ServiceAppointment_1.ServiceAppointment.find(query)
            .populate('store', 'name logo location contact operationalInfo')
            .sort({ appointmentDate: -1, createdAt: -1 })
            .lean();
        console.log(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for user ${userId}`);
        (0, response_1.sendSuccess)(res, { appointments, total: appointments.length }, 'Appointments retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error getting user appointments:', error);
        (0, response_1.sendError)(res, 'Failed to get appointments', 500);
    }
};
exports.getUserServiceAppointments = getUserServiceAppointments;
/**
 * Get service appointment by ID
 * GET /api/service-appointments/:appointmentId
 */
const getServiceAppointment = async (req, res) => {
    try {
        const userId = req.userId;
        const { appointmentId } = req.params;
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        if (!mongoose_1.Types.ObjectId.isValid(appointmentId)) {
            (0, response_1.sendError)(res, 'Invalid appointment ID', 400);
            return;
        }
        const appointment = await ServiceAppointment_1.ServiceAppointment.findById(appointmentId)
            .populate('store', 'name logo location contact operationalInfo bookingConfig')
            .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
            .lean();
        if (!appointment) {
            (0, response_1.sendNotFound)(res, 'Appointment not found');
            return;
        }
        // Verify the appointment belongs to the user
        if (appointment.user._id.toString() !== userId) {
            (0, response_1.sendError)(res, 'Unauthorized to access this appointment', 403);
            return;
        }
        console.log(`✅ [SERVICE APPOINTMENT] Retrieved appointment ${appointmentId}`);
        (0, response_1.sendSuccess)(res, appointment, 'Appointment retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error getting appointment:', error);
        (0, response_1.sendError)(res, 'Failed to get appointment', 500);
    }
};
exports.getServiceAppointment = getServiceAppointment;
/**
 * Get store's service appointments
 * GET /api/service-appointments/store/:storeId
 */
const getStoreServiceAppointments = async (req, res) => {
    try {
        const userId = req.userId;
        const { storeId } = req.params;
        const { date, status } = req.query;
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        if (!mongoose_1.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            (0, response_1.sendNotFound)(res, 'Store not found');
            return;
        }
        const query = { store: new mongoose_1.Types.ObjectId(storeId) };
        // Filter by date if provided
        if (date) {
            const filterDate = new Date(date);
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.appointmentDate = {
                $gte: startOfDay,
                $lte: endOfDay,
            };
        }
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        const appointments = await ServiceAppointment_1.ServiceAppointment.find(query)
            .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
            .sort({ appointmentDate: 1, appointmentTime: 1 })
            .lean();
        console.log(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for store ${storeId}`);
        (0, response_1.sendSuccess)(res, { appointments, total: appointments.length }, 'Store appointments retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error getting store appointments:', error);
        (0, response_1.sendError)(res, 'Failed to get store appointments', 500);
    }
};
exports.getStoreServiceAppointments = getStoreServiceAppointments;
/**
 * Cancel service appointment
 * PUT /api/service-appointments/:appointmentId/cancel
 */
const cancelServiceAppointment = async (req, res) => {
    try {
        const userId = req.userId;
        const { appointmentId } = req.params;
        const { reason } = req.body;
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        if (!mongoose_1.Types.ObjectId.isValid(appointmentId)) {
            (0, response_1.sendError)(res, 'Invalid appointment ID', 400);
            return;
        }
        const appointment = await ServiceAppointment_1.ServiceAppointment.findById(appointmentId);
        if (!appointment) {
            (0, response_1.sendNotFound)(res, 'Appointment not found');
            return;
        }
        // Verify the appointment belongs to the user
        if (appointment.user.toString() !== userId) {
            (0, response_1.sendError)(res, 'Unauthorized to cancel this appointment', 403);
            return;
        }
        // Check if appointment can be cancelled
        if (appointment.status === 'cancelled') {
            (0, response_1.sendError)(res, 'Appointment is already cancelled', 400);
            return;
        }
        if (appointment.status === 'completed') {
            (0, response_1.sendError)(res, 'Cannot cancel a completed appointment', 400);
            return;
        }
        // Cancel the appointment
        await appointment.cancel(reason);
        // Populate for response
        const updatedAppointment = await ServiceAppointment_1.ServiceAppointment.findById(appointmentId)
            .populate('store', 'name logo location contact')
            .lean();
        console.log(`✅ [SERVICE APPOINTMENT] Cancelled appointment ${appointmentId}`);
        (0, response_1.sendSuccess)(res, updatedAppointment, 'Appointment cancelled successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error cancelling appointment:', error);
        (0, response_1.sendError)(res, 'Failed to cancel appointment', 500);
    }
};
exports.cancelServiceAppointment = cancelServiceAppointment;
/**
 * Check availability for a time slot
 * GET /api/service-appointments/availability/:storeId
 */
const checkAvailability = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { date, time, duration } = req.query;
        if (!mongoose_1.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        if (!date || !time) {
            (0, response_1.sendError)(res, 'Date and time are required', 400);
            return;
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            (0, response_1.sendNotFound)(res, 'Store not found');
            return;
        }
        const appointmentDate = new Date(date);
        const appointmentTime = time;
        const appointmentDuration = duration ? parseInt(duration) : 60;
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(appointmentTime)) {
            (0, response_1.sendError)(res, 'Invalid time format. Use HH:MM format', 400);
            return;
        }
        const isAvailable = await ServiceAppointment_1.ServiceAppointment.checkAvailability(new mongoose_1.Types.ObjectId(storeId), appointmentDate, appointmentTime, appointmentDuration);
        console.log(`✅ [SERVICE APPOINTMENT] Checked availability for ${storeId} on ${date} at ${time}: ${isAvailable}`);
        (0, response_1.sendSuccess)(res, {
            available: isAvailable,
            date: appointmentDate,
            time: appointmentTime,
            duration: appointmentDuration,
        }, isAvailable ? 'Time slot is available' : 'Time slot is not available');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error checking availability:', error);
        (0, response_1.sendError)(res, 'Failed to check availability', 500);
    }
};
exports.checkAvailability = checkAvailability;
/**
 * Get available time slots for a date
 * GET /api/service-appointments/slots/:storeId
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { date, duration } = req.query;
        if (!mongoose_1.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        if (!date) {
            (0, response_1.sendError)(res, 'Date is required', 400);
            return;
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId).lean();
        if (!store) {
            (0, response_1.sendNotFound)(res, 'Store not found');
            return;
        }
        const appointmentDate = new Date(date);
        const appointmentDuration = duration ? parseInt(duration) : 60;
        // Get store working hours (default 9 AM to 9 PM if not specified)
        let workingHours = { start: '09:00', end: '21:00' };
        if (store.bookingConfig?.workingHours) {
            workingHours = store.bookingConfig.workingHours;
        }
        else if (store.operationalInfo?.hours) {
            // Try to get from operational hours
            const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const dayHours = store.operationalInfo.hours[dayName];
            if (dayHours && !dayHours.closed) {
                workingHours = { start: dayHours.open, end: dayHours.close };
            }
        }
        // Generate time slots
        const [startHour, startMin] = workingHours.start.split(':').map(Number);
        const [endHour, endMin] = workingHours.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const slots = [];
        // Generate slots every 30 minutes
        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            const hour = Math.floor(minutes / 60);
            const min = minutes % 60;
            const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            // Check if slot is available
            const isAvailable = await ServiceAppointment_1.ServiceAppointment.checkAvailability(new mongoose_1.Types.ObjectId(storeId), appointmentDate, timeSlot, appointmentDuration);
            slots.push({
                time: timeSlot,
                available: isAvailable,
            });
        }
        console.log(`✅ [SERVICE APPOINTMENT] Generated ${slots.length} time slots for ${storeId} on ${date}`);
        (0, response_1.sendSuccess)(res, {
            date: appointmentDate,
            slots,
            workingHours,
        }, 'Available slots retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SERVICE APPOINTMENT] Error getting available slots:', error);
        (0, response_1.sendError)(res, 'Failed to get available slots', 500);
    }
};
exports.getAvailableSlots = getAvailableSlots;
