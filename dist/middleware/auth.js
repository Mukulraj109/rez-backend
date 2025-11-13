"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.requireAuth = exports.requireStoreOwnerOrAdmin = exports.requireAdmin = exports.authorize = exports.optionalAuth = exports.authenticate = exports.verifyRefreshToken = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
// Generate JWT token
const generateToken = (userId, role = 'user') => {
    const payload = { userId, role };
    const secret = process.env.JWT_SECRET || 'your-fallback-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
exports.generateToken = generateToken;
// Generate refresh token
const generateRefreshToken = (userId) => {
    const payload = { userId };
    const secret = process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret';
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
exports.generateRefreshToken = generateRefreshToken;
// Verify JWT token
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET || 'your-fallback-secret';
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyToken = verifyToken;
// Verify refresh token
const verifyRefreshToken = (token) => {
    const secret = process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret';
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyRefreshToken = verifyRefreshToken;
// Extract token from request
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};
// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        console.log('🔐 [AUTH] Authenticating request:', {
            path: req.path,
            method: req.method,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
        });
        if (!token) {
            console.warn('⚠️ [AUTH] No token provided');
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        try {
            const decoded = (0, exports.verifyToken)(token);
            console.log('🔓 [AUTH] Token decoded:', { userId: decoded.userId, role: decoded.role });
            const user = await User_1.User.findById(decoded.userId).select('-auth.refreshToken');
            if (!user) {
                console.warn('⚠️ [AUTH] User not found:', decoded.userId);
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
            console.log('✅ [AUTH] User found:', {
                id: user._id,
                phone: user.phoneNumber,
                isActive: user.isActive
            });
            if (!user.isActive) {
                console.warn('⚠️ [AUTH] Account deactivated:', user._id);
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }
            if (user.isAccountLocked()) {
                console.warn('⚠️ [AUTH] Account locked:', user._id);
                return res.status(423).json({
                    success: false,
                    message: 'Account is temporarily locked. Please try again later.'
                });
            }
            // Attach user to request
            req.user = user;
            req.userId = String(user._id);
            console.log('✅ [AUTH] Authentication successful for user:', user._id);
            next();
        }
        catch (tokenError) {
            console.error('❌ [AUTH] Token verification failed:', {
                error: tokenError.message,
                name: tokenError.name,
                expiredAt: tokenError.expiredAt
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
                error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
            });
        }
    }
    catch (error) {
        console.error('❌ [AUTH] Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication'
        });
    }
};
exports.authenticate = authenticate;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        if (token) {
            try {
                const decoded = (0, exports.verifyToken)(token);
                const user = await User_1.User.findById(decoded.userId).select('-auth.refreshToken');
                if (user && user.isActive && !user.isAccountLocked()) {
                    req.user = user;
                    req.userId = String(user._id);
                }
            }
            catch (tokenError) {
                // Ignore token errors for optional auth
            }
        }
        next();
    }
    catch (error) {
        // Don't fail on optional auth errors
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};
exports.authorize = authorize;
// Check if user is admin
exports.requireAdmin = (0, exports.authorize)('admin');
// Check if user is store owner or admin
exports.requireStoreOwnerOrAdmin = (0, exports.authorize)('store_owner', 'admin');
// Alias for authenticate (commonly used name)
exports.requireAuth = exports.authenticate;
// Alias for authenticate (commonly used in routes)
exports.protect = exports.authenticate;
