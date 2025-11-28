import mongoose, { Document, Types } from 'mongoose';
export interface IUserStoreVoucher extends Document {
    user: Types.ObjectId;
    voucher: Types.ObjectId;
    assignedAt: Date;
    usedAt?: Date;
    order?: Types.ObjectId;
    status: 'assigned' | 'used' | 'expired';
}
declare const UserStoreVoucher: mongoose.Model<IUserStoreVoucher, {}, {}, {}, mongoose.Document<unknown, {}, IUserStoreVoucher, {}, {}> & IUserStoreVoucher & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default UserStoreVoucher;
