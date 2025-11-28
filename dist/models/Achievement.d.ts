import mongoose, { Document, Types } from 'mongoose';
export declare enum AchievementType {
    FIRST_ORDER = "FIRST_ORDER",
    ORDERS_10 = "ORDERS_10",
    ORDERS_50 = "ORDERS_50",
    ORDERS_100 = "ORDERS_100",
    FREQUENT_BUYER = "FREQUENT_BUYER",
    SPENT_1000 = "SPENT_1000",
    SPENT_5000 = "SPENT_5000",
    SPENT_10000 = "SPENT_10000",
    BIG_SPENDER = "BIG_SPENDER",
    FIRST_REVIEW = "FIRST_REVIEW",
    REVIEWS_10 = "REVIEWS_10",
    REVIEWS_25 = "REVIEWS_25",
    REVIEW_MASTER = "REVIEW_MASTER",
    FIRST_VIDEO = "FIRST_VIDEO",
    VIDEOS_10 = "VIDEOS_10",
    VIEWS_1000 = "VIEWS_1000",
    VIEWS_10000 = "VIEWS_10000",
    INFLUENCER = "INFLUENCER",
    FIRST_PROJECT = "FIRST_PROJECT",
    PROJECTS_10 = "PROJECTS_10",
    PROJECT_APPROVED = "PROJECT_APPROVED",
    TOP_EARNER = "TOP_EARNER",
    VOUCHER_REDEEMED = "VOUCHER_REDEEMED",
    OFFERS_10 = "OFFERS_10",
    CASHBACK_EARNED = "CASHBACK_EARNED",
    FIRST_REFERRAL = "FIRST_REFERRAL",
    REFERRALS_5 = "REFERRALS_5",
    REFERRALS_10 = "REFERRALS_10",
    REFERRAL_MASTER = "REFERRAL_MASTER",
    EARLY_BIRD = "EARLY_BIRD",
    ONE_YEAR = "ONE_YEAR",
    ACTIVITY_100 = "ACTIVITY_100",
    ACTIVITY_500 = "ACTIVITY_500",
    SUPER_USER = "SUPER_USER"
}
export declare enum AchievementCategory {
    ORDERS = "ORDERS",
    SPENDING = "SPENDING",
    REVIEWS = "REVIEWS",
    VIDEOS = "VIDEOS",
    PROJECTS = "PROJECTS",
    VOUCHERS = "VOUCHERS",
    REFERRALS = "REFERRALS",
    LOYALTY = "LOYALTY",
    ACTIVITY = "ACTIVITY"
}
export interface IAchievementDefinition {
    type: AchievementType;
    category: AchievementCategory;
    title: string;
    description: string;
    icon: string;
    color: string;
    requirement: {
        metric: string;
        target: number;
    };
    reward?: {
        coins?: number;
        cashback?: number;
        badge?: string;
    };
    order: number;
    isActive: boolean;
}
export interface IUserAchievement extends Document {
    user: Types.ObjectId;
    type: AchievementType;
    title: string;
    description: string;
    icon: string;
    color: string;
    unlocked: boolean;
    progress: number;
    unlockedDate?: Date;
    currentValue?: number;
    targetValue?: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[];
export declare const UserAchievement: mongoose.Model<IUserAchievement, {}, {}, {}, mongoose.Document<unknown, {}, IUserAchievement, {}, {}> & IUserAchievement & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
