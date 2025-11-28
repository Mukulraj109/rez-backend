"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventNoSQLInjection = exports.sanitizeRequest = exports.sanitizeParams = exports.sanitizeQuery = exports.sanitizeBody = void 0;
exports.sanitizeMongoQuery = sanitizeMongoQuery;
exports.sanitizeObjectId = sanitizeObjectId;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.sanitizeURL = sanitizeURL;
const validator_1 = __importDefault(require("validator"));
/**
 * Deep sanitization function to recursively sanitize all string values in an object
 * Prevents XSS attacks by escaping HTML and removing dangerous characters
 */
function deepSanitize(input) {
    if (typeof input === 'string') {
        // Escape HTML to prevent XSS
        let sanitized = validator_1.default.escape(input);
        // Trim whitespace
        sanitized = sanitized.trim();
        // Remove null bytes
        sanitized = sanitized.replace(/\0/g, '');
        return sanitized;
    }
    if (Array.isArray(input)) {
        return input.map(item => deepSanitize(item));
    }
    if (typeof input === 'object' && input !== null) {
        const sanitized = {};
        for (const key in input) {
            if (input.hasOwnProperty(key)) {
                // Sanitize the key as well
                const sanitizedKey = validator_1.default.escape(key);
                sanitized[sanitizedKey] = deepSanitize(input[key]);
            }
        }
        return sanitized;
    }
    return input;
}
/**
 * Sanitize specific fields that should not be HTML-escaped but still cleaned
 * Used for fields like descriptions, content, etc.
 */
function sanitizePreservingFormat(input) {
    if (typeof input !== 'string')
        return input;
    // Trim whitespace
    let sanitized = input.trim();
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    // Remove potentially dangerous scripts but preserve basic formatting
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
    return sanitized;
}
/**
 * Middleware to sanitize request body
 * Applies deep sanitization to prevent XSS and injection attacks
 */
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
    }
    next();
};
exports.sanitizeBody = sanitizeBody;
/**
 * Middleware to sanitize query parameters
 */
const sanitizeQuery = (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
        req.query = deepSanitize(req.query);
    }
    next();
};
exports.sanitizeQuery = sanitizeQuery;
/**
 * Middleware to sanitize URL parameters
 */
const sanitizeParams = (req, res, next) => {
    if (req.params && typeof req.params === 'object') {
        req.params = deepSanitize(req.params);
    }
    next();
};
exports.sanitizeParams = sanitizeParams;
/**
 * Combined sanitization middleware for all request data
 */
const sanitizeRequest = (req, res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
    }
    // Sanitize query
    if (req.query && typeof req.query === 'object') {
        req.query = deepSanitize(req.query);
    }
    // Sanitize params
    if (req.params && typeof req.params === 'object') {
        req.params = deepSanitize(req.params);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
/**
 * Middleware to prevent NoSQL injection by blacklisting dangerous operators
 */
const preventNoSQLInjection = (req, res, next) => {
    const dangerousOperators = ['$where', '$regex', '$ne', '$nin', '$exists', '$type'];
    const checkForDangerousOperators = (obj) => {
        if (typeof obj !== 'object' || obj === null)
            return false;
        for (const key in obj) {
            if (dangerousOperators.some(op => key.includes(op))) {
                return true;
            }
            if (typeof obj[key] === 'object' && checkForDangerousOperators(obj[key])) {
                return true;
            }
        }
        return false;
    };
    // Check body
    if (req.body && checkForDangerousOperators(req.body)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request: Potentially malicious operators detected'
        });
    }
    // Check query
    if (req.query && checkForDangerousOperators(req.query)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request: Potentially malicious operators detected'
        });
    }
    next();
};
exports.preventNoSQLInjection = preventNoSQLInjection;
/**
 * Sanitize MongoDB query to prevent injection
 */
function sanitizeMongoQuery(query) {
    if (typeof query !== 'object' || query === null) {
        return query;
    }
    const sanitized = {};
    for (const key in query) {
        if (query.hasOwnProperty(key)) {
            // Skip keys that start with $ (MongoDB operators) unless they're in a safe list
            const safeOperators = ['$and', '$or', '$in', '$gte', '$lte', '$gt', '$lt', '$eq'];
            if (key.startsWith('$') && !safeOperators.includes(key)) {
                continue; // Skip dangerous operators
            }
            const value = query[key];
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeMongoQuery(value);
            }
            else if (typeof value === 'string') {
                sanitized[key] = validator_1.default.escape(value.trim());
            }
            else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
}
/**
 * Validate and sanitize ObjectId
 */
function sanitizeObjectId(id) {
    if (!id || typeof id !== 'string')
        return null;
    // MongoDB ObjectId is 24 hex characters
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const trimmed = id.trim();
    if (!objectIdRegex.test(trimmed)) {
        return null;
    }
    return trimmed;
}
/**
 * Sanitize email address
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string')
        return null;
    const normalized = validator_1.default.normalizeEmail(email, {
        all_lowercase: true,
        gmail_remove_dots: false
    });
    if (!normalized || !validator_1.default.isEmail(normalized)) {
        return null;
    }
    return normalized;
}
/**
 * Sanitize phone number
 */
function sanitizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string')
        return null;
    // Remove all non-digit characters except +
    const sanitized = phone.replace(/[^\d+]/g, '');
    // Basic validation for international format
    if (sanitized.length < 10 || sanitized.length > 15) {
        return null;
    }
    return sanitized;
}
/**
 * Sanitize URL
 */
function sanitizeURL(url) {
    if (!url || typeof url !== 'string')
        return null;
    const trimmed = url.trim();
    if (!validator_1.default.isURL(trimmed, {
        protocols: ['http', 'https'],
        require_protocol: true
    })) {
        return null;
    }
    return trimmed;
}
exports.default = {
    sanitizeBody: exports.sanitizeBody,
    sanitizeQuery: exports.sanitizeQuery,
    sanitizeParams: exports.sanitizeParams,
    sanitizeRequest: exports.sanitizeRequest,
    preventNoSQLInjection: exports.preventNoSQLInjection,
    sanitizeMongoQuery,
    sanitizeObjectId,
    sanitizeEmail,
    sanitizePhoneNumber,
    sanitizeURL
};
