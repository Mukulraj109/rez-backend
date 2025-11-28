import mongoose, { Document, Model } from 'mongoose';
interface IUserVoucherMethods {
    isValid(): boolean;
    markAsUsed(usageLocation?: string): Promise<any>;
}
interface IUserVoucherModel extends Model<IUserVoucher, {}, IUserVoucherMethods> {
    updateExpiredVouchers(): Promise<any>;
    getUserActiveVouchers(userId: string): any;
}
export interface IVoucherBrand extends Document {
    name: string;
    logo: string;
    backgroundColor?: string;
    logoColor?: string;
    description?: string;
    cashbackRate: number;
    rating?: number;
    ratingCount?: number;
    category: string;
    store?: mongoose.Types.ObjectId;
    isNewlyAdded: boolean;
    isFeatured: boolean;
    isActive: boolean;
    denominations: number[];
    termsAndConditions: string[];
    purchaseCount: number;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IUserVoucher extends Document, IUserVoucherMethods {
    user: mongoose.Types.ObjectId;
    brand: mongoose.Types.ObjectId;
    voucherCode: string;
    denomination: number;
    purchasePrice: number;
    purchaseDate: Date;
    expiryDate: Date;
    validityDays: number;
    status: 'active' | 'used' | 'expired' | 'cancelled';
    usedDate?: Date;
    usedAt?: string;
    deliveryMethod: 'email' | 'sms' | 'app' | 'physical';
    deliveryStatus: 'pending' | 'delivered' | 'failed';
    deliveredAt?: Date;
    paymentMethod: 'wallet' | 'card' | 'upi' | 'netbanking';
    transactionId?: string;
    qrCode?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const VoucherBrand: mongoose.Model<IVoucherBrand, {}, {}, {}, mongoose.Document<unknown, {}, IVoucherBrand, {}, {}> & IVoucherBrand & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
declare const UserVoucher: IUserVoucherModel;
export { VoucherBrand, UserVoucher };
export default VoucherBrand;
