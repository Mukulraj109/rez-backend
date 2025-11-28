import mongoose, { Document, Types } from 'mongoose';
export interface IStoreLocation {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
    deliveryRadius?: number;
    landmark?: string;
}
export interface Review {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    text: string;
    cashbackEarned: number;
    createdAt: Date;
    updatedAt?: Date;
}
export interface IStoreContact {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
}
export interface IStoreRatings {
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
export interface IStoreOffers {
    cashback?: number;
    minOrderAmount?: number;
    maxCashback?: number;
    discounts?: Types.ObjectId[];
    isPartner: boolean;
    partnerLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}
export interface IStoreDeliveryCategories {
    fastDelivery: boolean;
    budgetFriendly: boolean;
    ninetyNineStore: boolean;
    premium: boolean;
    organic: boolean;
    alliance: boolean;
    lowestPrice: boolean;
    mall: boolean;
    cashStore: boolean;
}
export interface IStoreOperationalInfo {
    hours: {
        monday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        tuesday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        wednesday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        thursday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        friday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        saturday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
        sunday?: {
            open: string;
            close: string;
            closed?: boolean;
        };
    };
    deliveryTime?: string;
    minimumOrder?: number;
    deliveryFee?: number;
    freeDeliveryAbove?: number;
    acceptsWalletPayment: boolean;
    paymentMethods: string[];
}
export interface IStoreAnalytics {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    repeatCustomers: number;
    followersCount: number;
    popularProducts?: Types.ObjectId[];
    peakHours?: string[];
    monthlyStats?: {
        month: number;
        year: number;
        orders: number;
        revenue: number;
    }[];
}
export interface IStoreVideo {
    url: string;
    thumbnail?: string;
    title?: string;
    duration?: number;
    uploadedAt?: Date;
}
export interface IStore extends Document {
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    banner?: string | string[];
    videos?: IStoreVideo[];
    category: Types.ObjectId;
    subCategories?: Types.ObjectId[];
    location: IStoreLocation;
    contact: IStoreContact;
    ratings: IStoreRatings;
    offers: IStoreOffers;
    operationalInfo: IStoreOperationalInfo;
    deliveryCategories: IStoreDeliveryCategories;
    analytics: IStoreAnalytics;
    tags: string[];
    isActive: boolean;
    isFeatured: boolean;
    isVerified: boolean;
    merchantId?: Types.ObjectId;
    createdViaOnboarding?: boolean;
    hasMenu?: boolean;
    menuCategories?: string[];
    bookingType?: 'RESTAURANT' | 'SERVICE' | 'CONSULTATION' | 'RETAIL' | 'HYBRID';
    bookingConfig?: {
        enabled: boolean;
        requiresAdvanceBooking: boolean;
        allowWalkIn: boolean;
        slotDuration: number;
        advanceBookingDays: number;
        workingHours?: {
            start: string;
            end: string;
        };
    };
    storeVisitConfig?: {
        enabled: boolean;
        features: ('queue_system' | 'visit_scheduling' | 'live_availability')[];
        maxVisitorsPerSlot?: number;
        averageVisitDuration?: number;
    };
    serviceTypes?: string[];
    consultationTypes?: string[];
    createdAt: Date;
    updatedAt: Date;
    isOpen(): boolean;
    calculateDistance(userCoordinates: [number, number]): number;
    isEligibleForDelivery(userCoordinates: [number, number]): boolean;
    updateRatings(): Promise<void>;
}
export declare const Store: mongoose.Model<IStore, {}, {}, {}, mongoose.Document<unknown, {}, IStore, {}, {}> & IStore & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
