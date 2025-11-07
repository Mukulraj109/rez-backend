import mongoose, { Document, Types } from 'mongoose';
export interface IUserCouponNotifications {
    expiryReminder: boolean;
    expiryReminderSent: Date | null;
}
export interface IUserCoupon extends Document {
    user: Types.ObjectId;
    coupon: Types.ObjectId;
    claimedDate: Date;
    expiryDate: Date;
    usedDate: Date | null;
    usedInOrder: Types.ObjectId | null;
    status: 'available' | 'used' | 'expired';
    notifications: IUserCouponNotifications;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserCoupon: mongoose.Model<IUserCoupon, {}, {}, {}, mongoose.Document<unknown, {}, IUserCoupon, {}, {}> & IUserCoupon & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
