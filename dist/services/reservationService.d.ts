import { IReservedItem } from '../models/Cart';
import { IReservationResult, IReservationExtension, ICleanupResult } from '../types/reservation';
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
declare class ReservationService {
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
    reserveStock(cartId: string, productId: string, quantity: number, variant?: {
        type: string;
        value: string;
    }): Promise<IReservationResult>;
    /**
     * Release stock reservation for a specific product in a cart
     *
     * @param cartId - The cart ID
     * @param productId - The product ID
     * @param variant - Optional variant specification
     * @returns Reservation result
     */
    releaseStock(cartId: string, productId: string, variant?: {
        type: string;
        value: string;
    }): Promise<IReservationResult>;
    /**
     * Release all stock reservations for a cart
     * Used when cart is cleared or order is completed
     *
     * @param cartId - The cart ID
     * @returns Reservation result
     */
    releaseAllStock(cartId: string): Promise<IReservationResult>;
    /**
     * Extend reservation timeout when user enters checkout
     * This gives the user more time to complete their purchase
     *
     * @param cartId - The cart ID
     * @param productId - The product ID (optional - if not provided, extends all)
     * @param additionalMinutes - Additional minutes to extend (default: 15)
     * @returns Extension result
     */
    extendReservation(cartId: string, productId?: string, additionalMinutes?: number): Promise<IReservationExtension>;
    /**
     * Clean up expired reservations across all carts
     * This is run periodically by a background job
     *
     * @returns Cleanup result with count of released items
     */
    releaseExpiredReservations(): Promise<ICleanupResult>;
    /**
     * Get total reserved quantity for a product across all carts
     * Used to calculate actual available stock
     *
     * @param productId - The product ID
     * @param variant - Optional variant specification
     * @returns Total reserved quantity
     */
    private getTotalReservedQuantity;
    /**
     * Get reservation status for a specific cart
     * Useful for debugging and monitoring
     *
     * @param cartId - The cart ID
     * @returns Array of reservation details
     */
    getReservationStatus(cartId: string): Promise<IReservedItem[]>;
    /**
     * Validate that all cart items have valid reservations
     * Used before checkout to ensure stock is still available
     *
     * @param cartId - The cart ID
     * @returns Validation result
     */
    validateReservations(cartId: string): Promise<{
        valid: boolean;
        message: string;
        issues?: string[];
    }>;
}
declare const _default: ReservationService;
export default _default;
