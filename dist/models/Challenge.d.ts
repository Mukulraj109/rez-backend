import mongoose, { Document } from 'mongoose';
export interface IChallenge extends Document {
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    title: string;
    description: string;
    icon: string;
    requirements: {
        action: 'visit_stores' | 'upload_bills' | 'refer_friends' | 'spend_amount' | 'order_count' | 'review_count' | 'login_streak' | 'share_deals' | 'explore_categories' | 'add_favorites';
        target: number;
        stores?: mongoose.Types.ObjectId[];
        categories?: string[];
        minAmount?: number;
    };
    rewards: {
        coins: number;
        badges?: string[];
        exclusiveDeals?: mongoose.Types.ObjectId[];
        multiplier?: number;
    };
    difficulty: 'easy' | 'medium' | 'hard';
    startDate: Date;
    endDate: Date;
    participantCount: number;
    completionCount: number;
    active: boolean;
    featured: boolean;
    maxParticipants?: number;
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    canJoin(): boolean;
}
declare const _default: mongoose.Model<IChallenge, {}, {}, {}, mongoose.Document<unknown, {}, IChallenge, {}, {}> & IChallenge & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
