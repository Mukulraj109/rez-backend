import { Document, Types, Model } from 'mongoose';
export interface IUserOfferInteraction extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    offer: Types.ObjectId;
    action: 'like' | 'share' | 'view' | 'claim' | 'click' | 'favorite';
    timestamp: Date;
    metadata?: {
        source?: string;
        device?: string;
        location?: {
            type: 'Point';
            coordinates: [number, number];
        };
        userAgent?: string;
        ipAddress?: string;
        referrer?: string;
        sessionId?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface IUserOfferInteractionModel extends Model<IUserOfferInteraction> {
    trackInteraction(userId: Types.ObjectId, offerId: Types.ObjectId, action: string, metadata?: any): Promise<IUserOfferInteraction>;
    getUserInteractions(userId: Types.ObjectId, action?: string): Promise<IUserOfferInteraction[]>;
    getOfferInteractions(offerId: Types.ObjectId, action?: string): Promise<IUserOfferInteraction[]>;
    getInteractionStats(offerId: Types.ObjectId): Promise<any>;
    getUserEngagementStats(userId: Types.ObjectId): Promise<any>;
}
declare const UserOfferInteraction: IUserOfferInteractionModel;
export default UserOfferInteraction;
