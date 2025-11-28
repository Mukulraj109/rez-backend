import mongoose, { Document, Types } from 'mongoose';
export interface IArticleEngagement {
    likes: Types.ObjectId[];
    bookmarks: Types.ObjectId[];
    shares: number;
    comments: number;
}
export interface IArticleAnalytics {
    totalViews: number;
    uniqueViews: number;
    avgReadTime: number;
    completionRate: number;
    engagementRate: number;
    shareRate: number;
    likeRate: number;
    viewsByDate: {
        [date: string]: number;
    };
    topLocations?: string[];
    deviceBreakdown?: {
        mobile: number;
        tablet: number;
        desktop: number;
    };
}
export interface IArticle extends Document {
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    author: Types.ObjectId;
    authorType: 'user' | 'merchant';
    category: 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'general';
    tags: string[];
    products: Types.ObjectId[];
    stores: Types.ObjectId[];
    engagement: IArticleEngagement;
    analytics: IArticleAnalytics;
    readTime: string;
    isPublished: boolean;
    isFeatured: boolean;
    isApproved: boolean;
    moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderationReasons?: string[];
    publishedAt?: Date;
    scheduledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    readonly likeCount?: number;
    readonly bookmarkCount?: number;
    readonly engagementScore?: number;
    readonly viewCount?: string;
    incrementViews(userId?: string): Promise<void>;
    toggleLike(userId: string): Promise<boolean>;
    toggleBookmark(userId: string): Promise<boolean>;
    share(): Promise<void>;
    updateAnalytics(): Promise<void>;
    isViewableBy(userId?: string): boolean;
}
export declare const Article: mongoose.Model<IArticle, {}, {}, {}, mongoose.Document<unknown, {}, IArticle, {}, {}> & IArticle & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
