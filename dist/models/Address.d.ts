import mongoose, { Document, Types } from 'mongoose';
export declare enum AddressType {
    HOME = "HOME",
    OFFICE = "OFFICE",
    OTHER = "OTHER"
}
export interface IAddress extends Document {
    user: Types.ObjectId;
    type: AddressType;
    title: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    isDefault: boolean;
    instructions?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Address: mongoose.Model<IAddress, {}, {}, {}, mongoose.Document<unknown, {}, IAddress, {}, {}> & IAddress & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
