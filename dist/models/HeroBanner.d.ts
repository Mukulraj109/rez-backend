import { Document, Types, Model } from 'mongoose';
export interface IHeroBanner extends Document {
    _id: Types.ObjectId;
    title: string;
    subtitle?: string;
    description?: string;
    image: string;
    ctaText: string;
    ctaAction: string;
    ctaUrl?: string;
    backgroundColor: string;
    textColor?: string;
    isActive: boolean;
    priority: number;
    validFrom: Date;
    validUntil: Date;
    targetAudience: {
        userTypes?: ('student' | 'new_user' | 'premium' | 'all')[];
        ageRange?: {
            min?: number;
            max?: number;
        };
        locations?: string[];
        categories?: string[];
    };
    analytics: {
        views: number;
        clicks: number;
        conversions: number;
    };
    metadata: {
        page: 'offers' | 'home' | 'category' | 'product' | 'all';
        position: 'top' | 'middle' | 'bottom';
        size: 'small' | 'medium' | 'large' | 'full';
        animation?: string;
        tags: string[];
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    isCurrentlyActive(): boolean;
    incrementView(): Promise<void>;
    incrementClick(): Promise<void>;
    incrementConversion(): Promise<void>;
    isTargetedForUser(userData?: any): boolean;
}
export interface IHeroBannerModel extends Model<IHeroBanner> {
    findActiveBanners(page?: string, position?: string): Promise<IHeroBanner[]>;
    findBannersForUser(userData?: any, page?: string): Promise<IHeroBanner[]>;
    findExpiredBanners(): Promise<IHeroBanner[]>;
    findUpcomingBanners(): Promise<IHeroBanner[]>;
}
declare const HeroBanner: IHeroBannerModel;
export default HeroBanner;
