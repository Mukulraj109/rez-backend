import { Document, Types } from 'mongoose';
import { Model } from 'mongoose';
export interface ICartItem {
    product: Types.ObjectId;
    store: Types.ObjectId;
    quantity: number;
    variant?: {
        type: string;
        value: string;
    };
    price: number;
    originalPrice?: number;
    discount?: number;
    addedAt: Date;
    notes?: string;
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
    itemCount: number;
    storeCount: number;
}
export declare const Cart: ICartModel;
