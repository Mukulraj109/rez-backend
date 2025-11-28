// Messaging Controller
// Handles store messaging and conversations API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Conversation, ConversationStatus } from '../models/Conversation';
import { Message, MessageType, MessageStatus, SenderType } from '../models/Message';

/**
 * Get all conversations for a user
 * GET /api/messages/conversations
 */
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, search, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Build query
    const query: any = {
      customerId: new Types.ObjectId(userId)
    };

    // Apply status filter
    if (status) {
      if (status === 'active') {
        query.status = ConversationStatus.ACTIVE;
      } else if (status === 'archived') {
        query.status = ConversationStatus.ARCHIVED;
      } else {
        query.status = { $ne: ConversationStatus.BLOCKED };
      }
    } else {
      // Default: exclude blocked conversations
      query.status = { $ne: ConversationStatus.BLOCKED };
    }

    // Apply search filter
    if (search) {
      query.storeName = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get conversations
    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Conversation.countDocuments(query)
    ]);

    // Get summary
    const summary = await Conversation.getConversationsSummary(
      new Types.ObjectId(userId),
      status as ConversationStatus
    );

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum
        },
        summary
      }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message,
    });
  }
};

/**
 * Get or create a conversation
 * POST /api/messages/conversations
 */
export const getOrCreateConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { storeId, storeName, storeImage } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!storeId || !storeName) {
      res.status(400).json({
        success: false,
        message: 'Store ID and name are required',
      });
      return;
    }

    // Get customer name from user (you may need to fetch from User model)
    const customerName = req.body.customerName || 'Customer';
    const customerImage = req.body.customerImage;

    const conversation = await Conversation.getOrCreate(
      new Types.ObjectId(userId),
      new Types.ObjectId(storeId),
      { storeName, storeImage },
      { customerName, customerImage }
    );

    res.status(200).json({
      success: true,
      data: { conversation }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting/creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get or create conversation',
      error: error.message,
    });
  }
};

/**
 * Get conversation by ID
 * GET /api/messages/conversations/:id
 */
export const getConversation = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { conversation }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message,
    });
  }
};

/**
 * Get messages in a conversation
 * GET /api/messages/conversations/:id/messages
 */
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Build query
    const query: any = {
      conversationId: new Types.ObjectId(id),
      deletedAt: { $exists: false }
    };

    // If 'before' timestamp is provided, get messages before that time
    if (before) {
      query.sentAt = { $lt: new Date(before as string) };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get messages (newest first)
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments(query)
    ]);

    // Reverse to show oldest first in the list
    messages.reverse();

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum,
          hasMore: pageNum < totalPages
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message,
    });
  }
};

/**
 * Send a message
 * POST /api/messages/conversations/:id/messages
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { content, type = MessageType.TEXT, attachments, location, product, order } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
      return;
    }

    // Verify conversation exists and user has access
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Check if conversation is blocked
    if (conversation.status === ConversationStatus.BLOCKED) {
      res.status(403).json({
        success: false,
        message: 'Cannot send message to blocked conversation',
      });
      return;
    }

    // Create message
    const message = new Message({
      conversationId: new Types.ObjectId(id),
      senderId: new Types.ObjectId(userId),
      senderType: SenderType.CUSTOMER,
      type,
      content,
      status: MessageStatus.SENT,
      attachments,
      location,
      product,
      order,
      sentAt: new Date()
    });

    await message.save();

    // Update conversation's last message
    await conversation.updateLastMessage({
      content,
      senderId: new Types.ObjectId(userId),
      senderType: SenderType.CUSTOMER,
      timestamp: message.sentAt,
      type
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

    // TODO: Emit WebSocket event for real-time updates
    // io.to(storeId).emit('new_message', message);

  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * Mark conversation as read
 * PATCH /api/messages/conversations/:id/read
 */
export const markConversationAsRead = async (req: Request, res: Response): Promise<void> => {
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

    // Verify conversation
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Mark all messages as read
    await Message.markConversationAsRead(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    // Update conversation unread count
    await conversation.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: error.message,
    });
  }
};

/**
 * Archive conversation
 * PATCH /api/messages/conversations/:id/archive
 */
export const archiveConversation = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.archive();

    res.status(200).json({
      success: true,
      message: 'Conversation archived successfully'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversation',
      error: error.message,
    });
  }
};

/**
 * Unarchive conversation
 * PATCH /api/messages/conversations/:id/unarchive
 */
export const unarchiveConversation = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.unarchive();

    res.status(200).json({
      success: true,
      message: 'Conversation unarchived successfully'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error unarchiving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive conversation',
      error: error.message,
    });
  }
};

/**
 * Delete conversation
 * DELETE /api/messages/conversations/:id
 */
export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Soft delete: mark messages as deleted
    await Message.updateMany(
      { conversationId: new Types.ObjectId(id) },
      { $set: { deletedAt: new Date() } }
    );

    // Delete conversation
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message,
    });
  }
};

/**
 * Search messages
 * GET /api/messages/search
 */
export const searchMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { query, conversationId, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    // Build search query
    const searchQuery: any = {
      content: { $regex: query, $options: 'i' },
      deletedAt: { $exists: false }
    };

    // If conversationId is provided, search within that conversation
    if (conversationId) {
      // Verify user has access to this conversation
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(conversationId as string),
        customerId: new Types.ObjectId(userId)
      });

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
        return;
      }

      searchQuery.conversationId = new Types.ObjectId(conversationId as string);
    } else {
      // Search in all user's conversations
      const userConversations = await Conversation.find({
        customerId: new Types.ObjectId(userId)
      }).select('_id');

      const conversationIds = userConversations.map(c => c._id);
      searchQuery.conversationId = { $in: conversationIds };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search messages
    const [messages, total] = await Promise.all([
      Message.find(searchQuery)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('conversationId', 'storeName storeImage')
        .lean(),
      Message.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message,
    });
  }
};

/**
 * Report a message
 * POST /api/messages/:id/report
 */
export const reportMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason, details } = req.body;

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
        message: 'Report reason is required',
      });
      return;
    }

    const message = await Message.findById(id);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Store report in metadata (you might want a separate Report model)
    message.metadata = {
      ...message.metadata,
      reported: true,
      reportedBy: userId,
      reportReason: reason,
      reportDetails: details,
      reportedAt: new Date()
    };

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message reported successfully'
    });

    // TODO: Send notification to admin/moderation team

  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error reporting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report message',
      error: error.message,
    });
  }
};

/**
 * Get unread messages count
 * GET /api/messages/unread/count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const totalUnread = await Conversation.getTotalUnreadCount(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: {
        unreadCount: totalUnread
      }
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};

/**
 * Get store availability (business hours)
 * GET /api/stores/:id/availability
 */
export const getStoreAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // For now, return default business hours
    // TODO: Fetch actual store business hours from Store model
    const availability = {
      isOpen: true,
      businessHours: {
        monday: { open: '09:00', close: '21:00', isOpen: true },
        tuesday: { open: '09:00', close: '21:00', isOpen: true },
        wednesday: { open: '09:00', close: '21:00', isOpen: true },
        thursday: { open: '09:00', close: '21:00', isOpen: true },
        friday: { open: '09:00', close: '21:00', isOpen: true },
        saturday: { open: '10:00', close: '20:00', isOpen: true },
        sunday: { open: '10:00', close: '20:00', isOpen: true }
      },
      currentStatus: {
        isOpen: true,
        message: 'Store is currently open',
        nextChange: {
          time: '21:00',
          status: 'closed'
        }
      },
      responseTime: {
        average: '5-15 minutes',
        status: 'active'
      }
    };

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error getting store availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get store availability',
      error: error.message,
    });
  }
};

/**
 * Block a store
 * POST /api/stores/:id/block
 */
export const blockStore = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      customerId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(id)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.block();

    res.status(200).json({
      success: true,
      message: 'Store blocked successfully'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error blocking store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block store',
      error: error.message,
    });
  }
};

/**
 * Unblock a store
 * POST /api/stores/:id/unblock
 */
export const unblockStore = async (req: Request, res: Response): Promise<void> => {
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

    const conversation = await Conversation.findOne({
      customerId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(id)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.unblock();

    res.status(200).json({
      success: true,
      message: 'Store unblocked successfully'
    });
  } catch (error: any) {
    console.error('❌ [MESSAGING CONTROLLER] Error unblocking store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock store',
      error: error.message,
    });
  }
};
