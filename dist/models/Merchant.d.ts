import { Document } from 'mongoose';
export interface IMerchant extends Document {
    businessName: string;
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    businessAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    verificationStatus: 'pending' | 'verified' | 'rejected';
    isActive: boolean;
    businessLicense?: string;
    taxId?: string;
    website?: string;
    description?: string;
    logo?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    displayName?: string;
    tagline?: string;
    coverImage?: string;
    galleryImages?: string[];
    brandColors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
    };
    address?: any;
    contact?: any;
    socialMedia?: any;
    businessHours?: any;
    deliveryOptions?: any;
    paymentMethods?: any;
    policies?: any;
    ratings?: any;
    status?: string;
    isFeatured?: boolean;
    categories?: string[];
    tags?: string[];
    timezone?: string;
    serviceArea?: any;
    features?: string[];
    reviewSummary?: any;
    verification?: {
        isVerified?: boolean;
    };
    metrics?: {
        totalOrders?: number;
        totalCustomers?: number;
        averageResponseTime?: string;
        fulfillmentRate?: number;
    };
    activePromotions?: any[];
    announcements?: any[];
    searchKeywords?: string[];
    sortOrder?: number;
    lastActiveAt?: Date;
    isPubliclyVisible?: boolean;
    searchable?: boolean;
    acceptingOrders?: boolean;
    showInDirectory?: boolean;
    showContact?: boolean;
    showRatings?: boolean;
    showBusinessHours?: boolean;
    allowCustomerMessages?: boolean;
    showPromotions?: boolean;
}
export declare const Merchant: any;
export { Merchant as MerchantModel };
