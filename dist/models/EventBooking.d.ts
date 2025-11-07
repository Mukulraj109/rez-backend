import mongoose, { Document, Types } from 'mongoose';
export interface IEventBooking extends Document {
    _id: Types.ObjectId;
    eventId: Types.ObjectId;
    userId: Types.ObjectId;
    slotId?: string;
    bookingDate: Date;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
    paymentId?: Types.ObjectId;
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    attendeeInfo: {
        name: string;
        email: string;
        phone?: string;
        age?: number;
        specialRequirements?: string;
    };
    bookingReference: string;
    qrCode?: string;
    checkInTime?: Date;
    checkOutTime?: Date;
    notes?: string;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const EventBooking: mongoose.Model<IEventBooking, {}, {}, {}, mongoose.Document<unknown, {}, IEventBooking, {}, {}> & IEventBooking & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default EventBooking;
