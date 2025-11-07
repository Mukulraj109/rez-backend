import mongoose, { Document, Types } from 'mongoose';
export interface IEventSlot {
    id: string;
    time: string;
    available: boolean;
    maxCapacity: number;
    bookedCount: number;
}
export interface IEventLocation {
    name: string;
    address: string;
    city: string;
    state?: string;
    country?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    isOnline: boolean;
    meetingUrl?: string;
}
export interface IEventOrganizer {
    name: string;
    email: string;
    phone?: string;
    website?: string;
    description?: string;
    logo?: string;
}
export interface IEventPrice {
    amount: number;
    currency: string;
    isFree: boolean;
    originalPrice?: number;
    discount?: number;
}
export interface IEventAnalytics {
    views: number;
    bookings: number;
    shares: number;
    favorites: number;
    lastViewed?: Date;
}
export interface IEvent extends Document {
    _id: Types.ObjectId;
    title: string;
    subtitle?: string;
    description: string;
    image: string;
    images?: string[];
    price: IEventPrice;
    location: IEventLocation;
    date: Date;
    time: string;
    endTime?: string;
    category: string;
    subcategory?: string;
    organizer: IEventOrganizer;
    merchantId?: Types.ObjectId;
    isOnline: boolean;
    registrationRequired: boolean;
    bookingUrl?: string;
    availableSlots?: IEventSlot[];
    status: 'draft' | 'published' | 'cancelled' | 'completed' | 'sold_out';
    tags: string[];
    maxCapacity?: number;
    minAge?: number;
    requirements?: string[];
    includes?: string[];
    refundPolicy?: string;
    cancellationPolicy?: string;
    analytics: IEventAnalytics;
    featured: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    expiresAt?: Date;
    incrementViews(): Promise<IEvent>;
    incrementBookings(): Promise<IEvent>;
    incrementShares(): Promise<IEvent>;
    incrementFavorites(): Promise<IEvent>;
}
declare const Event: mongoose.Model<IEvent, {}, {}, {}, mongoose.Document<unknown, {}, IEvent, {}, {}> & IEvent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Event;
