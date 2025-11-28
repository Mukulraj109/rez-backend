import mongoose, { Document, Types } from 'mongoose';
export declare enum VisitType {
    SCHEDULED = "scheduled",
    QUEUE = "queue"
}
export declare enum VisitStatus {
    PENDING = "pending",
    CHECKED_IN = "checked_in",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export interface IStoreVisit extends Document {
    visitNumber: string;
    storeId: Types.ObjectId;
    userId?: Types.ObjectId;
    visitType: VisitType;
    visitDate: Date;
    visitTime?: string;
    queueNumber?: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    status: VisitStatus;
    estimatedDuration: number;
    createdAt: Date;
    updatedAt: Date;
    updateStatus(newStatus: VisitStatus): Promise<IStoreVisit>;
    formattedDateTime: string;
}
interface IStoreVisitModel extends mongoose.Model<IStoreVisit> {
    findByVisitNumber(visitNumber: string): Promise<IStoreVisit | null>;
    findStoreVisits(storeId: string | Types.ObjectId, date?: Date): Promise<IStoreVisit[]>;
    findUserVisits(userId: string | Types.ObjectId): Promise<IStoreVisit[]>;
    getNextQueueNumber(storeId: string | Types.ObjectId): Promise<number>;
}
export declare const StoreVisit: IStoreVisitModel;
export {};
