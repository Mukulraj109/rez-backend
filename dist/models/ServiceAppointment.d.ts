import mongoose, { Document, Types } from 'mongoose';
export interface IServiceAppointment extends Document {
    _id: Types.ObjectId;
    appointmentNumber: string;
    store: Types.ObjectId;
    user: Types.ObjectId;
    serviceType: string;
    appointmentDate: Date;
    appointmentTime: string;
    duration: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    specialInstructions?: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    staffMember?: string;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    formattedDateTime?: string;
    updateStatus(newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<IServiceAppointment>;
    cancel(reason?: string): Promise<IServiceAppointment>;
    confirm(): Promise<IServiceAppointment>;
}
export declare const ServiceAppointment: mongoose.Model<IServiceAppointment, {}, {}, {}, mongoose.Document<unknown, {}, IServiceAppointment, {}, {}> & IServiceAppointment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
