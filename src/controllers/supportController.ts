// Support Controller
// Handles customer support and FAQ API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import supportService from '../services/supportService';

/**
 * Create new support ticket
 * POST /api/support/tickets
 */
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { subject, category, message, relatedEntity, attachments, priority } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!subject || !category || !message) {
      res.status(400).json({
        success: false,
        message: 'Subject, category, and message are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject,
      category,
      initialMessage: message,
      relatedEntity,
      attachments,
      priority,
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message,
    });
  }
};

/**
 * Get user's tickets with filters
 * GET /api/support/tickets
 */
export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, category, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await supportService.getUserTickets(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tickets',
      error: error.message,
    });
  }
};

/**
 * Get ticket by ID
 * GET /api/support/tickets/:id
 */
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const ticket = await supportService.getTicketById(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    // Mark messages as read
    await supportService.markMessagesAsRead(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket',
      error: error.message,
    });
  }
};

/**
 * Add message to ticket
 * POST /api/support/tickets/:id/messages
 */
export const addMessageToTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!message) {
      res.status(400).json({
        success: false,
        message: 'Message is required',
      });
      return;
    }

    const ticket = await supportService.addMessageToTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      message,
      attachments
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message,
    });
  }
};

/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
export const closeTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const ticket = await supportService.closeTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error closing ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error.message,
    });
  }
};

/**
 * Reopen ticket
 * POST /api/support/tickets/:id/reopen
 */
export const reopenTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Reason for reopening is required',
      });
      return;
    }

    const ticket = await supportService.reopenTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      reason
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error reopening ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reopen ticket',
      error: error.message,
    });
  }
};

/**
 * Rate ticket
 * POST /api/support/tickets/:id/rate
 */
export const rateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { score, comment } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!score || score < 1 || score > 5) {
      res.status(400).json({
        success: false,
        message: 'Valid rating score (1-5) is required',
      });
      return;
    }

    const ticket = await supportService.rateTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      score,
      comment || ''
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket rated successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error rating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate ticket',
      error: error.message,
    });
  }
};

/**
 * Get active tickets summary
 * GET /api/support/tickets/summary
 */
export const getTicketsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const summary = await supportService.getActiveTicketsSummary(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tickets summary',
      error: error.message,
    });
  }
};

// ==================== FAQ ENDPOINTS ====================

/**
 * Get all FAQs
 * GET /api/support/faq
 */
export const getAllFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subcategory, limit = 100 } = req.query;

    let faqs;

    if (category) {
      faqs = await supportService.getFAQsByCategory(
        category as string,
        subcategory as string
      );
    } else {
      faqs = await supportService.getPopularFAQs(Number(limit));
    }

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQs',
      error: error.message,
    });
  }
};

/**
 * Search FAQs
 * GET /api/support/faq/search
 */
export const searchFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    const faqs = await supportService.searchFAQs(q as string, Number(limit));

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error searching FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search FAQs',
      error: error.message,
    });
  }
};

/**
 * Get FAQ categories
 * GET /api/support/faq/categories
 */
export const getFAQCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await supportService.getFAQCategories();

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQ categories',
      error: error.message,
    });
  }
};

/**
 * Get popular FAQs
 * GET /api/support/faq/popular
 */
export const getPopularFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const faqs = await supportService.getPopularFAQs(Number(limit));

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error getting popular FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular FAQs',
      error: error.message,
    });
  }
};

/**
 * Mark FAQ as helpful
 * POST /api/support/faq/:id/helpful
 */
export const markFAQHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    if (helpful) {
      await supportService.markFAQAsHelpful(new Types.ObjectId(id));
    } else {
      await supportService.markFAQAsNotHelpful(new Types.ObjectId(id));
    }

    res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error marking FAQ helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback',
      error: error.message,
    });
  }
};

/**
 * Track FAQ view
 * POST /api/support/faq/:id/view
 */
export const trackFAQView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await supportService.incrementFAQView(new Types.ObjectId(id));

    res.status(200).json({
      success: true,
      message: 'View tracked',
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error tracking view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message,
    });
  }
};

// ==================== QUICK ACTIONS ====================

/**
 * Create ticket from order issue
 * POST /api/support/quick-actions/order-issue
 */
export const createOrderIssueTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { orderId, issueType, description } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!orderId || !issueType || !description) {
      res.status(400).json({
        success: false,
        message: 'Order ID, issue type, and description are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject: `Order Issue: ${issueType}`,
      category: 'order',
      initialMessage: description,
      relatedEntity: {
        type: 'order',
        id: new Types.ObjectId(orderId),
      },
      priority: 'high',
    });

    res.status(201).json({
      success: true,
      message: 'Order issue ticket created successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error creating order issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order issue ticket',
      error: error.message,
    });
  }
};

/**
 * Report product issue
 * POST /api/support/quick-actions/report-product
 */
export const reportProductIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { productId, issueType, description, images } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!productId || !issueType || !description) {
      res.status(400).json({
        success: false,
        message: 'Product ID, issue type, and description are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject: `Product Issue: ${issueType}`,
      category: 'product',
      initialMessage: description,
      relatedEntity: {
        type: 'product',
        id: new Types.ObjectId(productId),
      },
      attachments: images,
      priority: 'medium',
    });

    res.status(201).json({
      success: true,
      message: 'Product issue reported successfully',
      data: { ticket },
    });
  } catch (error: any) {
    console.error('❌ [SUPPORT CONTROLLER] Error reporting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report product issue',
      error: error.message,
    });
  }
};
