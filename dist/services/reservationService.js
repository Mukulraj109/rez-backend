"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const reservation_1 = require("../types/reservation");
/**
 * Stock Reservation Service
 *
 * This service manages temporary stock reservations to prevent overselling.
 * When items are added to a cart, stock is "reserved" for a limited time (15 minutes).
 * If the user doesn't complete checkout, the reservation expires and stock is released.
 *
 * Key Features:
 * - Reserve stock when items are added to cart
 * - Extend reservations when user enters checkout
 * - Release reservations on cart clear or item removal
 * - Automatic cleanup of expired reservations
 * - Atomic operations to prevent race conditions
 */
class ReservationService {
    /**
     * Reserve stock for a product in a cart
     * This creates a temporary reservation that prevents other users from purchasing
     *
     * @param cartId - The cart ID
     * @param productId - The product ID
     * @param quantity - Quantity to reserve
     * @param variant - Optional variant specification
     * @returns Reservation result with success status and details
     */
    async reserveStock(cartId, productId, quantity, variant) {
        try {
            console.log('🔒 [RESERVATION] Attempting to reserve stock:', {
                cartId,
                productId,
                quantity,
                variant
            });
            // Get the cart
            const cart = await Cart_1.Cart.findById(cartId);
            if (!cart) {
                return {
                    success: false,
                    message: 'Cart not found'
                };
            }
            // Get the product
            const product = await Product_1.Product.findById(productId);
            if (!product) {
                return {
                    success: false,
                    message: 'Product not found'
                };
            }
            // Check if product is available
            if (!product.isActive || !product.inventory.isAvailable) {
                return {
                    success: false,
                    message: 'Product is not available'
                };
            }
            // Calculate available stock (accounting for existing reservations)
            let availableStock = product.inventory.stock;
            if (variant && product.inventory.variants) {
                const variantObj = product.inventory.variants.find((v) => v.type === variant.type && v.value === variant.value);
                if (!variantObj) {
                    return {
                        success: false,
                        message: `Variant "${variant.value}" not found`
                    };
                }
                availableStock = variantObj.stock;
            }
            // Calculate total reserved quantity for this product across all carts
            const totalReserved = await this.getTotalReservedQuantity(productId, variant);
            // Calculate actual available stock (physical stock - reserved)
            const actualAvailable = availableStock - totalReserved;
            console.log('🔒 [RESERVATION] Stock analysis:', {
                physicalStock: availableStock,
                totalReserved,
                actualAvailable,
                requestedQuantity: quantity
            });
            // Check if we have enough available stock
            if (actualAvailable < quantity) {
                return {
                    success: false,
                    message: `Insufficient stock available. Only ${actualAvailable} items remaining`,
                    availableStock: actualAvailable
                };
            }
            // Check if there's already a reservation for this product in this cart
            const existingReservationIndex = cart.reservedItems.findIndex((item) => {
                const productMatch = item.productId.toString() === productId;
                const variantMatch = variant
                    ? item.variant?.type === variant.type && item.variant?.value === variant.value
                    : !item.variant || (!item.variant.type && !item.variant.value);
                return productMatch && variantMatch;
            });
            const expiresAt = new Date(Date.now() + reservation_1.RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
            if (existingReservationIndex > -1) {
                // Update existing reservation
                cart.reservedItems[existingReservationIndex].quantity = quantity;
                cart.reservedItems[existingReservationIndex].reservedAt = new Date();
                cart.reservedItems[existingReservationIndex].expiresAt = expiresAt;
                console.log('🔒 [RESERVATION] Updated existing reservation');
            }
            else {
                // Create new reservation
                cart.reservedItems.push({
                    productId: new mongoose_1.Types.ObjectId(productId),
                    quantity,
                    variant,
                    reservedAt: new Date(),
                    expiresAt
                });
                console.log('🔒 [RESERVATION] Created new reservation');
            }
            await cart.save();
            console.log('✅ [RESERVATION] Stock reserved successfully');
            return {
                success: true,
                message: 'Stock reserved successfully',
                reservedQuantity: quantity,
                availableStock: actualAvailable - quantity,
                expiresAt
            };
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error reserving stock:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reserve stock'
            };
        }
    }
    /**
     * Release stock reservation for a specific product in a cart
     *
     * @param cartId - The cart ID
     * @param productId - The product ID
     * @param variant - Optional variant specification
     * @returns Reservation result
     */
    async releaseStock(cartId, productId, variant) {
        try {
            console.log('🔓 [RESERVATION] Releasing stock:', {
                cartId,
                productId,
                variant
            });
            const cart = await Cart_1.Cart.findById(cartId);
            if (!cart) {
                return {
                    success: false,
                    message: 'Cart not found'
                };
            }
            // Find and remove the reservation
            const initialLength = cart.reservedItems.length;
            cart.reservedItems = cart.reservedItems.filter((item) => {
                const productMatch = item.productId.toString() === productId;
                const variantMatch = variant
                    ? item.variant?.type === variant.type && item.variant?.value === variant.value
                    : !item.variant || (!item.variant.type && !item.variant.value);
                return !(productMatch && variantMatch);
            });
            if (cart.reservedItems.length === initialLength) {
                console.log('⚠️ [RESERVATION] No reservation found to release');
                return {
                    success: true,
                    message: 'No reservation found'
                };
            }
            await cart.save();
            console.log('✅ [RESERVATION] Stock reservation released');
            return {
                success: true,
                message: 'Stock reservation released'
            };
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error releasing stock:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to release stock'
            };
        }
    }
    /**
     * Release all stock reservations for a cart
     * Used when cart is cleared or order is completed
     *
     * @param cartId - The cart ID
     * @returns Reservation result
     */
    async releaseAllStock(cartId) {
        try {
            console.log('🔓 [RESERVATION] Releasing all stock for cart:', cartId);
            const cart = await Cart_1.Cart.findById(cartId);
            if (!cart) {
                return {
                    success: false,
                    message: 'Cart not found'
                };
            }
            const releasedCount = cart.reservedItems.length;
            cart.reservedItems = [];
            await cart.save();
            console.log(`✅ [RESERVATION] Released ${releasedCount} reservations`);
            return {
                success: true,
                message: `Released ${releasedCount} reservations`
            };
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error releasing all stock:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to release stock'
            };
        }
    }
    /**
     * Extend reservation timeout when user enters checkout
     * This gives the user more time to complete their purchase
     *
     * @param cartId - The cart ID
     * @param productId - The product ID (optional - if not provided, extends all)
     * @param additionalMinutes - Additional minutes to extend (default: 15)
     * @returns Extension result
     */
    async extendReservation(cartId, productId, additionalMinutes = reservation_1.RESERVATION_TIMEOUT_MINUTES) {
        try {
            console.log('⏰ [RESERVATION] Extending reservation:', {
                cartId,
                productId,
                additionalMinutes
            });
            const cart = await Cart_1.Cart.findById(cartId);
            if (!cart) {
                return {
                    success: false,
                    message: 'Cart not found'
                };
            }
            const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
            if (productId) {
                // Extend specific product reservation
                const reservation = cart.reservedItems.find((item) => item.productId.toString() === productId);
                if (!reservation) {
                    return {
                        success: false,
                        message: 'Reservation not found'
                    };
                }
                reservation.expiresAt = newExpiresAt;
            }
            else {
                // Extend all reservations
                cart.reservedItems.forEach((item) => {
                    item.expiresAt = newExpiresAt;
                });
            }
            await cart.save();
            console.log('✅ [RESERVATION] Reservation extended');
            return {
                success: true,
                message: 'Reservation extended successfully',
                newExpiresAt
            };
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error extending reservation:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to extend reservation'
            };
        }
    }
    /**
     * Clean up expired reservations across all carts
     * This is run periodically by a background job
     *
     * @returns Cleanup result with count of released items
     */
    async releaseExpiredReservations() {
        const result = {
            releasedCount: 0,
            releasedItems: [],
            errors: []
        };
        try {
            console.log('🧹 [RESERVATION] Starting expired reservation cleanup...');
            const now = new Date();
            // Find all carts with expired reservations
            const carts = await Cart_1.Cart.find({
                'reservedItems.expiresAt': { $lt: now }
            });
            console.log(`🧹 [RESERVATION] Found ${carts.length} carts with expired reservations`);
            for (const cart of carts) {
                try {
                    // Filter out expired reservations
                    const expiredItems = cart.reservedItems.filter((item) => item.expiresAt < now);
                    // Track released items
                    expiredItems.forEach((item) => {
                        result.releasedItems.push({
                            cartId: cart._id.toString(),
                            productId: item.productId.toString(),
                            quantity: item.quantity,
                            variant: item.variant
                        });
                    });
                    // Remove expired reservations
                    cart.reservedItems = cart.reservedItems.filter((item) => item.expiresAt >= now);
                    await cart.save();
                    result.releasedCount += expiredItems.length;
                    console.log(`🧹 [RESERVATION] Released ${expiredItems.length} expired reservations from cart ${cart._id}`);
                }
                catch (error) {
                    console.error(`❌ [RESERVATION] Error cleaning cart ${cart._id}:`, error);
                    result.errors.push({
                        cartId: cart._id.toString(),
                        productId: 'N/A',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            console.log(`✅ [RESERVATION] Cleanup complete. Released ${result.releasedCount} reservations`);
            return result;
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error during cleanup:', error);
            result.errors.push({
                cartId: 'N/A',
                productId: 'N/A',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return result;
        }
    }
    /**
     * Get total reserved quantity for a product across all carts
     * Used to calculate actual available stock
     *
     * @param productId - The product ID
     * @param variant - Optional variant specification
     * @returns Total reserved quantity
     */
    async getTotalReservedQuantity(productId, variant) {
        try {
            const now = new Date();
            // Build aggregation pipeline
            const pipeline = [
                // Match carts with reservations for this product
                {
                    $match: {
                        'reservedItems.productId': new mongoose_1.Types.ObjectId(productId),
                        'reservedItems.expiresAt': { $gt: now } // Only non-expired reservations
                    }
                },
                // Unwind reservedItems array
                { $unwind: '$reservedItems' },
                // Match specific product and variant
                {
                    $match: {
                        'reservedItems.productId': new mongoose_1.Types.ObjectId(productId),
                        'reservedItems.expiresAt': { $gt: now }
                    }
                }
            ];
            // Add variant matching if provided
            if (variant) {
                pipeline.push({
                    $match: {
                        'reservedItems.variant.type': variant.type,
                        'reservedItems.variant.value': variant.value
                    }
                });
            }
            else {
                // Match items without variants or with empty variants
                pipeline.push({
                    $match: {
                        $or: [
                            { 'reservedItems.variant': { $exists: false } },
                            { 'reservedItems.variant.type': { $exists: false } },
                            { 'reservedItems.variant.type': null },
                            { 'reservedItems.variant.type': '' }
                        ]
                    }
                });
            }
            // Sum quantities
            pipeline.push({
                $group: {
                    _id: null,
                    totalReserved: { $sum: '$reservedItems.quantity' }
                }
            });
            const result = await Cart_1.Cart.aggregate(pipeline);
            const totalReserved = result.length > 0 ? result[0].totalReserved : 0;
            console.log('🔒 [RESERVATION] Total reserved for product:', {
                productId,
                variant,
                totalReserved
            });
            return totalReserved;
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error calculating total reserved:', error);
            return 0; // Return 0 on error to be safe
        }
    }
    /**
     * Get reservation status for a specific cart
     * Useful for debugging and monitoring
     *
     * @param cartId - The cart ID
     * @returns Array of reservation details
     */
    async getReservationStatus(cartId) {
        try {
            const cart = await Cart_1.Cart.findById(cartId).populate('reservedItems.productId', 'name sku');
            if (!cart) {
                return [];
            }
            return cart.reservedItems;
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error getting reservation status:', error);
            return [];
        }
    }
    /**
     * Validate that all cart items have valid reservations
     * Used before checkout to ensure stock is still available
     *
     * @param cartId - The cart ID
     * @returns Validation result
     */
    async validateReservations(cartId) {
        try {
            const cart = await Cart_1.Cart.findById(cartId);
            if (!cart) {
                return {
                    valid: false,
                    message: 'Cart not found'
                };
            }
            const issues = [];
            const now = new Date();
            // Check each cart item has a valid reservation (only for products, not events)
            for (const item of cart.items) {
                // Skip event items - they don't need stock reservations
                if (!item.product || item.event) {
                    continue;
                }
                const productId = item.product.toString();
                const variant = item.variant;
                const reservation = cart.reservedItems.find((res) => {
                    const productMatch = res.productId.toString() === productId;
                    const variantMatch = variant
                        ? res.variant?.type === variant.type && res.variant?.value === variant.value
                        : !res.variant || (!res.variant.type && !res.variant.value);
                    return productMatch && variantMatch;
                });
                if (!reservation) {
                    issues.push(`No reservation found for product ${productId}`);
                }
                else if (reservation.expiresAt < now) {
                    issues.push(`Reservation expired for product ${productId}`);
                }
                else if (reservation.quantity < item.quantity) {
                    issues.push(`Reserved quantity (${reservation.quantity}) less than cart quantity (${item.quantity}) for product ${productId}`);
                }
            }
            if (issues.length > 0) {
                return {
                    valid: false,
                    message: 'Reservation validation failed',
                    issues
                };
            }
            return {
                valid: true,
                message: 'All reservations valid'
            };
        }
        catch (error) {
            console.error('❌ [RESERVATION] Error validating reservations:', error);
            return {
                valid: false,
                message: error instanceof Error ? error.message : 'Validation error'
            };
        }
    }
}
// Export singleton instance
exports.default = new ReservationService();
