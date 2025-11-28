import mongoose, { Document, Types } from 'mongoose';
export interface ITableBooking extends Document {
    bookingNumber: string;
    storeId: Types.ObjectId;
    userId: Types.ObjectId;
    bookingDate: Date;
    bookingTime: string;
    partySize: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    specialRequests?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
    updateStatus(newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled'): Promise<void>;
}
interface ITableBookingModel extends mongoose.Model<ITableBooking> {
    findByBookingNumber(bookingNumber: string): Promise<ITableBooking | null>;
    findStoreBookings(storeId: Types.ObjectId | string, date?: Date): Promise<ITableBooking[]>;
    findUserBookings(userId: Types.ObjectId | string): Promise<ITableBooking[]>;
}
export declare const TableBooking: ITableBookingModel;
export {};
