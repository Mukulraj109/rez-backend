import { Request, Response } from 'express';
import { ServiceBooking } from '../models/ServiceBooking';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { ServiceCategory } from '../models/ServiceCategory';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

// Use Express Request with user property (extended globally)

/**
 * Create a new service booking
 * POST /api/service-bookings
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const {
      serviceId,
      bookingDate,
      timeSlot,
      serviceType,
      serviceAddress,
      customerNotes,
      paymentMethod
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!serviceId || !bookingDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Service ID, booking date, and time slot are required'
      });
    }

    // Fetch the service
    const service = await Product.findOne({
      _id: serviceId,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    }).populate('store serviceCategory');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if service requires address for home service
    const svcType = serviceType || service.serviceDetails?.serviceType || 'store';
    if (svcType === 'home' && !serviceAddress) {
      return res.status(400).json({
        success: false,
        message: 'Service address is required for home services'
      });
    }

    // Get store info
    const store = await Store.findById(service.store);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Parse booking date
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);

    // Check slot availability
    const duration = service.serviceDetails?.duration || 60;
    const isAvailable = await (ServiceBooking as any).checkSlotAvailability(
      service._id,
      service.store,
      bookingDateObj,
      timeSlot,
      duration
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Calculate pricing
    const basePrice = service.pricing.selling;
    const cashbackPercentage = service.cashback?.percentage || 0;
    const cashbackEarned = Math.round((basePrice * cashbackPercentage) / 100);

    // Generate booking number
    const bookingNumber = await (ServiceBooking as any).generateBookingNumber();

    // Get customer info (phoneNumber and email are on user object, not profile)
    const customerName = req.user?.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
      : 'Customer';
    const customerPhone = req.user?.phoneNumber || '';
    const customerEmail = req.user?.email;

    // Create booking
    const booking = new ServiceBooking({
      bookingNumber,
      user: userId,
      service: service._id,
      serviceCategory: service.serviceCategory,
      store: service.store,
      merchantId: store.merchantId || service.merchantId,
      customerName,
      customerPhone,
      customerEmail,
      bookingDate: bookingDateObj,
      timeSlot,
      duration,
      serviceType: svcType,
      serviceAddress: svcType === 'home' ? serviceAddress : undefined,
      pricing: {
        basePrice,
        total: basePrice,
        cashbackEarned,
        cashbackPercentage,
        currency: service.pricing.currency || 'INR'
      },
      requiresPaymentUpfront: service.serviceDetails?.requiresPaymentUpfront || false,
      paymentStatus: 'pending',
      paymentMethod,
      customerNotes,
      status: 'pending'
    });

    await booking.save();

    // Populate booking data for response
    const populatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing serviceDetails')
      .populate('serviceCategory', 'name icon cashbackPercentage')
      .populate('store', 'name logo location contact operationalInfo');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking
    });
  } catch (error: any) {
    logger.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

/**
 * Get user's bookings
 * GET /api/service-bookings
 */
export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { status, page = '1', limit = '20' } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      ServiceBooking.find(query)
        .populate('service', 'name images pricing serviceDetails')
        .populate('serviceCategory', 'name icon cashbackPercentage')
        .populate('store', 'name logo location contact operationalInfo')
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ServiceBooking.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

/**
 * Get booking by ID
 * GET /api/service-bookings/:id
 */
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    })
      .populate('service', 'name images pricing serviceDetails description')
      .populate('serviceCategory', 'name icon cashbackPercentage')
      .populate('store', 'name logo location contact operationalInfo')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
};

/**
 * Cancel a booking
 * PUT /api/service-bookings/:id/cancel
 */
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed', 'assigned'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled'
      });
    }

    // Check cancellation time (at least 2 hours before)
    const now = new Date();
    const bookingDateTime = new Date(booking.bookingDate);
    const [hours, minutes] = booking.timeSlot.start.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    const twoHoursBefore = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);

    if (now >= twoHoursBefore) {
      return res.status(400).json({
        success: false,
        message: 'Bookings can only be cancelled at least 2 hours before the scheduled time'
      });
    }

    await booking.cancel(reason || 'Cancelled by user', 'user');

    // Populate booking data for response
    const updatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing')
      .populate('serviceCategory', 'name icon')
      .populate('store', 'name logo location contact')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking
    });
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

/**
 * Reschedule a booking
 * PUT /api/service-bookings/:id/reschedule
 */
export const rescheduleBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bookingDate, timeSlot } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!bookingDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'New booking date and time slot are required'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be rescheduled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be rescheduled'
      });
    }

    if (booking.rescheduleCount >= booking.maxReschedules) {
      return res.status(400).json({
        success: false,
        message: 'Maximum reschedule limit reached'
      });
    }

    // Parse new booking date
    const newBookingDate = new Date(bookingDate);
    newBookingDate.setHours(0, 0, 0, 0);

    // Check slot availability
    const isAvailable = await (ServiceBooking as any).checkSlotAvailability(
      booking.service,
      booking.store,
      newBookingDate,
      timeSlot,
      booking.duration,
      booking._id
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    await booking.reschedule(newBookingDate, timeSlot);

    // Populate booking data for response
    const updatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing')
      .populate('serviceCategory', 'name icon')
      .populate('store', 'name logo location contact')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: updatedBooking
    });
  } catch (error: any) {
    logger.error('Error rescheduling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule booking',
      error: error.message
    });
  }
};

/**
 * Add rating to a completed booking
 * POST /api/service-bookings/:id/rate
 */
export const rateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, review } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed bookings can be rated'
      });
    }

    if (booking.rating?.score) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been rated'
      });
    }

    await booking.addRating(score, review);

    res.status(200).json({
      success: true,
      message: 'Rating added successfully',
      data: {
        bookingId: booking._id,
        rating: booking.rating
      }
    });
  } catch (error: any) {
    logger.error('Error rating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add rating',
      error: error.message
    });
  }
};

/**
 * Get available time slots for a service on a specific date
 * GET /api/service-bookings/available-slots
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and date are required'
      });
    }

    // Fetch the service
    const service = await Product.findOne({
      _id: serviceId,
      productType: 'service',
      isActive: true
    }).populate('store');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Get store info for operating hours
    const store = await Store.findById(service.store);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Parse date
    const bookingDate = new Date(date as string);
    bookingDate.setHours(0, 0, 0, 0);

    // Get store hours (default if not specified)
    const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as
      'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    const hours = store.operationalInfo?.hours;
    const storeHours = hours?.[dayOfWeek] || {
      open: '09:00',
      close: '18:00'
    };

    // Get service duration
    const duration = service.serviceDetails?.duration || 60;

    // Get available slots
    const availableSlots = await (ServiceBooking as any).getAvailableSlots(
      service.store,
      bookingDate,
      duration,
      storeHours
    );

    res.status(200).json({
      success: true,
      data: {
        serviceId,
        date: bookingDate.toISOString().split('T')[0],
        duration,
        storeHours,
        slots: availableSlots
      }
    });
  } catch (error: any) {
    logger.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message
    });
  }
};

// Export all controller functions
export default {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  rateBooking,
  getAvailableSlots
};
