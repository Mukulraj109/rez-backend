import mongoose, { Document } from 'mongoose';
export type MerchantUserRole = 'owner' | 'admin' | 'manager' | 'staff';
export type MerchantUserStatus = 'active' | 'inactive' | 'suspended';
export interface IMerchantUser extends Document {
    _id: mongoose.Types.ObjectId;
    merchantId: mongoose.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    role: MerchantUserRole;
    permissions: string[];
    status: MerchantUserStatus;
    invitedBy: mongoose.Types.ObjectId;
    invitedAt: Date;
    acceptedAt?: Date;
    lastLoginAt?: Date;
    invitationToken?: string;
    invitationExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordExpiry?: Date;
    failedLoginAttempts: number;
    accountLockedUntil?: Date;
    lastLoginIP?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const MerchantUser: mongoose.Model<IMerchantUser, {}, {}, {}, mongoose.Document<unknown, {}, IMerchantUser, {}, {}> & IMerchantUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
