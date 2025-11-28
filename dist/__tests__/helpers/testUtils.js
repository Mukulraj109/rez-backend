"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.cleanupTestData = exports.generateMerchantUserToken = exports.createTestOrder = exports.createTestProduct = exports.createTestMerchantUser = exports.createTestMerchantWithPassword = exports.TEST_PASSWORD = exports.createAuthHeaders = exports.generateMerchantToken = exports.createTestMerchant = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Merchant_1 = require("../../models/Merchant");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Creates a test merchant with default or custom values
 */
const createTestMerchant = async (overrides = {}) => {
    const hashedPassword = await bcryptjs_1.default.hash(overrides.password || 'Password123', 10);
    const defaultMerchant = {
        businessName: 'Test Store',
        ownerName: 'Test Owner',
        email: `test${Date.now()}@example.com`,
        password: hashedPassword,
        phone: '+1234567890',
        businessAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
        },
        verificationStatus: 'verified',
        isActive: true,
    };
    const merchant = await Merchant_1.Merchant.create({
        ...defaultMerchant,
        ...overrides,
        password: hashedPassword, // Always use hashed password
    });
    return merchant;
};
exports.createTestMerchant = createTestMerchant;
/**
 * Generates a JWT token for a merchant
 */
const generateMerchantToken = (merchantId) => {
    const secret = process.env.JWT_MERCHANT_SECRET || process.env.JWT_SECRET || 'test-secret';
    return jsonwebtoken_1.default.sign({ id: merchantId, type: 'merchant' }, secret, { expiresIn: '7d' });
};
exports.generateMerchantToken = generateMerchantToken;
/**
 * Creates authentication headers with Bearer token
 */
const createAuthHeaders = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};
exports.createAuthHeaders = createAuthHeaders;
/**
 * Creates a plain password for testing (before hashing)
 */
exports.TEST_PASSWORD = 'Password123';
/**
 * Helper to create merchant with known password
 */
const createTestMerchantWithPassword = async (password = exports.TEST_PASSWORD, overrides = {}) => {
    return (0, exports.createTestMerchant)({ ...overrides, password });
};
exports.createTestMerchantWithPassword = createTestMerchantWithPassword;
/**
 * Create test merchant user (team member)
 */
const createTestMerchantUser = async (merchantId, overrides = {}) => {
    const { MerchantUser } = require('../../models/MerchantUser');
    const hashedPassword = await bcryptjs_1.default.hash(overrides.password || exports.TEST_PASSWORD, 10);
    const defaultUser = {
        merchantId,
        name: 'Test User',
        email: `user${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'staff',
        isActive: true,
    };
    return await MerchantUser.create({
        ...defaultUser,
        ...overrides,
        password: hashedPassword,
    });
};
exports.createTestMerchantUser = createTestMerchantUser;
/**
 * Create test product
 */
const createTestProduct = async (merchantId, overrides = {}) => {
    const { MerchantProduct } = require('../../models/MerchantProduct');
    const defaultProduct = {
        merchantId,
        name: 'Test Product',
        description: 'Test product description',
        category: 'Test Category',
        price: 99.99,
        inventory: {
            quantity: 100,
            trackInventory: true,
            lowStockThreshold: 10,
        },
        isActive: true,
    };
    return await MerchantProduct.create({
        ...defaultProduct,
        ...overrides,
    });
};
exports.createTestProduct = createTestProduct;
/**
 * Create test order
 */
const createTestOrder = async (merchantId, overrides = {}) => {
    const { MerchantOrder } = require('../../models/MerchantOrder');
    const defaultOrder = {
        merchantId,
        customerId: 'test-customer-id',
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        items: [{
                productId: 'test-product-id',
                name: 'Test Product',
                quantity: 1,
                price: 99.99,
                total: 99.99,
            }],
        subtotal: 99.99,
        total: 99.99,
        status: 'pending',
        paymentStatus: 'pending',
    };
    return await MerchantOrder.create({
        ...defaultOrder,
        ...overrides,
    });
};
exports.createTestOrder = createTestOrder;
/**
 * Generate auth token for merchant user
 */
const generateMerchantUserToken = (userId, merchantId, role = 'staff') => {
    const secret = process.env.JWT_MERCHANT_SECRET || process.env.JWT_SECRET || 'test-secret';
    return jsonwebtoken_1.default.sign({ id: userId, merchantId, role, type: 'merchant_user' }, secret, { expiresIn: '7d' });
};
exports.generateMerchantUserToken = generateMerchantUserToken;
/**
 * Clean up test data
 */
const cleanupTestData = async () => {
    try {
        const { MerchantUser } = require('../../models/MerchantUser');
        const { MerchantProduct } = require('../../models/MerchantProduct');
        const { MerchantOrder } = require('../../models/MerchantOrder');
        const { AuditLog } = require('../../models/AuditLog');
        const { TeamInvitation } = require('../../models/TeamInvitation');
        await Promise.all([
            Merchant_1.Merchant.deleteMany({}),
            MerchantUser.deleteMany({}),
            MerchantProduct.deleteMany({}),
            MerchantOrder.deleteMany({}),
            AuditLog.deleteMany({}),
            TeamInvitation.deleteMany({}),
        ]);
    }
    catch (error) {
        console.error('Cleanup error:', error);
    }
};
exports.cleanupTestData = cleanupTestData;
/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
