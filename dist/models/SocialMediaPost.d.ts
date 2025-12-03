import mongoose, { Document, Types } from 'mongoose';
export interface ISocialMediaPost extends Document {
    user: Types.ObjectId;
    order?: Types.ObjectId;
    store?: Types.ObjectId;
    merchant?: Types.ObjectId;
    platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
    postUrl: string;
    status: 'pending' | 'approved' | 'rejected' | 'credited';
    cashbackAmount: number;
    cashbackPercentage: number;
    submittedAt: Date;
    reviewedAt?: Date;
    creditedAt?: Date;
    reviewedBy?: Types.ObjectId;
    rejectionReason?: string;
    approvalNotes?: string;
    submissionIp?: string;
    deviceFingerprint?: string;
    userAgent?: string;
    metadata: {
        postId?: string;
        thumbnailUrl?: string;
        orderNumber?: string;
        extractedData?: any;
    };
    createdAt: Date;
    updatedAt: Date;
    approve(reviewerId: Types.ObjectId): Promise<ISocialMediaPost>;
    reject(reviewerId: Types.ObjectId, reason: string): Promise<ISocialMediaPost>;
    creditCashback(): Promise<ISocialMediaPost>;
}
export interface ISocialMediaPostModel extends mongoose.Model<ISocialMediaPost> {
    getUserEarnings(userId: Types.ObjectId): Promise<{
        totalEarned: number;
        pendingAmount: number;
        creditedAmount: number;
        approvedAmount: number;
        rejectedAmount: number;
        postsSubmitted: number;
        postsApproved: number;
        postsRejected: number;
        postsCredited: number;
        approvalRate: number;
    }>;
}
declare const SocialMediaPost: ISocialMediaPostModel;
export default SocialMediaPost;
