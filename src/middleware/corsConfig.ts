import cors, { CorsOptions } from 'cors';
import { Request } from 'express';
import { logger } from '../config/logger';

/**
 * CORS Configuration with Environment-based Whitelist
 * Implements strict CORS policy for production security
 */

// Parse allowed origins from environment variable
const getAllowedOrigins = (): string[] => {
  const corsOrigin = process.env.CORS_ORIGIN || '';

  if (corsOrigin === '*') {
    logger.warn('⚠️ CORS is set to allow all origins - NOT recommended for production!');
    return ['*'];
  }

  // Split by comma and trim whitespace
  const origins = corsOrigin
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  // Default allowed origins for development
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://localhost:8081'
  ];

  // In development, merge with defaults
  if (process.env.NODE_ENV === 'development') {
    const combined = [...new Set([...origins, ...defaultOrigins])];
    logger.info('🔧 CORS allowed origins (development):', combined);
    return combined;
  }

  // In production, use only configured origins
  if (origins.length === 0) {
    logger.error('❌ No CORS origins configured for production!');
    throw new Error('CORS_ORIGIN environment variable must be set in production');
  }

  logger.info('🔒 CORS allowed origins (production):', origins);
  return origins;
};

// Get allowed origins
const allowedOrigins = getAllowedOrigins();

/**
 * CORS origin validation function
 */
const corsOriginValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (like mobile apps, Postman, curl)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in whitelist
  if (allowedOrigins.includes('*')) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Check for dynamic patterns (e.g., *.example.com)
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });

  if (isAllowed) {
    return callback(null, true);
  }

  // Origin not allowed
  logger.warn(`🚫 CORS blocked request from origin: ${origin}`);
  callback(new Error('Not allowed by CORS'));
};

/**
 * Strict CORS options for production
 */
export const strictCorsOptions: CorsOptions = {
  origin: corsOriginValidator,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'Accept',
    'Origin',
    'X-Rez-Region',
    'X-Device-OS',
    'X-Device-Fingerprint',
    'X-Rez-Signature',
    'X-Provider-Name',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
  preflightContinue: false
};

/**
 * Relaxed CORS options for development
 */
export const developmentCorsOptions: CorsOptions = {
  origin: corsOriginValidator,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key',
    'Accept', 'Origin', 'X-Rez-Region', 'X-Device-OS', 'X-Device-Fingerprint',
    'X-Rez-Signature', 'X-Provider-Name', 'Cache-Control', 'Pragma',
  ],
  exposedHeaders: [
    'X-Total-Count', 'X-Page-Count', 'X-Current-Page',
    'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

/**
 * Public API CORS (no credentials, wider access)
 */
export const publicApiCorsOptions: CorsOptions = {
  origin: corsOriginValidator,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

/**
 * Get appropriate CORS configuration based on environment
 */
export const getCorsOptions = (): CorsOptions => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return strictCorsOptions;
    case 'staging':
      return strictCorsOptions;
    case 'development':
    case 'test':
      return developmentCorsOptions;
    default:
      return developmentCorsOptions;
  }
};

/**
 * CORS middleware with environment-aware configuration
 */
export const corsMiddleware = cors(getCorsOptions());

/**
 * Public API CORS middleware (for public endpoints)
 */
export const publicCorsMiddleware = cors(publicApiCorsOptions);

/**
 * Dynamic CORS middleware for specific routes
 */
export const dynamicCors = (customOrigins?: string[]) => {
  const origins = customOrigins || allowedOrigins;

  return cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes('*') || origins.includes(origin || '')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Rez-Region', 'X-Device-OS', 'X-Device-Fingerprint'],
    credentials: true,
    maxAge: 86400
  });
};

/**
 * Validate CORS configuration on startup
 */
export const validateCorsConfiguration = (): void => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
      logger.error('❌ CRITICAL: CORS_ORIGIN not properly configured for production!');
      logger.error('   Please set CORS_ORIGIN to a comma-separated list of allowed origins');
      throw new Error('Invalid CORS configuration for production');
    }

    if (!allowedOrigins.every(origin => origin.startsWith('https://'))) {
      logger.warn('⚠️ WARNING: Some CORS origins are not using HTTPS in production');
    }
  }

  logger.info('✅ CORS configuration validated');
};

export default {
  corsMiddleware,
  publicCorsMiddleware,
  dynamicCors,
  strictCorsOptions,
  developmentCorsOptions,
  publicApiCorsOptions,
  getCorsOptions,
  validateCorsConfiguration
};
