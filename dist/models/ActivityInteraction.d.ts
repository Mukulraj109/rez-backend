import mongoose, { Document } from 'mongoose';
export interface IActivityInteraction extends Document {
    activity: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: 'like' | 'comment' | 'share';
    comment?: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IActivityInteraction, {}, {}, {}, mongoose.Document<unknown, {}, IActivityInteraction, {}, {}> & IActivityInteraction & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
