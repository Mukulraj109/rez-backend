"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const Merchant_1 = require("../models/Merchant");
const MerchantUser_1 = require("../models/MerchantUser");
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        console.log('🔍 AUTH DEBUG: Request to', req.path);
        console.log('🔍 AUTH DEBUG: Auth header exists:', !!authHeader);
        console.log('🔍 AUTH DEBUG: Token exists:', !!token);
        if (token) {
            console.log('🔍 AUTH DEBUG: Token preview:', token.substring(0, 20) + '...');
        }
        if (!token) {
            console.log('🔍 AUTH DEBUG: No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }
        // Verify token using merchant-specific secret
        const merchantSecret = process.env.JWT_MERCHANT_SECRET;
        if (!merchantSecret) {
            console.warn('⚠️ WARNING: JWT_MERCHANT_SECRET not set! Using fallback. Set JWT_MERCHANT_SECRET in .env for production!');
        }
        console.log('🔍 AUTH DEBUG: Verifying token with merchant secret');
        const decoded = jwt.verify(token, merchantSecret || 'fallback-merchant-secret');
        console.log('🔍 AUTH DEBUG: Token decoded successfully');
        console.log('🔍 AUTH DEBUG: MerchantId:', decoded.merchantId);
        console.log('🔍 AUTH DEBUG: MerchantUserId:', decoded.merchantUserId);
        console.log('🔍 AUTH DEBUG: Role:', decoded.role);
        // Find merchant
        const merchant = await Merchant_1.Merchant.findById(decoded.merchantId);
        console.log('🔍 AUTH DEBUG: Merchant found:', !!merchant);
        if (!merchant) {
            console.log('🔍 AUTH DEBUG: Merchant not found for ID:', decoded.merchantId);
            return res.status(401).json({
                success: false,
                message: 'Token is not valid - merchant not found'
            });
        }
        // Check if merchant is active
        console.log('🔍 AUTH DEBUG: Merchant isActive:', merchant.isActive);
        if (!merchant.isActive) {
            console.log('🔍 AUTH DEBUG: Merchant account is deactivated');
            return res.status(401).json({
                success: false,
                message: 'Merchant account is deactivated'
            });
        }
        // Add merchant to request
        req.merchantId = decoded.merchantId;
        req.merchant = merchant;
        // If this is a team member (has merchantUserId), load their data
        if (decoded.merchantUserId) {
            console.log('🔍 AUTH DEBUG: Loading MerchantUser data');
            const merchantUser = await MerchantUser_1.MerchantUser.findById(decoded.merchantUserId);
            if (!merchantUser) {
                console.log('🔍 AUTH DEBUG: MerchantUser not found for ID:', decoded.merchantUserId);
                return res.status(401).json({
                    success: false,
                    message: 'Token is not valid - user not found'
                });
            }
            // Check if user is active
            if (merchantUser.status !== 'active') {
                console.log('🔍 AUTH DEBUG: MerchantUser account is', merchantUser.status);
                return res.status(403).json({
                    success: false,
                    message: `Account is ${merchantUser.status}. Please contact your administrator.`
                });
            }
            // Check if account is locked
            if (merchantUser.accountLockedUntil && merchantUser.accountLockedUntil > new Date()) {
                console.log('🔍 AUTH DEBUG: MerchantUser account is locked');
                return res.status(423).json({
                    success: false,
                    message: 'Account is temporarily locked. Please try again later.'
                });
            }
            req.merchantUser = merchantUser;
            console.log('🔍 AUTH DEBUG: Authentication successful for team member:', merchantUser.name);
        }
        else {
            console.log('🔍 AUTH DEBUG: Authentication successful for merchant owner:', merchant.businessName);
        }
        return next();
    }
    catch (error) {
        console.error('🔍 AUTH DEBUG: Auth middleware error:', error);
        console.error('🔍 AUTH DEBUG: Error name:', error.name);
        console.error('🔍 AUTH DEBUG: Error message:', error.message);
        if (error.name === 'JsonWebTokenError') {
            console.log('🔍 AUTH DEBUG: JWT verification failed');
            return res.status(401).json({
                success: false,
                message: 'Token is not valid'
            });
        }
        if (error.name === 'TokenExpiredError') {
            console.log('🔍 AUTH DEBUG: JWT token expired');
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }
        console.log('🔍 AUTH DEBUG: General authentication error');
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};
exports.authMiddleware = authMiddleware;
// Optional auth middleware (doesn't fail if no token)
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            const merchantSecret = process.env.JWT_MERCHANT_SECRET;
            const decoded = jwt.verify(token, merchantSecret || 'fallback-merchant-secret');
            const merchant = await Merchant_1.Merchant.findById(decoded.merchantId);
            if (merchant && merchant.isActive) {
                req.merchantId = decoded.merchantId;
                req.merchant = merchant;
                // Load MerchantUser if present
                if (decoded.merchantUserId) {
                    const merchantUser = await MerchantUser_1.MerchantUser.findById(decoded.merchantUserId);
                    if (merchantUser && merchantUser.status === 'active') {
                        req.merchantUser = merchantUser;
                    }
                }
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
