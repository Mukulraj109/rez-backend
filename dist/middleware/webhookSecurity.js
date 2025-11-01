"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSecureWebhookSuccess = exports.sendSecureWebhookError = exports.logWebhookSecurityEvent = exports.validateWebhookPayload = exports.webhookRateLimiter = exports.razorpayIPWhitelist = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Razorpay IP Ranges - Verified from official Razorpay documentation
 * These are the IPs from which Razorpay sends webhook requests
 * https://razorpay.com/docs/webhooks/
 */
const RAZORPAY_IP_RANGES = [
    // Razorpay Primary Data Centers (India)
    '52.66.135.160/27', // 52.66.135.160 - 52.66.135.191
    '3.6.119.224/27', // 3.6.119.224 - 3.6.119.255
    '13.232.125.192/27', // 13.232.125.192 - 13.232.125.223
];
/**
 * Convert IP address string to 32-bit integer
 */
function ipToInt(ip) {
    const parts = ip.split('.');
    return ((parseInt(parts[0]) << 24) +
        (parseInt(parts[1]) << 16) +
        (parseInt(parts[2]) << 8) +
        parseInt(parts[3]));
}
/**
 * Check if an IP address falls within a CIDR range
 * @param ip - The IP address to check
 * @param cidr - CIDR notation (e.g., "52.66.135.160/27")
 * @returns true if IP is within the CIDR range
 */
function isIPInRange(ip, cidr) {
    try {
        const [range, bits] = cidr.split('/');
        const ipInt = ipToInt(ip);
        const rangeInt = ipToInt(range);
        const mask = -1 << (32 - parseInt(bits));
        return (ipInt & mask) === (rangeInt & mask);
    }
    catch (error) {
        console.error(`Error checking IP range: ${error}`);
        return false;
    }
}
/**
 * Middleware to whitelist Razorpay IPs only
 * Extracts client IP from request and validates against Razorpay ranges
 */
const razorpayIPWhitelist = (req, res, next) => {
    // Extract client IP - check multiple sources for proxy situations
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req.headers['x-real-ip']?.toString() ||
        req.socket.remoteAddress ||
        req.connection.remoteAddress ||
        'unknown';
    // Check if IP is in Razorpay's whitelisted ranges
    const isAuthorized = RAZORPAY_IP_RANGES.some(range => isIPInRange(clientIP, range));
    if (!isAuthorized) {
        console.error(`[WEBHOOK-SECURITY] Unauthorized webhook attempt from IP: ${clientIP}`, {
            timestamp: new Date().toISOString(),
            ip: clientIP,
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip'],
                'user-agent': req.headers['user-agent'],
            },
        });
        res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Request origin not authorized',
        });
        return;
    }
    console.log(`[WEBHOOK-SECURITY] Authorized IP: ${clientIP}`, {
        timestamp: new Date().toISOString(),
    });
    next();
};
exports.razorpayIPWhitelist = razorpayIPWhitelist;
/**
 * Rate limiter for webhook endpoint
 * Allows max 100 webhook requests per minute per IP
 */
exports.webhookRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // Max 100 requests per window
    message: 'Too many webhook requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req) => {
        // Only apply rate limiting to webhook endpoint
        return !req.path.includes('/webhook');
    },
    handler: (req, res) => {
        console.warn('[WEBHOOK-SECURITY] Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: req.rateLimit?.resetTime,
        });
    },
});
/**
 * Middleware to validate webhook payload structure
 * Ensures all required fields are present and event type is valid
 */
const validateWebhookPayload = (req, res, next) => {
    try {
        const webhookBody = req.body;
        // Check for required fields
        const requiredFields = ['id', 'event', 'created_at', 'payload'];
        const missingFields = requiredFields.filter(field => !webhookBody[field]);
        if (missingFields.length > 0) {
            console.error(`[WEBHOOK-SECURITY] Missing required fields: ${missingFields.join(', ')}`, {
                receivedFields: Object.keys(webhookBody),
                timestamp: new Date().toISOString(),
            });
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: `Missing required fields: ${missingFields.join(', ')}`,
            });
            return;
        }
        // Validate event type
        const validEventTypes = [
            'subscription.activated',
            'subscription.charged',
            'subscription.completed',
            'subscription.cancelled',
            'subscription.paused',
            'subscription.resumed',
            'subscription.pending',
            'subscription.halted',
            'subscription.updated',
            'invoice.paid',
            'invoice.issued',
            'invoice.failed',
        ];
        if (!validEventTypes.includes(webhookBody.event)) {
            console.error(`[WEBHOOK-SECURITY] Invalid event type: ${webhookBody.event}`, {
                timestamp: new Date().toISOString(),
            });
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: `Invalid event type: ${webhookBody.event}`,
            });
            return;
        }
        // Validate timestamp freshness (within 5 minutes)
        const WEBHOOK_MAX_AGE_SECONDS = 300; // 5 minutes
        const eventTimestamp = webhookBody.created_at;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const webhookAge = currentTimestamp - eventTimestamp;
        if (webhookAge > WEBHOOK_MAX_AGE_SECONDS) {
            console.error(`[WEBHOOK-SECURITY] Webhook too old: ${webhookBody.id}`, {
                eventId: webhookBody.id,
                age: webhookAge,
                maxAge: WEBHOOK_MAX_AGE_SECONDS,
                timestamp: new Date().toISOString(),
            });
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Webhook expired or too old',
            });
            return;
        }
        // Attach validated payload to request for next middleware
        req.webhookPayload = webhookBody;
        req.webhookValidated = true;
        next();
    }
    catch (error) {
        console.error(`[WEBHOOK-SECURITY] Payload validation error: ${error.message}`, {
            error: error.message,
            timestamp: new Date().toISOString(),
        });
        res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Invalid webhook payload',
        });
    }
};
exports.validateWebhookPayload = validateWebhookPayload;
/**
 * Middleware to log webhook security events
 * Tracks all webhook attempts for audit purposes
 */
const logWebhookSecurityEvent = (req, res, next) => {
    const webhookBody = req.webhookPayload || req.body;
    console.log('[WEBHOOK-SECURITY] Webhook received', {
        eventId: webhookBody.id,
        eventType: webhookBody.event,
        ip: req.ip || req.socket.remoteAddress,
        timestamp: new Date().toISOString(),
        signature: req.headers['x-razorpay-signature']?.substring(0, 16) + '...',
    });
    next();
};
exports.logWebhookSecurityEvent = logWebhookSecurityEvent;
/**
 * Helper function to create secure webhook error responses
 */
const sendSecureWebhookError = (res, statusCode, errorType, message, eventId) => {
    console.error(`[WEBHOOK-SECURITY] ${errorType}`, {
        eventId,
        message,
        timestamp: new Date().toISOString(),
    });
    res.status(statusCode).json({
        success: false,
        error: errorType,
        message,
    });
};
exports.sendSecureWebhookError = sendSecureWebhookError;
/**
 * Helper function to create secure webhook success responses
 */
const sendSecureWebhookSuccess = (res, message, eventId) => {
    console.log('[WEBHOOK-SECURITY] Webhook processed successfully', {
        eventId,
        message,
        timestamp: new Date().toISOString(),
    });
    res.status(200).json({
        success: true,
        message,
        eventId,
    });
};
exports.sendSecureWebhookSuccess = sendSecureWebhookSuccess;
