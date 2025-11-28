// Support Service
// Business logic for customer support and ticket management

import { Types } from 'mongoose';
import { SupportTicket, ISupportTicket } from '../models/SupportTicket';
import { FAQ, IFAQ } from '../models/FAQ';
import { User } from '../models/User';

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

class SupportService {
  /**
   * Generate unique ticket number
   */
  async generateTicketNumber(): Promise<string> {
    return (SupportTicket as any).generateTicketNumber();
  }

  /**
   * Create new support ticket
   */
  async createTicket(data: CreateTicketData): Promise<ISupportTicket> {
    try {
      const ticketNumber = await this.generateTicketNumber();

      const ticket = await SupportTicket.create({
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
      await this.autoAssignTicket(ticket._id as Types.ObjectId);

      return ticket;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Get user's tickets with filters
   */
  async getUserTickets(
    userId: Types.ObjectId,
    filters?: TicketFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ tickets: ISupportTicket[]; total: number; pages: number }> {
    try {
      const query: any = { user: userId };

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
        SupportTicket.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('assignedTo', 'profile.firstName profile.lastName')
          .lean(),
        SupportTicket.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      console.log(`✅ [SUPPORT SERVICE] Retrieved ${tickets.length} tickets for user`);

      return { tickets, total, pages };
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting user tickets:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID (with authorization check)
   */
  async getTicketById(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ISupportTicket | null> {
    try {
      const ticket = await SupportTicket.findOne({
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
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting ticket:', error);
      throw error;
    }
  }

  /**
   * Add message to ticket
   */
  async addMessageToTicket(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId,
    message: string,
    attachments: string[] = []
  ): Promise<ISupportTicket | null> {
    try {
      const ticket = await SupportTicket.findOne({
        _id: ticketId,
        user: userId,
      });

      if (!ticket) {
        console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
        return null;
      }

      await (ticket as any).addMessage(userId, 'user', message, attachments);

      // Notify assigned agent
      if (ticket.assignedTo) {
        await this.notifyAgent(ticket.assignedTo, ticket);
      }

      return ticket;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error adding message:', error);
      throw error;
    }
  }

  /**
   * Close ticket
   */
  async closeTicket(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ISupportTicket | null> {
    try {
      const ticket = await SupportTicket.findOne({
        _id: ticketId,
        user: userId,
      });

      if (!ticket) {
        console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
        return null;
      }

      await (ticket as any).closeTicket();

      return ticket;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error closing ticket:', error);
      throw error;
    }
  }

  /**
   * Reopen ticket
   */
  async reopenTicket(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId,
    reason: string
  ): Promise<ISupportTicket | null> {
    try {
      const ticket = await SupportTicket.findOne({
        _id: ticketId,
        user: userId,
      });

      if (!ticket) {
        console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
        return null;
      }

      await (ticket as any).reopenTicket(userId, reason);

      // Notify support team
      await this.notifyAgents(ticket);

      return ticket;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error reopening ticket:', error);
      throw error;
    }
  }

  /**
   * Rate ticket
   */
  async rateTicket(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId,
    score: number,
    comment: string
  ): Promise<ISupportTicket | null> {
    try {
      const ticket = await SupportTicket.findOne({
        _id: ticketId,
        user: userId,
      });

      if (!ticket) {
        console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
        return null;
      }

      await (ticket as any).rateTicket(score, comment);

      // Notify assigned agent about rating
      if (ticket.assignedTo) {
        await this.notifyAgentRating(ticket.assignedTo, ticket, score);
      }

      return ticket;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error rating ticket:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    ticketId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<void> {
    try {
      const ticket = await SupportTicket.findOne({
        _id: ticketId,
        user: userId,
      });

      if (!ticket) {
        console.log(`⚠️ [SUPPORT SERVICE] Ticket not found: ${ticketId}`);
        return;
      }

      await (ticket as any).markMessagesAsRead('user');
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get user's active tickets summary
   */
  async getActiveTicketsSummary(userId: Types.ObjectId): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byCategory: { [key: string]: number };
  }> {
    try {
      const tickets = await (SupportTicket as any).getUserActiveTickets(userId);

      const summary = {
        total: tickets.length,
        byStatus: {} as { [key: string]: number },
        byCategory: {} as { [key: string]: number },
      };

      tickets.forEach((ticket: any) => {
        summary.byStatus[ticket.status] = (summary.byStatus[ticket.status] || 0) + 1;
        summary.byCategory[ticket.category] = (summary.byCategory[ticket.category] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting tickets summary:', error);
      throw error;
    }
  }

  /**
   * Calculate response time statistics
   */
  calculateResponseTime(createdAt: Date, firstAgentResponse: Date): number {
    const diff = firstAgentResponse.getTime() - createdAt.getTime();
    return Math.round(diff / (1000 * 60)); // minutes
  }

  /**
   * Calculate resolution time statistics
   */
  calculateResolutionTime(createdAt: Date, resolvedAt: Date): number {
    const diff = resolvedAt.getTime() - createdAt.getTime();
    return Math.round(diff / (1000 * 60)); // minutes
  }

  /**
   * Auto-assign ticket (placeholder for assignment logic)
   */
  private async autoAssignTicket(ticketId: Types.ObjectId): Promise<void> {
    // Implement round-robin or load-based assignment
    // For now, leave unassigned
    console.log(`📋 [SUPPORT SERVICE] Auto-assign logic for ticket ${ticketId}`);
  }

  /**
   * Notify agents about new ticket (placeholder)
   */
  private async notifyAgents(ticket: ISupportTicket): Promise<void> {
    // Implement notification to support team
    console.log(`📧 [SUPPORT SERVICE] Notifying agents about ticket ${ticket.ticketNumber}`);
  }

  /**
   * Notify specific agent about update (placeholder)
   */
  private async notifyAgent(
    agentId: Types.ObjectId,
    ticket: ISupportTicket
  ): Promise<void> {
    // Implement notification to specific agent
    console.log(`📧 [SUPPORT SERVICE] Notifying agent ${agentId} about ticket ${ticket.ticketNumber}`);
  }

  /**
   * Notify agent about rating (placeholder)
   */
  private async notifyAgentRating(
    agentId: Types.ObjectId,
    ticket: ISupportTicket,
    score: number
  ): Promise<void> {
    // Implement rating notification
    console.log(`⭐ [SUPPORT SERVICE] Agent ${agentId} received ${score}/5 rating for ticket ${ticket.ticketNumber}`);
  }

  /**
   * Search FAQs
   */
  async searchFAQs(query: string, limit: number = 10): Promise<IFAQ[]> {
    try {
      return await (FAQ as any).searchFAQs(query, limit);
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error searching FAQs:', error);
      throw error;
    }
  }

  /**
   * Get FAQs by category
   */
  async getFAQsByCategory(category: string, subcategory?: string): Promise<IFAQ[]> {
    try {
      return await (FAQ as any).getByCategory(category, subcategory);
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting FAQs:', error);
      throw error;
    }
  }

  /**
   * Get popular FAQs
   */
  async getPopularFAQs(limit: number = 10): Promise<IFAQ[]> {
    try {
      return await (FAQ as any).getPopularFAQs(limit);
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting popular FAQs:', error);
      throw error;
    }
  }

  /**
   * Get FAQ categories
   */
  async getFAQCategories(): Promise<any[]> {
    try {
      return await (FAQ as any).getCategories();
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error getting FAQ categories:', error);
      throw error;
    }
  }

  /**
   * Mark FAQ as helpful
   */
  async markFAQAsHelpful(faqId: Types.ObjectId): Promise<void> {
    try {
      const faq = await FAQ.findById(faqId);
      if (faq) {
        await (faq as any).markAsHelpful();
      }
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error marking FAQ as helpful:', error);
      throw error;
    }
  }

  /**
   * Mark FAQ as not helpful
   */
  async markFAQAsNotHelpful(faqId: Types.ObjectId): Promise<void> {
    try {
      const faq = await FAQ.findById(faqId);
      if (faq) {
        await (faq as any).markAsNotHelpful();
      }
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error marking FAQ as not helpful:', error);
      throw error;
    }
  }

  /**
   * Increment FAQ view count
   */
  async incrementFAQView(faqId: Types.ObjectId): Promise<void> {
    try {
      const faq = await FAQ.findById(faqId);
      if (faq) {
        await (faq as any).incrementView();
      }
    } catch (error) {
      console.error('❌ [SUPPORT SERVICE] Error incrementing FAQ view:', error);
      throw error;
    }
  }
}

export default new SupportService();
