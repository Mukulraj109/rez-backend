// Force restart - Deleted stale JS files from src
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

// Import Redis service
import redisService from './services/redisService';

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
import { initializeCashbackJobs } from './jobs/cashbackJobs';
import { initializeTravelCashbackJobs } from './jobs/travelCashbackJobs';
import { initializeInventoryAlertJob } from './jobs/inventoryAlerts';
import { initializeDealExpiryJob } from './jobs/expireDealRedemptions';
import { initializeVoucherExpiryJob } from './jobs/expireVoucherRedemptions';
import { initializeTableBookingExpiryJob } from './jobs/expireTableBookings';
import { startReconciliationJob } from './jobs/reconciliationJob';
import { startReservationCleanup } from './jobs/reservationCleanup';
import { initializeLeaderboardRefreshJob } from './jobs/leaderboardRefreshJob';
import { initializeBillVerificationJob } from './jobs/billVerificationJob';
import { startCreatorJobs } from './jobs/creatorJobs';
import { initializeStreakResetJob } from './jobs/streakResetJob';
import { initBonusCampaignJobs } from './jobs/bonusCampaignJob';
import { initChallengeLifecycleJobs } from './jobs/challengeLifecycleJob';
import { initializeTournamentLifecycleJobs } from './jobs/tournamentLifecycleJob';
import { initializePrizeDistributionJob } from './jobs/leaderboardPrizeDistributionJob';
import { runStuckTransactionRecovery } from './jobs/stuckTransactionRecoveryJob';
import { runGiftDelivery } from './jobs/giftDeliveryJob';
import { runGiftExpiry } from './jobs/giftExpiryJob';
import { runSurpriseDropExpiry } from './jobs/surpriseDropExpiryJob';
import { runPartnerEarningsSnapshot } from './jobs/partnerEarningsSnapshotJob';
import { initializeReferralExpiryJob, runReferralExpiry } from './jobs/referralExpiryJob';
import { initializePriveInviteExpiryJob } from './jobs/priveInviteExpiryJob';
import { seedWalletFeatureFlags } from './services/walletFeatureService';

// Import Bull-based scheduled job service (replaces node-cron with Bull repeatable jobs)
import { ScheduledJobService } from './services/ScheduledJobService';

// Import export worker (initializes automatically when imported)
import './workers/exportWorker';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger, requestLogger, correlationIdMiddleware } from './config/logger';

// Override console methods in production to route through structured logger
// This ensures all 9000+ existing console.log calls get PII masking and proper log formatting
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: any[]) => logger.info(args.map(String).join(' '));
  console.error = (...args: any[]) => logger.error(args.map(String).join(' '));
  console.warn = (...args: any[]) => logger.warn(args.map(String).join(' '));
  console.debug = (...args: any[]) => logger.debug(args.map(String).join(' '));
}

import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import { setCsrfToken, validateCsrfToken } from './middleware/csrf';
import { metricsMiddleware, metricsEndpoint } from './config/prometheus';
import { generalLimiter } from './middleware/rateLimiter';
import { ipBlocker } from './middleware/ipBlocker';
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
import productComparisonRoutes from './routes/productComparisonRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import syncRoutes from './routes/syncRoutes';
import locationRoutes from './routes/locationRoutes';
import walletRoutes from './routes/walletRoutes';
import transferRoutes from './routes/transferRoutes';
import giftRoutes from './routes/giftRoutes';
import giftCardRoutes from './routes/giftCardRoutes';
import offerRoutes from './routes/offerRoutes';
import offerCommentRoutes from './routes/offerCommentRoutes';
import offerCategoryRoutes from './routes/offerCategoryRoutes';
import heroBannerRoutes from './routes/heroBannerRoutes';
import whatsNewRoutes from './routes/whatsNewRoutes';
import voucherRoutes from './routes/voucherRoutes';
import addressRoutes from './routes/addressRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import userSettingsRoutes from './routes/userSettingsRoutes';
import achievementRoutes from './routes/achievementRoutes';
import activityRoutes from './routes/activityRoutes';
import paymentRoutes from './routes/paymentRoutes';
import storePaymentRoutes from './routes/storePaymentRoutes';
import externalWalletRoutes from './routes/externalWalletRoutes';
import stockRoutes from './routes/stockRoutes';
import socialMediaRoutes from './routes/socialMediaRoutes';
import securityRoutes from './routes/securityRoutes';
import eventRoutes from './routes/eventRoutes';
import referralRoutes from './routes/referralRoutes';
import profileRoutes from './routes/profileRoutes';
import gameRoutes from './routes/gameRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import streakRoutes from './routes/streakRoutes';
import shareRoutes from './routes/shareRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import programRoutes from './routes/programRoutes';
import specialProgramRoutes from './routes/specialProgramRoutes';
import sponsorRoutes from './routes/sponsorRoutes';
import surveyRoutes from './routes/surveyRoutes';
import verificationRoutes from './routes/verificationRoutes';
import scratchCardRoutes from './routes/scratchCardRoutes';
import couponRoutes from './routes/couponRoutes';
// storePromoCoinRoutes removed - using wallet.brandedCoins instead
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
import creatorRoutes from './routes/creatorRoutes';
import adminCreatorRoutes from './routes/adminCreatorRoutes';
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
import homeServicesRoutes from './routes/homeServicesRoutes';
import travelServicesRoutes from './routes/travelServicesRoutes';
import travelPaymentRoutes from './routes/travelPaymentRoutes';
import travelWebhookRoutes from './routes/travelWebhookRoutes';
import financialServicesRoutes from './routes/financialServicesRoutes';
import healthRecordRoutes from './routes/healthRecordRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import storeVisitRoutes from './routes/storeVisitRoutes';
import homepageRoutes from './routes/homepageRoutes';
import searchRoutes from './routes/searchRoutes';
import mallRoutes from './routes/mallRoutes';  // ReZ Mall routes
import mallAffiliateRoutes from './routes/mallAffiliateRoutes';  // Mall Affiliate tracking routes (legacy - use cashstore/affiliate)
import cashStoreAffiliateRoutes from './routes/cashStoreAffiliateRoutes';  // Cash Store affiliate tracking routes
import cashStoreRoutes from './routes/cashStoreRoutes';  // Cash Store browsing routes (categories, brands, homepage)
import priveRoutes from './routes/priveRoutes';  // Privé eligibility and reputation routes
import priveInviteRoutes from './routes/priveInviteRoutes';  // Privé invite system routes
import webhookRoutes from './routes/webhookRoutes';
import storeGalleryRoutes from './routes/storeGallery';  // Public store gallery routes
import productGalleryRoutes from './routes/productGallery';  // Public product gallery routes
import offersRoutes from './routes/offersRoutes';  // Bank and exclusive offers routes
import zoneVerificationRoutes from './routes/zoneVerificationRoutes';  // Zone verification routes
import loyaltyRoutes from './routes/loyaltyRoutes';  // User loyalty routes
import statsRoutes from './routes/statsRoutes';  // Social proof stats routes
import platformRoutes from './routes/platformRoutes';  // Platform stats (public)
import exploreRoutes from './routes/exploreRoutes';  // Explore page routes
import testRoutes from './routes/testRoutes';  // Integration test routes (dev/test only)
import adminExploreRoutes from './routes/adminExploreRoutes';  // Admin explore management routes
import { adminAuditMiddleware } from './middleware/adminAuditMiddleware';  // Admin audit trail
// Admin panel routes
import {
  adminDashboardRoutes,
  adminOrdersRoutes,
  adminCoinRewardsRoutes,
  adminMerchantWalletsRoutes,
  adminAuthRoutes,
  adminUsersRoutes,
  adminMerchantsRoutes,
  adminWalletRoutes,
  adminCampaignsRoutes,
  adminUploadsRoutes,
  adminExperiencesRoutes,
  adminCategoriesRoutes,
  adminStoresRoutes,
  adminHomepageDealsRoutes,
  adminZoneVerificationsRoutes,
  adminOffersRoutes,
  adminLoyaltyRoutes,
  adminDoubleCampaignsRoutes,
  adminCoinDropsRoutes,
  adminVouchersRoutes,
  adminCouponsRoutes,
  adminTravelRoutes,
  adminSystemRoutes,
  adminChallengesRoutes,
  adminGameConfigRoutes,
  adminFeatureFlagsRoutes,
  adminAchievementsRoutes,
  adminGamificationStatsRoutes,
  adminDailyCheckinConfigRoutes,
  adminSpecialProgramsRoutes,
  adminEventsRoutes,
  adminEventCategoriesRoutes,
  adminEventRewardsRoutes,
  adminTournamentsRoutes,
  adminLearningContentRoutes,
  adminLeaderboardConfigRoutes,
  adminQuickActionRoutes,
  adminValueCardRoutes,
  adminWalletConfigRoutes,
  adminUserWalletsRoutes,
  adminGiftCardsRoutes,
  adminCoinGiftsRoutes,
  adminSurpriseCoinDropsRoutes,
  adminPartnerEarningsRoutes,
  adminReferralsRoutes,
  adminFlashSalesRoutes,
  adminHotspotAreasRoutes,
  adminBankOffersRoutes,
  adminUploadBillStoresRoutes,
  adminExclusiveZonesRoutes,
  adminSpecialProfilesRoutes,
  adminLoyaltyMilestonesRoutes,
  adminSupportRoutes,
  adminSupportConfigRoutes,
  adminFaqRoutes,
  adminNotificationMgmtRoutes,
  adminFraudReportsRoutes,
  adminMembershipRoutes,
  adminAdminUsersRoutes,
} from './routes/admin';
import campaignRoutes from './routes/campaignRoutes';  // Campaign routes for homepage
import bonusZoneRoutes from './routes/bonusZoneRoutes';  // Bonus Zone campaign routes
import adminBonusZoneRoutes from './routes/admin/bonusZone';  // Admin Bonus Zone management
import adminOffersSectionRoutes from './routes/admin/offersSectionConfig';  // Admin Offers Section Config
import adminStoreCollectionRoutes from './routes/admin/storeCollectionConfig';  // Admin Store Collection Config
import adminPriveRoutes from './routes/admin/priveAdmin';  // Admin Privé management
import lockDealRoutes from './routes/lockDealRoutes';  // Lock Price Deal routes
import playEarnRoutes from './routes/playEarnRoutes';  // Play & Earn config routes
import learningRoutes from './routes/learningRoutes';  // Learning content routes
import experienceRoutes from './routes/experienceRoutes';  // Store experience routes
import contentRoutes from './routes/contentRoutes';  // Public content routes (value cards, quick actions)
import earnRoutes from './routes/earnRoutes';  // Earn nearby routes
import authRoutes1 from './merchantroutes/auth';  // Temporarily disabled
import merchantRoutes from './merchantroutes/merchants';  // Temporarily disabled
import merchantProfileRoutes from './merchantroutes/merchant-profile'; // Disabled due to missing properties
import productRoutes1 from './merchantroutes/products';  // Temporarily disabled
import categoryRoutes1 from './merchantroutes/categories';  // Temporarily disabled
import uploadRoutes from './merchantroutes/uploads';  // Temporarily disabled
import orderRoutes1 from './merchantroutes/orders';  // Temporarily disabled
import merchantCashbackRoutes from './merchantroutes/cashback';  // Temporarily disabled
import dashboardRoutes from './merchantroutes/dashboard';  // Temporarily disabled
import merchantWalletRoutes from './merchantroutes/wallet';  // Merchant wallet routes
import merchantCoinsRoutes from './merchantroutes/coins';  // Merchant coin award routes
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
// Merchant CoinDrop routes (Phase 4.1)
import merchantCoinDropRoutes from './routes/merchant/coinDrops';
// Merchant Branded Coin campaign routes (Phase 4.2)
import merchantBrandedCoinRoutes from './routes/merchant/brandedCoins';
// Merchant Earning Analytics routes (Phase 4.3)
import merchantEarningAnalyticsRoutes from './routes/merchant/earningAnalytics';
// Merchant Creator Analytics routes
import merchantCreatorAnalyticsRoutes from './routes/merchant/creatorAnalytics';
// Merchant Social Impact routes
import merchantSocialImpactRoutes from './routes/merchant/socialImpact';
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
import merchantStoreVisitRoutes from './merchantroutes/storeVisits';  // Merchant store visit management routes
import merchantDealRedemptionRoutes from './merchantroutes/dealRedemptions';  // Merchant deal redemption routes
import merchantVoucherRedemptionRoutes from './merchantroutes/voucherRedemptions';  // Merchant voucher/offer redemption routes
import { RealTimeService } from './merchantservices/RealTimeService';  // Temporarily disabled
import { ReportService } from './merchantservices/ReportService';  // Temporarily disabled
import stockSocketService from './services/stockSocketService';
import earningsSocketService from './services/earningsSocketService';
import gamificationSocketService from './services/gamificationSocketService';
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
  // Production: CORS_ORIGIN env var is REQUIRED — explicit whitelist only
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }

  // Collect env-configured origins
  const origins: string[] = [];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  if (process.env.MERCHANT_FRONTEND_URL) {
    origins.push(process.env.MERCHANT_FRONTEND_URL);
  }
  if (process.env.ADMIN_FRONTEND_URL) {
    origins.push(process.env.ADMIN_FRONTEND_URL);
  }

  // Only add localhost in development (explicit check for 'development')
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:19006',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:8083',
      'http://localhost:19000',
      'http://127.0.0.1:19006',
      'http://127.0.0.1:19000'
    );
  }

  if (origins.length === 0) {
    console.warn('⚠️ [CORS] No origins configured! Set CORS_ORIGIN env var for production.');
    return ['http://localhost:3000']; // Fallback for local dev only
  }

  return origins;
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Rez-Region'],
  exposedHeaders: ['X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// IP Blocker — blocks IPs flagged for suspicious activity (Redis-backed)
app.use(ipBlocker);

// ==================== WEBHOOK RAW BODY ROUTES ====================
// Mount webhook routes BEFORE the JSON body parser so they receive the raw Buffer.
// Stripe signature verification requires the original raw body (not re-stringified JSON).
// Razorpay HMAC verification also needs the original body bytes.
import { handleStripeWebhook, handleWebhook as handleRazorpayWebhook } from './controllers/paymentController';

app.post('/api/payment/stripe-webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook as any
);

app.post('/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook as any
);

// Body parsing middleware — selective limits to prevent memory exhaustion
const UPLOAD_PATHS = [
  '/api/bills/upload',
  '/api/products/import',
  '/api/merchant/products/bulk',
  '/api/ugc/upload',
  '/api/merchant/uploads',
];

app.use((req: any, res: any, next: any) => {
  // Upload routes get 10MB; everything else gets 50KB
  const isUpload = UPLOAD_PATHS.some((p: string) => req.path.startsWith(p));
  const limit = isUpload ? '10mb' : '50kb';

  express.json({ limit })(req, res, (err: any) => {
    if (err) {
      if (err.type === 'entity.too.large') {
        return res.status(413).json({
          success: false,
          message: `Request body too large. Maximum size is ${limit}.`,
        });
      }
      if (err instanceof SyntaxError && 'body' in err) {
        req.body = {};
        return next();
      }
      return next(err);
    }
    next();
  });
});

app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Cookie parser middleware (required for CSRF protection)
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// CSRF Protection Middleware
// Sets CSRF token in cookie and response header for all requests
app.use(setCsrfToken);
console.log('✅ CSRF protection middleware enabled');

// Compression middleware
app.use(compression());

// Prometheus metrics middleware - tracks all HTTP requests
app.use(metricsMiddleware);

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
app.use(generalLimiter);

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

    // Check Redis health
    let redisHealth: { status: string; latencyMs?: number } = { status: 'unknown' };
    try {
      const redisService = (await import('./services/redisService')).default;
      const start = Date.now();
      const connected = await redisService.exists('health:ping');
      redisHealth = { status: connected !== undefined ? 'connected' : 'disconnected', latencyMs: Date.now() - start };
    } catch {
      redisHealth = { status: 'disconnected' };
    }

    const allHealthy = dbHealth && redisHealth.status !== 'disconnected';

    const health = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      redis: redisHealth,
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

// Cache stats endpoint
app.get('/health/cache-stats', async (req, res) => {
  try {
    const stats = await redisService.getStats();
    res.json({ success: true, data: { redis: stats } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Prometheus metrics endpoint - for scraping by Prometheus server
app.get('/metrics', metricsEndpoint);

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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || getAllowedOrigins(),
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e4,       // 10 KB max payload (prevents memory exhaustion)
  pingTimeout: 10_000,          // 10s (faster dead socket cleanup)
  pingInterval: 25_000,         // 25s keepalive
  connectTimeout: 10_000,       // 10s to complete handshake
  transports: ['websocket', 'polling'],
});

// Socket.IO Redis adapter is attached after Redis connects in startServer()
import { attachRedisAdapter } from './config/socketAdapter';

// Register Socket.IO instance so services (supportSocketService, etc.) can emit events
import { initializeSocket } from './config/socket';
initializeSocket(io);

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
app.use(`${API_PREFIX}/creators`, creatorRoutes);
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
app.use(`${API_PREFIX}/product-comparisons`, productComparisonRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/recommendations`, recommendationRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/sync`, syncRoutes);
app.use(`${API_PREFIX}/location`, locationRoutes);
app.use(`${API_PREFIX}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/wallet/transfer`, transferRoutes);
console.log('✅ Transfer routes registered at /api/wallet/transfer');
app.use(`${API_PREFIX}/wallet/gift`, giftRoutes);
console.log('✅ Gift routes registered at /api/wallet/gift');
app.use(`${API_PREFIX}/wallet/gift-cards`, giftCardRoutes);
console.log('✅ Gift card routes registered at /api/wallet/gift-cards');
app.use(`${API_PREFIX}/offers`, offerCommentRoutes);
console.log('✅ Offer comment routes registered at /api/offers');
app.use(`${API_PREFIX}/offers`, offerRoutes);
app.use(`${API_PREFIX}/zones`, zoneVerificationRoutes);
console.log('✅ Zone verification routes registered at /api/zones');
app.use(`${API_PREFIX}/offer-categories`, offerCategoryRoutes);
app.use(`${API_PREFIX}/hero-banners`, heroBannerRoutes);
app.use(`${API_PREFIX}/whats-new`, whatsNewRoutes);
app.use(`${API_PREFIX}/vouchers`, voucherRoutes);
app.use(`${API_PREFIX}/addresses`, addressRoutes);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes);
app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes);
app.use(`${API_PREFIX}/achievements`, achievementRoutes);
app.use(`${API_PREFIX}/activities`, activityRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);
app.use(`${API_PREFIX}/store-payment`, storePaymentRoutes);
console.log('✅ Store payment routes registered at /api/store-payment');
app.use(`${API_PREFIX}/wallets/external`, externalWalletRoutes);
console.log('✅ External wallet routes registered at /api/wallets/external');
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/social-media`, socialMediaRoutes);
app.use(`${API_PREFIX}/security`, securityRoutes);
app.use(`${API_PREFIX}/events`, eventRoutes);
app.use(`${API_PREFIX}/referral`, referralRoutes);
app.use(`${API_PREFIX}/user/profile`, profileRoutes);
app.use(`${API_PREFIX}/games`, gameRoutes);
console.log('✅ Game routes registered at /api/games');
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);
console.log('✅ Leaderboard routes registered at /api/leaderboard');
app.use(`${API_PREFIX}/streak`, streakRoutes);
console.log('✅ Streak routes registered at /api/streak');
app.use(`${API_PREFIX}/shares`, shareRoutes);  // plural to match frontend
console.log('✅ Share routes registered at /api/shares');
import photoUploadRoutes from './routes/photoUploadRoutes';
app.use(`${API_PREFIX}/photos`, photoUploadRoutes);
console.log('✅ Photo upload routes registered at /api/photos');
import pollRoutes from './routes/pollRoutes';
app.use(`${API_PREFIX}/polls`, pollRoutes);
console.log('✅ Poll routes registered at /api/polls');
app.use(`${API_PREFIX}/tournaments`, tournamentRoutes);
console.log('✅ Tournament routes registered at /api/tournaments');
app.use(`${API_PREFIX}/programs`, programRoutes);
console.log('✅ Program routes registered at /api/programs');
app.use(`${API_PREFIX}/special-programs`, specialProgramRoutes);
console.log('✅ Special Program routes registered at /api/special-programs');
app.use(`${API_PREFIX}/sponsors`, sponsorRoutes);
console.log('✅ Sponsor routes registered at /api/sponsors');
app.use(`${API_PREFIX}/surveys`, surveyRoutes);
console.log('✅ Survey routes registered at /api/surveys');
app.use(`${API_PREFIX}/user/verifications`, verificationRoutes);
console.log('✅ User verification routes registered at /api/user/verifications');
app.use(`${API_PREFIX}/scratch-cards`, scratchCardRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
// store-promo-coins route removed - using wallet.brandedCoins instead
app.use(`${API_PREFIX}/razorpay`, razorpayRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
console.log('✅ Webhook routes registered at /api/webhooks');
app.use(`${API_PREFIX}/support`, supportRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);
console.log('✅ Messaging routes registered at /api/messages');
app.use(`${API_PREFIX}/cashback`, cashbackRoutes);
app.use(`${API_PREFIX}/loyalty`, loyaltyRoutes);
console.log('✅ Loyalty routes registered at /api/loyalty');
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

// Learning Content Routes - Educational content with coin rewards
app.use(`${API_PREFIX}/learning`, learningRoutes);
console.log('✅ Learning routes registered at /api/learning');

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

// Home Services Routes - Home services specific endpoints
app.use(`${API_PREFIX}/home-services`, homeServicesRoutes);
console.log('✅ Home services routes registered at /api/home-services');

// Travel Services Routes - Travel services specific endpoints (flights, hotels, trains, bus, cab, packages)
app.use(`${API_PREFIX}/travel-services`, travelServicesRoutes);
console.log('✅ Travel services routes registered at /api/travel-services');

// Travel Payment Routes - Razorpay integration for travel bookings
app.use(`${API_PREFIX}/travel-payment`, travelPaymentRoutes);
console.log('✅ Travel payment routes registered at /api/travel-payment');
app.use(`${API_PREFIX}/travel-webhooks`, travelWebhookRoutes);
console.log('✅ Travel webhook routes registered at /api/travel-webhooks');

// Financial Services Routes - Financial services endpoints (bills, OTT, recharge, gold, insurance)
app.use(`${API_PREFIX}/financial-services`, financialServicesRoutes);
console.log('✅ Financial services routes registered at /api/financial-services');

// Service Bookings Routes - User service bookings
app.use(`${API_PREFIX}/service-bookings`, serviceBookingRoutes);
console.log('✅ Service booking routes registered at /api/service-bookings');

// // Consultation Routes - Medical/Professional consultation bookings
app.use(`${API_PREFIX}/consultations`, consultationRoutes);
console.log('✅ Consultation routes registered at /api/consultations');

// Health Records Routes - User health document management
app.use(`${API_PREFIX}/health-records`, healthRecordRoutes);
console.log('✅ Health records routes registered at /api/health-records');

// Emergency Routes - Emergency contacts and ambulance booking
app.use(`${API_PREFIX}/emergency`, emergencyRoutes);
console.log('✅ Emergency routes registered at /api/emergency');

// // Store Visit Routes - Retail store visits and queue system
app.use(`${API_PREFIX}/store-visits`, storeVisitRoutes);
console.log('✅ Store visit routes registered at /api/store-visits');

// Homepage Routes - Batch endpoint for all homepage data
app.use(`${API_PREFIX}/homepage`, homepageRoutes);
console.log('✅ Homepage routes registered at /api/homepage');

// Offers Routes - Bank offers and exclusive offers
app.use(`${API_PREFIX}/offers`, offersRoutes);
console.log('✅ Offers routes registered at /api/offers');

// Loyalty Routes - User loyalty, streaks, missions, coins
app.use(`${API_PREFIX}/users/loyalty`, loyaltyRoutes);
console.log('✅ Loyalty routes registered at /api/users/loyalty');

// Stats Routes - Social proof stats
app.use(`${API_PREFIX}/stats`, statsRoutes);

// Platform Routes - Public platform stats (rating, store count)
app.use(`${API_PREFIX}/platform`, platformRoutes);

// Explore page routes
app.use(`${API_PREFIX}/explore`, exploreRoutes);
app.use(`${API_PREFIX}/test`, testRoutes);  // Integration test routes (dev/test only)
console.log('✅ Explore routes registered at /api/explore');

// Admin audit middleware — logs all POST/PUT/PATCH/DELETE on admin routes
app.use(`${API_PREFIX}/admin`, adminAuditMiddleware);
console.log('✅ Admin audit middleware registered for /api/admin/*');

// Admin explore management routes
app.use(`${API_PREFIX}/admin/explore`, adminExploreRoutes);
console.log('✅ Admin explore routes registered at /api/admin/explore');

// Admin creator management routes
app.use(`${API_PREFIX}/admin/creators`, adminCreatorRoutes);
console.log('✅ Admin creator routes registered at /api/admin/creators');

// Admin authentication routes (for rez-admin portal)
app.use(`${API_PREFIX}/admin/auth`, adminAuthRoutes);
console.log('✅ Admin auth routes registered at /api/admin/auth');

// Admin panel routes
app.use(`${API_PREFIX}/admin/dashboard`, adminDashboardRoutes);
console.log('✅ Admin dashboard routes registered at /api/admin/dashboard');
app.use(`${API_PREFIX}/admin/orders`, adminOrdersRoutes);
console.log('✅ Admin orders routes registered at /api/admin/orders');
app.use(`${API_PREFIX}/admin/coin-rewards`, adminCoinRewardsRoutes);
console.log('✅ Admin coin rewards routes registered at /api/admin/coin-rewards');
app.use(`${API_PREFIX}/admin/merchant-wallets`, adminMerchantWalletsRoutes);
console.log('✅ Admin merchant wallets routes registered at /api/admin/merchant-wallets');
app.use(`${API_PREFIX}/admin/users`, adminUsersRoutes);
console.log('✅ Admin users routes registered at /api/admin/users');
app.use(`${API_PREFIX}/admin/merchants`, adminMerchantsRoutes);
console.log('✅ Admin merchants routes registered at /api/admin/merchants');
app.use(`${API_PREFIX}/admin/wallet`, adminWalletRoutes);
console.log('✅ Admin wallet routes registered at /api/admin/wallet');
app.use(`${API_PREFIX}/admin/campaigns`, adminCampaignsRoutes);
console.log('✅ Admin campaigns routes registered at /api/admin/campaigns');
app.use(`${API_PREFIX}/admin/bonus-zone`, adminBonusZoneRoutes);
app.use(`${API_PREFIX}/admin/offers-sections`, adminOffersSectionRoutes);
app.use(`${API_PREFIX}/admin/store-collections`, adminStoreCollectionRoutes);
app.use(`${API_PREFIX}/admin/prive`, adminPriveRoutes);
console.log('✅ Admin bonus zone routes registered at /api/admin/bonus-zone');
console.log('✅ Admin store-collections routes registered at /api/admin/store-collections');
console.log('✅ Admin Privé routes registered at /api/admin/prive');
app.use(`${API_PREFIX}/admin/uploads`, adminUploadsRoutes);
console.log('✅ Admin uploads routes registered at /api/admin/uploads');
app.use(`${API_PREFIX}/admin/experiences`, adminExperiencesRoutes);
console.log('✅ Admin experiences routes registered at /api/admin/experiences');
app.use(`${API_PREFIX}/admin/categories`, adminCategoriesRoutes);
console.log('✅ Admin categories routes registered at /api/admin/categories');
app.use(`${API_PREFIX}/admin/stores`, adminStoresRoutes);
console.log('✅ Admin stores routes registered at /api/admin/stores');
app.use(`${API_PREFIX}/admin/homepage-deals`, adminHomepageDealsRoutes);
console.log('✅ Admin homepage deals routes registered at /api/admin/homepage-deals');
app.use(`${API_PREFIX}/admin/zone-verifications`, adminZoneVerificationsRoutes);
console.log('✅ Admin zone verifications routes registered at /api/admin/zone-verifications');
app.use(`${API_PREFIX}/admin/offers`, adminOffersRoutes);
console.log('✅ Admin offers routes registered at /api/admin/offers');
app.use(`${API_PREFIX}/admin/loyalty`, adminLoyaltyRoutes);
console.log('✅ Admin loyalty routes registered at /api/admin/loyalty');
app.use(`${API_PREFIX}/admin/double-campaigns`, adminDoubleCampaignsRoutes);
console.log('✅ Admin double campaigns routes registered at /api/admin/double-campaigns');
app.use(`${API_PREFIX}/admin/coin-drops`, adminCoinDropsRoutes);
console.log('✅ Admin coin drops routes registered at /api/admin/coin-drops');
app.use(`${API_PREFIX}/admin/vouchers`, adminVouchersRoutes);
console.log('✅ Admin vouchers routes registered at /api/admin/vouchers');
app.use(`${API_PREFIX}/admin/coupons`, adminCouponsRoutes);
console.log('✅ Admin coupons routes registered at /api/admin/coupons');
app.use(`${API_PREFIX}/admin/travel`, adminTravelRoutes);
console.log('✅ Admin travel routes registered at /api/admin/travel');
app.use(`${API_PREFIX}/admin/system`, adminSystemRoutes);
console.log('✅ Admin system routes registered at /api/admin/system');
app.use(`${API_PREFIX}/admin/challenges`, adminChallengesRoutes);
console.log('✅ Admin challenges routes registered at /api/admin/challenges');
app.use(`${API_PREFIX}/admin/game-config`, adminGameConfigRoutes);
console.log('✅ Admin game config routes registered at /api/admin/game-config');
app.use(`${API_PREFIX}/admin/tournaments`, adminTournamentsRoutes);
console.log('✅ Admin tournament routes registered at /api/admin/tournaments');
app.use(`${API_PREFIX}/admin/feature-flags`, adminFeatureFlagsRoutes);
console.log('✅ Admin feature flags routes registered at /api/admin/feature-flags');
app.use(`${API_PREFIX}/admin/achievements`, adminAchievementsRoutes);
console.log('✅ Admin achievements routes registered at /api/admin/achievements');
app.use(`${API_PREFIX}/admin/gamification-stats`, adminGamificationStatsRoutes);
console.log('✅ Admin gamification stats routes registered at /api/admin/gamification-stats');
app.use(`${API_PREFIX}/admin/daily-checkin-config`, adminDailyCheckinConfigRoutes);
console.log('✅ Admin daily check-in config routes registered at /api/admin/daily-checkin-config');
app.use(`${API_PREFIX}/admin/special-programs`, adminSpecialProgramsRoutes);
console.log('✅ Admin special programs routes registered at /api/admin/special-programs');
app.use(`${API_PREFIX}/admin/events`, adminEventsRoutes);
console.log('✅ Admin events routes registered at /api/admin/events');
app.use(`${API_PREFIX}/admin/event-categories`, adminEventCategoriesRoutes);
console.log('✅ Admin event categories routes registered at /api/admin/event-categories');
app.use(`${API_PREFIX}/admin/event-rewards`, adminEventRewardsRoutes);
console.log('✅ Admin event rewards routes registered at /api/admin/event-rewards');
app.use(`${API_PREFIX}/admin/learning-content`, adminLearningContentRoutes);
console.log('✅ Admin learning content routes registered at /api/admin/learning-content');
app.use(`${API_PREFIX}/admin/leaderboard/configs`, adminLeaderboardConfigRoutes);
console.log('✅ Admin leaderboard config routes registered at /api/admin/leaderboard/configs');
app.use(`${API_PREFIX}/admin/quick-actions`, adminQuickActionRoutes);
console.log('✅ Admin quick action routes registered at /api/admin/quick-actions');
app.use(`${API_PREFIX}/admin/value-cards`, adminValueCardRoutes);
console.log('✅ Admin value card routes registered at /api/admin/value-cards');
app.use(`${API_PREFIX}/admin/wallet-config`, adminWalletConfigRoutes);
console.log('✅ Admin wallet config routes registered at /api/admin/wallet-config');
app.use(`${API_PREFIX}/admin/user-wallets`, adminUserWalletsRoutes);
console.log('✅ Admin user wallets routes registered at /api/admin/user-wallets');
app.use(`${API_PREFIX}/admin/gift-cards`, adminGiftCardsRoutes);
console.log('✅ Admin gift cards routes registered at /api/admin/gift-cards');
app.use(`${API_PREFIX}/admin/coin-gifts`, adminCoinGiftsRoutes);
console.log('✅ Admin coin gift routes registered at /api/admin/coin-gifts');
app.use(`${API_PREFIX}/admin/surprise-coin-drops`, adminSurpriseCoinDropsRoutes);
console.log('✅ Admin surprise coin drops routes registered at /api/admin/surprise-coin-drops');

app.use(`${API_PREFIX}/admin/partner-earnings`, adminPartnerEarningsRoutes);
console.log('✅ Admin partner earnings routes registered at /api/admin/partner-earnings');

app.use(`${API_PREFIX}/admin/referrals`, adminReferralsRoutes);
console.log('✅ Admin referrals routes registered at /api/admin/referrals');

app.use(`${API_PREFIX}/admin/flash-sales`, adminFlashSalesRoutes);
console.log('✅ Admin flash sales routes registered at /api/admin/flash-sales');
app.use(`${API_PREFIX}/admin/hotspot-areas`, adminHotspotAreasRoutes);
console.log('✅ Admin hotspot areas routes registered at /api/admin/hotspot-areas');
app.use(`${API_PREFIX}/admin/bank-offers`, adminBankOffersRoutes);
console.log('✅ Admin bank offers routes registered at /api/admin/bank-offers');
app.use(`${API_PREFIX}/admin/upload-bill-stores`, adminUploadBillStoresRoutes);
console.log('✅ Admin upload bill stores routes registered at /api/admin/upload-bill-stores');
app.use(`${API_PREFIX}/admin/exclusive-zones`, adminExclusiveZonesRoutes);
console.log('✅ Admin exclusive zones routes registered at /api/admin/exclusive-zones');
app.use(`${API_PREFIX}/admin/special-profiles`, adminSpecialProfilesRoutes);
console.log('✅ Admin special profiles routes registered at /api/admin/special-profiles');
app.use(`${API_PREFIX}/admin/loyalty-milestones`, adminLoyaltyMilestonesRoutes);
console.log('✅ Admin loyalty milestones routes registered at /api/admin/loyalty-milestones');
app.use(`${API_PREFIX}/admin/support-config`, adminSupportConfigRoutes);
console.log('✅ Admin support config routes registered at /api/admin/support-config');
app.use(`${API_PREFIX}/admin/support`, adminSupportRoutes);
console.log('✅ Admin support routes registered at /api/admin/support');
app.use(`${API_PREFIX}/admin/support/faq`, adminFaqRoutes);
console.log('✅ Admin FAQ routes registered at /api/admin/support/faq');
app.use(`${API_PREFIX}/admin/notifications`, adminNotificationMgmtRoutes);
console.log('✅ Admin notification management routes registered at /api/admin/notifications');
app.use(`${API_PREFIX}/admin/fraud-reports`, adminFraudReportsRoutes);
console.log('✅ Admin fraud reports routes registered at /api/admin/fraud-reports');
app.use(`${API_PREFIX}/admin/membership`, adminMembershipRoutes);
console.log('✅ Admin membership routes registered at /api/admin/membership');
app.use(`${API_PREFIX}/admin/admin-users`, adminAdminUsersRoutes);
console.log('✅ Admin user management routes registered at /api/admin/admin-users');

// Admin Engagement Config Routes
import { Router as EngagementConfigRouter } from 'express';
import { authenticate as authTokenMiddleware } from './middleware/auth';
import { getAllConfigs, updateConfig, setCampaign } from './controllers/engagementConfigController';
const engagementConfigRouter = EngagementConfigRouter();
engagementConfigRouter.get('/', getAllConfigs);
engagementConfigRouter.patch('/:action', updateConfig);
engagementConfigRouter.post('/:action/campaign', setCampaign);
app.use(`${API_PREFIX}/admin/engagement-config`, authTokenMiddleware, engagementConfigRouter);
console.log('✅ Admin engagement config routes registered at /api/admin/engagement-config');

// Campaign Routes - Homepage exciting deals
app.use(`${API_PREFIX}/campaigns`, campaignRoutes);
console.log('✅ Campaign routes registered at /api/campaigns');

// Bonus Zone Routes - Production campaign reward engine
app.use(`${API_PREFIX}/bonus-zone`, bonusZoneRoutes);
console.log('✅ Bonus Zone routes registered at /api/bonus-zone');

// Lock Price Deal Routes - Lock deals with deposit, double earnings, pickup rewards
app.use(`${API_PREFIX}/lock-deals`, lockDealRoutes);
console.log('✅ Lock deal routes registered at /api/lock-deals');

// Play & Earn Config Routes
app.use(`${API_PREFIX}/play-earn`, playEarnRoutes);
console.log('✅ Play & Earn routes registered at /api/play-earn');

// Experience Routes - Store experiences
app.use(`${API_PREFIX}/experiences`, experienceRoutes);
console.log('✅ Experience routes registered at /api/experiences');

// Content Routes - Public content (value cards, quick actions)
app.use(`${API_PREFIX}/content`, contentRoutes);
console.log('✅ Content routes registered at /api/content');

// Earn Routes - Nearby earn, earning opportunities
app.use(`${API_PREFIX}/earn`, earnRoutes);
console.log('✅ Earn routes registered at /api/earn');

// // Search Routes - Global search across products, stores, and articles
app.use(`${API_PREFIX}/search`, searchRoutes);
console.log('✅ Search routes registered at /api/search');

// Mall Routes - ReZ Mall curated brands and offers
app.use(`${API_PREFIX}/mall`, mallRoutes);
console.log('✅ Mall routes registered at /api/mall');

// Mall Affiliate Routes - Cashback tracking, webhooks, and conversions (legacy)
app.use(`${API_PREFIX}/mall/affiliate`, mallAffiliateRoutes);
console.log('✅ Mall Affiliate routes registered at /api/mall/affiliate (legacy)');

// Cash Store Browsing Routes - Categories, brands, homepage aggregation
app.use(`${API_PREFIX}/cashstore`, cashStoreRoutes);
console.log('✅ Cash Store routes registered at /api/cashstore');

// Cash Store Affiliate Routes - External brand cashback tracking
app.use(`${API_PREFIX}/cashstore/affiliate`, cashStoreAffiliateRoutes);
console.log('✅ Cash Store Affiliate routes registered at /api/cashstore/affiliate');

// Privé Routes - Eligibility, reputation, and exclusive access
app.use(`${API_PREFIX}/prive`, priveRoutes);
app.use(`${API_PREFIX}/prive`, priveInviteRoutes);
console.log('✅ Privé routes registered at /api/prive (including invite system)');

// Store Gallery Routes - Public gallery viewing
app.use(`${API_PREFIX}/stores`, storeGalleryRoutes);
console.log('✅ Store gallery routes registered at /api/stores/:storeId/gallery');

// Product Gallery Routes - Public gallery viewing
app.use(`${API_PREFIX}/products`, productGalleryRoutes);
console.log('✅ Product gallery routes registered at /api/products/:productId/gallery');

// Merchant API Routes — rate limiter re-enabled for production
app.use('/api/merchant', generalLimiter);
console.log('✅ General rate limiter applied to all merchant routes');

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
app.use('/api/merchant/wallet', merchantWalletRoutes);  // Merchant wallet routes
console.log('✅ Merchant wallet routes registered at /api/merchant/wallet');
app.use('/api/merchant/coins', merchantCoinsRoutes);  // Merchant coin award routes
console.log('✅ Merchant coin award routes registered at /api/merchant/coins');
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

app.use('/api/merchant/store-visits', merchantStoreVisitRoutes);
console.log('✅ Merchant store visit management routes registered at /api/merchant/store-visits');

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

// Merchant Deal Redemption Routes - Verify and redeem deal codes
app.use('/api/merchant/deal-redemptions', merchantDealRedemptionRoutes);
console.log('✅ Merchant deal redemption routes registered at /api/merchant/deal-redemptions');

// Merchant Voucher Redemption Routes - Verify and redeem offer voucher codes
app.use('/api/merchant/voucher-redemptions', merchantVoucherRedemptionRoutes);
console.log('✅ Merchant voucher redemption routes registered at /api/merchant/voucher-redemptions');

// Merchant CoinDrop Routes (Phase 4.1) - CoinDrop configuration and management
app.use('/api/merchant', merchantCoinDropRoutes);
console.log('✅ Merchant CoinDrop routes registered at /api/merchant/stores/:storeId/coin-drops');

// Merchant Branded Coin Campaign Routes (Phase 4.2) - Branded coin analytics and awards
app.use('/api/merchant', merchantBrandedCoinRoutes);
console.log('✅ Merchant branded coin routes registered at /api/merchant/stores/:storeId/branded-campaigns');

// Merchant Earning Analytics Routes (Phase 4.3) - Earning analytics dashboard
app.use('/api/merchant', merchantEarningAnalyticsRoutes);
console.log('✅ Merchant earning analytics routes registered');

// Merchant Creator Analytics Routes - Creator program analytics for merchants
app.use('/api/merchant/stores', merchantCreatorAnalyticsRoutes);
console.log('✅ Merchant creator analytics routes registered');

// Merchant Social Impact Routes - Social impact event management for merchants
app.use('/api/merchant/programs/social-impact', merchantSocialImpactRoutes);
console.log('✅ Merchant social impact routes registered');

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





// Socket.IO JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string; role: string };
    (socket as any).userId = decoded.userId;
    (socket as any).userRole = decoded.role;
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  const userRole = (socket as any).userRole;

  // Auto-join user's personal room
  socket.join(`user-${userId}`);
  console.log(`[Socket] Connected: userId=${userId}, role=${userRole}, socketId=${socket.id}, rooms=[${[...socket.rooms].join(', ')}]`);

  // Auto-join support-agents room for admin users
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin') {
    socket.join('support-agents');
    console.log(`[Socket] Admin ${userId} joined support-agents room`);
  }

  // Join merchant room (only if merchant/admin role)
  socket.on('join-merchant-room', (merchantId: string) => {
    if (userRole === 'merchant' || userRole === 'admin' || userRole === 'superadmin') {
      socket.join(`merchant-${merchantId}`);
    }
  });

  // Join a specific support ticket room (any authenticated user)
  const handleJoinTicket = (ticketId: string) => {
    if (ticketId) {
      socket.join(`support-ticket-${ticketId}`);
      console.log(`[Socket] User ${userId} (${userRole}) joined support-ticket-${ticketId}`);
    }
  };
  socket.on('join-support-ticket', handleJoinTicket);
  socket.on('join_ticket', (data: any) => {
    // Frontend realTimeService sends { ticketId } as data
    const tid = typeof data === 'string' ? data : data?.ticketId;
    if (tid) handleJoinTicket(tid);
  });

  // Leave a specific support ticket room
  socket.on('leave-support-ticket', (ticketId: string) => {
    socket.leave(`support-ticket-${ticketId}`);
  });
  socket.on('leave_ticket', (data: any) => {
    const tid = typeof data === 'string' ? data : data?.ticketId;
    if (tid) socket.leave(`support-ticket-${tid}`);
  });

  // Admin typing indicator for support chat
  socket.on('support-agent-typing', (data: { ticketId: string; isTyping: boolean }) => {
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin') {
      const event = data.isTyping ? 'support_agent_typing_start' : 'support_agent_typing_stop';
      socket.to(`support-ticket-${data.ticketId}`).emit(event, {
        ticketId: data.ticketId,
        agentId: userId,
      });
    }
  });

  // User typing indicator for support chat
  socket.on('support-user-typing', (data: { ticketId: string; isTyping: boolean }) => {
    const event = data.isTyping ? 'support_user_typing_start' : 'support_user_typing_stop';
    socket.to(`support-ticket-${data.ticketId}`).emit(event, {
      ticketId: data.ticketId,
      userId: userId,
    });
    // Also notify support-agents room
    socket.to('support-agents').emit(event, {
      ticketId: data.ticketId,
      userId: userId,
    });
  });

  socket.on('disconnect', () => {
    // cleanup handled by socket.io automatically
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

// Initialize gamification socket service (live tournament leaderboards)
gamificationSocketService.initialize(io);

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

    // Connect to Redis (required for token blacklist, caching, distributed locks)
    console.log('🔄 Connecting to Redis...');
    await redisService.connect();
    console.log(redisService.isReady() ? '✅ Redis connected' : '⚠️ Redis unavailable — app will continue without caching');

    // Warm up public caches after Redis connects (non-blocking)
    if (redisService.isReady()) {
      const { warmUpPublicCaches } = await import('./utils/cacheWarmup');
      setImmediate(() => warmUpPublicCaches().catch(err => console.warn('[CACHE-WARMUP]', err)));
    }

    // Attach Socket.IO Redis adapter (needs Redis to be connected first)
    try {
      await attachRedisAdapter(io);
    } catch (err) {
      console.error('[Socket.IO] Redis adapter failed, using in-memory fallback:', err);
    }

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

    // Initialize cashback jobs (credit pending & expire clicks)
    console.log('🔄 Initializing cashback jobs...');
    initializeCashbackJobs();
    console.log('✅ Cashback jobs started (credit: hourly, expire: daily at 2:00 AM)');

    // Initialize travel cashback jobs (credit, expire unpaid, mark completed)
    console.log('🔄 Initializing travel cashback jobs...');
    initializeTravelCashbackJobs();
    console.log('✅ Travel cashback jobs started (credit: 2h, expire: 15m, complete: daily 3AM)');

    // Initialize inventory alert job (sends low stock / out of stock notifications)
    console.log('🔄 Initializing inventory alert job...');
    initializeInventoryAlertJob();
    console.log('✅ Inventory alert job started (runs daily at 8:00 AM)');

    // Initialize deal redemption expiry job
    console.log('🔄 Initializing deal expiry job...');
    initializeDealExpiryJob();
    console.log('✅ Deal expiry job started (runs every hour)');

    // Initialize voucher redemption expiry job
    console.log('🔄 Initializing voucher expiry job...');
    initializeVoucherExpiryJob();
    console.log('✅ Voucher expiry job started (runs every hour at :30)');

    // Initialize table booking expiry job
    console.log('🔄 Initializing table booking expiry job...');
    initializeTableBookingExpiryJob();
    console.log('✅ Table booking expiry job started (runs every 30 min)');

    // Initialize reconciliation job
    console.log('🔄 Initializing reconciliation job...');
    startReconciliationJob();
    console.log('✅ Reconciliation job started (runs daily at 3:00 AM)');

    // Initialize reservation cleanup job
    console.log('🔄 Initializing reservation cleanup job...');
    startReservationCleanup();
    console.log('✅ Reservation cleanup job started (runs every 5 min)');

    // Initialize leaderboard refresh job (gamification Phase 5.2)
    console.log('🔄 Initializing leaderboard refresh job...');
    initializeLeaderboardRefreshJob();
    console.log('✅ Leaderboard refresh job started (runs every 5 min)');

    // Initialize bill verification job (gamification Phase 5.2)
    console.log('🔄 Initializing bill verification job...');
    initializeBillVerificationJob();
    console.log('✅ Bill verification job started (runs every 10 min)');

    // Initialize creator program background jobs
    console.log('🔄 Starting creator program jobs...');
    startCreatorJobs();
    console.log('✅ Creator jobs started (trending, stats, conversions, tiers)');

    // Initialize streak reset job (resets broken streaks daily at 00:05 UTC)
    console.log('🔄 Initializing streak reset job...');
    initializeStreakResetJob();
    console.log('✅ Streak reset job started (runs daily at 00:05 UTC)');

    // Initialize bonus campaign jobs (status transitions every 5m, expire claims every 30m)
    console.log('🔄 Initializing bonus campaign jobs...');
    initBonusCampaignJobs();
    console.log('✅ Bonus campaign jobs started (transitions: 5m, expire claims: 30m)');

    // Initialize challenge lifecycle jobs (status transitions every 5m, cleanup every 30m)
    console.log('🔄 Initializing challenge lifecycle jobs...');
    initChallengeLifecycleJobs();
    console.log('✅ Challenge lifecycle jobs started (transitions: 5m, cleanup: 30m)');

    // Initialize tournament lifecycle jobs (activation + completion + prize distribution)
    console.log('🔄 Initializing tournament lifecycle jobs...');
    initializeTournamentLifecycleJobs();
    console.log('✅ Tournament lifecycle jobs started (activation: 5m, completion: 5m)');

    // Initialize wallet production-readiness jobs with distributed locks
    console.log('🔄 Initializing wallet production jobs...');
    const cron = require('node-cron');

    // Stuck transaction recovery — every 15 min, one pod only
    cron.schedule('*/15 * * * *', async () => {
      const lock = await redisService.acquireLock('stuck_tx_recovery', 600);
      if (!lock) return;
      try { await runStuckTransactionRecovery(); }
      catch (e) { console.error('[JOB] stuckTransactionRecovery:', e); }
      finally { await redisService.releaseLock('stuck_tx_recovery', lock); }
    });

    // Gift delivery — every 5 min, one pod only
    cron.schedule('*/5 * * * *', async () => {
      const lock = await redisService.acquireLock('gift_delivery', 240);
      if (!lock) return;
      try { await runGiftDelivery(); }
      catch (e) { console.error('[JOB] giftDelivery:', e); }
      finally { await redisService.releaseLock('gift_delivery', lock); }
    });

    // Gift expiry — daily 2:30 AM, one pod only
    cron.schedule('30 2 * * *', async () => {
      const lock = await redisService.acquireLock('gift_expiry', 3600);
      if (!lock) return;
      try { await runGiftExpiry(); }
      catch (e) { console.error('[JOB] giftExpiry:', e); }
      finally { await redisService.releaseLock('gift_expiry', lock); }
    });

    // Surprise drop expiry — hourly, one pod only
    cron.schedule('0 * * * *', async () => {
      const lock = await redisService.acquireLock('surprise_drop_expiry', 3000);
      if (!lock) return;
      try { await runSurpriseDropExpiry(); }
      catch (e) { console.error('[JOB] surpriseDropExpiry:', e); }
      finally { await redisService.releaseLock('surprise_drop_expiry', lock); }
    });

    // Partner earnings snapshot — daily 1 AM, one pod only
    cron.schedule('0 1 * * *', async () => {
      const lock = await redisService.acquireLock('partner_earnings_snapshot', 7200);
      if (!lock) return;
      try { await runPartnerEarningsSnapshot(); }
      catch (e) { console.error('[JOB] partnerEarningsSnapshot:', e); }
      finally { await redisService.releaseLock('partner_earnings_snapshot', lock); }
    });

    console.log('✅ Wallet production jobs started with distributed locks');
    // Referral expiry — daily at 3 AM
    initializeReferralExpiryJob();
    console.log('✅ Referral expiry job started (runs daily at 3 AM)');
    // Privé invite code expiry — daily at 3:30 AM
    initializePriveInviteExpiryJob();

    // Seed wallet feature flags
    await seedWalletFeatureFlags();
    console.log('✅ Wallet feature flags seeded');

    // Initialize Bull-based scheduled job service (preferred over node-cron above)
    // The node-cron jobs above serve as fallback if Redis/Bull is unavailable
    console.log('🔄 Initializing Bull scheduled job service...');
    await ScheduledJobService.initialize();
    console.log('✅ Bull scheduled job service initialized');

    // Initialize audit retention service
    console.log('🔄 Initializing audit retention service...');
    await AuditRetentionService.initialize();
    console.log('✅ Audit retention service initialized');

    // Initialize leaderboard prize distribution job (hourly check for period-end prizes)
    console.log('🔄 Initializing leaderboard prize distribution job...');
    initializePrizeDistributionJob();
    console.log('✅ Leaderboard prize distribution job started (runs hourly)');

    // Initialize order lifecycle background jobs
    console.log('🔄 Initializing order lifecycle jobs...');
    const { initializeOrderLifecycleJobs } = await import('./jobs/orderLifecycleJobs');
    initializeOrderLifecycleJobs();
    const { initializeOrderReconciliationJob } = await import('./jobs/orderReconciliationJob');
    initializeOrderReconciliationJob();
    console.log('✅ Order lifecycle + reconciliation jobs started');

    // Initialize gamification event bus
    console.log('🔄 Initializing gamification event bus...');
    const gamificationEventBus = (await import('./events/gamificationEventBus')).default;
    await gamificationEventBus.initialize();
    console.log('✅ Gamification event bus initialized');

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
    let isShuttingDown = false;
    const shutdown = (signal: string) => {
      if (isShuttingDown) return; // Prevent double-shutdown
      isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);

      // Stop accepting new connections, drain in-flight requests
      server.close(async () => {
        console.log('✅ HTTP server closed (in-flight requests drained)');

        try {
          // Shut down Bull scheduled job service
          try {
            await ScheduledJobService.shutdown();
            console.log('✅ Scheduled job service shut down');
          } catch { /* May not be initialized */ }

          // Disconnect Redis
          try {
            const redisService = (await import('./services/redisService')).default;
            await redisService.disconnect();
            console.log('✅ Redis disconnected');
          } catch { /* Redis may not be connected */ }

          // Disconnect MongoDB
          await database.disconnect();
          console.log('✅ Database disconnected');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 15 seconds
      setTimeout(() => {
        console.log('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception — shutting down', {
        message: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

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