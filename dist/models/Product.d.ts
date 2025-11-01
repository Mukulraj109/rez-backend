import { Types } from 'mongoose';
export interface IProductVariant {
    type: string;
    value: string;
    price?: number;
    stock: number;
    sku?: string;
    image?: string;
}
export interface IProductPricing {
    original: number;
    selling: number;
    discount?: number;
    currency: string;
    bulk?: {
        minQuantity: number;
        price: number;
    }[];
}
export interface IProductInventory {
    stock: number;
    isAvailable: boolean;
    lowStockThreshold?: number;
    variants?: IProductVariant[];
    unlimited: boolean;
}
export interface IProductRatings {
    average: number;
    count: number;
    distribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}
export interface IProductSpecification {
    key: string;
    value: string;
    group?: string;
}
export interface IProductSEO {
    title?: string;
    description?: string;
    keywords?: string[];
    metaTags?: {
        [key: string]: string;
    };
}
export interface IProductAnalytics {
    views: number;
    purchases: number;
    conversions: number;
    wishlistAdds: number;
    shareCount: number;
    returnRate: number;
    avgRating: number;
    todayPurchases?: number;
    todayViews?: number;
    lastResetDate?: Date;
}
export interface IProductCashback {
    percentage: number;
    maxAmount?: number;
    minPurchase?: number;
    validUntil?: Date;
    terms?: string;
}
export interface IProductDeliveryInfo {
    estimatedDays?: string;
    freeShippingThreshold?: number;
    expressAvailable?: boolean;
    standardDeliveryTime?: string;
    expressDeliveryTime?: string;
    deliveryPartner?: string;
}
export interface IFrequentlyBoughtWith {
    productId: Types.ObjectId;
    purchaseCount: number;
    lastUpdated?: Date;
}
export interface IProduct {
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    productType: 'product' | 'service';
    category: Types.ObjectId;
    subCategory?: Types.ObjectId;
    store: Types.ObjectId;
    brand?: string;
    model?: string;
    sku: string;
    barcode?: string;
    images: string[];
    videos?: string[];
    pricing: IProductPricing;
    inventory: IProductInventory;
    ratings: IProductRatings;
    specifications: IProductSpecification[];
    tags: string[];
    seo: IProductSEO;
    analytics: IProductAnalytics;
    cashback?: IProductCashback;
    deliveryInfo?: IProductDeliveryInfo;
    bundleProducts?: Types.ObjectId[];
    frequentlyBoughtWith?: IFrequentlyBoughtWith[];
    isActive: boolean;
    isFeatured: boolean;
    isDigital: boolean;
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        unit: 'cm' | 'inch';
    };
    shippingInfo?: {
        weight: number;
        freeShipping: boolean;
        shippingCost?: number;
        processingTime?: string;
    };
    relatedProducts?: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    isInStock(): boolean;
    getVariantByType(type: string, value: string): IProductVariant | null;
    calculateDiscountedPrice(): number;
    updateRatings(): Promise<void>;
    incrementViews(): Promise<void>;
    incrementTodayPurchases(): Promise<void>;
    resetDailyAnalytics(): Promise<void>;
    calculateCashback(purchaseAmount?: number): number;
    getEstimatedDelivery(userLocation?: any): string;
}
export declare const Product: any;
