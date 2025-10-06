import { Types } from 'mongoose';
/**
 * Stock Reservation Types
 *
 * These types define the structure for temporary stock reservations
 * that prevent overselling during the checkout process.
 */
export interface IReservedItem {
    productId: Types.ObjectId;
    quantity: number;
    variant?: {
        type: string;
        value: string;
    };
    reservedAt: Date;
    expiresAt: Date;
}
export interface IReservationResult {
    success: boolean;
    message: string;
    availableStock?: number;
    reservedQuantity?: number;
    expiresAt?: Date;
}
export interface IReservationExtension {
    success: boolean;
    message: string;
    newExpiresAt?: Date;
}
export interface ICleanupResult {
    releasedCount: number;
    releasedItems: Array<{
        cartId: string;
        productId: string;
        quantity: number;
        variant?: {
            type: string;
            value: string;
        };
    }>;
    errors: Array<{
        cartId: string;
        productId: string;
        error: string;
    }>;
}
export declare const RESERVATION_TIMEOUT_MINUTES = 15;
export declare const CLEANUP_INTERVAL_MINUTES = 5;
