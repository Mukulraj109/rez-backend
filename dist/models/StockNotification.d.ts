import { Document, Types } from 'mongoose';
export interface IStockNotification extends Document {
    userId: Types.ObjectId;
    productId: Types.ObjectId;
    email?: string;
    phoneNumber?: string;
    notificationMethod: 'email' | 'sms' | 'both' | 'push';
    status: 'pending' | 'sent' | 'cancelled';
    createdAt: Date;
    notifiedAt?: Date;
    product?: {
        name: string;
        image: string;
        price: number;
    };
}
export declare const StockNotification: any;
