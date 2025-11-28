import express from 'express';
import {
  getAllEvents,
  getEventById,
  getEventsByCategory,
  searchEvents,
  getFeaturedEvents,
  bookEventSlot,
  getUserBookings,
  confirmBooking,
  cancelBooking,
  toggleEventFavorite,
  shareEvent,
  getEventAnalytics,
  getRelatedEvents,
  trackEventAnalytics
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/featured', getFeaturedEvents);
router.get('/search', searchEvents);
router.get('/category/:category', getEventsByCategory);
router.post('/analytics/track', trackEventAnalytics); // Must be before /:id routes

// Protected routes (require authentication) - Must be before /:id routes
router.get('/my-bookings', authenticate, getUserBookings);
router.put('/bookings/:bookingId/confirm', authenticate, confirmBooking);
router.delete('/bookings/:bookingId', authenticate, cancelBooking);

// Parameterized routes (must be last)
router.get('/:id', getEventById);
router.get('/:id/related', getRelatedEvents);
router.post('/:id/share', shareEvent);
router.post('/:id/book', authenticate, bookEventSlot);
router.post('/:id/favorite', authenticate, toggleEventFavorite);
router.get('/:id/analytics', authenticate, getEventAnalytics);

export default router;
