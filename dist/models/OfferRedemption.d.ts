import mongoose, { Document } from 'mongoose';
interface IOfferRedemptionMethods {
    isValid(): boolean;
    markAsUsed(orderId?: string, amount?: number, storeId?: string): Promise<any>;
    cancel(reason?: string): Promise<any>;
    verify(verifiedByUserId: string): Promise<any>;
}
export interface IOfferRedemption extends Document, IOfferRedemptionMethods {
    user: mongoose.Types.ObjectId;
    offer: mongoose.Types.ObjectId;
    redemptionCode: string;
    redemptionType: 'online' | 'instore';
    redemptionDate: Date;
    expiryDate: Date;
    validityDays: number;
    status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
    usedDate?: Date;
    order?: mongoose.Types.ObjectId;
    usedAtStore?: mongoose.Types.ObjectId;
    usedAmount?: number;
    qrCode?: string;
    qrCodeUrl?: string;
    verificationCode?: string;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: {
        type: string;
        coordinates: [number, number];
    };
    cancelledAt?: Date;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const OfferRedemption: any;
export default OfferRedemption;
