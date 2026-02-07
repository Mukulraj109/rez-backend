import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TableBooking } from '../models/TableBooking';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendError
} from '../utils/response';

// Create new table booking
export const createTableBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      storeId,
      bookingDate,
      bookingTime,
      partySize,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests
    } = req.body;

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
      return sendBadRequest(res, 'All required fields must be provided');
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      console.error('❌ [TABLE BOOKING] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    // Validate booking date is not in the past
    const bookingDateTime = new Date(bookingDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (bookingDateTime < now) {
      console.error('❌ [TABLE BOOKING] Booking date is in the past');
      return sendBadRequest(res, 'Booking date cannot be in the past');
    }

    // Validate party size
    if (partySize < 1 || partySize > 50) {
      console.error('❌ [TABLE BOOKING] Invalid party size:', partySize);
      return sendBadRequest(res, 'Party size must be between 1 and 50');
    }

    // Check availability before creating booking (prevent overbooking)
    const maxCapacity = (store as any).bookingConfig?.maxTableCapacity || 50;

    const startOfBookingDay = new Date(bookingDateTime);
    startOfBookingDay.setHours(0, 0, 0, 0);
    const endOfBookingDay = new Date(bookingDateTime);
    endOfBookingDay.setHours(23, 59, 59, 999);

    const existingBookings = await TableBooking.find({
      storeId: new Types.ObjectId(storeId),
      bookingDate: { $gte: startOfBookingDay, $lte: endOfBookingDay },
      bookingTime,
      status: { $in: ['pending', 'confirmed'] }
    }).select('partySize').lean();

    const totalBooked = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
    if (totalBooked + partySize > maxCapacity) {
      const remaining = maxCapacity - totalBooked;
      console.error('❌ [TABLE BOOKING] Slot full. Booked:', totalBooked, 'Requested:', partySize, 'Max:', maxCapacity);
      return sendBadRequest(
        res,
        remaining > 0
          ? `Only ${remaining} seats available at ${bookingTime}. Please choose a different time or reduce party size.`
          : `This time slot (${bookingTime}) is fully booked. Please choose a different time.`
      );
    }

    // Create booking
    const booking = new TableBooking({
      storeId: new Types.ObjectId(storeId),
      userId: new Types.ObjectId(userId),
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
    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email');

    return sendCreated(res, populatedBooking, 'Table booking created successfully');

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error creating booking:', error);
    return sendError(res, `Failed to create booking: ${error.message}`, 500);
  }
};

// Get user's table bookings
export const getUserTableBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { status, page = 1, limit = 20 } = req.query;

    console.log('📅 [TABLE BOOKING] Getting user bookings:', {
      userId,
      status,
      page,
      limit
    });

    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await TableBooking.find(query)
      .populate('storeId', 'name logo location contact')
      .sort({ bookingDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await TableBooking.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    console.log('✅ [TABLE BOOKING] Found bookings:', bookings.length);

    return sendSuccess(res, {
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

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error getting user bookings:', error);
    return sendError(res, `Failed to retrieve bookings: ${error.message}`, 500);
  }
};

// Get table booking by ID
export const getTableBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId!;

    console.log('📅 [TABLE BOOKING] Getting booking:', bookingId);

    const booking = await TableBooking.findOne({
      _id: bookingId,
      userId: new Types.ObjectId(userId)
    })
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
      .lean();

    if (!booking) {
      console.error('❌ [TABLE BOOKING] Booking not found:', bookingId);
      return sendNotFound(res, 'Booking not found');
    }

    console.log('✅ [TABLE BOOKING] Booking found:', booking.bookingNumber);

    return sendSuccess(res, booking, 'Booking retrieved successfully');

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error getting booking:', error);
    return sendError(res, `Failed to retrieve booking: ${error.message}`, 500);
  }
};

// Get store's table bookings (for store owners)
export const getStoreTableBookings = async (req: Request, res: Response) => {
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
    const store = await Store.findById(storeId);
    if (!store) {
      console.error('❌ [TABLE BOOKING] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    const query: any = { storeId: new Types.ObjectId(storeId) };

    // Filter by date if provided
    if (date) {
      const bookingDate = new Date(date as string);
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

    const bookings = await TableBooking.find(query)
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
      .sort({ bookingDate: 1, bookingTime: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await TableBooking.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    console.log('✅ [TABLE BOOKING] Found store bookings:', bookings.length);

    return sendSuccess(res, {
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

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error getting store bookings:', error);
    return sendError(res, `Failed to retrieve store bookings: ${error.message}`, 500);
  }
};

// Get all table bookings across all stores owned by the merchant
export const getMerchantTableBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { date, status, page = 1, limit = 50 } = req.query;

    console.log('📅 [TABLE BOOKING] Getting merchant bookings for user:', userId);

    // Find all stores owned by this merchant
    const merchantStores = await Store.find({ merchantId: new Types.ObjectId(userId) }).select('_id name').lean();

    if (!merchantStores.length) {
      return sendSuccess(res, {
        bookings: [],
        stores: [],
        pagination: { page: 1, limit: Number(limit), total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }, 'No stores found');
    }

    const storeIds = merchantStores.map(s => s._id);
    const query: any = { storeId: { $in: storeIds } };

    if (date) {
      const bookingDate = new Date(date as string);
      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await TableBooking.find(query)
      .populate('storeId', 'name logo')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
      .sort({ bookingDate: -1, bookingTime: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await TableBooking.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    console.log('✅ [TABLE BOOKING] Found merchant bookings:', bookings.length, 'across', merchantStores.length, 'stores');

    return sendSuccess(res, {
      bookings,
      stores: merchantStores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Merchant bookings retrieved successfully');

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error getting merchant bookings:', error);
    return sendError(res, `Failed to retrieve merchant bookings: ${error.message}`, 500);
  }
};

// Update table booking status (for store owners/merchants)
export const updateTableBookingStatus = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId!;
    const { status } = req.body;

    console.log('📅 [TABLE BOOKING] Updating booking status:', { bookingId, status });

    // Validate status
    const validStatuses = ['confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Find the booking
    const booking = await TableBooking.findById(bookingId);
    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    // Verify the merchant owns the store
    const store = await Store.findOne({
      _id: booking.storeId,
      merchantId: new Types.ObjectId(userId)
    });

    if (!store) {
      return sendBadRequest(res, 'You do not have permission to update this booking');
    }

    // Validate status transitions
    if (booking.status === 'cancelled') {
      return sendBadRequest(res, 'Cannot update a cancelled booking');
    }
    if (booking.status === 'completed') {
      return sendBadRequest(res, 'Cannot update a completed booking');
    }
    if (status === 'completed' && booking.status !== 'confirmed') {
      return sendBadRequest(res, 'Booking must be confirmed before marking as completed');
    }

    booking.status = status;
    await booking.save();

    console.log('✅ [TABLE BOOKING] Booking status updated:', booking.bookingNumber, '->', status);

    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email');

    return sendSuccess(res, populatedBooking, `Booking ${status} successfully`);

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error updating booking status:', error);
    return sendError(res, `Failed to update booking status: ${error.message}`, 500);
  }
};

// Cancel table booking
export const cancelTableBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId!;
    const { reason } = req.body;

    console.log('📅 [TABLE BOOKING] Cancelling booking:', bookingId);

    const booking = await TableBooking.findOne({
      _id: bookingId,
      userId: new Types.ObjectId(userId)
    });

    if (!booking) {
      console.error('❌ [TABLE BOOKING] Booking not found:', bookingId);
      return sendNotFound(res, 'Booking not found');
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      console.error('❌ [TABLE BOOKING] Booking already cancelled');
      return sendBadRequest(res, 'Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      console.error('❌ [TABLE BOOKING] Cannot cancel completed booking');
      return sendBadRequest(res, 'Cannot cancel a completed booking');
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    console.log('✅ [TABLE BOOKING] Booking cancelled:', booking.bookingNumber);

    // Populate booking for response
    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email');

    return sendSuccess(res, populatedBooking, 'Booking cancelled successfully');

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error cancelling booking:', error);
    return sendError(res, `Failed to cancel booking: ${error.message}`, 500);
  }
};

// Check table availability
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { date } = req.query;

    console.log('📅 [TABLE BOOKING] Checking availability:', {
      storeId,
      date
    });

    if (!date) {
      return sendBadRequest(res, 'Date is required');
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      console.error('❌ [TABLE BOOKING] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    // Get bookings for the specified date
    const bookingDate = new Date(date as string);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await TableBooking.find({
      storeId: new Types.ObjectId(storeId),
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    }).select('bookingTime partySize status').lean();

    console.log('✅ [TABLE BOOKING] Found bookings for date:', bookings.length);

    // Use store's configured capacity or default
    const maxCapacity = (store as any).bookingConfig?.maxTableCapacity || 50;
    const slotDuration = (store as any).bookingConfig?.slotDuration || 30; // minutes
    const workingStart = (store as any).bookingConfig?.workingHours?.start || '09:00';
    const workingEnd = (store as any).bookingConfig?.workingHours?.end || '22:00';

    const startHour = parseInt(workingStart.split(':')[0]);
    const endHour = parseInt(workingEnd.split(':')[0]);

    // Generate time slots based on store config (half-hour or configured duration)
    const timeSlots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        if (hour === endHour && min > 0) break; // Don't go past closing
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // Count bookings for this time slot
        const bookingsAtTime = bookings.filter(b => b.bookingTime === time);
        const totalPartySize = bookingsAtTime.reduce((sum, b) => sum + b.partySize, 0);

        const remainingCapacity = Math.max(0, maxCapacity - totalPartySize);
        const available = remainingCapacity > 0;

        timeSlots.push({
          time,
          available,
          remainingCapacity,
          bookingsCount: bookingsAtTime.length
        });
      }
    }

    return sendSuccess(res, {
      date: bookingDate,
      storeId,
      storeName: store.name,
      timeSlots,
      totalBookings: bookings.length
    }, 'Availability checked successfully');

  } catch (error: any) {
    console.error('❌ [TABLE BOOKING] Error checking availability:', error);
    return sendError(res, `Failed to check availability: ${error.message}`, 500);
  }
};
