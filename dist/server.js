"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
// Import database connection
const database_1 = require("./config/database");
// Import utilities
const cloudinaryUtils_1 = require("./utils/cloudinaryUtils");
// Import partner level maintenance service
const partnerLevelMaintenanceService_1 = __importDefault(require("./services/partnerLevelMaintenanceService"));
// Import trial expiry notification job
const trialExpiryNotification_1 = require("./jobs/trialExpiryNotification");
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const storeRoutes_1 = __importDefault(require("./routes/storeRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const videoRoutes_1 = __importDefault(require("./routes/videoRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const stockNotificationRoutes_1 = __importDefault(require("./routes/stockNotificationRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const favoriteRoutes_1 = __importDefault(require("./routes/favoriteRoutes"));
const comparisonRoutes_1 = __importDefault(require("./routes/comparisonRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const recommendationRoutes_1 = __importDefault(require("./routes/recommendationRoutes"));
const wishlistRoutes_1 = __importDefault(require("./routes/wishlistRoutes"));
const syncRoutes_1 = __importDefault(require("./routes/syncRoutes"));
const locationRoutes_1 = __importDefault(require("./routes/locationRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const offerRoutes_1 = __importDefault(require("./routes/offerRoutes"));
const offerCategoryRoutes_1 = __importDefault(require("./routes/offerCategoryRoutes"));
const heroBannerRoutes_1 = __importDefault(require("./routes/heroBannerRoutes"));
const voucherRoutes_1 = __importDefault(require("./routes/voucherRoutes"));
const addressRoutes_1 = __importDefault(require("./routes/addressRoutes"));
const paymentMethodRoutes_1 = __importDefault(require("./routes/paymentMethodRoutes"));
const userSettingsRoutes_1 = __importDefault(require("./routes/userSettingsRoutes"));
const achievementRoutes_1 = __importDefault(require("./routes/achievementRoutes"));
const activityRoutes_1 = __importDefault(require("./routes/activityRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const stockRoutes_1 = __importDefault(require("./routes/stockRoutes"));
const socialMediaRoutes_1 = __importDefault(require("./routes/socialMediaRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const referralRoutes_1 = __importDefault(require("./routes/referralRoutes"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const scratchCardRoutes_1 = __importDefault(require("./routes/scratchCardRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const storePromoCoinRoutes_1 = __importDefault(require("./routes/storePromoCoinRoutes"));
const razorpayRoutes_1 = __importDefault(require("./routes/razorpayRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const cashbackRoutes_1 = __importDefault(require("./routes/cashbackRoutes"));
const userProductRoutes_1 = __importDefault(require("./routes/userProductRoutes"));
const discountRoutes_1 = __importDefault(require("./routes/discountRoutes"));
const storeVoucherRoutes_1 = __importDefault(require("./routes/storeVoucherRoutes"));
const outletRoutes_1 = __importDefault(require("./routes/outletRoutes"));
const flashSaleRoutes_1 = __importDefault(require("./routes/flashSaleRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const billRoutes_1 = __importDefault(require("./routes/billRoutes"));
const billingRoutes_1 = __importDefault(require("./routes/billingRoutes"));
const activityFeedRoutes_1 = __importDefault(require("./routes/activityFeedRoutes"));
const unifiedGamificationRoutes_1 = __importDefault(require("./routes/unifiedGamificationRoutes"));
const partnerRoutes_1 = __importDefault(require("./routes/partnerRoutes"));
const auth_1 = __importDefault(require("./merchantroutes/auth")); // Temporarily disabled
const merchants_1 = __importDefault(require("./merchantroutes/merchants")); // Temporarily disabled
const merchant_profile_1 = __importDefault(require("./merchantroutes/merchant-profile")); // Disabled due to missing properties
const products_1 = __importDefault(require("./merchantroutes/products")); // Temporarily disabled
const categories_1 = __importDefault(require("./merchantroutes/categories")); // Temporarily disabled
const uploads_1 = __importDefault(require("./merchantroutes/uploads")); // Temporarily disabled
const orders_1 = __importDefault(require("./merchantroutes/orders")); // Temporarily disabled
const cashback_1 = __importDefault(require("./merchantroutes/cashback")); // Temporarily disabled
const dashboard_1 = __importDefault(require("./merchantroutes/dashboard")); // Temporarily disabled
const sync_1 = __importDefault(require("./merchantroutes/sync"));
const RealTimeService_1 = require("./merchantservices/RealTimeService"); // Temporarily disabled
const ReportService_1 = require("./merchantservices/ReportService"); // Temporarily disabled
const stockSocketService_1 = __importDefault(require("./services/stockSocketService"));
// Load environment variables
dotenv_1.default.config();
// Create Express application
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 5001;
const API_PREFIX = process.env.API_PREFIX || '/api';
// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
// CORS configuration
const corsOptions = {
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression middleware
app.use((0, compression_1.default)());
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use((0, morgan_1.default)(morganFormat));
}
// Rate limiting - Production security
app.use(rateLimiter_1.generalLimiter);
// Health check endpoint with API info
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await database_1.database.healthCheck();
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            api: {
                prefix: API_PREFIX,
                totalEndpoints: 145,
                modules: 15,
                endpoints: {
                    auth: `${API_PREFIX}/auth`,
                    products: `${API_PREFIX}/products`,
                    cart: `${API_PREFIX}/cart`,
                    categories: `${API_PREFIX}/categories`,
                    stores: `${API_PREFIX}/stores`,
                    orders: `${API_PREFIX}/orders`,
                    videos: `${API_PREFIX}/videos`,
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
                    partner: `${API_PREFIX}/partner`
                }
            }
        };
        res.status(200).json(health);
    }
    catch (error) {
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
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
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
                'Video', 'Project', 'Transaction', 'Notification', 'Review', 'Wishlist',
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
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});
// User API Routes
app.use(`${API_PREFIX}/user/auth`, authRoutes_1.default);
app.use(`${API_PREFIX}/products`, productRoutes_1.default);
app.use(`${API_PREFIX}/cart`, cartRoutes_1.default);
app.use(`${API_PREFIX}/categories`, categoryRoutes_1.default);
app.use(`${API_PREFIX}/stores`, storeRoutes_1.default);
app.use(`${API_PREFIX}/orders`, orderRoutes_1.default);
app.use(`${API_PREFIX}/videos`, videoRoutes_1.default);
app.use(`${API_PREFIX}/projects`, projectRoutes_1.default);
app.use(`${API_PREFIX}/notifications`, notificationRoutes_1.default);
app.use(`${API_PREFIX}/stock-notifications`, stockNotificationRoutes_1.default);
app.use(`${API_PREFIX}/reviews`, reviewRoutes_1.default);
app.use(`${API_PREFIX}/favorites`, favoriteRoutes_1.default);
app.use(`${API_PREFIX}/comparisons`, comparisonRoutes_1.default);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes_1.default);
app.use(`${API_PREFIX}/recommendations`, recommendationRoutes_1.default);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes_1.default);
app.use(`${API_PREFIX}/sync`, syncRoutes_1.default);
app.use(`${API_PREFIX}/location`, locationRoutes_1.default);
app.use(`${API_PREFIX}/wallet`, walletRoutes_1.default);
app.use(`${API_PREFIX}/offers`, offerRoutes_1.default);
app.use(`${API_PREFIX}/offer-categories`, offerCategoryRoutes_1.default);
app.use(`${API_PREFIX}/hero-banners`, heroBannerRoutes_1.default);
app.use(`${API_PREFIX}/vouchers`, voucherRoutes_1.default);
app.use(`${API_PREFIX}/addresses`, addressRoutes_1.default);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes_1.default);
app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes_1.default);
app.use(`${API_PREFIX}/achievements`, achievementRoutes_1.default);
app.use(`${API_PREFIX}/activities`, activityRoutes_1.default);
app.use(`${API_PREFIX}/payment`, paymentRoutes_1.default);
app.use(`${API_PREFIX}/stock`, stockRoutes_1.default);
app.use(`${API_PREFIX}/social-media`, socialMediaRoutes_1.default);
app.use(`${API_PREFIX}/events`, eventRoutes_1.default);
app.use(`${API_PREFIX}/referral`, referralRoutes_1.default);
app.use(`${API_PREFIX}/user/profile`, profileRoutes_1.default);
app.use(`${API_PREFIX}/scratch-cards`, scratchCardRoutes_1.default);
app.use(`${API_PREFIX}/coupons`, couponRoutes_1.default);
app.use(`${API_PREFIX}/store-promo-coins`, storePromoCoinRoutes_1.default);
app.use(`${API_PREFIX}/razorpay`, razorpayRoutes_1.default);
app.use(`${API_PREFIX}/support`, supportRoutes_1.default);
app.use(`${API_PREFIX}/cashback`, cashbackRoutes_1.default);
app.use(`${API_PREFIX}/user-products`, userProductRoutes_1.default);
app.use(`${API_PREFIX}/discounts`, discountRoutes_1.default);
app.use(`${API_PREFIX}/store-vouchers`, storeVoucherRoutes_1.default);
app.use(`${API_PREFIX}/outlets`, outletRoutes_1.default);
// Flash Sales Routes - Time-limited promotional offers
app.use(`${API_PREFIX}/flash-sales`, flashSaleRoutes_1.default);
// Subscription Routes - Premium membership tiers
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes_1.default);
// Billing History Routes - Transaction history and invoices for subscriptions
app.use(`${API_PREFIX}/billing`, billingRoutes_1.default);
console.log('✅ Billing routes registered at /api/billing');
// Bill Upload & Verification Routes - Offline purchase receipts for cashback
app.use(`${API_PREFIX}/bills`, billRoutes_1.default);
console.log('✅ Bill routes registered at /api/bills');
// Unified Gamification Routes - All gamification functionality under one endpoint
app.use(`${API_PREFIX}/gamification`, unifiedGamificationRoutes_1.default);
console.log('✅ Unified gamification routes registered at /api/gamification');
// Social Feed Routes - Activity feed, follow system, likes, comments
app.use(`${API_PREFIX}/social`, activityFeedRoutes_1.default);
console.log('✅ Social feed routes registered at /api/social');
// Partner Program Routes - Partner levels, rewards, milestones, earnings
app.use(`${API_PREFIX}/partner`, partnerRoutes_1.default);
console.log('✅ Partner program routes registered at /api/partner');
// Merchant API Routes
app.use('/api/merchant/auth', auth_1.default); // Merchant auth routes
app.use('/api/merchant/categories', categories_1.default);
app.use('/api/merchants', merchants_1.default);
app.use('/api/merchant/products', products_1.default);
app.use('/api/merchant/profile', merchant_profile_1.default);
app.use('/api/merchant/uploads', uploads_1.default);
app.use('/api/merchant/orders', orders_1.default);
app.use('/api/merchant/cashback', cashback_1.default);
app.use('/api/merchant/dashboard', dashboard_1.default);
// Merchant Sync Routes - Syncs merchant data to customer app
app.use('/api/merchant/sync', sync_1.default);
// // 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
// Root endpoint
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
// Handle undefined routes (404)
app.use(errorHandler_1.notFoundHandler);
// Global error handler (must be last)
app.use(errorHandler_1.globalErrorHandler);
io.on('connection', (socket) => {
    console.log('🔌 Merchant client connected:', socket.id);
    // Join merchant room for real-time updates
    socket.on('join-merchant-room', (merchantId) => {
        socket.join(`merchant-${merchantId}`);
        console.log(`Merchant ${merchantId} joined room`);
    });
    socket.on('disconnect', () => {
        console.log('🔌 Merchant client disconnected:', socket.id);
    });
});
global.io = io;
// Initialize stock socket service
stockSocketService_1.default.initialize(io);
// Initialize real-time service
const realTimeServiceInstance = RealTimeService_1.RealTimeService.getInstance(io);
global.realTimeService = realTimeServiceInstance;
// Initialize report service
ReportService_1.ReportService.initialize();
// Start server function
async function startServer() {
    try {
        // Connect to database
        console.log('🔄 Connecting to database...');
        await (0, database_1.connectDatabase)();
        // Validate Cloudinary configuration
        const cloudinaryConfigured = (0, cloudinaryUtils_1.validateCloudinaryConfig)();
        if (!cloudinaryConfigured) {
            console.warn('⚠️  Cloudinary not configured. Bill upload features will not work.');
            console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
        }
        // Initialize partner level maintenance cron jobs (FIXED: Issue #2, #4, #5)
        console.log('🔄 Initializing partner level maintenance...');
        partnerLevelMaintenanceService_1.default.startAll();
        console.log('✅ Partner level maintenance cron jobs started');
        // Initialize trial expiry notification job
        console.log('🔄 Initializing trial expiry notification job...');
        (0, trialExpiryNotification_1.initializeTrialExpiryJob)();
        console.log('✅ Trial expiry notification job started');
        // Start HTTP server (with Socket.IO attached)
        server.listen(Number(PORT), '0.0.0.0', () => {
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            Object.keys(networkInterfaces).forEach(interfaceName => {
                const addresses = networkInterfaces[interfaceName];
                addresses?.forEach((addr) => {
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
        const shutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);
            server.close(async () => {
                console.log('✅ HTTP server closed');
                try {
                    await database_1.database.disconnect();
                    console.log('✅ Database disconnected');
                    process.exit(0);
                }
                catch (error) {
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
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the application if this file is run directly
if (require.main === module) {
    startServer();
}
