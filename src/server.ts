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

// Import database connection
import { connectDatabase, database } from './config/database';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
// import { generalLimiter } from './middleware/rateLimiter'; // Disabled for development
// Import routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import categoryRoutes from './routes/categoryRoutes';
import storeRoutes from './routes/storeRoutes';
import orderRoutes from './routes/orderRoutes';
import videoRoutes from './routes/videoRoutes';
import projectRoutes from './routes/projectRoutes';
import notificationRoutes from './routes/notificationRoutes';
import stockNotificationRoutes from './routes/stockNotificationRoutes';
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
import voucherRoutes from './routes/voucherRoutes';
import addressRoutes from './routes/addressRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import userSettingsRoutes from './routes/userSettingsRoutes';
import achievementRoutes from './routes/achievementRoutes';
import activityRoutes from './routes/activityRoutes';
import paymentRoutes from './routes/paymentRoutes';
import authRoutes1 from './merchantroutes/auth';  // Temporarily disabled
import merchantRoutes from './merchantroutes/merchants';  // Temporarily disabled
import merchantProfileRoutes from './merchantroutes/merchant-profile'; // Disabled due to missing properties
import productRoutes1 from './merchantroutes/products';  // Temporarily disabled
import categoryRoutes1 from './merchantroutes/categories';  // Temporarily disabled
import uploadRoutes from './merchantroutes/uploads';  // Temporarily disabled
import orderRoutes1 from './merchantroutes/orders';  // Temporarily disabled
import cashbackRoutes from './merchantroutes/cashback';  // Temporarily disabled
import dashboardRoutes from './merchantroutes/dashboard';  // Temporarily disabled
import { RealTimeService } from './merchantservices/RealTimeService';  // Temporarily disabled
import { ReportService } from './merchantservices/ReportService';  // Temporarily disabled
import stockSocketService from './services/stockSocketService';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
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

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));
}

// Rate limiting
//app.use(generalLimiter);

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
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/stores`, storeRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/videos`, videoRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/stock-notifications`, stockNotificationRoutes);
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
app.use(`${API_PREFIX}/vouchers`, voucherRoutes);
app.use(`${API_PREFIX}/addresses`, addressRoutes);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes);
app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes);
app.use(`${API_PREFIX}/achievements`, achievementRoutes);
app.use(`${API_PREFIX}/activities`, activityRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);

// Merchant API Routes
app.use('/api/merchant/auth', authRoutes1);  // Merchant auth routes
app.use('/api/merchant/categories', categoryRoutes1);
app.use('/api/merchants', merchantRoutes);
app.use('/api/merchant/products', productRoutes1);
app.use('/api/merchant/profile', merchantProfileRoutes);
app.use('/api/merchant/uploads', uploadRoutes);
app.use('/api/merchant/orders', orderRoutes1);
app.use('/api/merchant/cashback', cashbackRoutes);
app.use('/api/merchant/dashboard', dashboardRoutes);

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
app.use(notFoundHandler);

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
  var io: SocketIOServer;
  var realTimeService: RealTimeService;
}
global.io = io;

// Initialize stock socket service
stockSocketService.initialize(io);

// Initialize real-time service
const realTimeService = RealTimeService.getInstance(io);
global.realTimeService = realTimeService;





// Initialize report service
ReportService.initialize();



// Start server function
async function startServer() {
  try {
    // Connect to database
    console.log('🔄 Connecting to database...');
    await connectDatabase();
    
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