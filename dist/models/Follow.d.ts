import mongoose, { Document } from 'mongoose';
export interface IFollow extends Document {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: mongoose.Model<IFollow, {}, {}, {}, mongoose.Document<unknown, {}, IFollow, {}, {}> & IFollow & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
