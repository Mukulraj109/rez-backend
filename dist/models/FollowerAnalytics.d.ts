import mongoose, { Document } from 'mongoose';
export interface IFollowerAnalytics extends Document {
    store: mongoose.Types.ObjectId;
    date: Date;
    followersCount: number;
    newFollowers: number;
    unfollows: number;
    clicksFromFollowers: number;
    ordersFromFollowers: number;
    revenueFromFollowers: number;
    exclusiveOffersViewed: number;
    exclusiveOffersRedeemed: number;
    avgEngagementRate: number;
    topFollowerLocation?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FollowerAnalytics: mongoose.Model<IFollowerAnalytics, {}, {}, {}, mongoose.Document<unknown, {}, IFollowerAnalytics, {}, {}> & IFollowerAnalytics & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
