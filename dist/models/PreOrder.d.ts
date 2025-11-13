import mongoose, { Document, Model } from 'mongoose';
export interface IPreOrderItem {
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
}
export interface IPreOrder extends Document {
    orderNumber: string;
    storeId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    items: IPreOrderItem[];
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    scheduledTime?: Date;
    deliveryType: 'pickup' | 'delivery';
    deliveryAddress?: {
        address: string;
        city: string;
        postalCode: string;
        coordinates?: [number, number];
    };
    contactPhone: string;
    notes?: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod?: string;
    createdAt: Date;
    updatedAt: Date;
    calculateTotals(): void;
    updateStatus(newStatus: IPreOrder['status']): Promise<this>;
}
export interface IPreOrderModel extends Model<IPreOrder> {
    findByOrderNumber(orderNumber: string): Promise<IPreOrder | null>;
    findUserOrders(userId: string, limit?: number): Promise<IPreOrder[]>;
    findStoreOrders(storeId: string, status?: string): Promise<IPreOrder[]>;
}
declare const PreOrder: IPreOrderModel;
export default PreOrder;
