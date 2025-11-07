import { Document, Types, Model } from 'mongoose';
export interface IOfferCategory extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color: string;
    backgroundColor?: string;
    isActive: boolean;
    priority: number;
    offers: Types.ObjectId[];
    metadata: {
        displayOrder: number;
        isFeatured: boolean;
        parentCategory?: Types.ObjectId;
        subcategories?: Types.ObjectId[];
        tags: string[];
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    addOffer(offerId: Types.ObjectId): Promise<void>;
    removeOffer(offerId: Types.ObjectId): Promise<void>;
    getActiveOffersCount(): Promise<number>;
}
export interface IOfferCategoryModel extends Model<IOfferCategory> {
    findActiveCategories(): Promise<IOfferCategory[]>;
    findBySlug(slug: string): Promise<IOfferCategory | null>;
    findFeaturedCategories(): Promise<IOfferCategory[]>;
    findParentCategories(): Promise<IOfferCategory[]>;
    findSubcategories(parentId: Types.ObjectId): Promise<IOfferCategory[]>;
}
declare const OfferCategory: IOfferCategoryModel;
export default OfferCategory;
