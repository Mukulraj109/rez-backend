import mongoose, { Document, Types } from 'mongoose';
export interface IVideoEngagement {
    views: number;
    likes: Types.ObjectId[];
    shares: number;
    comments: number;
    saves: number;
    reports: number;
}
export interface IVideoMetadata {
    duration: number;
    resolution?: string;
    fileSize?: number;
    format?: string;
    aspectRatio?: string;
    fps?: number;
}
export interface IVideoProcessing {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    originalUrl?: string;
    processedUrl?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    errorMessage?: string;
    processedAt?: Date;
}
export interface IVideoAnalytics {
    totalViews: number;
    uniqueViews: number;
    avgWatchTime: number;
    completionRate: number;
    engagementRate: number;
    shareRate: number;
    likeRate: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    viewsByHour: {
        [hour: string]: number;
    };
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
export interface IVideo extends Document {
    title: string;
    description?: string;
    creator: Types.ObjectId;
    contentType: 'merchant' | 'ugc' | 'article_video';
    videoUrl: string;
    thumbnail: string;
    preview?: string;
    category: 'trending_me' | 'trending_her' | 'waist' | 'article' | 'featured' | 'challenge' | 'tutorial' | 'review';
    subcategory?: string;
    tags: string[];
    hashtags: string[];
    associatedArticle?: Types.ObjectId;
    products: Types.ObjectId[];
    stores: Types.ObjectId[];
    engagement: IVideoEngagement;
    metadata: IVideoMetadata;
    processing: IVideoProcessing;
    analytics: IVideoAnalytics;
    reports: Array<{
        userId: Types.ObjectId;
        reason: string;
        details?: string;
        reportedAt: Date;
    }>;
    reportCount: number;
    isReported: boolean;
    isPublished: boolean;
    isFeatured: boolean;
    isApproved: boolean;
    isTrending: boolean;
    isSponsored: boolean;
    sponsorInfo?: {
        brand: string;
        campaignId?: string;
        isDisclosed: boolean;
    };
    moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderationReasons?: string[];
    location?: {
        name?: string;
        coordinates?: [number, number];
        city?: string;
        country?: string;
    };
    music?: {
        title: string;
        artist: string;
        url?: string;
        startTime?: number;
        duration?: number;
    };
    effects?: string[];
    privacy: 'public' | 'private' | 'unlisted';
    allowComments: boolean;
    allowSharing: boolean;
    ageRestriction?: number;
    publishedAt?: Date;
    scheduledAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    likedBy: Types.ObjectId[];
    bookmarkedBy: Types.ObjectId[];
    comments: Array<{
        user: Types.ObjectId;
        content: string;
        timestamp: Date;
        likes?: Types.ObjectId[];
        replies?: Array<{
            user: Types.ObjectId;
            content: string;
            timestamp: Date;
        }>;
    }>;
    reportVideo(userId: string, reason: string, details?: string): Promise<void>;
    incrementViews(userId?: string): Promise<void>;
    toggleLike(userId: string): Promise<boolean>;
    toggleBookmark(userId: string): Promise<boolean>;
    addComment(userId: string, content: string): Promise<void>;
    share(): Promise<void>;
    updateAnalytics(): Promise<void>;
    isViewableBy(userId?: string): boolean;
}
export declare const Video: mongoose.Model<IVideo, {}, {}, {}, mongoose.Document<unknown, {}, IVideo, {}, {}> & IVideo & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
