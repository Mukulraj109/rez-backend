import { Request, Response } from 'express';
/**
 * Create new service appointment
 * POST /api/service-appointments
 */
export declare const createServiceAppointment: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's service appointments
 * GET /api/service-appointments/user
 */
export declare const getUserServiceAppointments: (req: Request, res: Response) => Promise<void>;
/**
 * Get service appointment by ID
 * GET /api/service-appointments/:appointmentId
 */
export declare const getServiceAppointment: (req: Request, res: Response) => Promise<void>;
/**
 * Get store's service appointments
 * GET /api/service-appointments/store/:storeId
 */
export declare const getStoreServiceAppointments: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel service appointment
 * PUT /api/service-appointments/:appointmentId/cancel
 */
export declare const cancelServiceAppointment: (req: Request, res: Response) => Promise<void>;
/**
 * Check availability for a time slot
 * GET /api/service-appointments/availability/:storeId
 */
export declare const checkAvailability: (req: Request, res: Response) => Promise<void>;
/**
 * Get available time slots for a date
 * GET /api/service-appointments/slots/:storeId
 */
export declare const getAvailableSlots: (req: Request, res: Response) => Promise<void>;
