import { Router } from 'express';
import {
  createTableBooking,
  getUserTableBookings,
  getTableBooking,
  getStoreTableBookings,
  cancelTableBooking,
  checkAvailability
} from '../controllers/tableBookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route - Check table availability
router.get('/availability/:storeId', checkAvailability);

// Protected routes - require authentication
router.use(authenticate);

// Create new table booking
router.post('/', createTableBooking);

// Get user's table bookings
router.get('/user', getUserTableBookings);

// Get specific booking by ID
router.get('/:bookingId', getTableBooking);

// Get store's table bookings (for store owners/admin)
router.get('/store/:storeId', getStoreTableBookings);

// Cancel table booking
router.put('/:bookingId/cancel', cancelTableBooking);

export default router;
