import { Document, Types } from 'mongoose';
export interface IProjectRequirements {
    minWords?: number;
    minDuration?: number;
    maxDuration?: number;
    minPhotos?: number;
    location?: {
        required: boolean;
        specific?: string;
        radius?: number;
        coordinates?: [number, number];
    };
    products?: Types.ObjectId[];
    stores?: Types.ObjectId[];
    categories?: Types.ObjectId[];
    demographics?: {
        minAge?: number;
        maxAge?: number;
        gender?: 'male' | 'female' | 'any';
        languages?: string[];
    };
    skills?: string[];
    deviceRequirements?: {
        camera: boolean;
        microphone: boolean;
        location: boolean;
    };
}
export interface IProjectReward {
    amount: number;
    currency: string;
    type: 'fixed' | 'variable' | 'milestone';
    bonusMultiplier?: number;
    milestones?: {
        target: number;
        bonus: number;
    }[];
    paymentMethod: 'wallet' | 'bank' | 'upi';
    paymentSchedule: 'immediate' | 'daily' | 'weekly' | 'monthly';
}
export interface IProjectLimits {
    maxCompletions?: number;
    totalBudget?: number;
    dailyBudget?: number;
    maxCompletionsPerDay?: number;
    maxCompletionsPerUser?: number;
    expiryDate?: Date;
    startDate?: Date;
}
export interface IProjectSubmission {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    submittedAt: Date;
    content: {
        type: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
        data: string | string[];
        metadata?: {
            location?: [number, number];
            duration?: number;
            wordCount?: number;
            rating?: number;
            additional?: any;
        };
    };
    status: 'pending' | 'approved' | 'rejected' | 'under_review';
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    reviewComments?: string;
    qualityScore?: number;
    paidAmount?: number;
    paidAt?: Date;
    rejectionReason?: string;
}
export interface IProjectAnalytics {
    totalViews: number;
    totalApplications: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    avgCompletionTime: number;
    avgQualityScore: number;
    totalPayout: number;
    conversionRate: number;
    approvalRate: number;
    likes: number;
    comments: number;
    engagement: number;
    participantDemographics: {
        ageGroups: {
            [range: string]: number;
        };
        genderSplit: {
            [gender: string]: number;
        };
        locationSplit: {
            [city: string]: number;
        };
    };
    dailyStats: {
        date: Date;
        views: number;
        applications: number;
        submissions: number;
    }[];
}
export interface IProject extends Document {
    title: string;
    description: string;
    shortDescription?: string;
    category: 'review' | 'social_share' | 'ugc_content' | 'store_visit' | 'survey' | 'photo' | 'video' | 'data_collection' | 'mystery_shopping' | 'referral';
    subcategory?: string;
    type: 'video' | 'photo' | 'text' | 'visit' | 'checkin' | 'survey' | 'rating' | 'social' | 'referral';
    brand?: string;
    sponsor?: Types.ObjectId;
    requirements: IProjectRequirements;
    reward: IProjectReward;
    limits: IProjectLimits;
    instructions: string[];
    examples?: string[];
    tags: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number;
    status: 'draft' | 'active' | 'paused' | 'completed' | 'expired' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    submissions: IProjectSubmission[];
    analytics: IProjectAnalytics;
    isFeatured: boolean;
    isSponsored: boolean;
    approvalRequired: boolean;
    qualityControl: {
        enabled: boolean;
        minScore?: number;
        manualReview: boolean;
        autoApprove?: boolean;
    };
    targetAudience: {
        size?: number;
        demographics?: string;
        interests?: string[];
    };
    likedBy: Types.ObjectId[];
    comments: Array<{
        user: Types.ObjectId;
        content: string;
        timestamp: Date;
        replies?: Array<{
            user: Types.ObjectId;
            content: string;
            timestamp: Date;
        }>;
    }>;
    createdBy: Types.ObjectId;
    managedBy?: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    canUserParticipate(userId: string): Promise<boolean>;
    getUserSubmission(userId: string): IProjectSubmission | null;
    submitWork(userId: string, content: any): Promise<IProjectSubmission>;
    reviewSubmission(submissionId: string, status: string, comments?: string): Promise<void>;
    calculatePayout(submission: IProjectSubmission): number;
    updateAnalytics(): Promise<void>;
    isActive(): boolean;
    getRemainingBudget(): number;
}
export declare const Project: any;
