import express from 'express';
import {
  generateStoreQR,
  lookupStoreByQR,
  getStorePaymentOffers,
  initiateStorePayment,
  confirmStorePayment,
  cancelStorePayment,
  getStorePaymentHistory,
  getStorePaymentById,
  updatePaymentSettings,
  getPaymentSettings,
  getStoreQRDetails,
  toggleQRStatus,
  regenerateQR,
  // New premium payment endpoints
  getCoinsForStore,
  getEnhancedPaymentMethods,
  autoOptimizeCoins,
  getStoreMembership,
} from '../controllers/storePaymentController';
import { authenticate } from '../middleware/auth';
import { authMiddleware as merchantAuth } from '../middleware/merchantauth';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Rate limiter for payment initiation (10 per minute per user)
const paymentInitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many payment attempts. Please try again later.',
});

/**
 * Store Payment Routes
 * Base path: /api/store-payment
 *
 * This module handles:
 * - QR code generation for stores (merchant)
 * - QR code lookup by customers
 * - Store payment processing
 * - Payment settings management
 */

// ==================== QR CODE ROUTES (MERCHANT) ====================

// Generate QR code for a store (merchant only)
router.post('/generate-qr/:storeId', merchantAuth, generateStoreQR);

// Regenerate QR code (invalidates old one) (merchant only)
router.post('/regenerate-qr/:storeId', merchantAuth, regenerateQR);

// Get store QR code details (merchant only)
router.get('/qr/:storeId', merchantAuth, getStoreQRDetails);

// Toggle QR code active status (merchant only)
router.patch('/qr/:storeId/toggle', merchantAuth, toggleQRStatus);

// ==================== QR CODE ROUTES (CUSTOMER) ====================

// Lookup store by QR code (customer - authenticated)
router.post('/lookup', authenticate, lookupStoreByQR);

// Lookup store by QR code (public - for initial scan)
router.get('/lookup/:qrCode', lookupStoreByQR);

// ==================== PAYMENT SETTINGS ROUTES (MERCHANT) ====================

// Get payment settings for a store
router.get('/settings/:storeId', merchantAuth, getPaymentSettings);

// Update payment settings for a store
router.put('/settings/:storeId', merchantAuth, updatePaymentSettings);

// ==================== PREMIUM PAYMENT ROUTES (CUSTOMER) ====================

// Get all available coins for user at a specific store
router.get('/coins/:storeId', authenticate, getCoinsForStore);

// Get enhanced payment methods with bank-specific offers
router.get('/payment-methods/:storeId', authenticate, getEnhancedPaymentMethods);

// Auto-optimize coin allocation for maximum savings
router.post('/auto-optimize', authenticate, autoOptimizeCoins);

// Get user's membership tier for a store
router.get('/membership/:storeId', authenticate, getStoreMembership);

// ==================== OFFERS ROUTES (CUSTOMER) ====================

// Get offers for store payment
router.get('/offers/:storeId', authenticate, getStorePaymentOffers);

// ==================== PAYMENT ROUTES (CUSTOMER) ====================

// Initiate store payment (rate limited)
router.post('/initiate', authenticate, paymentInitLimiter, initiateStorePayment);

// Confirm store payment
router.post('/confirm', authenticate, confirmStorePayment);

// Cancel store payment
router.post('/cancel', authenticate, cancelStorePayment);

// Get payment history for a user
router.get('/history', authenticate, getStorePaymentHistory);

// Get payment history for a specific store (merchant)
router.get('/history/:storeId', merchantAuth, getStorePaymentHistory);

// Get single payment details by paymentId
router.get('/details/:paymentId', authenticate, getStorePaymentById);

export default router;
