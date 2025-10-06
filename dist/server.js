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
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
// import { generalLimiter } from './middleware/rateLimiter'; // Disabled for development
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
const voucherRoutes_1 = __importDefault(require("./routes/voucherRoutes"));
const addressRoutes_1 = __importDefault(require("./routes/addressRoutes"));
const paymentMethodRoutes_1 = __importDefault(require("./routes/paymentMethodRoutes"));
const userSettingsRoutes_1 = __importDefault(require("./routes/userSettingsRoutes"));
const achievementRoutes_1 = __importDefault(require("./routes/achievementRoutes"));
const activityRoutes_1 = __importDefault(require("./routes/activityRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const stockRoutes_1 = __importDefault(require("./routes/stockRoutes"));
const auth_1 = __importDefault(require("./merchantroutes/auth")); // Temporarily disabled
const merchants_1 = __importDefault(require("./merchantroutes/merchants")); // Temporarily disabled
const merchant_profile_1 = __importDefault(require("./merchantroutes/merchant-profile")); // Disabled due to missing properties
const products_1 = __importDefault(require("./merchantroutes/products")); // Temporarily disabled
const categories_1 = __importDefault(require("./merchantroutes/categories")); // Temporarily disabled
const uploads_1 = __importDefault(require("./merchantroutes/uploads")); // Temporarily disabled
const orders_1 = __importDefault(require("./merchantroutes/orders")); // Temporarily disabled
const cashback_1 = __importDefault(require("./merchantroutes/cashback")); // Temporarily disabled
const dashboard_1 = __importDefault(require("./merchantroutes/dashboard")); // Temporarily disabled
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
// Rate limiting
//app.use(generalLimiter);
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
                totalEndpoints: 119,
                modules: 13,
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
                    activities: `${API_PREFIX}/activities`
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
            activities: `${API_PREFIX}/activities`
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
            'Activity Feed'
        ],
        database: {
            models: [
                'User', 'Category', 'Store', 'Product', 'Cart', 'Order',
                'Video', 'Project', 'Transaction', 'Notification', 'Review', 'Wishlist',
                'Wallet', 'Offer', 'VoucherBrand', 'UserVoucher', 'OfferRedemption',
                'Address', 'PaymentMethod', 'UserSettings', 'UserAchievement', 'Activity'
            ],
            totalModels: 22
        },
        implementation: {
            completed: ['Authentication', 'Products', 'Cart', 'Categories', 'Stores', 'Orders', 'Videos', 'Projects', 'Notifications', 'Reviews', 'Wishlist', 'Wallet', 'Offers', 'Vouchers', 'Addresses', 'Payment Methods', 'User Settings', 'Achievements', 'Activities'],
            totalEndpoints: 160,
            apiModules: 18
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
app.use(`${API_PREFIX}/vouchers`, voucherRoutes_1.default);
app.use(`${API_PREFIX}/addresses`, addressRoutes_1.default);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes_1.default);
app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes_1.default);
app.use(`${API_PREFIX}/achievements`, achievementRoutes_1.default);
app.use(`${API_PREFIX}/activities`, activityRoutes_1.default);
app.use(`${API_PREFIX}/payment`, paymentRoutes_1.default);
app.use(`${API_PREFIX}/stock`, stockRoutes_1.default);
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
const realTimeService = RealTimeService_1.RealTimeService.getInstance(io);
global.realTimeService = realTimeService;
// Initialize report service
ReportService_1.ReportService.initialize();
// Start server function
async function startServer() {
    try {
        // Connect to database
        console.log('🔄 Connecting to database...');
        await (0, database_1.connectDatabase)();
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
            console.log(`\n🎉 Phase 6 Complete - Profile & Account Management APIs Implemented!`);
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
            console.log(`   🎯 Total Implemented: ~160 endpoints across 18 modules`);
            console.log(`\n🚀 Phase 6 Complete - Ready for Frontend Integration!`);
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
