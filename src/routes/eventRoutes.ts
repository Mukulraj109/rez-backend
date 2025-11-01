import express from 'express';
import {
  getAllEvents,
  getEventById,
  getEventsByCategory,
  searchEvents,
  getFeaturedEvents,
  bookEventSlot,
  getUserBookings,
  cancelBooking,
  toggleEventFavorite,
  shareEvent,
  getEventAnalytics
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/featured', getFeaturedEvents);
router.get('/search', searchEvents);
router.get('/category/:category', getEventsByCategory);
router.get('/:id', getEventById);
router.post('/:id/share', shareEvent);

// Protected routes (require authentication)
router.post('/:id/book', authenticate, bookEventSlot);
router.get('/my-bookings', authenticate, getUserBookings);
router.delete('/bookings/:bookingId', authenticate, cancelBooking);
router.post('/:id/favorite', authenticate, toggleEventFavorite);
router.get('/:id/analytics', authenticate, getEventAnalytics);

export default router;
