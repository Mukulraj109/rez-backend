import mongoose, { Document, Model } from 'mongoose';
export interface IReview extends Document {
    _id: string;
    store: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
    helpful: number;
    verified: boolean;
    isActive: boolean;
    moderationStatus: 'pending' | 'approved' | 'rejected';
    moderatedBy?: mongoose.Types.ObjectId;
    moderatedAt?: Date;
    moderationReason?: string;
    merchantResponse?: {
        message: string;
        respondedAt: Date;
        respondedBy?: mongoose.Types.ObjectId;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface IReviewModel extends Model<IReview> {
    getStoreRatingStats(storeId: string): Promise<{
        average: number;
        count: number;
        distribution: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
    }>;
    hasUserReviewed(storeId: string, userId: string): Promise<boolean>;
}
export interface IReviewMedia {
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
    alt?: string;
}
export interface IReviewHelpfulness {
    userId: mongoose.Types.ObjectId;
    helpful: boolean;
    createdAt: Date;
}
export interface IReviewModeration {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderatedBy?: mongoose.Types.ObjectId;
    moderatedAt?: Date;
    reason?: string;
    flags: string[];
}
export interface IReviewVerification {
    isVerified: boolean;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    verificationMethod: 'automatic' | 'manual' | 'purchase_verified';
}
export declare const Review: IReviewModel;
export default Review;
