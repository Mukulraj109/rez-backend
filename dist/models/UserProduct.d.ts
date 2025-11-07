import mongoose, { Document, Types } from 'mongoose';
export interface IWarranty {
    hasWarranty: boolean;
    startDate?: Date;
    endDate?: Date;
    duration?: number;
    warrantyCard?: string;
    terms?: string[];
}
export interface IRegistration {
    isRegistered: boolean;
    registrationDate?: Date;
    serialNumber?: string;
    registrationNumber?: string;
}
export interface IInstallation {
    required: boolean;
    scheduled: boolean;
    scheduledDate?: Date;
    completed: boolean;
    completedDate?: Date;
    technician?: string;
    notes?: string;
}
export interface IAMC {
    hasAMC: boolean;
    startDate?: Date;
    endDate?: Date;
    serviceCount: number;
    amount?: number;
    renewalDue: boolean;
}
export interface IUserProduct extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    product: Types.ObjectId;
    order: Types.ObjectId;
    purchaseDate: Date;
    quantity: number;
    totalPrice: number;
    warranty: IWarranty;
    registration: IRegistration;
    installation: IInstallation;
    amc: IAMC;
    status: 'active' | 'warranty_expired' | 'returned' | 'replaced';
    serviceRequests: Types.ObjectId[];
    documents: string[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    warrantyDaysRemaining?: number;
    warrantyStatus?: 'active' | 'expiring_soon' | 'expired' | 'no_warranty';
    isWarrantyExpiringSoon?: boolean;
    amcDaysRemaining?: number;
    isAMCExpiringSoon?: boolean;
}
export declare const UserProduct: mongoose.Model<IUserProduct, {}, {}, {}, mongoose.Document<unknown, {}, IUserProduct, {}, {}> & IUserProduct & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
