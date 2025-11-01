import { Document, Types } from 'mongoose';
export interface ITechnician {
    id?: Types.ObjectId;
    name: string;
    phone: string;
    rating?: number;
}
export interface ICost {
    estimatedCost: number;
    actualCost?: number;
    warrantyCovered: boolean;
    payment?: {
        method: string;
        status: 'pending' | 'completed' | 'failed' | 'refunded';
        transactionId?: string;
    };
}
export interface IServiceRequest extends Document {
    _id: Types.ObjectId;
    requestNumber: string;
    user: Types.ObjectId;
    userProduct: Types.ObjectId;
    product: Types.ObjectId;
    requestType: 'repair' | 'replacement' | 'installation' | 'maintenance' | 'inspection';
    status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduledDate?: Date;
    scheduledTimeSlot?: string;
    technician?: ITechnician;
    issueDescription: string;
    issueCategory?: string;
    images: string[];
    diagnosis?: string;
    resolution?: string;
    cost: ICost;
    address: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    rating?: number;
    feedback?: string;
    daysUntilScheduled?: number;
    isOverdue?: boolean;
}
export declare const ServiceRequest: any;
