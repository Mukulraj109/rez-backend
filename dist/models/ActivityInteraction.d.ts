import mongoose, { Document } from 'mongoose';
export interface IActivityInteraction extends Document {
    activity: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: 'like' | 'comment' | 'share';
    comment?: string;
    createdAt: Date;
}
declare const _default: any;
export default _default;
