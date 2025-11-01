import { Document, Types } from 'mongoose';
export interface ICategoryMetadata {
    color?: string;
    tags?: string[];
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
}
export interface ICategory extends Document {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    image?: string;
    bannerImage?: string;
    type: 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';
    parentCategory?: Types.ObjectId;
    childCategories?: Types.ObjectId[];
    isActive: boolean;
    sortOrder: number;
    metadata: ICategoryMetadata;
    productCount: number;
    storeCount: number;
    createdAt: Date;
    updatedAt: Date;
    _fullPath?: string;
    getFullPath(): Promise<string>;
    getAllChildren(): Promise<ICategory[]>;
}
export declare const Category: any;
