import mongoose, { Document, Model } from 'mongoose';
interface IOfferRedemptionMethods {
    isValid(): boolean;
    markAsUsed(orderId?: string, amount?: number, storeId?: string): Promise<any>;
    cancel(reason?: string): Promise<any>;
    verify(verifiedByUserId: string): Promise<any>;
}
interface IOfferRedemptionModel extends Model<IOfferRedemption, {}, IOfferRedemptionMethods> {
    updateExpired(): Promise<any>;
    getUserRedemptions(userId: string, status?: string, limit?: number): any;
    countUserOfferRedemptions(userId: string, offerId: string): Promise<number>;
    canUserRedeem(userId: string, offerId: string, userLimit: number): Promise<boolean>;
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
declare const OfferRedemption: IOfferRedemptionModel;
export default OfferRedemption;
