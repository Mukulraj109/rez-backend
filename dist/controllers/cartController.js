"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLockedItems = exports.moveLockedToCart = exports.unlockItem = exports.lockItem = exports.validateCart = exports.getCartSummary = exports.removeCoupon = exports.applyCoupon = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
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
    const { productId, quantity, variant } = req.body;
    try {
        console.log('🛒 [ADD TO CART] Starting add to cart for user:', req.userId);
        console.log('🛒 [ADD TO CART] Request data:', { productId, quantity, variant });
        // Verify product exists and is available
        console.log('🛒 [ADD TO CART] Finding product:', productId);
        const product = await Product_1.Product.findById(productId).populate('store');
        if (!product) {
            console.log('❌ [ADD TO CART] Product not found:', productId);
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
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
        // Check stock availability with comprehensive validation
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
        await cart.addItem(productId, quantity, variant);
        // Recalculate totals
        console.log('🛒 [ADD TO CART] Calculating totals...');
        await cart.calculateTotals();
        console.log('🛒 [ADD TO CART] Saving cart...');
        await cart.save();
        // Reserve stock for the added item
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
    const { couponCode } = req.body;
    try {
        const cart = await Cart_1.Cart.getActiveCart(req.userId);
        if (!cart) {
            return (0, response_1.sendNotFound)(res, 'Cart not found');
        }
        if (cart.items.length === 0) {
            return (0, response_1.sendError)(res, 'Cannot apply coupon to empty cart', 400);
        }
        const couponApplied = await cart.applyCoupon(couponCode);
        if (!couponApplied) {
            return (0, response_1.sendError)(res, 'Invalid or expired coupon code', 400);
        }
        await cart.calculateTotals();
        await cart.save();
        (0, response_1.sendSuccess)(res, cart, 'Coupon applied successfully');
    }
    catch (error) {
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
