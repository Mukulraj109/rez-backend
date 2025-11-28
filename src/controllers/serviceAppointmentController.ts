// ServiceAppointment Controller
// Handles service appointment booking API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ServiceAppointment } from '../models/ServiceAppointment';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';

/**
 * Create new service appointment
 * POST /api/service-appointments
 */
export const createServiceAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const {
      storeId,
      serviceType,
      appointmentDate,
      appointmentTime,
      duration,
      customerName,
      customerPhone,
      customerEmail,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!storeId || !serviceType || !appointmentDate || !appointmentTime || !customerName || !customerPhone) {
      sendError(res, 'Missing required fields', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    // Verify store type supports appointments
    const storeTypeField = (store as any).type;
    if (storeTypeField && storeTypeField !== 'SERVICE') {
      sendError(res, 'This store does not support service appointments', 400);
      return;
    }

    // Check availability
    const isAvailable = await (ServiceAppointment as any).checkAvailability(
      new Types.ObjectId(storeId),
      new Date(appointmentDate),
      appointmentTime,
      duration || 60
    );

    if (!isAvailable) {
      sendError(res, 'This time slot is not available. Please choose another time.', 409);
      return;
    }

    // Generate appointment number
    const appointmentNumber = await (ServiceAppointment as any).generateAppointmentNumber();

    // Create appointment
    const appointment = await ServiceAppointment.create({
      appointmentNumber,
      store: new Types.ObjectId(storeId),
      user: new Types.ObjectId(userId),
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
    const populatedAppointment = await ServiceAppointment.findById(appointment._id)
      .populate('store', 'name logo location contact')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');

    console.log(`✅ [SERVICE APPOINTMENT] Created appointment ${appointmentNumber} for store ${storeId}`);

    sendCreated(res, populatedAppointment, 'Service appointment created successfully');
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error creating appointment:', error);
    sendError(res, 'Failed to create service appointment', 500);
  }
};

/**
 * Get user's service appointments
 * GET /api/service-appointments/user
 */
export const getUserServiceAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { status } = req.query;

    const query: any = { user: new Types.ObjectId(userId) };

    if (status) {
      query.status = status;
    }

    const appointments = await ServiceAppointment.find(query)
      .populate('store', 'name logo location contact operationalInfo')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .lean();

    console.log(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for user ${userId}`);

    sendSuccess(res, { appointments, total: appointments.length }, 'Appointments retrieved successfully');
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error getting user appointments:', error);
    sendError(res, 'Failed to get appointments', 500);
  }
};

/**
 * Get service appointment by ID
 * GET /api/service-appointments/:appointmentId
 */
export const getServiceAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { appointmentId } = req.params;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      sendError(res, 'Invalid appointment ID', 400);
      return;
    }

    const appointment = await ServiceAppointment.findById(appointmentId)
      .populate('store', 'name logo location contact operationalInfo bookingConfig')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
      .lean();

    if (!appointment) {
      sendNotFound(res, 'Appointment not found');
      return;
    }

    // Verify the appointment belongs to the user
    if (appointment.user._id.toString() !== userId) {
      sendError(res, 'Unauthorized to access this appointment', 403);
      return;
    }

    console.log(`✅ [SERVICE APPOINTMENT] Retrieved appointment ${appointmentId}`);

    sendSuccess(res, appointment, 'Appointment retrieved successfully');
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error getting appointment:', error);
    sendError(res, 'Failed to get appointment', 500);
  }
};

/**
 * Get store's service appointments
 * GET /api/service-appointments/store/:storeId
 */
export const getStoreServiceAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { storeId } = req.params;
    const { date, status } = req.query;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const query: any = { store: new Types.ObjectId(storeId) };

    // Filter by date if provided
    if (date) {
      const filterDate = new Date(date as string);
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

    const appointments = await ServiceAppointment.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean();

    console.log(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for store ${storeId}`);

    sendSuccess(res, { appointments, total: appointments.length }, 'Store appointments retrieved successfully');
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error getting store appointments:', error);
    sendError(res, 'Failed to get store appointments', 500);
  }
};

/**
 * Cancel service appointment
 * PUT /api/service-appointments/:appointmentId/cancel
 */
export const cancelServiceAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { appointmentId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      sendError(res, 'Invalid appointment ID', 400);
      return;
    }

    const appointment = await ServiceAppointment.findById(appointmentId);

    if (!appointment) {
      sendNotFound(res, 'Appointment not found');
      return;
    }

    // Verify the appointment belongs to the user
    if (appointment.user.toString() !== userId) {
      sendError(res, 'Unauthorized to cancel this appointment', 403);
      return;
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'cancelled') {
      sendError(res, 'Appointment is already cancelled', 400);
      return;
    }

    if (appointment.status === 'completed') {
      sendError(res, 'Cannot cancel a completed appointment', 400);
      return;
    }

    // Cancel the appointment
    await appointment.cancel(reason);

    // Populate for response
    const updatedAppointment = await ServiceAppointment.findById(appointmentId)
      .populate('store', 'name logo location contact')
      .lean();

    console.log(`✅ [SERVICE APPOINTMENT] Cancelled appointment ${appointmentId}`);

    sendSuccess(res, updatedAppointment, 'Appointment cancelled successfully');
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error cancelling appointment:', error);
    sendError(res, 'Failed to cancel appointment', 500);
  }
};

/**
 * Check availability for a time slot
 * GET /api/service-appointments/availability/:storeId
 */
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { date, time, duration } = req.query;

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    if (!date || !time) {
      sendError(res, 'Date and time are required', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const appointmentDate = new Date(date as string);
    const appointmentTime = time as string;
    const appointmentDuration = duration ? parseInt(duration as string) : 60;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      sendError(res, 'Invalid time format. Use HH:MM format', 400);
      return;
    }

    const isAvailable = await (ServiceAppointment as any).checkAvailability(
      new Types.ObjectId(storeId),
      appointmentDate,
      appointmentTime,
      appointmentDuration
    );

    console.log(`✅ [SERVICE APPOINTMENT] Checked availability for ${storeId} on ${date} at ${time}: ${isAvailable}`);

    sendSuccess(
      res,
      {
        available: isAvailable,
        date: appointmentDate,
        time: appointmentTime,
        duration: appointmentDuration,
      },
      isAvailable ? 'Time slot is available' : 'Time slot is not available'
    );
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error checking availability:', error);
    sendError(res, 'Failed to check availability', 500);
  }
};

/**
 * Get available time slots for a date
 * GET /api/service-appointments/slots/:storeId
 */
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { date, duration } = req.query;

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    if (!date) {
      sendError(res, 'Date is required', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const appointmentDate = new Date(date as string);
    const appointmentDuration = duration ? parseInt(duration as string) : 60;

    // Get store working hours (default 9 AM to 9 PM if not specified)
    let workingHours = { start: '09:00', end: '21:00' };

    if ((store as any).bookingConfig?.workingHours) {
      workingHours = (store as any).bookingConfig.workingHours;
    } else if ((store as any).operationalInfo?.hours) {
      // Try to get from operational hours
      const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayHours = (store as any).operationalInfo.hours[dayName];
      if (dayHours && !dayHours.closed) {
        workingHours = { start: dayHours.open, end: dayHours.close };
      }
    }

    // Generate time slots
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const slots: Array<{ time: string; available: boolean }> = [];

    // Generate slots every 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // Check if slot is available
      const isAvailable = await (ServiceAppointment as any).checkAvailability(
        new Types.ObjectId(storeId),
        appointmentDate,
        timeSlot,
        appointmentDuration
      );

      slots.push({
        time: timeSlot,
        available: isAvailable,
      });
    }

    console.log(`✅ [SERVICE APPOINTMENT] Generated ${slots.length} time slots for ${storeId} on ${date}`);

    sendSuccess(
      res,
      {
        date: appointmentDate,
        slots,
        workingHours,
      },
      'Available slots retrieved successfully'
    );
  } catch (error: any) {
    console.error('❌ [SERVICE APPOINTMENT] Error getting available slots:', error);
    sendError(res, 'Failed to get available slots', 500);
  }
};
