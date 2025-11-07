import mongoose, { Document, Types } from 'mongoose';
export interface IFAQ extends Document {
    category: string;
    subcategory?: string;
    question: string;
    answer: string;
    shortAnswer?: string;
    isActive: boolean;
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    tags: string[];
    relatedQuestions: Types.ObjectId[];
    order: number;
    imageUrl?: string;
    videoUrl?: string;
    relatedArticles: string[];
    createdBy: Types.ObjectId;
    lastUpdatedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FAQ: mongoose.Model<IFAQ, {}, {}, {}, mongoose.Document<unknown, {}, IFAQ, {}, {}> & IFAQ & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
