import { Types } from 'mongoose';
import { ISupportTicket } from '../models/SupportTicket';
import { IFAQ } from '../models/FAQ';
interface CreateTicketData {
    userId: Types.ObjectId;
    subject: string;
    category: 'order' | 'payment' | 'product' | 'account' | 'technical' | 'delivery' | 'refund' | 'other';
    initialMessage: string;
    relatedEntity?: {
        type: 'order' | 'product' | 'transaction' | 'none';
        id?: Types.ObjectId;
    };
    attachments?: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}
interface TicketFilters {
    status?: string;
    category?: string;
    priority?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
declare class SupportService {
    /**
     * Generate unique ticket number
     */
    generateTicketNumber(): Promise<string>;
    /**
     * Create new support ticket
     */
    createTicket(data: CreateTicketData): Promise<ISupportTicket>;
    /**
     * Get user's tickets with filters
     */
    getUserTickets(userId: Types.ObjectId, filters?: TicketFilters, page?: number, limit?: number): Promise<{
        tickets: ISupportTicket[];
        total: number;
        pages: number;
    }>;
    /**
     * Get ticket by ID (with authorization check)
     */
    getTicketById(ticketId: Types.ObjectId, userId: Types.ObjectId): Promise<ISupportTicket | null>;
    /**
     * Add message to ticket
     */
    addMessageToTicket(ticketId: Types.ObjectId, userId: Types.ObjectId, message: string, attachments?: string[]): Promise<ISupportTicket | null>;
    /**
     * Close ticket
     */
    closeTicket(ticketId: Types.ObjectId, userId: Types.ObjectId): Promise<ISupportTicket | null>;
    /**
     * Reopen ticket
     */
    reopenTicket(ticketId: Types.ObjectId, userId: Types.ObjectId, reason: string): Promise<ISupportTicket | null>;
    /**
     * Rate ticket
     */
    rateTicket(ticketId: Types.ObjectId, userId: Types.ObjectId, score: number, comment: string): Promise<ISupportTicket | null>;
    /**
     * Mark messages as read
     */
    markMessagesAsRead(ticketId: Types.ObjectId, userId: Types.ObjectId): Promise<void>;
    /**
     * Get user's active tickets summary
     */
    getActiveTicketsSummary(userId: Types.ObjectId): Promise<{
        total: number;
        byStatus: {
            [key: string]: number;
        };
        byCategory: {
            [key: string]: number;
        };
    }>;
    /**
     * Calculate response time statistics
     */
    calculateResponseTime(createdAt: Date, firstAgentResponse: Date): number;
    /**
     * Calculate resolution time statistics
     */
    calculateResolutionTime(createdAt: Date, resolvedAt: Date): number;
    /**
     * Auto-assign ticket (placeholder for assignment logic)
     */
    private autoAssignTicket;
    /**
     * Notify agents about new ticket (placeholder)
     */
    private notifyAgents;
    /**
     * Notify specific agent about update (placeholder)
     */
    private notifyAgent;
    /**
     * Notify agent about rating (placeholder)
     */
    private notifyAgentRating;
    /**
     * Search FAQs
     */
    searchFAQs(query: string, limit?: number): Promise<IFAQ[]>;
    /**
     * Get FAQs by category
     */
    getFAQsByCategory(category: string, subcategory?: string): Promise<IFAQ[]>;
    /**
     * Get popular FAQs
     */
    getPopularFAQs(limit?: number): Promise<IFAQ[]>;
    /**
     * Get FAQ categories
     */
    getFAQCategories(): Promise<any[]>;
    /**
     * Mark FAQ as helpful
     */
    markFAQAsHelpful(faqId: Types.ObjectId): Promise<void>;
    /**
     * Mark FAQ as not helpful
     */
    markFAQAsNotHelpful(faqId: Types.ObjectId): Promise<void>;
    /**
     * Increment FAQ view count
     */
    incrementFAQView(faqId: Types.ObjectId): Promise<void>;
}
declare const _default: SupportService;
export default _default;
