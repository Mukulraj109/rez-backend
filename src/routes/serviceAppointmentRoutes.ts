import { Router } from 'express';
import {
  createServiceAppointment,
  getUserServiceAppointments,
  getServiceAppointment,
  getStoreServiceAppointments,
  cancelServiceAppointment,
  checkAvailability,
  getAvailableSlots,
} from '../controllers/serviceAppointmentController';
import { authenticate } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// ==================== APPOINTMENT ROUTES ====================

// Create service appointment (protected)
router.post(
  '/',
  authenticate,
  validate(Joi.object({
    storeId: commonSchemas.objectId().required(),
    serviceType: Joi.string().trim().min(2).max(200).required(),
    appointmentDate: Joi.date().iso().required(),
    appointmentTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'Time must be in HH:MM format (e.g., 14:30)'
      }),
    duration: Joi.number().integer().min(15).max(480).default(60),
    customerName: Joi.string().trim().min(2).max(100).required(),
    customerPhone: Joi.string().trim().pattern(/^[0-9]{10}$/).required()
      .messages({
        'string.pattern.base': 'Phone number must be 10 digits'
      }),
    customerEmail: Joi.string().trim().email().optional(),
    specialInstructions: Joi.string().trim().max(1000).optional(),
  })),
  createServiceAppointment
);

// Get user's appointments (protected)
router.get(
  '/user',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled').optional(),
  })),
  getUserServiceAppointments
);

// Get appointment by ID (protected)
router.get(
  '/:appointmentId',
  authenticate,
  validateParams(Joi.object({
    appointmentId: commonSchemas.objectId().required(),
  })),
  getServiceAppointment
);

// Get store's appointments (protected)
router.get(
  '/store/:storeId',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required(),
  })),
  validateQuery(Joi.object({
    date: Joi.date().iso().optional(),
    status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled').optional(),
  })),
  getStoreServiceAppointments
);

// Cancel appointment (protected)
router.put(
  '/:appointmentId/cancel',
  authenticate,
  validateParams(Joi.object({
    appointmentId: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    reason: Joi.string().trim().max(500).optional(),
  })),
  cancelServiceAppointment
);

// Check availability for a time slot (public)
router.get(
  '/availability/:storeId',
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required(),
  })),
  validateQuery(Joi.object({
    date: Joi.date().iso().required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'Time must be in HH:MM format (e.g., 14:30)'
      }),
    duration: Joi.number().integer().min(15).max(480).default(60),
  })),
  checkAvailability
);

// Get available time slots for a date (public)
router.get(
  '/slots/:storeId',
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required(),
  })),
  validateQuery(Joi.object({
    date: Joi.date().iso().required(),
    duration: Joi.number().integer().min(15).max(480).default(60),
  })),
  getAvailableSlots
);

export default router;
