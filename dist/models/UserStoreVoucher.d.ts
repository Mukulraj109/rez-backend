import { Document, Types } from 'mongoose';
export interface IUserStoreVoucher extends Document {
    user: Types.ObjectId;
    voucher: Types.ObjectId;
    assignedAt: Date;
    usedAt?: Date;
    order?: Types.ObjectId;
    status: 'assigned' | 'used' | 'expired';
}
declare const UserStoreVoucher: any;
export default UserStoreVoucher;
