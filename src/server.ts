/**
 * server.ts — Application entry point
 *
 * Split into:
 *   - config/middleware.ts   — middleware setup (cors, helmet, compression, etc.)
 *   - config/routes.ts       — route registration (all app.use() calls)
 *   - config/socketSetup.ts  — Socket.IO setup and event handlers
 *   - config/cronJobs.ts     — cron job initialization
 */
import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import database connection
import { connectDatabase, database } from './config/database';

// Import Redis service
import redisService from './services/redisService';

// Import payment gateway for health check
import paymentGatewayService from './services/paymentGatewayService';

// App version from package.json
import { version as appVersion } from '../package.json';

// Import environment validation
import { validateEnvironment } from './config/validateEnv';

// Import utilities
import { validateCloudinaryConfig } from './utils/cloudinaryUtils';

// Import logger
import { logger } from './config/logger';

// Override console methods in production to route through structured logger
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: any[]) => logger.info(args.map(String).join(' '));
  console.error = (...args: any[]) => logger.error(args.map(String).join(' '));
  console.warn = (...args: any[]) => logger.warn(args.map(String).join(' '));
  console.debug = (...args: any[]) => logger.debug(args.map(String).join(' '));
}

// Import export worker (initializes automatically when imported)
import './workers/exportWorker';

// Import modular setup functions
import { setupMiddleware, getAllowedOrigins } from './config/middleware';
import { registerRoutes } from './config/routes';
import { setupSocket, attachSocketRedisAdapter } from './config/socketSetup';
import { initializeCronJobs } from './config/cronJobs';
import { ScheduledJobService } from './services/ScheduledJobService';

// ── Create Express application ──
const app = express();
const PORT = process.env.PORT || 5001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// ── Setup middleware ──
setupMiddleware(app);

// ── Health check endpoint — lean, UptimeRobot-friendly ──
app.get('/health', async (_req, res) => {
  try {
    let db = 'disconnected';
    try {
      const dbHealth = await database.healthCheck();
      db = dbHealth.status === 'healthy' ? 'connected' : 'disconnected';
    } catch {
      db = 'error';
    }

    let redis = 'disconnected';
    try {
      redis = redisService.isReady() ? 'connected' : 'disconnected';
    } catch {
      redis = 'error';
    }

    const payments = paymentGatewayService.getHealthStatus();
    const allHealthy = db === 'connected' && redis === 'connected';

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      db,
      redis,
      payments,
      uptime: Math.floor(process.uptime()),
      version: appVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
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

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  try {
    const csrfToken = res.getHeader('x-csrf-token');
    if (!csrfToken) {
      return res.status(503).json({
        success: false,
        message: 'CSRF protection is not enabled.',
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

// API info endpoint
app.get('/api-info', (req, res) => {
  res.json({
    name: 'REZ App Backend API',
    version: '1.0.0',
    description: 'Backend API for REZ - E-commerce, Rewards & Social Platform',
    status: 'Running',
    endpoints: {
      auth: `${API_PREFIX}/user/auth`,
      products: `${API_PREFIX}/products`,
      categories: `${API_PREFIX}/categories`,
      cart: `${API_PREFIX}/cart`,
      stores: `${API_PREFIX}/stores`,
      orders: `${API_PREFIX}/orders`,
      health: '/health',
    },
  });
});

// ── Create HTTP server & Socket.IO ──
const server = createServer(app);
const io = setupSocket(server);

// Generic error handler (before routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ── Register all routes ──
registerRoutes(app);

// ── Start server function ──
async function startServer() {
  try {
    // Validate environment variables first (fail fast if invalid)
    logger.info('Validating environment configuration...');
    try {
      validateEnvironment();
      logger.info('Environment validation passed');
    } catch (error) {
      logger.error('Environment validation failed:', error);
      process.exit(1);
    }

    // Start listening on port FIRST so Render/hosting detects the port immediately
    server.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT} (initializing services...)`);
    });

    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisService.connect();
    logger.info(redisService.isReady() ? 'Redis connected' : 'Redis unavailable - app will continue without caching');

    // Warm up public caches after Redis connects (non-blocking)
    if (redisService.isReady()) {
      const { warmUpPublicCaches } = await import('./utils/cacheWarmup');
      setImmediate(() => warmUpPublicCaches().catch(err => logger.warn('[CACHE-WARMUP]', err)));
    }

    // Attach Socket.IO Redis adapter (needs Redis to be connected first)
    await attachSocketRedisAdapter(io);

    // Validate Cloudinary configuration
    const cloudinaryConfigured = validateCloudinaryConfig();
    if (!cloudinaryConfigured) {
      logger.warn('Cloudinary not configured. Bill upload features will not work.');
    }

    // Initialize all cron jobs and background services
    logger.info('Initializing cron jobs and background services...');
    await initializeCronJobs();

    // All services initialized
    logger.info(`All services initialized successfully`);
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);

    // ── Graceful shutdown handling ──
    let isShuttingDown = false;
    const shutdown = (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`Received ${signal}. Graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed (in-flight requests drained)');

        try {
          try {
            await ScheduledJobService.shutdown();
            logger.info('Scheduled job service shut down');
          } catch { /* May not be initialized */ }

          try {
            const redisService = (await import('./services/redisService')).default;
            await redisService.disconnect();
            logger.info('Redis disconnected');
          } catch { /* Redis may not be connected */ }

          await database.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 15 seconds
      setTimeout(() => {
        logger.info('Could not close connections in time, forcefully shutting down');
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
      logger.error('Uncaught Exception - shutting down', {
        message: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
