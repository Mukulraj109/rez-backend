import { Request, Response } from 'express';
/**
 * Get all conversations for a user
 * GET /api/messages/conversations
 */
export declare const getConversations: (req: Request, res: Response) => Promise<void>;
/**
 * Get or create a conversation
 * POST /api/messages/conversations
 */
export declare const getOrCreateConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Get conversation by ID
 * GET /api/messages/conversations/:id
 */
export declare const getConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Get messages in a conversation
 * GET /api/messages/conversations/:id/messages
 */
export declare const getMessages: (req: Request, res: Response) => Promise<void>;
/**
 * Send a message
 * POST /api/messages/conversations/:id/messages
 */
export declare const sendMessage: (req: Request, res: Response) => Promise<void>;
/**
 * Mark conversation as read
 * PATCH /api/messages/conversations/:id/read
 */
export declare const markConversationAsRead: (req: Request, res: Response) => Promise<void>;
/**
 * Archive conversation
 * PATCH /api/messages/conversations/:id/archive
 */
export declare const archiveConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Unarchive conversation
 * PATCH /api/messages/conversations/:id/unarchive
 */
export declare const unarchiveConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Delete conversation
 * DELETE /api/messages/conversations/:id
 */
export declare const deleteConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Search messages
 * GET /api/messages/search
 */
export declare const searchMessages: (req: Request, res: Response) => Promise<void>;
/**
 * Report a message
 * POST /api/messages/:id/report
 */
export declare const reportMessage: (req: Request, res: Response) => Promise<void>;
/**
 * Get unread messages count
 * GET /api/messages/unread/count
 */
export declare const getUnreadCount: (req: Request, res: Response) => Promise<void>;
/**
 * Get store availability (business hours)
 * GET /api/stores/:id/availability
 */
export declare const getStoreAvailability: (req: Request, res: Response) => Promise<void>;
/**
 * Block a store
 * POST /api/stores/:id/block
 */
export declare const blockStore: (req: Request, res: Response) => Promise<void>;
/**
 * Unblock a store
 * POST /api/stores/:id/unblock
 */
export declare const unblockStore: (req: Request, res: Response) => Promise<void>;
