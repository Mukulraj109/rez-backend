import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';
import compression from 'compression';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Import database connection
import { connectDatabase, database } from './config/database';

// Import environment validation
import { validateEnvironment } from './config/validateEnv';

// Import utilities
import { validateCloudinaryConfig } from './utils/cloudinaryUtils';

// Import partner level maintenance service
import partnerLevelMaintenanceService from './services/partnerLevelMaintenanceService';

// Import trial expiry notification job
import { initializeTrialExpiryJob } from './jobs/trialExpiryNotification';

// Import new cron jobs
import { initializeSessionCleanupJob } from './jobs/cleanupExpiredSessions';
import { initializeCoinExpiryJob } from './jobs/expireCoins';

// Import export worker (initializes automatically when imported)
import './workers/exportWorker';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger, requestLogger, correlationIdMiddleware } from './config/logger';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import { setCsrfToken, validateCsrfToken } from './middleware/csrf';
// DEV: import { generalLimiter } from './middleware/rateLimiter';
// Import routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import categoryRoutes from './routes/categoryRoutes';
import storeRoutes from './routes/storeRoutes';
import followerStatsRoutes from './routes/followerStatsRoutes';
import orderRoutes from './routes/orderRoutes';
import videoRoutes from './routes/videoRoutes';
import ugcRoutes from './routes/ugcRoutes';
import articleRoutes from './routes/articleRoutes';
import projectRoutes from './routes/projectRoutes';
import earningProjectsRoutes from './routes/earningProjectsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import stockNotificationRoutes from './routes/stockNotificationRoutes';
import priceTrackingRoutes from './routes/priceTrackingRoutes';
import reviewRoutes from './routes/reviewRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import comparisonRoutes from './routes/comparisonRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import syncRoutes from './routes/syncRoutes';
import locationRoutes from './routes/locationRoutes';
import walletRoutes from './routes/walletRoutes';
import offerRoutes from './routes/offerRoutes';
import offerCategoryRoutes from './routes/offerCategoryRoutes';
import heroBannerRoutes from './routes/heroBannerRoutes';
import voucherRoutes from './routes/voucherRoutes';
import addressRoutes from './routes/addressRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import userSettingsRoutes from './routes/userSettingsRoutes';
import achievementRoutes from './routes/achievementRoutes';
import activityRoutes from './routes/activityRoutes';
import paymentRoutes from './routes/paymentRoutes';
import storePaymentRoutes from './routes/storePaymentRoutes';
import stockRoutes from './routes/stockRoutes';
import socialMediaRoutes from './routes/socialMediaRoutes';
import securityRoutes from './routes/securityRoutes';
import eventRoutes from './routes/eventRoutes';
import referralRoutes from './routes/referralRoutes';
import profileRoutes from './routes/profileRoutes';
import scratchCardRoutes from './routes/scratchCardRoutes';
import couponRoutes from './routes/couponRoutes';
import storePromoCoinRoutes from './routes/storePromoCoinRoutes';
import razorpayRoutes from './routes/razorpayRoutes';
import supportRoutes from './routes/supportRoutes';
import messageRoutes from './routes/messageRoutes';
import cashbackRoutes from './routes/cashbackRoutes';
import userProductRoutes from './routes/userProductRoutes';
import discountRoutes from './routes/discountRoutes';
import storeVoucherRoutes from './routes/storeVoucherRoutes';
import outletRoutes from './routes/outletRoutes';
import flashSaleRoutes from './routes/flashSaleRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import billRoutes from './routes/billRoutes';
import billingRoutes from './routes/billingRoutes';
import activityFeedRoutes from './routes/activityFeedRoutes';
import unifiedGamificationRoutes from './routes/unifiedGamificationRoutes';
import socialProofRoutes from './routes/socialProofRoutes';
import partnerRoutes from './routes/partnerRoutes';
import earningsRoutes from './routes/earningsRoutes';
import menuRoutes from './routes/menuRoutes';
import tableBookingRoutes from './routes/tableBookingRoutes';
import consultationRoutes from './routes/consultationRoutes';
import serviceAppointmentRoutes from './routes/serviceAppointmentRoutes';
import serviceCategoryRoutes from './routes/serviceCategoryRoutes';
import serviceRoutes from './routes/serviceRoutes';
import serviceBookingRoutes from './routes/serviceBookingRoutes';
import storeVisitRoutes from './routes/storeVisitRoutes';
import homepageRoutes from './routes/homepageRoutes';
import searchRoutes from './routes/searchRoutes';
import mallRoutes from './routes/mallRoutes';  // ReZ Mall routes
import mallAffiliateRoutes from './routes/mallAffiliateRoutes';  // Mall Affiliate tracking routes (legacy - use cashstore/affiliate)
import cashStoreAffiliateRoutes from './routes/cashStoreAffiliateRoutes';  // Cash Store affiliate tracking routes
import webhookRoutes from './routes/webhookRoutes';
import storeGalleryRoutes from './routes/storeGallery';  // Public store gallery routes
import productGalleryRoutes from './routes/productGallery';  // Public product gallery routes
import authRoutes1 from './merchantroutes/auth';  // Temporarily disabled
import merchantRoutes from './merchantroutes/merchants';  // Temporarily disabled
import merchantProfileRoutes from './merchantroutes/merchant-profile'; // Disabled due to missing properties
import productRoutes1 from './merchantroutes/products';  // Temporarily disabled
import categoryRoutes1 from './merchantroutes/categories';  // Temporarily disabled
import uploadRoutes from './merchantroutes/uploads';  // Temporarily disabled
import orderRoutes1 from './merchantroutes/orders';  // Temporarily disabled
import merchantCashbackRoutes from './merchantroutes/cashback';  // Temporarily disabled
import dashboardRoutes from './merchantroutes/dashboard';  // Temporarily disabled
import analyticsRoutesM from './merchantroutes/analytics';  // Analytics with real data
import merchantSyncRoutes from './merchantroutes/sync';
import teamRoutes from './merchantroutes/team';
import teamPublicRoutes from './merchantroutes/team-public';
import auditRoutes from './merchantroutes/audit';
import onboardingRoutes from './merchantroutes/onboarding';
// Enhanced merchant order routes (Agent 7)
import merchantOrderRoutes from './routes/merchant/orders';
// Enhanced merchant cashback routes (Agent 5)
import merchantCashbackRoutesNew from './routes/merchant/cashback';
// Merchant notification routes (Agent 2)
import merchantNotificationRoutes from './routes/merchant/notifications';
// Bulk product operations routes (Agent 4)
import bulkRoutes from './merchantroutes/bulk';
import storeRoutesM from './merchantroutes/stores';  // Merchant store management routes
import merchantOfferRoutes from './merchantroutes/offers';  // Merchant offers/deals management routes
import storeGalleryRoutesM from './merchantroutes/storeGallery';  // Merchant store gallery management routes
import productGalleryRoutesM from './merchantroutes/productGallery';  // Merchant product gallery management routes
import merchantDiscountRoutes from './merchantroutes/discounts';  // Merchant discount management routes (Phase 3)
import merchantStoreVoucherRoutes from './merchantroutes/storeVouchers';  // Merchant store voucher management routes
import merchantOutletRoutes from './merchantroutes/outlets';  // Merchant outlet management routes
import merchantVideoRoutes from './merchantroutes/videos';  // Merchant promotional video routes
import bulkImportRoutes from './merchantroutes/bulkImport';  // Bulk product import routes
import merchantSocialMediaRoutes from './merchantroutes/socialMedia';  // Merchant social media verification routes
import merchantEventsRoutes from './merchantroutes/events';  // Merchant events management routes
import merchantServicesRoutes from './merchantroutes/services';  // Merchant services management routes
import { RealTimeService } from './merchantservices/RealTimeService';  // Temporarily disabled
import { ReportService } from './merchantservices/ReportService';  // Temporarily disabled
import stockSocketService from './services/stockSocketService';
import earningsSocketService from './services/earningsSocketService';
import AuditRetentionService from './services/AuditRetentionService';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Initialize Sentry (must be first)
initSentry(app);
if (process.env.SENTRY_DSN) {
  app.use(sentryRequestHandler);
  app.use(sentryTracingHandler);
}

// Correlation ID middleware (early for tracking)
app.use(correlationIdMiddleware);

// Security middleware - Enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  hidePoweredBy: true
}));

// CORS configuration
// Allow specific origins from environment variables or use defaults for development
const getAllowedOrigins = (): string[] => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
  
  // Development defaults
  const origins: string[] = [];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  if (process.env.MERCHANT_FRONTEND_URL) {
    origins.push(process.env.MERCHANT_FRONTEND_URL);
  }
  
  // Add localhost for development if not in production
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:19006'); // Expo default
    origins.push('http://localhost:8081'); // React Native
    origins.push('http://localhost:19000'); // Expo web
    origins.push('http://127.0.0.1:19006'); // Expo alternative
    origins.push('http://127.0.0.1:19000'); // Expo web alternative
  }
  
  return origins.length > 0 ? origins : ['http://localhost:3000'];
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ [CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
// Use custom JSON parser that handles null/empty bodies gracefully
app.use((req: any, res: any, next: any) => {
  express.json({ limit: '10mb' })(req, res, (err: any) => {
    if (err) {
      // Check if it's a JSON parse error (includes "null" string issue)
      if (err instanceof SyntaxError && 'body' in err) {
        console.log('🔍 [BODY-PARSER] JSON parse error caught for:', req.method, req.path);
        console.log('🔍 [BODY-PARSER] Error message:', err.message);
        // Set body to empty object instead of failing
        req.body = {};
        return next(); // Continue without error
      }
      // Pass other errors to error handler
      return next(err);
    }
    // No error, continue normally
    next();
  });
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware (required for CSRF protection)
// Note: Install cookie-parser package: npm install cookie-parser @types/cookie-parser
// import cookieParser from 'cookie-parser';
// app.use(cookieParser());

// CSRF Protection Middleware
// Automatically sets CSRF token in cookie and response header for all requests
// Note: Requires cookie-parser to be installed and enabled above
// app.use(setCsrfToken);
console.log('⚠️  CSRF protection middleware available but not enabled (requires cookie-parser)');

// Compression middleware
app.use(compression());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Winston request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Morgan for additional development logging (optional)
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MORGAN === 'true') {
  app.use(morgan('dev'));
}

// Rate limiting - Production security
// DEV: app.use(generalLimiter);

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'REZ Merchant API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Serve Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

console.log('✅ Swagger documentation available at /api-docs');

// Health check endpoint with API info
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      api: {
        prefix: API_PREFIX,
        totalEndpoints: 159,
        modules: 17,
        endpoints: {
          auth: `${API_PREFIX}/auth`,
          products: `${API_PREFIX}/products`,
          cart: `${API_PREFIX}/cart`,
          categories: `${API_PREFIX}/categories`,
          stores: `${API_PREFIX}/stores`,
          orders: `${API_PREFIX}/orders`,
          videos: `${API_PREFIX}/videos`,
          ugc: `${API_PREFIX}/ugc`,
          articles: `${API_PREFIX}/articles`,
          projects: `${API_PREFIX}/projects`,
          notifications: `${API_PREFIX}/notifications`,
          reviews: `${API_PREFIX}/reviews`,
          wishlist: `${API_PREFIX}/wishlist`,
          sync: `${API_PREFIX}/sync`,
          wallet: `${API_PREFIX}/wallet`,
          offers: `${API_PREFIX}/offers`,
          vouchers: `${API_PREFIX}/vouchers`,
          addresses: `${API_PREFIX}/addresses`,
          paymentMethods: `${API_PREFIX}/payment-methods`,
          userSettings: `${API_PREFIX}/user-settings`,
          achievements: `${API_PREFIX}/achievements`,
          activities: `${API_PREFIX}/activities`,
          referral: `${API_PREFIX}/referral`,
          coupons: `${API_PREFIX}/coupons`,
          support: `${API_PREFIX}/support`,
          cashback: `${API_PREFIX}/cashback`,
          discounts: `${API_PREFIX}/discounts`,
          storeVouchers: `${API_PREFIX}/store-vouchers`,
          outlets: `${API_PREFIX}/outlets`,
          flashSales: `${API_PREFIX}/flash-sales`,
          bills: `${API_PREFIX}/bills`,
          partner: `${API_PREFIX}/partner`,
          menu: `${API_PREFIX}/menu`,
          tableBookings: `${API_PREFIX}/table-bookings`,
          consultations: `${API_PREFIX}/consultations`,
          storeVisits: `${API_PREFIX}/store-visits`,
          homepage: `${API_PREFIX}/homepage`
        }
      }
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// CSRF Token endpoint
// Returns a new CSRF token for web clients
// Note: Requires cookie-parser and setCsrfToken middleware to be enabled
app.get('/api/csrf-token', (req, res) => {
  try {
    // The setCsrfToken middleware will automatically set the token in cookie and header
    // This endpoint just needs to return success
    const csrfToken = res.getHeader('x-csrf-token');

    if (!csrfToken) {
      return res.status(503).json({
        success: false,
        message: 'CSRF protection is not enabled. Please install cookie-parser package.',
        note: 'Run: npm install cookie-parser @types/cookie-parser'
      });
    }

    res.json({
      success: true,
      message: 'CSRF token generated successfully',
      token: csrfToken,
      usage: {
        header: 'Include this token in X-CSRF-Token header for POST/PUT/DELETE requests',
        cookie: 'Token is also set in csrf-token cookie automatically'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token',
      error: error.message
    });
  }
});

const server = createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// API info endpoint (directly after health)
app.get('/api-info', (req, res) => {
  res.json({
    name: 'REZ App Backend API',
    version: '1.0.0',
    description: 'Backend API for REZ - E-commerce, Rewards & Social Platform',
    status: 'Phase 6 Complete - Profile & Account Management Implemented',
    endpoints: {
      auth: `${API_PREFIX}/user/auth`,
      products: `${API_PREFIX}/products`,
      categories: `${API_PREFIX}/categories`,
      cart: `${API_PREFIX}/cart`,
      stores: `${API_PREFIX}/stores`,
      orders: `${API_PREFIX}/orders`,
      videos: `${API_PREFIX}/videos`,
      ugc: `${API_PREFIX}/ugc`,
      articles: `${API_PREFIX}/articles`,
      projects: `${API_PREFIX}/projects`,
      notifications: `${API_PREFIX}/notifications`,
      reviews: `${API_PREFIX}/reviews`,
      wishlist: `${API_PREFIX}/wishlist`,
      sync: `${API_PREFIX}/sync`,
      offers: `${API_PREFIX}/offers`,
      vouchers: `${API_PREFIX}/vouchers`,
      addresses: `${API_PREFIX}/addresses`,
      paymentMethods: `${API_PREFIX}/payment-methods`,
      userSettings: `${API_PREFIX}/user-settings`,
      achievements: `${API_PREFIX}/achievements`,
      activities: `${API_PREFIX}/activities`,
      referral: `${API_PREFIX}/referral`,
      coupons: `${API_PREFIX}/coupons`,
      support: `${API_PREFIX}/support`,
      cashback: `${API_PREFIX}/cashback`,
      discounts: `${API_PREFIX}/discounts`,
      storeVouchers: `${API_PREFIX}/store-vouchers`,
      outlets: `${API_PREFIX}/outlets`,
      flashSales: `${API_PREFIX}/flash-sales`,
      bills: `${API_PREFIX}/bills`,
      partner: `${API_PREFIX}/partner`,
      storeVisits: `${API_PREFIX}/store-visits`,
      merchantSync: '/api/merchant/sync'
    },
    features: [
      'User Authentication (OTP-based)',
      'Product Catalog Management',
      'Shopping Cart System',
      'Category Management',
      'Store Management',
      'Order Processing',
      'Video Content Platform',
      'Rewards/Earning System',
      'Notification System',
      'Review & Rating System',
      'Wishlist Management',
      'Merchant-User Data Sync',
      'Wallet & Payments',
      'Offers & Promotions',
      'Voucher Management',
      'Address Management',
      'Payment Methods',
      'User Settings & Preferences',
      'Achievement & Badges System',
      'Activity Feed',
      'Coupon Management System',
      'Customer Support & Tickets',
      'User Cashback System',
      'Flash Sales & Time-limited Offers',
      'Merchant Data Synchronization'
    ],
    database: {
      models: [
        'User', 'Category', 'Store', 'Product', 'Cart', 'Order',
        'Video', 'Article', 'Project', 'Transaction', 'Notification', 'Review', 'Wishlist',
        'Wallet', 'Offer', 'VoucherBrand', 'UserVoucher', 'OfferRedemption',
        'Address', 'PaymentMethod', 'UserSettings', 'UserAchievement', 'Activity',
        'Coupon', 'UserCoupon', 'SupportTicket', 'FAQ', 'UserCashback'
      ],
      totalModels: 27
    },
    implementation: {
      completed: ['Authentication', 'Products', 'Cart', 'Categories', 'Stores', 'Orders', 'Videos', 'Projects', 'Notifications', 'Reviews', 'Wishlist', 'Wallet', 'Offers', 'Vouchers', 'Addresses', 'Payment Methods', 'User Settings', 'Achievements', 'Activities', 'Coupons', 'Support', 'Cashback'],
      totalEndpoints: 194,
      apiModules: 21
    }
  });
});

// Rate limiter disabled for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});



// User API Routes
app.use(`${API_PREFIX}/user/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
console.log('✅ Product routes registered at /api/products');
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/stores`, storeRoutes);
app.use(`${API_PREFIX}/stores`, followerStatsRoutes); // Follower stats for merchants
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/videos`, videoRoutes);
app.use(`${API_PREFIX}/ugc`, ugcRoutes);
app.use(`${API_PREFIX}/articles`, articleRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/earning-projects`, earningProjectsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/stock-notifications`, stockNotificationRoutes);
app.use(`${API_PREFIX}/price-tracking`, priceTrackingRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/favorites`, favoriteRoutes);
app.use(`${API_PREFIX}/comparisons`, comparisonRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/recommendations`, recommendationRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/sync`, syncRoutes);
app.use(`${API_PREFIX}/location`, locationRoutes);
app.use(`${API_PREFIX}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/offers`, offerRoutes);
app.use(`${API_PREFIX}/offer-categories`, offerCategoryRoutes);
app.use(`${API_PREFIX}/hero-banners`, heroBannerRoutes);
app.use(`${API_PREFIX}/vouchers`, voucherRoutes);
app.use(`${API_PREFIX}/addresses`, addressRoutes);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes);
app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes);
app.use(`${API_PREFIX}/achievements`, achievementRoutes);
app.use(`${API_PREFIX}/activities`, activityRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);
app.use(`${API_PREFIX}/store-payment`, storePaymentRoutes);
console.log('✅ Store payment routes registered at /api/store-payment');
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/social-media`, socialMediaRoutes);
app.use(`${API_PREFIX}/security`, securityRoutes);
app.use(`${API_PREFIX}/events`, eventRoutes);
app.use(`${API_PREFIX}/referral`, referralRoutes);
app.use(`${API_PREFIX}/user/profile`, profileRoutes);
app.use(`${API_PREFIX}/scratch-cards`, scratchCardRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
app.use(`${API_PREFIX}/store-promo-coins`, storePromoCoinRoutes);
app.use(`${API_PREFIX}/razorpay`, razorpayRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
console.log('✅ Webhook routes registered at /api/webhooks');
app.use(`${API_PREFIX}/support`, supportRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);
console.log('✅ Messaging routes registered at /api/messages');
app.use(`${API_PREFIX}/cashback`, cashbackRoutes);
app.use(`${API_PREFIX}/user-products`, userProductRoutes);
app.use(`${API_PREFIX}/discounts`, discountRoutes);
app.use(`${API_PREFIX}/store-vouchers`, storeVoucherRoutes);
app.use(`${API_PREFIX}/outlets`, outletRoutes);

// Flash Sales Routes - Time-limited promotional offers
app.use(`${API_PREFIX}/flash-sales`, flashSaleRoutes);

// Subscription Routes - Premium membership tiers
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

// Billing History Routes - Transaction history and invoices for subscriptions
app.use(`${API_PREFIX}/billing`, billingRoutes);
console.log('✅ Billing routes registered at /api/billing');

// Bill Upload & Verification Routes - Offline purchase receipts for cashback
app.use(`${API_PREFIX}/bills`, billRoutes);
console.log('✅ Bill routes registered at /api/bills');

// Unified Gamification Routes - All gamification functionality under one endpoint
app.use(`${API_PREFIX}/gamification`, unifiedGamificationRoutes);
console.log('✅ Unified gamification routes registered at /api/gamification');

// Social Feed Routes - Activity feed, follow system, likes, comments
app.use(`${API_PREFIX}/social`, activityFeedRoutes);
console.log('✅ Social feed routes registered at /api/social');

// Social Proof Routes - Nearby activity for trust indicators
app.use(`${API_PREFIX}/social-proof`, socialProofRoutes);
console.log('✅ Social proof routes registered at /api/social-proof');

// Partner Program Routes - Partner levels, rewards, milestones, earnings
app.use(`${API_PREFIX}/partner`, partnerRoutes);
console.log('✅ Partner program routes registered at /api/partner');

// // Earnings Routes - User earnings summary with breakdown
app.use(`${API_PREFIX}/earnings`, earningsRoutes);
console.log('✅ Earnings routes registered at /api/earnings');

// Menu Routes - Restaurant/Store menus and pre-orders
app.use(`${API_PREFIX}/menu`, menuRoutes);
console.log('✅ Menu routes registered at /api/menu');

// Table Booking Routes - Restaurant table reservations
app.use(`${API_PREFIX}/table-bookings`, tableBookingRoutes);
console.log('✅ Table booking routes registered at /api/table-bookings');

// Service Appointment Routes - Service appointments for salons, spas, consultations
app.use(`${API_PREFIX}/service-appointments`, serviceAppointmentRoutes);
console.log('✅ Service appointment routes registered at /api/service-appointments');

// Service Categories Routes - Service categories with cashback offers
app.use(`${API_PREFIX}/service-categories`, serviceCategoryRoutes);
console.log('✅ Service category routes registered at /api/service-categories');

// Services Routes - Services (products with type 'service')
app.use(`${API_PREFIX}/services`, serviceRoutes);
console.log('✅ Service routes registered at /api/services');

// Service Bookings Routes - User service bookings
app.use(`${API_PREFIX}/service-bookings`, serviceBookingRoutes);
console.log('✅ Service booking routes registered at /api/service-bookings');

// // Consultation Routes - Medical/Professional consultation bookings
app.use(`${API_PREFIX}/consultations`, consultationRoutes);
console.log('✅ Consultation routes registered at /api/consultations');

// // Store Visit Routes - Retail store visits and queue system
app.use(`${API_PREFIX}/store-visits`, storeVisitRoutes);
console.log('✅ Store visit routes registered at /api/store-visits');

// Homepage Routes - Batch endpoint for all homepage data
app.use(`${API_PREFIX}/homepage`, homepageRoutes);
console.log('✅ Homepage routes registered at /api/homepage');

// // Search Routes - Global search across products, stores, and articles
app.use(`${API_PREFIX}/search`, searchRoutes);
console.log('✅ Search routes registered at /api/search');

// Mall Routes - ReZ Mall curated brands and offers
app.use(`${API_PREFIX}/mall`, mallRoutes);
console.log('✅ Mall routes registered at /api/mall');

// Mall Affiliate Routes - Cashback tracking, webhooks, and conversions (legacy)
app.use(`${API_PREFIX}/mall/affiliate`, mallAffiliateRoutes);
console.log('✅ Mall Affiliate routes registered at /api/mall/affiliate (legacy)');

// Cash Store Affiliate Routes - External brand cashback tracking
app.use(`${API_PREFIX}/cashstore/affiliate`, cashStoreAffiliateRoutes);
console.log('✅ Cash Store Affiliate routes registered at /api/cashstore/affiliate');

// Store Gallery Routes - Public gallery viewing
app.use(`${API_PREFIX}/stores`, storeGalleryRoutes);
console.log('✅ Store gallery routes registered at /api/stores/:storeId/gallery');

// Product Gallery Routes - Public gallery viewing
app.use(`${API_PREFIX}/products`, productGalleryRoutes);
console.log('✅ Product gallery routes registered at /api/products/:productId/gallery');

// // Merchant API Routes
// // Apply general rate limiting to all merchant routes
// // DEV: app.use('/api/merchant', generalLimiter);
// console.log('✅ General rate limiter applied to merchant routes');

app.use('/api/merchant/auth', authRoutes1);  // Merchant auth routes
app.use('/api/merchant/categories', categoryRoutes1);
app.use('/api/merchants', merchantRoutes);
app.use('/api/merchant/products', productRoutes1);
app.use('/api/merchant/profile', merchantProfileRoutes);
app.use('/api/merchant/uploads', uploadRoutes);
// // Enhanced merchant order routes (Agent 7) - includes bulk actions, refunds, analytics
app.use('/api/merchant/orders', merchantOrderRoutes);
console.log('✅ Enhanced merchant order routes registered at /api/merchant/orders (Agent 7)');
// // Legacy merchant cashback routes
app.use('/api/merchant/cashback-old', merchantCashbackRoutes);
// // Enhanced merchant cashback routes (Agent 5) - 7 critical endpoints with Razorpay integration
app.use('/api/merchant/cashback', merchantCashbackRoutesNew);
console.log('✅ Enhanced merchant cashback routes registered at /api/merchant/cashback (Agent 5)');
app.use('/api/merchant/dashboard', dashboardRoutes);
app.use('/api/merchant/analytics', analyticsRoutesM);  // Real-time analytics endpoints
app.use('/api/merchant/stores', storeRoutesM);  // Merchant store management routes
console.log('✅ Merchant store management routes registered at /api/merchant/stores');
app.use('/api/merchant/stores', storeGalleryRoutesM);  // Merchant store gallery management routes
console.log('✅ Merchant store gallery management routes registered at /api/merchant/stores/:storeId/gallery');
app.use('/api/merchant/products', productGalleryRoutesM);  // Merchant product gallery management routes
console.log('✅ Merchant product gallery management routes registered at /api/merchant/products/:productId/gallery');
app.use('/api/merchant/offers', merchantOfferRoutes);  // Merchant offers/deals management routes
console.log('✅ Merchant offers management routes registered at /api/merchant/offers');
app.use('/api/merchant/discounts', merchantDiscountRoutes);  // Merchant discount management routes (Phase 3)
console.log('✅ Merchant discount management routes registered at /api/merchant/discounts');
app.use('/api/merchant/store-vouchers', merchantStoreVoucherRoutes);  // Merchant store voucher management routes
console.log('✅ Merchant store voucher management routes registered at /api/merchant/store-vouchers');
app.use('/api/merchant/outlets', merchantOutletRoutes);  // Merchant outlet management routes
console.log('✅ Merchant outlet management routes registered at /api/merchant/outlets');
app.use('/api/merchant/videos', merchantVideoRoutes);  // Merchant promotional video routes
console.log('✅ Merchant promotional video routes registered at /api/merchant/videos');

// // Merchant Sync Routes - Syncs merchant data to customer app
app.use('/api/merchant/sync', merchantSyncRoutes);

// // Team Management Routes (RBAC)
app.use('/api/merchant/team-public', teamPublicRoutes);  // Public routes (invitation acceptance)
app.use('/api/merchant/team', teamRoutes);  // Protected team management routes

// Audit Logs & Activity Tracking Routes
app.use('/api/merchant/audit', auditRoutes);  // Audit logs and activity tracking

// // Merchant Onboarding Routes (Agent 1) - 8 onboarding workflow endpoints
app.use('/api/merchant/onboarding', onboardingRoutes);
console.log('✅ Merchant onboarding routes registered at /api/merchant/onboarding (Agent 1)');

// // Bulk Product Operations Routes (Agent 4) - CSV/Excel import/export
app.use('/api/merchant/bulk', bulkRoutes);
console.log('✅ Bulk product operations routes registered at /api/merchant/bulk (Agent 4)');

// // Bulk Product Import Routes - CSV/Excel product import with validation
app.use('/api/merchant/products', bulkImportRoutes);
console.log('✅ Bulk product import routes registered at /api/merchant/products');

// // Merchant Notification Routes (Agent 2) - 5 critical notification endpoints
app.use('/api/merchant/notifications', merchantNotificationRoutes);
console.log('✅ Merchant notification routes registered at /api/merchant/notifications (Agent 2)');

// // Merchant Social Media Verification Routes - Verify Instagram posts for user cashback
app.use('/api/merchant/social-media-posts', merchantSocialMediaRoutes);
console.log('✅ Merchant social media routes registered at /api/merchant/social-media-posts');

// Merchant Events Management Routes - Create, manage, and track events
app.use('/api/merchant/events', merchantEventsRoutes);
console.log('✅ Merchant events routes registered at /api/merchant/events');

// Merchant Services Management Routes - Create, manage services and bookings
app.use('/api/merchant/services', merchantServicesRoutes);
console.log('✅ Merchant services routes registered at /api/merchant/services');

// Root endpoint (MUST be before 404 handler)
app.get('/', (req, res) => {
  res.json({
    message: 'REZ App Backend API',
    status: 'Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      apiInfo: '/api-info'
    }
  });
});

// Handle undefined routes (404) - MUST be after ALL routes
app.use(notFoundHandler);

// Sentry error handler (must come before other error handlers)
if (process.env.SENTRY_DSN) {
  app.use(sentryErrorHandler);
}

// Global error handler (must be last)
app.use(globalErrorHandler);





io.on('connection', (socket) => {
  console.log('🔌 Merchant client connected:', socket.id);
  
  // Join merchant room for real-time updates
  socket.on('join-merchant-room', (merchantId: string) => {
    socket.join(`merchant-${merchantId}`);
    console.log(`Merchant ${merchantId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Merchant client disconnected:', socket.id);
  });
});


declare global {
  var io: any;
  var realTimeService: any;
}
global.io = io;

// Initialize stock socket service
stockSocketService.initialize(io);

// Initialize earnings socket service
earningsSocketService.initialize(io);

// Initialize real-time service
const realTimeServiceInstance = RealTimeService.getInstance(io);
global.realTimeService = realTimeServiceInstance;





// Initialize report service
ReportService.initialize();



// Start server function
async function startServer() {
  try {
    // Validate environment variables first (fail fast if invalid)
    console.log('🔍 Validating environment configuration...');
    try {
      validateEnvironment();
      console.log('✅ Environment validation passed');
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      process.exit(1);
    }

    // Connect to database
    console.log('🔄 Connecting to database...');
    await connectDatabase();

    // Validate Cloudinary configuration
    const cloudinaryConfigured = validateCloudinaryConfig();
    if (!cloudinaryConfigured) {
      console.warn('⚠️  Cloudinary not configured. Bill upload features will not work.');
      console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
    }

    // Initialize partner level maintenance cron jobs (FIXED: Issue #2, #4, #5)
    console.log('🔄 Initializing partner level maintenance...');
    partnerLevelMaintenanceService.startAll();
    console.log('✅ Partner level maintenance cron jobs started');

    // Initialize trial expiry notification job
    console.log('🔄 Initializing trial expiry notification job...');
    initializeTrialExpiryJob();
    console.log('✅ Trial expiry notification job started');

    // Initialize session cleanup job
    console.log('🔄 Initializing session cleanup job...');
    initializeSessionCleanupJob();
    console.log('✅ Session cleanup job started (runs daily at midnight)');

    // Initialize coin expiry job
    console.log('🔄 Initializing coin expiry job...');
    initializeCoinExpiryJob();
    console.log('✅ Coin expiry job started (runs daily at 1:00 AM)');

    // Initialize audit retention service
    console.log('🔄 Initializing audit retention service...');
    await AuditRetentionService.initialize();
    console.log('✅ Audit retention service initialized');

    // Start HTTP server (with Socket.IO attached)
    server.listen(Number(PORT), '0.0.0.0', () => {

      const os = require('os');
    const networkInterfaces = os.networkInterfaces();

     Object.keys(networkInterfaces).forEach(interfaceName => {
      const addresses = networkInterfaces[interfaceName];
      addresses?.forEach((addr: any) => {
        if (addr.family === 'IPv4' && !addr.internal) {
          console.log(`   - http://${addr.address}:${PORT}/health`);
        }
      });
    });

      console.log('\n🚀 REZ App Backend Server Started');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Database: Connected`);
      console.log(`✅ API Prefix: ${API_PREFIX}`);
      console.log(`\n📡 Available Endpoints:`);
      console.log(`   🔍 Health Check: http://localhost:${PORT}/health`);
      console.log(`   📋 API Info: http://localhost:${PORT}/api-info`);
      console.log(`   🔐 Authentication: http://localhost:${PORT}${API_PREFIX}/auth`);
      console.log(`   🛍️  Products: http://localhost:${PORT}${API_PREFIX}/products`);
      console.log(`   🛒 Cart: http://localhost:${PORT}${API_PREFIX}/cart`);
      console.log(`   📂 Categories: http://localhost:${PORT}${API_PREFIX}/categories`);
      console.log(`   🏪 Stores: http://localhost:${PORT}${API_PREFIX}/stores`);
      console.log(`   📦 Orders: http://localhost:${PORT}${API_PREFIX}/orders`);
      console.log(`   🎥 Videos: http://localhost:${PORT}${API_PREFIX}/videos`);
      console.log(`   📸 UGC: http://localhost:${PORT}${API_PREFIX}/ugc`);
      console.log(`   📋 Projects: http://localhost:${PORT}${API_PREFIX}/projects`);
      console.log(`   🔔 Notifications: http://localhost:${PORT}${API_PREFIX}/notifications`);
      console.log(`   ⭐ Reviews: http://localhost:${PORT}${API_PREFIX}/reviews`);
      console.log(`   💝 Wishlist: http://localhost:${PORT}${API_PREFIX}/wishlist`);
      console.log(`   🔄 Sync: http://localhost:${PORT}${API_PREFIX}/sync`);
      console.log(`   💰 Wallet: http://localhost:${PORT}${API_PREFIX}/wallet`);
      console.log(`   🎁 Offers: http://localhost:${PORT}${API_PREFIX}/offers`);
      console.log(`   🎟️  Vouchers: http://localhost:${PORT}${API_PREFIX}/vouchers`);
      console.log(`   📍 Addresses: http://localhost:${PORT}${API_PREFIX}/addresses`);
      console.log(`   💳 Payment Methods: http://localhost:${PORT}${API_PREFIX}/payment-methods`);
      console.log(`   ⚙️  User Settings: http://localhost:${PORT}${API_PREFIX}/user-settings`);
      console.log(`   🏆 Achievements: http://localhost:${PORT}${API_PREFIX}/achievements`);
      console.log(`   📊 Activities: http://localhost:${PORT}${API_PREFIX}/activities`);
      console.log(`   🎫 Coupons: http://localhost:${PORT}${API_PREFIX}/coupons`);
      console.log(`   🆘 Support: http://localhost:${PORT}${API_PREFIX}/support`);
      console.log(`   💸 Discounts: http://localhost:${PORT}${API_PREFIX}/discounts`);
      console.log(`   🎟️  Store Vouchers: http://localhost:${PORT}${API_PREFIX}/store-vouchers`);
      console.log(`   📍 Outlets: http://localhost:${PORT}${API_PREFIX}/outlets`);
      console.log(`   ⚡ Flash Sales: http://localhost:${PORT}${API_PREFIX}/flash-sales`);
      console.log(`   🍽️  Menu & Pre-orders: http://localhost:${PORT}${API_PREFIX}/menu`);
      console.log(`   🩺 Consultations: http://localhost:${PORT}${API_PREFIX}/consultations`);
      console.log(`   📅 Service Appointments: http://localhost:${PORT}${API_PREFIX}/service-appointments`);
      console.log(`   🔄 Merchant Sync: http://localhost:${PORT}/api/merchant/sync`);
      console.log(`\n🎉 Phase 7 Complete - Product Page Features Implemented!`);
      console.log(`   ✅ Authentication APIs (8 endpoints)`);
      console.log(`   ✅ Product APIs (8 endpoints)`);
      console.log(`   ✅ Cart APIs (11 endpoints)`);
      console.log(`   ✅ Category APIs (6 endpoints)`);
      console.log(`   ✅ Store APIs (8 endpoints)`);
      console.log(`   ✅ Order APIs (9 endpoints)`);
      console.log(`   ✅ Video APIs (8 endpoints)`);
      console.log(`   ✅ Project APIs (6 endpoints)`);
      console.log(`   ✅ Notification APIs (3 endpoints)`);
      console.log(`   ✅ Review APIs (5 endpoints)`);
      console.log(`   ✅ Wishlist APIs (8 endpoints)`);
      console.log(`   ✅ Wallet APIs (9 endpoints)`);
      console.log(`   ✅ Offer APIs (14 endpoints)`);
      console.log(`   ✅ Voucher APIs (10 endpoints)`);
      console.log(`   ✅ Address APIs (6 endpoints)`);
      console.log(`   ✅ Payment Method APIs (6 endpoints)`);
      console.log(`   ✅ User Settings APIs (8 endpoints)`);
      console.log(`   ✅ Achievement APIs (6 endpoints)`);
      console.log(`   ✅ Activity APIs (7 endpoints)`);
      console.log(`   ✅ Coupon APIs (9 endpoints)`);
      console.log(`   ✅ Support APIs (17 endpoints)`);
      console.log(`   ✅ Discount APIs (8 endpoints)`);
      console.log(`   ✅ Store Voucher APIs (8 endpoints)`);
      console.log(`   ✅ Outlet APIs (9 endpoints)`);
      console.log(`   🎯 Total Implemented: ~211 endpoints across 23 modules`);
      console.log(`\n🚀 Phase 7 Complete - Product Page Features Ready for Frontend Integration!`);
    });

    // Graceful shutdown handling
    const shutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await database.disconnect();
          console.log('✅ Database disconnected');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };