import { IEvent } from '../models/Event';
import { IEventBooking } from '../models/EventBooking';
export interface EventFilters {
    category?: string;
    location?: string;
    date?: Date;
    priceMin?: number;
    priceMax?: number;
    isOnline?: boolean;
    featured?: boolean;
    upcoming?: boolean;
    search?: string;
}
export interface EventSearchResult {
    events: IEvent[];
    total: number;
    hasMore: boolean;
    suggestions?: string[];
}
export interface BookingResult {
    success: boolean;
    booking?: IEventBooking;
    message: string;
    error?: string;
}
declare class EventService {
    /**
     * Get all published events with filters
     */
    getEvents(filters?: EventFilters, limit?: number, offset?: number): Promise<EventSearchResult>;
    /**
     * Get event by ID
     */
    getEventById(id: string): Promise<IEvent | null>;
    /**
     * Get events by category
     */
    getEventsByCategory(category: string, limit?: number, offset?: number): Promise<EventSearchResult>;
    /**
     * Search events
     */
    searchEvents(searchQuery: string, filters?: EventFilters, limit?: number, offset?: number): Promise<EventSearchResult>;
    /**
     * Get featured events for homepage
     */
    getFeaturedEvents(limit?: number): Promise<IEvent[]>;
    /**
     * Book event slot
     */
    bookEventSlot(eventId: string, userId: string, slotId?: string, attendeeInfo?: any): Promise<BookingResult>;
    /**
     * Get user's event bookings
     */
    getUserBookings(userId: string, status?: string, limit?: number, offset?: number): Promise<{
        bookings: IEventBooking[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Cancel event booking
     */
    cancelBooking(bookingId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get event analytics
     */
    getEventAnalytics(eventId: string): Promise<any>;
    /**
     * Get event categories
     */
    getEventCategories(): Promise<string[]>;
    /**
     * Get trending events
     */
    getTrendingEvents(limit?: number): Promise<IEvent[]>;
    /**
     * Get upcoming events
     */
    getUpcomingEvents(limit?: number, offset?: number): Promise<EventSearchResult>;
    /**
     * Increment event shares
     */
    incrementEventShares(eventId: string): Promise<void>;
    /**
     * Increment event favorites
     */
    incrementEventFavorites(eventId: string): Promise<void>;
}
declare const _default: EventService;
export default _default;
