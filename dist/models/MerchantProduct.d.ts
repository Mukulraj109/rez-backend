import mongoose, { Document, Types } from 'mongoose';
export interface IProduct extends Document {
    merchantId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    shortDescription?: string;
    sku: string;
    barcode?: string;
    category: string;
    subcategory?: string;
    brand?: string;
    price: number;
    costPrice?: number;
    compareAtPrice?: number;
    currency: string;
    inventory: {
        stock: number;
        lowStockThreshold: number;
        trackInventory: boolean;
        allowBackorders: boolean;
        reservedStock: number;
    };
    images: Array<{
        url: string;
        thumbnailUrl?: string;
        altText?: string;
        sortOrder: number;
        isMain: boolean;
    }>;
    videos?: Array<{
        url: string;
        thumbnailUrl?: string;
        title?: string;
        duration?: number;
        sortOrder: number;
    }>;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: 'cm' | 'inch';
    };
    tags: string[];
    metaTitle?: string;
    metaDescription?: string;
    searchKeywords: string[];
    status: 'active' | 'inactive' | 'draft' | 'archived';
    visibility: 'public' | 'hidden' | 'featured';
    cashback: {
        percentage: number;
        maxAmount?: number;
        isActive: boolean;
        conditions?: string[];
    };
    shipping?: {
        estimatedDelivery?: string;
        [key: string]: any;
    };
    ratings?: {
        average: number;
        count: number;
        [key: string]: any;
    };
    variants?: Array<{
        option: string;
        value: string;
        [key: string]: any;
    }>;
    attributes?: {
        material?: string;
        weight?: string;
        dimensions?: string;
        [key: string]: any;
    };
    slug?: string;
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
        [key: string]: any;
    };
    isFeatured?: boolean;
    sortOrder?: number;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const MProduct: mongoose.Model<any, {}, {}, {}, any, any>;
export declare class ProductModel {
    static findByMerchantId(merchantId: string | Types.ObjectId): Promise<IProduct[]>;
    static countByMerchant(merchantId: string | Types.ObjectId): Promise<number>;
    static findLowStock(merchantId: string | Types.ObjectId): Promise<IProduct[]>;
    static search(params: {
        merchantId: string;
        category?: string;
        status?: string;
        searchTerm?: string;
        priceRange?: {
            min: number;
            max: number;
        };
        stockFilter?: 'low' | 'out' | 'available';
        sortBy?: 'name' | 'price' | 'stock' | 'created';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }): Promise<{
        products: any[];
        totalCount: number;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrevious: boolean;
    }>;
    static createSampleProducts(merchantId: string): Promise<void>;
}
