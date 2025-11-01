import { Request, Response } from 'express';
/**
 * Create new support ticket
 * POST /api/support/tickets
 */
export declare const createTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's tickets with filters
 * GET /api/support/tickets
 */
export declare const getMyTickets: (req: Request, res: Response) => Promise<void>;
/**
 * Get ticket by ID
 * GET /api/support/tickets/:id
 */
export declare const getTicketById: (req: Request, res: Response) => Promise<void>;
/**
 * Add message to ticket
 * POST /api/support/tickets/:id/messages
 */
export declare const addMessageToTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
export declare const closeTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Reopen ticket
 * POST /api/support/tickets/:id/reopen
 */
export declare const reopenTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Rate ticket
 * POST /api/support/tickets/:id/rate
 */
export declare const rateTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Get active tickets summary
 * GET /api/support/tickets/summary
 */
export declare const getTicketsSummary: (req: Request, res: Response) => Promise<void>;
/**
 * Get all FAQs
 * GET /api/support/faq
 */
export declare const getAllFAQs: (req: Request, res: Response) => Promise<void>;
/**
 * Search FAQs
 * GET /api/support/faq/search
 */
export declare const searchFAQs: (req: Request, res: Response) => Promise<void>;
/**
 * Get FAQ categories
 * GET /api/support/faq/categories
 */
export declare const getFAQCategories: (req: Request, res: Response) => Promise<void>;
/**
 * Get popular FAQs
 * GET /api/support/faq/popular
 */
export declare const getPopularFAQs: (req: Request, res: Response) => Promise<void>;
/**
 * Mark FAQ as helpful
 * POST /api/support/faq/:id/helpful
 */
export declare const markFAQHelpful: (req: Request, res: Response) => Promise<void>;
/**
 * Track FAQ view
 * POST /api/support/faq/:id/view
 */
export declare const trackFAQView: (req: Request, res: Response) => Promise<void>;
/**
 * Create ticket from order issue
 * POST /api/support/quick-actions/order-issue
 */
export declare const createOrderIssueTicket: (req: Request, res: Response) => Promise<void>;
/**
 * Report product issue
 * POST /api/support/quick-actions/report-product
 */
export declare const reportProductIssue: (req: Request, res: Response) => Promise<void>;
