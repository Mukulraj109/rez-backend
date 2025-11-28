import mongoose, { Document } from 'mongoose';
export interface IOnboardingBusinessInfo {
    companyName?: string;
    businessType?: string;
    registrationNumber?: string;
    gstNumber?: string;
    panNumber?: string;
}
export interface IOnboardingStoreDetails {
    storeName?: string;
    description?: string;
    category?: string;
    logoUrl?: string;
    bannerUrl?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        landmark?: string;
    };
}
export interface IOnboardingBankDetails {
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    bankName?: string;
    branchName?: string;
}
export interface IOnboardingDocument {
    type: string;
    url: string;
    status: 'pending' | 'verified' | 'rejected';
    rejectionReason?: string;
    uploadedAt: Date;
}
export interface IOnboardingVerification {
    documents: IOnboardingDocument[];
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verifiedAt?: Date;
    verifiedBy?: string;
}
export interface IOnboarding {
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    currentStep: number;
    completedSteps: number[];
    stepData: {
        businessInfo?: IOnboardingBusinessInfo;
        storeDetails?: IOnboardingStoreDetails;
        bankDetails?: IOnboardingBankDetails;
        verification?: IOnboardingVerification;
    };
    startedAt?: Date;
    completedAt?: Date;
    rejectionReason?: string;
}
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
    resetPasswordToken?: string;
    resetPasswordExpiry?: Date;
    emailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
    failedLoginAttempts: number;
    accountLockedUntil?: Date;
    lastLoginAt?: Date;
    lastLoginIP?: string;
    onboarding: IOnboarding;
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
export declare const Merchant: mongoose.Model<IMerchant, {}, {}, {}, mongoose.Document<unknown, {}, IMerchant, {}, {}> & IMerchant & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export { Merchant as MerchantModel };
