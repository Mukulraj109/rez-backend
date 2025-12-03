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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLockFeeOptions = exports.lockItemWithPayment = exports.getLockedItems = exports.moveLockedToCart = exports.unlockItem = exports.lockItem = exports.validateCart = exports.getCartSummary = exports.removeCoupon = exports.applyCoupon = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const Event_1 = __importDefault(require("../models/Event"));
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
const redis_1 = require("../config/redis");
const cacheHelper_1 = require("../utils/cacheHelper");
const reservationService_1 = __importDefault(require("../services/reservationService"));
// Get user's active cart
exports.getCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        console.log('🛒 [GET CART] Getting cart for user:', req.userId);
        // Try to get from cache first
        const cacheKey = cacheHelper_1.CacheKeys.cart(req.userId);
        const cachedCart = await redisService_1.default.get(cacheKey);
        if (cachedCart) {
            console.log('✅ [GET CART] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedCart, 'Cart retrieved successfully');
        }
        let cart = await Cart_1.Cart.getActiveCart(req.userId);
        console.log('🛒 [GET CART] Found existing cart:', cart ? 'Yes' : 'No');
        // Create empty cart if doesn't exist
        if (!cart) {
            console.log('🛒 [GET CART] Creating new cart...');
            cart = new Cart_1.Cart({
                user: req.userId,
                items: [],
                totals: {
                    subtotal: 0,
                    tax: 0,
                    delivery: 0,
                    discount: 0,
                    cashback: 0,
                    total: 0,
                    savings: 0
                },
                isActive: true,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            });
            await cart.save();
            console.log('🛒 [GET CART] New cart created:', cart._id);
        }
        // Check if cart is expired
        const isExpired = cart.expiresAt && cart.expiresAt < new Date();
        if (isExpired) {
            console.log('🛒 [GET CART] Cart expired, clearing...');
            await cart.clearCart();
            await cart.save();
        }
        // BUGFIX: Recalculate totals if total is 0 but subtotal > 0 (stale data)
        if (cart.items.length > 0 && cart.totals.subtotal > 0 && cart.totals.total === 0) {
            console.log('🛒 [GET CART] Detected stale totals (total=0 but subtotal>0), recalculating...');
            await cart.calculateTotals();
            await cart.save();
            console.log('🛒 [GET CART] Totals recalculated:', cart.totals);
        }
        // Cache the cart data
        await redisService_1.default.set(cacheKey, cart, redis_1.CacheTTL.CART_DATA);
        console.log('🛒 [GET CART] Returning cart with', cart.items.length, 'items');
        (0, response_1.sendSuccess)(res, cart, 'Cart retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET CART] Error occurred:', error);
        console.error('❌ [GET CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [GET CART] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to get cart', 500);
    }
});
// Add item to cart
exports.addToCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId, quantity, variant, metadata } = req.body;
    try {
        console.log('🛒 [ADD TO CART] Starting add to cart for user:', req.userId);
        console.log('🛒 [ADD TO CART] Request data:', { productId, quantity, variant, metadata });
        // Verify product exists and is available
        console.log('🛒 [ADD TO CART] Finding product:', productId);
        let product = await Product_1.Product.findById(productId).populate('store');
        let event = null;
        let isEvent = false;
        // If product not found, check if it's an event
        if (!product) {
            console.log('🛒 [ADD TO CART] Product not found, checking if it\'s an event:', productId);
            event = await Event_1.default.findById(productId);
            if (event) {
                console.log('✅ [ADD TO CART] Event found:', event.title);
                isEvent = true;
                // Validate event is published and available
                if (event.status !== 'published') {
                    console.log('❌ [ADD TO CART] Event not available:', event.status);
                    return (0, response_1.sendNotFound)(res, 'Event not available');
                }
            }
            else {
                console.log('❌ [ADD TO CART] Product/Event not found:', productId);
                return (0, response_1.sendNotFound)(res, 'Product not found');
            }
        }
        // Handle product-specific validation
        if (!isEvent && product) {
            console.log('✅ [ADD TO CART] Product found:', product.name);
            console.log('🛒 [ADD TO CART] Product status:', {
                isActive: product.isActive,
                inventoryAvailable: product.inventory?.isAvailable,
                stock: product.inventory?.stock
            });
            if (!product.isActive || !product.inventory.isAvailable) {
                console.log('❌ [ADD TO CART] Product not available');
                return (0, response_1.sendNotFound)(res, 'Product not available');
            }
        }
        // Check stock availability with comprehensive validation (only for products)
        if (!isEvent && product) {
            let availableStock = product.inventory.stock;
            const lowStockThreshold = product.inventory.lowStockThreshold || 5;
            let variantInfo = '';
            console.log('🛒 [ADD TO CART] Available stock:', availableStock);
            console.log('🛒 [ADD TO CART] Low stock threshold:', lowStockThreshold);
            // Handle variant stock checking
            if (variant && product.inventory.variants) {
                console.log('🛒 [ADD TO CART] Checking variant:', variant);
                const variantObj = product.getVariantByType(variant.type, variant.value);
                if (!variantObj) {
                    console.log('❌ [ADD TO CART] Product variant not found');
                    return (0, response_1.sendError)(res, `Product variant "${variant.value}" is not available`, 400);
                }
                availableStock = variantObj.stock;
                variantInfo = ` (${variant.type}: ${variant.value})`;
                console.log('🛒 [ADD TO CART] Variant stock:', availableStock);
            }
            // Stock validation with detailed error messages
            if (!product.inventory.unlimited) {
                // Check if product is completely out of stock
                if (availableStock === 0) {
                    console.log('❌ [ADD TO CART] Product out of stock');
                    return (0, response_1.sendError)(res, `${product.name}${variantInfo} is currently out of stock`, 400);
                }
                // Check if requested quantity exceeds available stock
                if (availableStock < quantity) {
                    console.log('❌ [ADD TO CART] Insufficient stock. Available:', availableStock, 'Requested:', quantity);
                    // Provide helpful message about available quantity
                    const message = availableStock === 1
                        ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
                        : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
                    return (0, response_1.sendError)(res, message, 400);
                }
                // Check for low stock warning (this doesn't prevent adding to cart, just logs)
                if (availableStock <= lowStockThreshold) {
                    console.log('⚠️ [ADD TO CART] Low stock warning. Available:', availableStock, 'Threshold:', lowStockThreshold);
                    // Note: This is just a warning, we still allow the add to cart
                }
            }
        }
        // Get or create cart
        console.log('🛒 [ADD TO CART] Getting user cart...');
        let cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.log('🛒 [ADD TO CART] Creating new cart...');
            cart = new Cart_1.Cart({
                user: req.userId,
                items: [],
                totals: {
                    subtotal: 0,
                    tax: 0,
                    delivery: 0,
                    discount: 0,
                    cashback: 0,
                    total: 0,
                    savings: 0
                }
            });
        }
        else {
            console.log('✅ [ADD TO CART] Using existing cart:', cart._id);
        }
        // Add item to cart
        console.log('🛒 [ADD TO CART] Adding item to cart...');
        if (isEvent && event) {
            // Handle events - add directly to cart items
            const eventPrice = event.price?.amount || 0;
            const eventOriginalPrice = event.price?.originalPrice || eventPrice;
            // Check if event already exists in cart
            const existingItemIndex = cart.items.findIndex((item) => item.event && item.event.toString() === productId);
            if (existingItemIndex >= 0) {
                // Update quantity if item already exists
                cart.items[existingItemIndex].quantity += quantity;
                cart.items[existingItemIndex].addedAt = new Date();
            }
            else {
                // Add new event item
                const cartItem = {
                    event: event._id,
                    store: null, // Events don't have stores
                    quantity,
                    price: eventPrice,
                    originalPrice: eventOriginalPrice,
                    discount: eventOriginalPrice - eventPrice,
                    addedAt: new Date(),
                    metadata: metadata || {} // Store event metadata (slotId, etc.)
                };
                cart.items.push(cartItem);
            }
        }
        else if (product) {
            // Handle products - use existing addItem method
            await cart.addItem(productId, quantity, variant);
        }
        // Recalculate totals
        console.log('🛒 [ADD TO CART] Calculating totals...');
        await cart.calculateTotals();
        console.log('🛒 [ADD TO CART] Saving cart...');
        await cart.save();
        // Reserve stock for the added item (only for products)
        if (!isEvent && product) {
            console.log('🔒 [ADD TO CART] Reserving stock...');
            const reservationResult = await reservationService_1.default.reserveStock(cart._id.toString(), productId, quantity, variant);
            if (!reservationResult.success) {
                console.error('❌ [ADD TO CART] Stock reservation failed:', reservationResult.message);
                // Note: We don't fail the cart operation, but log the issue
                // The stock validation will catch this at checkout
            }
            else {
                console.log('✅ [ADD TO CART] Stock reserved successfully');
            }
        }
        // Invalidate cart cache after update
        await cacheHelper_1.CacheInvalidator.invalidateCart(req.userId);
        console.log('✅ [ADD TO CART] Item added successfully. Cart now has', cart.items.length, 'items');
        (0, response_1.sendSuccess)(res, cart, 'Item added to cart successfully');
    }
    catch (error) {
        console.error('❌ [ADD TO CART] Error occurred:', error);
        console.error('❌ [ADD TO CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [ADD TO CART] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to add item to cart', 500);
    }
});
// Update cart item quantity
exports.updateCartItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId, variant } = req.params;
    const { quantity } = req.body;
    try {
        console.log('🛒 [UPDATE CART] Starting update for user:', req.userId);
        console.log('🛒 [UPDATE CART] Request params:', { productId, variant });
        console.log('🛒 [UPDATE CART] Request body:', { quantity });
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.log('❌ [UPDATE CART] Cart not found');
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        console.log('✅ [UPDATE CART] Cart found with', cart.items.length, 'items');
        // Parse variant from query params
        let variantObj;
        if (variant && variant !== 'null') {
            try {
                variantObj = JSON.parse(variant);
                console.log('🛒 [UPDATE CART] Parsed variant:', variantObj);
            }
            catch (e) {
                console.log('❌ [UPDATE CART] Invalid variant format');
                return (0, response_1.sendError)(res, 'Invalid variant format', 400);
            }
        }
        // Validate stock before updating quantity (only if increasing)
        if (quantity > 0) {
            const product = await Product_1.Product.findById(productId);
            if (!product) {
                console.log('❌ [UPDATE CART] Product not found');
                return (0, response_1.sendNotFound)(res, 'Product not found');
            }
            if (!product.isActive || !product.inventory.isAvailable) {
                console.log('❌ [UPDATE CART] Product not available');
                return (0, response_1.sendError)(res, 'Product is no longer available', 400);
            }
            // Check stock availability
            let availableStock = product.inventory.stock;
            const lowStockThreshold = product.inventory.lowStockThreshold || 5;
            let variantInfo = '';
            if (variantObj && product.inventory.variants) {
                const variantData = product.getVariantByType(variantObj.type, variantObj.value);
                if (!variantData) {
                    console.log('❌ [UPDATE CART] Product variant not found');
                    return (0, response_1.sendError)(res, `Product variant "${variantObj.value}" is not available`, 400);
                }
                availableStock = variantData.stock;
                variantInfo = ` (${variantObj.type}: ${variantObj.value})`;
            }
            // Stock validation
            if (!product.inventory.unlimited) {
                if (availableStock === 0) {
                    console.log('❌ [UPDATE CART] Product out of stock');
                    return (0, response_1.sendError)(res, `${product.name}${variantInfo} is currently out of stock`, 400);
                }
                if (availableStock < quantity) {
                    console.log('❌ [UPDATE CART] Insufficient stock. Available:', availableStock, 'Requested:', quantity);
                    const message = availableStock === 1
                        ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
                        : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
                    return (0, response_1.sendError)(res, message, 400);
                }
                if (availableStock <= lowStockThreshold) {
                    console.log('⚠️ [UPDATE CART] Low stock warning. Available:', availableStock, 'Threshold:', lowStockThreshold);
                }
            }
        }
        console.log('🛒 [UPDATE CART] Updating item quantity...');
        await cart.updateItemQuantity(productId, quantity, variantObj);
        console.log('🛒 [UPDATE CART] Calculating totals...');
        await cart.calculateTotals();
        console.log('🛒 [UPDATE CART] Saving cart...');
        await cart.save();
        // Update stock reservation
        if (quantity > 0) {
            console.log('🔒 [UPDATE CART] Updating stock reservation...');
            const reservationResult = await reservationService_1.default.reserveStock(cart._id.toString(), productId, quantity, variantObj);
            if (!reservationResult.success) {
                console.error('❌ [UPDATE CART] Stock reservation update failed:', reservationResult.message);
            }
            else {
                console.log('✅ [UPDATE CART] Stock reservation updated successfully');
            }
        }
        else {
            // If quantity is 0, item was removed, so release reservation
            console.log('🔓 [UPDATE CART] Releasing stock reservation (quantity = 0)...');
            await reservationService_1.default.releaseStock(cart._id.toString(), productId, variantObj);
        }
        // Invalidate cart cache after update
        await cacheHelper_1.CacheInvalidator.invalidateCart(req.userId);
        console.log('✅ [UPDATE CART] Cart item updated successfully');
        (0, response_1.sendSuccess)(res, cart, 'Cart item updated successfully');
    }
    catch (error) {
        console.error('❌ [UPDATE CART] Error occurred:', error);
        console.error('❌ [UPDATE CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to update cart item', 500);
    }
});
// Remove item from cart
exports.removeFromCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🗑️ [REMOVE FROM CART] Starting remove item process');
    console.log('🗑️ [REMOVE FROM CART] User ID:', req.userId);
    console.log('🗑️ [REMOVE FROM CART] Request params:', req.params);
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId, variant } = req.params;
    console.log('🗑️ [REMOVE FROM CART] Product ID:', productId);
    console.log('🗑️ [REMOVE FROM CART] Variant (raw):', variant);
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.error('❌ [REMOVE FROM CART] Cart not found for user:', req.userId);
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        console.log('🗑️ [REMOVE FROM CART] Cart found:', cart._id);
        console.log('🗑️ [REMOVE FROM CART] Current cart items count:', cart.items.length);
        console.log('🗑️ [REMOVE FROM CART] Cart items:', cart.items.map((item) => ({
            id: item._id,
            product: item.product,
            hasProduct: !!item.product
        })));
        // Parse variant from query params
        let variantObj;
        if (variant && variant !== 'null') {
            try {
                variantObj = JSON.parse(variant);
                console.log('🗑️ [REMOVE FROM CART] Parsed variant:', variantObj);
            }
            catch (e) {
                console.error('❌ [REMOVE FROM CART] Invalid variant format:', e);
                return (0, response_1.sendError)(res, 'Invalid variant format', 400);
            }
        }
        console.log('🗑️ [REMOVE FROM CART] Calling cart.removeItem with:', { productId, variant: variantObj });
        await cart.removeItem(productId, variantObj);
        console.log('🗑️ [REMOVE FROM CART] Item removed, items count now:', cart.items.length);
        await cart.calculateTotals();
        await cart.save();
        console.log('✅ [REMOVE FROM CART] Cart saved successfully');
        // Release stock reservation
        console.log('🔓 [REMOVE FROM CART] Releasing stock reservation...');
        try {
            await reservationService_1.default.releaseStock(cart._id.toString(), productId, variantObj);
        }
        catch (stockError) {
            console.warn('⚠️ [REMOVE FROM CART] Stock release failed (non-critical):', stockError);
        }
        // Invalidate cart cache after update
        await cacheHelper_1.CacheInvalidator.invalidateCart(req.userId);
        (0, response_1.sendSuccess)(res, cart, 'Item removed from cart successfully');
    }
    catch (error) {
        console.error('❌ [REMOVE FROM CART] Error:', error);
        throw new errorHandler_1.AppError('Failed to remove item from cart', 500);
    }
});
// Clear entire cart
exports.clearCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        await cart.clearCart();
        await cart.save();
        (0, response_1.sendSuccess)(res, cart, 'Cart cleared successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to clear cart', 500);
    }
});
// Apply coupon to cart
exports.applyCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { couponCode, couponId } = req.body;
    try {
        console.log('🎟️ [APPLY COUPON] Starting coupon application');
        console.log('🎟️ [APPLY COUPON] Coupon code:', couponCode);
        console.log('🎟️ [APPLY COUPON] Coupon ID:', couponId);
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        if (cart.items.length === 0) {
            return (0, response_1.sendError)(res, 'Cannot apply coupon to empty cart', 400);
        }
        // Find coupon by code or ID
        const { Coupon } = await Promise.resolve().then(() => __importStar(require('../models/Coupon')));
        let coupon;
        if (couponId) {
            coupon = await Coupon.findById(couponId);
        }
        else if (couponCode) {
            coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });
        }
        if (!coupon) {
            return (0, response_1.sendError)(res, 'Coupon not found', 400);
        }
        console.log('✅ [APPLY COUPON] Coupon found:', coupon.title);
        // Build validation context from cart items
        const cartItems = await Promise.all(cart.items.map(async (item) => {
            const product = await Product_1.Product.findById(item.product);
            return {
                productId: item.product.toString(),
                storeId: product?.store?.toString() || '',
                quantity: item.quantity,
                price: item.price
            };
        }));
        // Validate coupon using validation service
        const { validateCouponForCart } = await Promise.resolve().then(() => __importStar(require('../services/couponValidationService')));
        const validationResult = await validateCouponForCart(coupon._id.toString(), {
            cartItems,
            userId: req.userId
        });
        console.log('🎟️ [APPLY COUPON] Validation result:', validationResult);
        if (!validationResult.isValid) {
            console.log('❌ [APPLY COUPON] Validation failed:', validationResult.error);
            return (0, response_1.sendError)(res, validationResult.error || 'Coupon is not valid', 400);
        }
        // Apply coupon to cart (existing method)
        const couponApplied = await cart.applyCoupon(couponCode || coupon.couponCode);
        if (!couponApplied) {
            return (0, response_1.sendError)(res, 'Failed to apply coupon', 400);
        }
        await cart.calculateTotals();
        await cart.save();
        // Invalidate cart cache
        await cacheHelper_1.CacheInvalidator.invalidateCart(req.userId);
        console.log('✅ [APPLY COUPON] Coupon applied successfully');
        (0, response_1.sendSuccess)(res, {
            cart,
            couponDetails: {
                code: coupon.couponCode,
                title: coupon.title,
                discountAmount: validationResult.discountAmount,
                applicableItems: validationResult.applicableItems,
                metadata: coupon.metadata
            }
        }, 'Coupon applied successfully');
    }
    catch (error) {
        console.error('❌ [APPLY COUPON] Error:', error);
        if (error instanceof errorHandler_1.AppError) {
            return (0, response_1.sendError)(res, error.message, 400);
        }
        throw new errorHandler_1.AppError('Failed to apply coupon', 500);
    }
});
// Remove coupon from cart
exports.removeCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        await cart.removeCoupon();
        await cart.calculateTotals();
        await cart.save();
        (0, response_1.sendSuccess)(res, cart, 'Coupon removed successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to remove coupon', 500);
    }
});
// Get cart summary/totals
exports.getCartSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            return (0, response_1.sendSuccess)(res, {
                itemCount: 0,
                totals: {
                    subtotal: 0,
                    tax: 0,
                    delivery: 0,
                    discount: 0,
                    cashback: 0,
                    total: 0,
                    savings: 0
                }
            }, 'Cart summary retrieved successfully');
        }
        const summary = {
            itemCount: cart.itemCount,
            storeCount: cart.storeCount,
            totals: cart.totals,
            hasItems: cart.items.length > 0,
            coupon: cart.coupon ? {
                code: cart.coupon.code,
                discountType: cart.coupon.discountType,
                appliedAmount: cart.coupon.appliedAmount
            } : null
        };
        (0, response_1.sendSuccess)(res, summary, 'Cart summary retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get cart summary', 500);
    }
});
// Validate cart before checkout
exports.validateCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart || cart.items.length === 0) {
            return (0, response_1.sendError)(res, 'Cart is empty', 400);
        }
        // BUGFIX: Recalculate totals if total is 0 but subtotal > 0 (stale data)
        if (cart.items.length > 0 && cart.totals.subtotal > 0 && cart.totals.total === 0) {
            console.log('✅ [VALIDATE CART] Detected stale totals, recalculating...');
            await cart.calculateTotals();
            await cart.save();
            console.log('✅ [VALIDATE CART] Totals recalculated:', cart.totals);
        }
        const validationErrors = [];
        const unavailableItems = [];
        // Check each item's availability and stock with detailed messages
        for (const item of cart.items) {
            const product = await Product_1.Product.findById(item.product);
            if (!product) {
                unavailableItems.push({
                    productId: item.product,
                    productName: 'Unknown Product',
                    reason: 'Product no longer exists',
                    severity: 'error'
                });
                continue;
            }
            if (!product.isActive) {
                unavailableItems.push({
                    productId: item.product,
                    productName: product.name,
                    reason: 'Product is no longer available for purchase',
                    severity: 'error'
                });
                continue;
            }
            if (!product.inventory.isAvailable) {
                unavailableItems.push({
                    productId: item.product,
                    productName: product.name,
                    reason: 'Product is currently unavailable',
                    severity: 'error'
                });
                continue;
            }
            // Check stock with detailed validation
            let availableStock = product.inventory.stock;
            const lowStockThreshold = product.inventory.lowStockThreshold || 5;
            let variantInfo = '';
            if (item.variant && item.variant.type && item.variant.value && product.inventory.variants) {
                const variant = product.getVariantByType(item.variant.type, item.variant.value);
                if (!variant) {
                    unavailableItems.push({
                        productId: item.product,
                        productName: product.name,
                        reason: `Variant "${item.variant.value}" is no longer available`,
                        severity: 'error'
                    });
                    continue;
                }
                availableStock = variant.stock;
                variantInfo = ` (${item.variant.type}: ${item.variant.value})`;
            }
            // Stock availability checks
            if (!product.inventory.unlimited) {
                // Out of stock
                if (availableStock === 0) {
                    unavailableItems.push({
                        productId: item.product,
                        productName: product.name + variantInfo,
                        reason: 'Out of stock',
                        availableQuantity: 0,
                        requestedQuantity: item.quantity,
                        severity: 'error'
                    });
                }
                // Insufficient stock
                else if (availableStock < item.quantity) {
                    const message = availableStock === 1
                        ? 'Only 1 item available'
                        : `Only ${availableStock} items available`;
                    unavailableItems.push({
                        productId: item.product,
                        productName: product.name + variantInfo,
                        reason: message,
                        availableQuantity: availableStock,
                        requestedQuantity: item.quantity,
                        severity: 'error'
                    });
                }
                // Low stock warning (doesn't block checkout, just warns)
                else if (availableStock <= lowStockThreshold) {
                    validationErrors.push(`${product.name}${variantInfo} has limited stock (${availableStock} remaining)`);
                }
            }
        }
        if (unavailableItems.length > 0) {
            return (0, response_1.sendError)(res, 'Some items in your cart have stock or availability issues', 400, unavailableItems);
        }
        // If there are validation warnings (low stock) but no blocking errors
        const response = {
            isValid: true,
            cart: cart
        };
        if (validationErrors.length > 0) {
            response.warnings = validationErrors;
        }
        (0, response_1.sendSuccess)(res, response, validationErrors.length > 0
            ? 'Cart is valid for checkout with warnings'
            : 'Cart is valid for checkout');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to validate cart', 500);
    }
});
// Lock item at current price
exports.lockItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔒 [LOCK ITEM] Starting lock process');
    console.log('🔒 [LOCK ITEM] User ID:', req.userId);
    console.log('🔒 [LOCK ITEM] Request body:', req.body);
    if (!req.userId) {
        console.error('❌ [LOCK ITEM] No user ID provided');
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId, quantity = 1, variant, lockDurationHours = 24 } = req.body;
    if (!productId) {
        console.error('❌ [LOCK ITEM] No product ID provided');
        return (0, response_1.sendBadRequest)(res, 'Product ID is required');
    }
    try {
        console.log('🔒 [LOCK ITEM] Finding cart for user:', req.userId);
        let cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.log('🔒 [LOCK ITEM] No cart found, creating new cart');
            // Create new cart if not exists
            cart = await Cart_1.Cart.create({
                user: req.userId,
                items: [],
                lockedItems: [],
                totals: {
                    subtotal: 0,
                    tax: 0,
                    delivery: 0,
                    discount: 0,
                    cashback: 0,
                    total: 0,
                    savings: 0
                },
                isActive: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
            console.log('🔒 [LOCK ITEM] New cart created:', cart._id);
        }
        else {
            console.log('🔒 [LOCK ITEM] Found existing cart:', cart._id);
            console.log('🔒 [LOCK ITEM] Current locked items count:', cart.lockedItems?.length || 0);
        }
        console.log('🔒 [LOCK ITEM] Locking product:', productId, 'with quantity:', quantity);
        await cart.lockItem(productId, quantity, variant, lockDurationHours);
        console.log('🔒 [LOCK ITEM] Item locked successfully');
        console.log('🔒 [LOCK ITEM] New locked items count:', cart.lockedItems?.length || 0);
        // Reload cart with populated fields
        const populatedCart = await Cart_1.Cart.findById(cart._id)
            .populate({
            path: 'lockedItems.product',
            select: 'name images pricing store category'
        })
            .populate({
            path: 'lockedItems.store',
            select: 'name logo location'
        });
        (0, response_1.sendSuccess)(res, { cart: populatedCart, message: 'Item locked successfully' }, 'Item locked successfully');
    }
    catch (error) {
        console.error('❌ [LOCK ITEM] Error:', error);
        throw new errorHandler_1.AppError(error instanceof Error ? error.message : 'Failed to lock item', 500);
    }
});
// Unlock item
exports.unlockItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔓 [UNLOCK ITEM] Starting unlock process');
    console.log('🔓 [UNLOCK ITEM] User ID:', req.userId);
    console.log('🔓 [UNLOCK ITEM] Product ID:', req.params.productId);
    console.log('🔓 [UNLOCK ITEM] Request body:', req.body);
    if (!req.userId) {
        console.error('❌ [UNLOCK ITEM] No user ID provided');
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId } = req.params;
    const { variant } = req.body || {}; // Handle undefined body for DELETE requests
    if (!productId) {
        console.error('❌ [UNLOCK ITEM] No product ID provided');
        return (0, response_1.sendBadRequest)(res, 'Product ID is required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.error('❌ [UNLOCK ITEM] Cart not found for user:', req.userId);
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        console.log('🔓 [UNLOCK ITEM] Cart found, locked items count:', cart.lockedItems?.length || 0);
        console.log('🔓 [UNLOCK ITEM] Locked items:', cart.lockedItems?.map((item) => ({
            productId: item.product?.toString(),
            variant: item.variant
        })));
        await cart.unlockItem(productId, variant);
        console.log('✅ [UNLOCK ITEM] Item unlocked successfully');
        console.log('✅ [UNLOCK ITEM] Remaining locked items:', cart.lockedItems?.length || 0);
        (0, response_1.sendSuccess)(res, cart, 'Item unlocked successfully');
    }
    catch (error) {
        console.error('❌ [UNLOCK ITEM] Error:', error);
        console.error('❌ [UNLOCK ITEM] Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw new errorHandler_1.AppError('Failed to unlock item', 500);
    }
});
// Move locked item to cart
exports.moveLockedToCart = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('➡️ [MOVE TO CART] Starting move locked to cart');
    console.log('➡️ [MOVE TO CART] User ID:', req.userId);
    console.log('➡️ [MOVE TO CART] Product ID:', req.params.productId);
    console.log('➡️ [MOVE TO CART] Request body:', req.body);
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId } = req.params;
    const { variant } = req.body || {}; // Handle undefined body safely
    if (!productId) {
        return (0, response_1.sendBadRequest)(res, 'Product ID is required');
    }
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            console.error('❌ [MOVE TO CART] Cart not found');
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        console.log('➡️ [MOVE TO CART] Cart found with locked items:', cart.lockedItems?.length || 0);
        console.log('➡️ [MOVE TO CART] Locked items:', cart.lockedItems?.map((item) => ({
            itemId: item._id,
            productId: typeof item.product === 'object' ? item.product._id : item.product,
            productString: item.product?.toString()
        })));
        await cart.moveLockedToCart(productId, variant);
        console.log('✅ [MOVE TO CART] Item moved successfully');
        (0, response_1.sendSuccess)(res, cart, 'Item moved to cart successfully');
    }
    catch (error) {
        console.error('❌ [MOVE TO CART] Error:', error);
        console.error('❌ [MOVE TO CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
        throw new errorHandler_1.AppError(error instanceof Error ? error.message : 'Failed to move item to cart', 500);
    }
});
// Get locked items
exports.getLockedItems = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔒 [GET LOCKED] Starting get locked items');
    console.log('🔒 [GET LOCKED] User ID:', req.userId);
    if (!req.userId) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const cart = await Cart_1.Cart.findOne({ user: req.userId, isActive: true })
            .populate({
            path: 'lockedItems.product',
            select: 'name images pricing store category'
        })
            .populate({
            path: 'lockedItems.store',
            select: 'name logo location'
        });
        console.log('🔒 [GET LOCKED] Cart found:', !!cart);
        console.log('🔒 [GET LOCKED] Total locked items in cart:', cart?.lockedItems?.length || 0);
        if (!cart) {
            console.log('🔒 [GET LOCKED] No cart found, returning empty array');
            return (0, response_1.sendSuccess)(res, { lockedItems: [] }, 'No locked items found');
        }
        // Log all locked items with their expiration
        const now = new Date();
        console.log('🔒 [GET LOCKED] Current time:', now.toISOString());
        cart.lockedItems.forEach((item, index) => {
            console.log(`🔒 [GET LOCKED] Item ${index + 1}:`, {
                id: item._id,
                productId: item.product?._id || item.product,
                expiresAt: item.expiresAt,
                expiresAtISO: new Date(item.expiresAt).toISOString(),
                isExpired: item.expiresAt <= now,
                timeUntilExpiry: item.expiresAt > now ? Math.round((item.expiresAt - now.getTime()) / 1000 / 60) + ' minutes' : 'EXPIRED'
            });
        });
        // Filter out expired locked items
        const validLockedItems = cart.lockedItems.filter((item) => item.expiresAt > now);
        console.log('🔒 [GET LOCKED] Found', validLockedItems.length, 'valid locked items out of', cart.lockedItems.length, 'total');
        if (validLockedItems.length > 0) {
            const firstItem = validLockedItems[0];
            console.log('🔒 [GET LOCKED] First valid item:', {
                id: firstItem._id,
                productId: firstItem.product?._id || firstItem.product,
                productName: firstItem.product?.name || 'N/A'
            });
        }
        (0, response_1.sendSuccess)(res, { lockedItems: validLockedItems }, 'Locked items retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET LOCKED] Error:', error);
        throw new errorHandler_1.AppError('Failed to get locked items', 500);
    }
});
// Lock fee configuration - Only 3 hour lock at 5%
const LOCK_FEE_CONFIG = {
    3: { hours: 3, percentage: 5, label: '3 Hours' },
};
// Calculate lock fee
const calculateLockFee = (productPrice, durationHours) => {
    const config = LOCK_FEE_CONFIG[durationHours];
    if (!config) {
        throw new Error('Invalid lock duration. Choose 3 hours.');
    }
    const fee = Math.ceil((productPrice * config.percentage) / 100);
    return { fee, percentage: config.percentage };
};
// Lock item with payment (MakeMyTrip style)
exports.lockItemWithPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔒💰 [LOCK WITH PAYMENT] Starting paid lock process');
    console.log('🔒💰 [LOCK WITH PAYMENT] User ID:', req.userId);
    console.log('🔒💰 [LOCK WITH PAYMENT] Request body:', req.body);
    if (!req.userId) {
        console.error('❌ [LOCK WITH PAYMENT] No user ID provided');
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { productId, quantity = 1, variant, duration = 3, // Default 3 hours
    paymentMethod = 'wallet' // 'wallet' | 'paybill' | 'upi'
     } = req.body;
    if (!productId) {
        console.error('❌ [LOCK WITH PAYMENT] No product ID provided');
        return (0, response_1.sendBadRequest)(res, 'Product ID is required');
    }
    // Validate duration
    if (!LOCK_FEE_CONFIG[duration]) {
        return (0, response_1.sendBadRequest)(res, 'Invalid lock duration. Use 3 hours lock.');
    }
    try {
        // 1. Get product details
        console.log('🔒💰 [LOCK WITH PAYMENT] Finding product:', productId);
        const product = await Product_1.Product.findById(productId).populate('store');
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (!product.isActive || !product.inventory.isAvailable) {
            return (0, response_1.sendBadRequest)(res, 'Product is not available for purchase');
        }
        // Check stock
        if (!product.inventory.unlimited && product.inventory.stock < quantity) {
            return (0, response_1.sendBadRequest)(res, `Only ${product.inventory.stock} items available in stock`);
        }
        // Check if product is already locked (prevent double charging)
        // Only check for NON-EXPIRED locks
        const existingCart = await Cart_1.Cart.getActiveCart(req.userId);
        if (existingCart) {
            const now = new Date();
            // Check for non-expired locks
            const alreadyLocked = existingCart.lockedItems.find((item) => {
                const itemProductId = item.product?._id?.toString() || item.product?.toString();
                const productMatch = itemProductId === productId;
                const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
                const isNotExpired = item.expiresAt > now; // Only check non-expired locks
                return productMatch && variantMatch && isNotExpired;
            });
            if (alreadyLocked) {
                console.log('🔒💰 [LOCK WITH PAYMENT] Product already locked (non-expired), rejecting duplicate lock');
                return (0, response_1.sendBadRequest)(res, 'This product is already locked. Go to your cart to view or modify your locked items.');
            }
            // Clean up expired locks for this product/variant combination
            const expiredLocksCount = existingCart.lockedItems.filter((item) => {
                const itemProductId = item.product?._id?.toString() || item.product?.toString();
                const productMatch = itemProductId === productId;
                const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
                const isExpired = item.expiresAt <= now;
                return productMatch && variantMatch && isExpired;
            }).length;
            if (expiredLocksCount > 0) {
                console.log(`🔒💰 [LOCK WITH PAYMENT] Found ${expiredLocksCount} expired locks for this product, cleaning up...`);
                existingCart.lockedItems = existingCart.lockedItems.filter((item) => {
                    const itemProductId = item.product?._id?.toString() || item.product?.toString();
                    const productMatch = itemProductId === productId;
                    const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
                    const isExpired = item.expiresAt <= now;
                    // Keep items that DON'T match (other products) OR aren't expired
                    return !(productMatch && variantMatch && isExpired);
                });
                await existingCart.save();
                console.log('🔒💰 [LOCK WITH PAYMENT] Expired locks cleaned up');
            }
        }
        // 2. Calculate lock fee
        const productPrice = product.pricing?.selling || product.price?.current || 0;
        if (!productPrice || productPrice === 0) {
            return (0, response_1.sendBadRequest)(res, 'Product price not available');
        }
        const { fee: lockFee, percentage: lockFeePercentage } = calculateLockFee(productPrice * quantity, duration);
        console.log('🔒💰 [LOCK WITH PAYMENT] Lock fee calculated:', { productPrice, lockFee, lockFeePercentage, duration });
        // 3. Process payment
        const { Wallet } = await Promise.resolve().then(() => __importStar(require('../models/Wallet')));
        const { Transaction } = await Promise.resolve().then(() => __importStar(require('../models/Transaction')));
        const wallet = await Wallet.findOne({ user: req.userId });
        if (!wallet) {
            return (0, response_1.sendBadRequest)(res, 'Wallet not found. Please set up your wallet first.');
        }
        console.log('🔒💰 [LOCK WITH PAYMENT] Wallet found:', {
            available: wallet.balance.available,
            paybill: wallet.balance.paybill,
            total: wallet.balance.total
        });
        // Determine which balance to use
        let balanceSource = 'wallet';
        let availableBalance = wallet.balance.available;
        if (paymentMethod === 'paybill') {
            balanceSource = 'paybill';
            availableBalance = wallet.balance.paybill;
        }
        if (paymentMethod === 'upi') {
            // For UPI, we would redirect to Razorpay - for now, return info for frontend
            return (0, response_1.sendSuccess)(res, {
                requiresUpiPayment: true,
                lockFee,
                lockFeePercentage,
                duration,
                productId,
                quantity,
                productName: product.name,
                productPrice: productPrice * quantity
            }, 'UPI payment required. Complete payment to lock the item.');
        }
        // Check balance
        if (availableBalance < lockFee) {
            return (0, response_1.sendBadRequest)(res, `Insufficient ${balanceSource === 'paybill' ? 'PayBill' : 'wallet'} balance. ` +
                `Required: ₹${lockFee}, Available: ₹${availableBalance}`);
        }
        // 4. Deduct from wallet/paybill
        const balanceBefore = wallet.balance.total;
        if (balanceSource === 'paybill') {
            await wallet.usePayBillBalance(lockFee);
        }
        else {
            await wallet.deductFunds(lockFee);
        }
        const balanceAfter = wallet.balance.total;
        console.log('🔒💰 [LOCK WITH PAYMENT] Payment deducted:', { balanceBefore, balanceAfter, lockFee });
        // 5. Create transaction record
        const transaction = await Transaction.create({
            user: req.userId,
            type: 'debit',
            category: 'spending',
            amount: lockFee,
            currency: 'INR',
            description: `Lock fee for ${product.name} (${duration}h lock)`,
            source: {
                type: 'order',
                reference: product._id,
                description: `Price lock deposit - ${LOCK_FEE_CONFIG[duration].label}`,
                metadata: {
                    projectTitle: product.name,
                    storeInfo: product.store ? {
                        name: product.store.name,
                        id: product.store._id
                    } : undefined
                }
            },
            status: {
                current: 'completed',
                history: [{
                        status: 'completed',
                        timestamp: new Date()
                    }]
            },
            balanceBefore,
            balanceAfter,
            isReversible: true,
            notes: `Lock duration: ${duration} hours, Payment method: ${balanceSource}`
        });
        console.log('🔒💰 [LOCK WITH PAYMENT] Transaction created:', transaction.transactionId);
        // 6. Add to cart locked items
        let cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            cart = await Cart_1.Cart.create({
                user: req.userId,
                items: [],
                lockedItems: [],
                totals: {
                    subtotal: 0, tax: 0, delivery: 0, discount: 0, cashback: 0, total: 0, savings: 0
                },
                isActive: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        }
        const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
        const storeId = typeof product.store === 'object' && product.store?._id
            ? product.store._id
            : product.store || null;
        // Handle existing cart item - can't have same product in both cart and locked
        const existingCartItemIndex = cart.items.findIndex((item) => {
            const itemProductId = item.product?._id?.toString() || item.product?.toString();
            const productMatch = itemProductId === productId;
            const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
            return productMatch && variantMatch;
        });
        if (existingCartItemIndex > -1) {
            const cartItem = cart.items[existingCartItemIndex];
            // Check if this cart item was previously locked (has lock fee already applied)
            // Only check notes - discount alone doesn't mean lock fee was paid
            const hasLockFeeApplied = cartItem.notes?.includes('Lock fee');
            if (hasLockFeeApplied) {
                // This item already has a lock fee applied - don't allow re-locking
                return (0, response_1.sendBadRequest)(res, 'This item already has a lock fee applied. Complete your purchase or remove it from cart first.');
            }
            const cartQty = cartItem.quantity || 1;
            if (cartQty <= quantity) {
                // Lock quantity >= cart quantity: Remove entire item from cart
                console.log(`🔒💰 [LOCK WITH PAYMENT] Removing item from cart (cart qty: ${cartQty}, lock qty: ${quantity})`);
                cart.items.splice(existingCartItemIndex, 1);
            }
            else {
                // Cart has more than we're locking: Reduce cart quantity
                console.log(`🔒💰 [LOCK WITH PAYMENT] Reducing cart qty from ${cartQty} to ${cartQty - quantity}`);
                cart.items[existingCartItemIndex].quantity = cartQty - quantity;
            }
        }
        // Add new locked item (duplicates are blocked earlier in the function)
        cart.lockedItems.push({
            product: productId,
            store: storeId,
            quantity,
            variant,
            lockedPrice: productPrice,
            originalPrice: product.pricing?.original || product.price?.original || productPrice,
            lockedAt: new Date(),
            expiresAt,
            notes: `Paid lock - ₹${lockFee} deposit (${lockFeePercentage}%)`,
            lockFee,
            lockFeePercentage,
            lockDuration: duration,
            paymentMethod: balanceSource,
            paymentTransactionId: transaction._id,
            lockPaymentStatus: 'paid',
            isPaidLock: true
        });
        await cart.save();
        console.log('🔒💰 [LOCK WITH PAYMENT] Lock saved successfully');
        // 7. Reload with populated fields
        const populatedCart = await Cart_1.Cart.findById(cart._id)
            .populate({
            path: 'lockedItems.product',
            select: 'name images pricing store category'
        })
            .populate({
            path: 'lockedItems.store',
            select: 'name logo location'
        });
        (0, response_1.sendSuccess)(res, {
            cart: populatedCart,
            lockDetails: {
                lockFee,
                lockFeePercentage,
                duration,
                expiresAt,
                transactionId: transaction.transactionId,
                paymentMethod: balanceSource,
                message: `Price locked for ${LOCK_FEE_CONFIG[duration].label}. ₹${lockFee} will be deducted from your final payment.`
            }
        }, 'Item locked successfully with payment');
    }
    catch (error) {
        console.error('❌ [LOCK WITH PAYMENT] Error:', error);
        throw new errorHandler_1.AppError(error instanceof Error ? error.message : 'Failed to lock item with payment', 500);
    }
});
// Get lock fee options for a product
exports.getLockFeeOptions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log('💰 [GET LOCK OPTIONS] Getting lock fee options');
    const { productId, quantity = 1 } = req.query;
    if (!productId) {
        return (0, response_1.sendBadRequest)(res, 'Product ID is required');
    }
    try {
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        const productPrice = product.pricing?.selling || product.price?.current || 0;
        if (!productPrice) {
            return (0, response_1.sendBadRequest)(res, 'Product price not available');
        }
        const totalPrice = productPrice * Number(quantity);
        // Return only 3-hour lock option at 5%
        const threeHourConfig = LOCK_FEE_CONFIG[3];
        const options = [{
                duration: 3,
                label: threeHourConfig.label,
                percentage: threeHourConfig.percentage,
                fee: Math.ceil((totalPrice * threeHourConfig.percentage) / 100)
            }];
        (0, response_1.sendSuccess)(res, {
            productId,
            productName: product.name,
            productPrice,
            quantity: Number(quantity),
            totalPrice,
            lockOptions: options
        }, 'Lock fee options retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET LOCK OPTIONS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get lock fee options', 500);
    }
});
