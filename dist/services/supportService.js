"use strict";
// Support Service
// Business logic for customer support and ticket management
Object.defineProperty(exports, "__esModule", { value: true });
const SupportTicket_1 = require("../models/SupportTicket");
const FAQ_1 = require("../models/FAQ");
class SupportService {
    /**
     * Generate unique ticket number
     */
    async generateTicketNumber() {
        return SupportTicket_1.SupportTicket.generateTicketNumber();
    }
    /**
     * Create new support ticket
     */
    async createTicket(data) {
        try {
            const ticketNumber = await this.generateTicketNumber();
            const ticket = await SupportTicket_1.SupportTicket.create({
                ticketNumber,
                user: data.userId,
                subject: data.subject,
                category: data.category,
                priority: data.priority || 'medium',
                status: 'open',
                relatedEntity: data.relatedEntity || { type: 'none' },
                messages: [
                    {
                        sender: data.userId,
                        senderType: 'user',
                        message: data.initialMessage,
                        attachments: data.attachments || [],
                        timestamp: new Date(),
                        isRead: false,
                    },
                ],
                attachments: data.attachments || [],
                tags: [data.category],
            });
            console.log(`✅ [SUPPORT SERVICE] Ticket created: ${ticketNumber}`);
            // Notify support team (implement notification logic here)
            await this.notifyAgents(ticket);
            // Auto-assign ticket (implement assignment logic here)
            await this.autoAssignTicket(ticket._id);
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error creating ticket:', error);
            throw error;
        }
    }
    /**
     * Get user's tickets with filters
     */
    async getUserTickets(userId, filters, page = 1, limit = 20) {
        try {
            const query = { user: userId };
            if (filters?.status) {
                query.status = filters.status;
            }
            if (filters?.category) {
                query.category = filters.category;
            }
            if (filters?.priority) {
                query.priority = filters.priority;
            }
            if (filters?.dateFrom || filters?.dateTo) {
                query.createdAt = {};
                if (filters.dateFrom) {
                    query.createdAt.$gte = filters.dateFrom;
                }
                if (filters.dateTo) {
                    query.createdAt.$lte = filters.dateTo;
                }
            }
            const skip = (page - 1) * limit;
            const [tickets, total] = await Promise.all([
                SupportTicket_1.SupportTicket.find(query)
                    .sort({ updatedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('assignedTo', 'profile.firstName profile.lastName')
                    .lean(),
                SupportTicket_1.SupportTicket.countDocuments(query),
            ]);
            const pages = Math.ceil(total / limit);
            console.log(`✅ [SUPPORT SERVICE] Retrieved ${tickets.length} tickets for user`);
            return { tickets, total, pages };
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting user tickets:', error);
            throw error;
        }
    }
    /**
     * Get ticket by ID (with authorization check)
     */
    async getTicketById(ticketId, userId) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            })
                .populate('assignedTo', 'profile.firstName profile.lastName')
                .populate('relatedEntity.id')
                .lean();
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found or unauthorized: ${ticketId}`);
                return null;
            }
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting ticket:', error);
            throw error;
        }
    }
    /**
     * Add message to ticket
     */
    async addMessageToTicket(ticketId, userId, message, attachments = []) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            });
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
                return null;
            }
            await ticket.addMessage(userId, 'user', message, attachments);
            // Notify assigned agent
            if (ticket.assignedTo) {
                await this.notifyAgent(ticket.assignedTo, ticket);
            }
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error adding message:', error);
            throw error;
        }
    }
    /**
     * Close ticket
     */
    async closeTicket(ticketId, userId) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            });
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
                return null;
            }
            await ticket.closeTicket();
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error closing ticket:', error);
            throw error;
        }
    }
    /**
     * Reopen ticket
     */
    async reopenTicket(ticketId, userId, reason) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            });
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
                return null;
            }
            await ticket.reopenTicket(userId, reason);
            // Notify support team
            await this.notifyAgents(ticket);
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error reopening ticket:', error);
            throw error;
        }
    }
    /**
     * Rate ticket
     */
    async rateTicket(ticketId, userId, score, comment) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            });
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
                return null;
            }
            await ticket.rateTicket(score, comment);
            // Notify assigned agent about rating
            if (ticket.assignedTo) {
                await this.notifyAgentRating(ticket.assignedTo, ticket, score);
            }
            return ticket;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error rating ticket:', error);
            throw error;
        }
    }
    /**
     * Mark messages as read
     */
    async markMessagesAsRead(ticketId, userId) {
        try {
            const ticket = await SupportTicket_1.SupportTicket.findOne({
                _id: ticketId,
                user: userId,
            });
            if (!ticket) {
                console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
                return;
            }
            await ticket.markMessagesAsRead('user');
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error marking messages as read:', error);
            throw error;
        }
    }
    /**
     * Get user's active tickets summary
     */
    async getActiveTicketsSummary(userId) {
        try {
            const tickets = await SupportTicket_1.SupportTicket.getUserActiveTickets(userId);
            const summary = {
                total: tickets.length,
                byStatus: {},
                byCategory: {},
            };
            tickets.forEach((ticket) => {
                summary.byStatus[ticket.status] = (summary.byStatus[ticket.status] || 0) + 1;
                summary.byCategory[ticket.category] = (summary.byCategory[ticket.category] || 0) + 1;
            });
            return summary;
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting tickets summary:', error);
            throw error;
        }
    }
    /**
     * Calculate response time statistics
     */
    calculateResponseTime(createdAt, firstAgentResponse) {
        const diff = firstAgentResponse.getTime() - createdAt.getTime();
        return Math.round(diff / (1000 * 60)); // minutes
    }
    /**
     * Calculate resolution time statistics
     */
    calculateResolutionTime(createdAt, resolvedAt) {
        const diff = resolvedAt.getTime() - createdAt.getTime();
        return Math.round(diff / (1000 * 60)); // minutes
    }
    /**
     * Auto-assign ticket (placeholder for assignment logic)
     */
    async autoAssignTicket(ticketId) {
        // Implement round-robin or load-based assignment
        // For now, leave unassigned
        console.log(`📋 [SUPPORT SERVICE] Auto-assign logic for ticket ${ticketId}`);
    }
    /**
     * Notify agents about new ticket (placeholder)
     */
    async notifyAgents(ticket) {
        // Implement notification to support team
        console.log(`📧 [SUPPORT SERVICE] Notifying agents about ticket ${ticket.ticketNumber}`);
    }
    /**
     * Notify specific agent about update (placeholder)
     */
    async notifyAgent(agentId, ticket) {
        // Implement notification to specific agent
        console.log(`📧 [SUPPORT SERVICE] Notifying agent ${agentId} about ticket ${ticket.ticketNumber}`);
    }
    /**
     * Notify agent about rating (placeholder)
     */
    async notifyAgentRating(agentId, ticket, score) {
        // Implement rating notification
        console.log(`⭐ [SUPPORT SERVICE] Agent ${agentId} received ${score}/5 rating for ticket ${ticket.ticketNumber}`);
    }
    /**
     * Search FAQs
     */
    async searchFAQs(query, limit = 10) {
        try {
            return await FAQ_1.FAQ.searchFAQs(query, limit);
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error searching FAQs:', error);
            throw error;
        }
    }
    /**
     * Get FAQs by category
     */
    async getFAQsByCategory(category, subcategory) {
        try {
            return await FAQ_1.FAQ.getByCategory(category, subcategory);
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting FAQs:', error);
            throw error;
        }
    }
    /**
     * Get popular FAQs
     */
    async getPopularFAQs(limit = 10) {
        try {
            return await FAQ_1.FAQ.getPopularFAQs(limit);
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting popular FAQs:', error);
            throw error;
        }
    }
    /**
     * Get FAQ categories
     */
    async getFAQCategories() {
        try {
            return await FAQ_1.FAQ.getCategories();
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error getting FAQ categories:', error);
            throw error;
        }
    }
    /**
     * Mark FAQ as helpful
     */
    async markFAQAsHelpful(faqId) {
        try {
            const faq = await FAQ_1.FAQ.findById(faqId);
            if (faq) {
                await faq.markAsHelpful();
            }
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error marking FAQ as helpful:', error);
            throw error;
        }
    }
    /**
     * Mark FAQ as not helpful
     */
    async markFAQAsNotHelpful(faqId) {
        try {
            const faq = await FAQ_1.FAQ.findById(faqId);
            if (faq) {
                await faq.markAsNotHelpful();
            }
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error marking FAQ as not helpful:', error);
            throw error;
        }
    }
    /**
     * Increment FAQ view count
     */
    async incrementFAQView(faqId) {
        try {
            const faq = await FAQ_1.FAQ.findById(faqId);
            if (faq) {
                await faq.incrementView();
            }
        }
        catch (error) {
            console.error('❌ [SUPPORT SERVICE] Error incrementing FAQ view:', error);
            throw error;
        }
    }
}
exports.default = new SupportService();
