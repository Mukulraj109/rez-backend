import mongoose, { Document } from 'mongoose';
export interface IFollow extends Document {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: any;
export default _default;
