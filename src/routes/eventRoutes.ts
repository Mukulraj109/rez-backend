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
import {
  getEventReviews,
  submitReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReview
} from '../controllers/eventReviewController';
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

// Review routes (must be before /:id routes)
router.put('/reviews/:reviewId', authenticate, updateReview);
router.delete('/reviews/:reviewId', authenticate, deleteReview);
router.put('/reviews/:reviewId/helpful', markReviewHelpful); // No auth required

// Parameterized routes (must be last)
router.get('/:id', getEventById);
router.get('/:id/related', getRelatedEvents);
router.get('/:id/reviews', getEventReviews); // Public - get event reviews
router.get('/:id/my-review', authenticate, getUserReview); // Get user's review
router.post('/:id/reviews', authenticate, submitReview); // Submit review
router.post('/:id/share', shareEvent);
router.post('/:id/book', authenticate, bookEventSlot);
router.post('/:id/favorite', authenticate, toggleEventFavorite);
router.get('/:id/analytics', authenticate, getEventAnalytics);

export default router;
