import { Document, Types } from 'mongoose';
import { Model } from 'mongoose';
export interface IServiceBookingDetails {
    bookingDate: Date;
    timeSlot: {
        start: string;
        end: string;
    };
    duration: number;
    serviceType: 'home' | 'store' | 'online';
    customerNotes?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
}
export interface ICartItem {
    product?: Types.ObjectId;
    event?: Types.ObjectId;
    store: Types.ObjectId | null;
    itemType: 'product' | 'service' | 'event';
    quantity: number;
    variant?: {
        type: string;
        value: string;
    };
    price: number;
    originalPrice?: number;
    discount?: number;
    lockedQuantity?: number;
    addedAt: Date;
    notes?: string;
    metadata?: any;
    serviceBookingDetails?: IServiceBookingDetails;
}
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
export interface ILockedItem {
    product: Types.ObjectId;
    store: Types.ObjectId;
    quantity: number;
    variant?: {
        type: string;
        value: string;
    };
    lockedPrice: number;
    originalPrice?: number;
    lockedAt: Date;
    expiresAt: Date;
    notes?: string;
    lockFee?: number;
    lockFeePercentage?: number;
    lockDuration?: number;
    paymentMethod?: 'wallet' | 'paybill' | 'upi';
    paymentTransactionId?: Types.ObjectId;
    lockPaymentStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited' | 'applied';
    isPaidLock?: boolean;
}
export interface ICartModel extends Model<ICart> {
    getActiveCart(userId: string): Promise<ICart | null>;
    cleanupExpired(): Promise<{
        acknowledged: boolean;
        deletedCount: number;
    }>;
}
export interface ICartTotals {
    subtotal: number;
    tax: number;
    delivery: number;
    discount: number;
    cashback: number;
    total: number;
    savings: number;
}
export interface ICartCoupon {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    appliedAmount: number;
    appliedAt: Date;
}
export interface ICart extends Document {
    user: Types.ObjectId;
    items: ICartItem[];
    reservedItems: IReservedItem[];
    lockedItems: ILockedItem[];
    totals: ICartTotals;
    coupon?: ICartCoupon;
    deliveryAddress?: Types.ObjectId;
    specialInstructions?: string;
    estimatedDeliveryTime?: Date;
    isActive: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    addItem(productId: string, quantity: number, variant?: any): Promise<void>;
    removeItem(productId: string, variant?: any): Promise<void>;
    updateItemQuantity(productId: string, quantity: number, variant?: any): Promise<void>;
    calculateTotals(): Promise<void>;
    applyCoupon(couponCode: string): Promise<boolean>;
    removeCoupon(): Promise<void>;
    clearCart(): Promise<void>;
    isExpired(): boolean;
    lockItem(productId: string, quantity: number, variant?: any, lockDuration?: number): Promise<void>;
    unlockItem(productId: string, variant?: any): Promise<void>;
    moveLockedToCart(productId: string, variant?: any): Promise<void>;
    itemCount: number;
    storeCount: number;
}
export declare const Cart: ICartModel;
