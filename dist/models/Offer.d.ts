import { Document, Types, Model } from 'mongoose';
export interface IOffer extends Document {
    _id: Types.ObjectId;
    title: string;
    subtitle?: string;
    description?: string;
    image: string;
    category: 'mega' | 'student' | 'new_arrival' | 'trending' | 'food' | 'fashion' | 'electronics' | 'general';
    type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
    cashbackPercentage: number;
    originalPrice?: number;
    discountedPrice?: number;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    distance?: number;
    store: {
        id: Types.ObjectId;
        name: string;
        logo?: string;
        rating?: number;
        verified?: boolean;
    };
    validity: {
        startDate: Date;
        endDate: Date;
        isActive: boolean;
    };
    engagement: {
        likesCount: number;
        sharesCount: number;
        viewsCount: number;
        isLikedByUser?: boolean;
    };
    restrictions: {
        minOrderValue?: number;
        maxDiscountAmount?: number;
        applicableOn?: string[];
        excludedProducts?: Types.ObjectId[];
        ageRestriction?: {
            minAge?: number;
            maxAge?: number;
        };
        userTypeRestriction?: 'student' | 'new_user' | 'premium' | 'all';
        usageLimitPerUser?: number;
        usageLimit?: number;
    };
    metadata: {
        isNew?: boolean;
        isTrending?: boolean;
        isBestSeller?: boolean;
        isSpecial?: boolean;
        priority: number;
        tags: string[];
        featured?: boolean;
        flashSale?: {
            isActive: boolean;
            endTime?: Date;
            originalPrice?: number;
            salePrice?: number;
        };
    };
    isFollowerExclusive: boolean;
    exclusiveUntil?: Date;
    visibleTo: 'all' | 'followers' | 'premium';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    calculateDistance(userLocation: [number, number]): number;
    isExpired(): boolean;
    isActiveForUser(userId: Types.ObjectId): Promise<{
        canUse: boolean;
        reason?: string;
    }>;
    incrementEngagement(action: 'view' | 'like' | 'share'): Promise<void>;
}
export interface IOfferModel extends Model<IOffer> {
    findActiveOffers(): Promise<IOffer[]>;
    findOffersByCategory(category: string): Promise<IOffer[]>;
    findNearbyOffers(userLocation: [number, number], maxDistance?: number): Promise<IOffer[]>;
    findTrendingOffers(limit?: number): Promise<IOffer[]>;
    findNewArrivals(limit?: number): Promise<IOffer[]>;
    findStudentOffers(): Promise<IOffer[]>;
    findMegaOffers(): Promise<IOffer[]>;
    searchOffers(query: string, filters?: any): Promise<IOffer[]>;
}
declare const Offer: IOfferModel;
export default Offer;
