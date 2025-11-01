import { Request, Response } from 'express';
import { Event, EventBooking } from '../models';
import { asyncHandler } from '../middleware/asyncHandler';
import { IEvent } from '../models/Event';
import { IEventBooking } from '../models/EventBooking';

// @desc    Get all published events
// @route   GET /api/events
// @access  Public
export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    location,
    date,
    limit = 20,
    offset = 0,
    featured,
    upcoming,
    sortBy = 'date'
  } = req.query;

  // Build query
  const query: any = { status: 'published' };

  if (category) {
    query.category = category;
  }

  if (location) {
    query['location.city'] = new RegExp(location as string, 'i');
  }

  if (date) {
    const targetDate = new Date(date as string);
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
  let sort: any = { date: 1 };
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

  const events = await Event.find(query)
    .sort(sort)
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  const total = await Event.countDocuments(query);

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
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  
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
  await (event as any).incrementViews();

  res.json({
    success: true,
    data: event
  });
});

// @desc    Get events by category
// @route   GET /api/events/category/:category
// @access  Public
export const getEventsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const events = await Event.find({
    category: new RegExp(category, 'i'),
    status: 'published'
  })
    .sort({ date: 1 })
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  const total = await Event.countDocuments({
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
export const searchEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    category,
    location,
    date,
    priceMin,
    priceMax,
    isOnline,
    limit = 20,
    offset = 0
  } = req.query;

  // Build search query
  const query: any = { status: 'published' };

  if (q) {
    query.$text = { $search: q as string };
  }

  if (category) {
    query.category = new RegExp(category as string, 'i');
  }

  if (location) {
    query['location.city'] = new RegExp(location as string, 'i');
  }

  if (date) {
    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = {
      $gte: targetDate,
      $lt: nextDay
    };
  }

  if (priceMin || priceMax) {
    query['price.amount'] = {};
    if (priceMin) query['price.amount'].$gte = Number(priceMin);
    if (priceMax) query['price.amount'].$lte = Number(priceMax);
  }

  if (isOnline !== undefined) {
    query.isOnline = isOnline === 'true';
  }

  // Build sort - prioritize text search score if searching
  let sort: any = { date: 1 };
  if (q) {
    sort = { score: { $meta: 'textScore' }, date: 1 };
  }

  const events = await Event.find(query, q ? { score: { $meta: 'textScore' } } : {})
    .sort(sort)
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  const total = await Event.countDocuments(query);

  // Get search suggestions
  const suggestions = await Event.distinct('category', { status: 'published' });

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
export const getFeaturedEvents = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const events = await Event.find({
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
export const bookEventSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { slotId, attendeeInfo } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Find event
  const event = await Event.findById(id);
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
  const existingBooking = await EventBooking.findOne({
    eventId: id,
    userId,
    status: { $in: ['pending', 'confirmed'] }
  });

  if (existingBooking) {
    return res.status(400).json({
      success: false,
      message: 'You have already booked this event'
    });
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

  // Create booking
  const booking = new EventBooking({
    eventId: id,
    userId,
    slotId,
    amount: event.price.amount,
    currency: event.price.currency,
    attendeeInfo,
    status: 'pending'
  });

  await booking.save();

  // Increment event booking count
  await (event as any).incrementBookings();

  res.status(201).json({
    success: true,
    data: booking,
    message: 'Event booked successfully'
  });
});

// @desc    Get user's event bookings
// @route   GET /api/events/my-bookings
// @access  Private
export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { status, limit = 20, offset = 0 } = req.query;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const query: any = { userId };
  if (status) {
    query.status = status;
  }

  const bookings = await EventBooking.find(query)
    .populate('eventId')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  const total = await EventBooking.countDocuments(query);

  res.json({
    success: true,
    data: {
      bookings,
      total,
      hasMore: Number(offset) + bookings.length < total
    }
  });
});

// @desc    Cancel event booking
// @route   DELETE /api/events/bookings/:bookingId
// @access  Private
export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const booking = await EventBooking.findOne({
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
    const event = await Event.findById(booking.eventId);
    if (event && event.availableSlots) {
      const slot = event.availableSlots.find(s => s.id === booking.slotId);
      if (slot) {
        slot.bookedCount = Math.max(0, slot.bookedCount - 1);
        await event.save();
      }
    }
  }

  await (booking as any).cancel('Cancelled by user');

  res.json({
    success: true,
    message: 'Booking cancelled successfully'
  });
});

// @desc    Toggle event favorite
// @route   POST /api/events/:id/favorite
// @access  Private
export const toggleEventFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // This would typically interact with a UserFavorites model
  // For now, we'll just increment the favorites count
  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  await (event as any).incrementFavorites();

  res.json({
    success: true,
    message: 'Event favorited successfully'
  });
});

// @desc    Share event
// @route   POST /api/events/:id/share
// @access  Public
export const shareEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  await (event as any).incrementShares();

  res.json({
    success: true,
    message: 'Event share recorded'
  });
});

// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Private (Admin/Organizer)
export const getEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Get booking statistics
  const bookingStats = await EventBooking.aggregate([
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
