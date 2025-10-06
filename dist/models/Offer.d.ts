import mongoose, { Document, Model } from 'mongoose';
interface IOfferMethods {
    isValid(): boolean;
    canUserRedeem(userRedemptionCount: number): boolean;
}
interface IOfferModel extends Model<IOffer, {}, IOfferMethods> {
    getActive(): any;
    getFeatured(limit: number): any;
    getTrending(limit: number): any;
}
export interface IOffer extends Document, IOfferMethods {
    title: string;
    description: string;
    image: string;
    images?: string[];
    originalPrice?: number;
    discountedPrice?: number;
    discountPercentage?: number;
    cashBackPercentage: number;
    discount?: string;
    category: mongoose.Types.ObjectId | string;
    tags: string[];
    store?: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    applicableStores: mongoose.Types.ObjectId[];
    applicableProducts: mongoose.Types.ObjectId[];
    location?: {
        type: string;
        coordinates: [number, number];
        address?: string;
        city?: string;
        state?: string;
    };
    distance?: string;
    startDate: Date;
    endDate: Date;
    validUntil?: string;
    isActive: boolean;
    redemptionType: 'online' | 'instore' | 'both' | 'voucher';
    redemptionCode?: string;
    maxRedemptions?: number;
    currentRedemptions: number;
    userRedemptionLimit: number;
    termsAndConditions: string[];
    minimumPurchase?: number;
    maximumDiscount?: number;
    isNew: boolean;
    isTrending: boolean;
    isBestSeller: boolean;
    isSpecial: boolean;
    isFeatured: boolean;
    storeInfo?: {
        name: string;
        rating: number;
        verified: boolean;
        logo?: string;
    };
    viewCount: number;
    clickCount: number;
    redemptionCount: number;
    favoriteCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Offer: IOfferModel;
export default Offer;
