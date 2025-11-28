import mongoose from 'mongoose';
declare const seedOffers: () => Promise<void>;
declare const seedVoucherBrands: () => Promise<mongoose.MergeType<mongoose.Document<unknown, {}, import("../models/Voucher").IVoucherBrand, {}, {}> & import("../models/Voucher").IVoucherBrand & Required<{
    _id: unknown;
}> & {
    __v: number;
}, Omit<{
    name: string;
    logo: string;
    backgroundColor: string;
    logoColor: string;
    description: string;
    cashbackRate: number;
    rating: number;
    ratingCount: number;
    category: string;
    isNewlyAdded: boolean;
    isFeatured: boolean;
    isActive: boolean;
    denominations: number[];
    termsAndConditions: string[];
    purchaseCount: number;
    viewCount: number;
}, "_id">>[]>;
declare const seedAll: () => Promise<never>;
export { seedOffers, seedVoucherBrands, seedAll };
