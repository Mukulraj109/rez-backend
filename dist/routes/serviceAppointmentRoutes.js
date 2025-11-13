"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceAppointmentController_1 = require("../controllers/serviceAppointmentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// ==================== APPOINTMENT ROUTES ====================
// Create service appointment (protected)
router.post('/', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
    serviceType: validation_2.Joi.string().trim().min(2).max(200).required(),
    appointmentDate: validation_2.Joi.date().iso().required(),
    appointmentTime: validation_2.Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        .messages({
        'string.pattern.base': 'Time must be in HH:MM format (e.g., 14:30)'
    }),
    duration: validation_2.Joi.number().integer().min(15).max(480).default(60),
    customerName: validation_2.Joi.string().trim().min(2).max(100).required(),
    customerPhone: validation_2.Joi.string().trim().pattern(/^[0-9]{10}$/).required()
        .messages({
        'string.pattern.base': 'Phone number must be 10 digits'
    }),
    customerEmail: validation_2.Joi.string().trim().email().optional(),
    specialInstructions: validation_2.Joi.string().trim().max(1000).optional(),
})), serviceAppointmentController_1.createServiceAppointment);
// Get user's appointments (protected)
router.get('/user', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled').optional(),
})), serviceAppointmentController_1.getUserServiceAppointments);
// Get appointment by ID (protected)
router.get('/:appointmentId', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    appointmentId: validation_1.commonSchemas.objectId().required(),
})), serviceAppointmentController_1.getServiceAppointment);
// Get store's appointments (protected)
router.get('/store/:storeId', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    date: validation_2.Joi.date().iso().optional(),
    status: validation_2.Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled').optional(),
})), serviceAppointmentController_1.getStoreServiceAppointments);
// Cancel appointment (protected)
router.put('/:appointmentId/cancel', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    appointmentId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().trim().max(500).optional(),
})), serviceAppointmentController_1.cancelServiceAppointment);
// Check availability for a time slot (public)
router.get('/availability/:storeId', (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    date: validation_2.Joi.date().iso().required(),
    time: validation_2.Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        .messages({
        'string.pattern.base': 'Time must be in HH:MM format (e.g., 14:30)'
    }),
    duration: validation_2.Joi.number().integer().min(15).max(480).default(60),
})), serviceAppointmentController_1.checkAvailability);
// Get available time slots for a date (public)
router.get('/slots/:storeId', (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    date: validation_2.Joi.date().iso().required(),
    duration: validation_2.Joi.number().integer().min(15).max(480).default(60),
})), serviceAppointmentController_1.getAvailableSlots);
exports.default = router;
