"use strict";
// Messaging Controller
// Handles store messaging and conversations API endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.unblockStore = exports.blockStore = exports.getStoreAvailability = exports.getUnreadCount = exports.reportMessage = exports.searchMessages = exports.deleteConversation = exports.unarchiveConversation = exports.archiveConversation = exports.markConversationAsRead = exports.sendMessage = exports.getMessages = exports.getConversation = exports.getOrCreateConversation = exports.getConversations = void 0;
const mongoose_1 = require("mongoose");
const Conversation_1 = require("../models/Conversation");
const Message_1 = require("../models/Message");
/**
 * Get all conversations for a user
 * GET /api/messages/conversations
 */
const getConversations = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, search, page = 1, limit = 20 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        // Build query
        const query = {
            customerId: new mongoose_1.Types.ObjectId(userId)
        };
        // Apply status filter
        if (status) {
            if (status === 'active') {
                query.status = Conversation_1.ConversationStatus.ACTIVE;
            }
            else if (status === 'archived') {
                query.status = Conversation_1.ConversationStatus.ARCHIVED;
            }
            else {
                query.status = { $ne: Conversation_1.ConversationStatus.BLOCKED };
            }
        }
        else {
            // Default: exclude blocked conversations
            query.status = { $ne: Conversation_1.ConversationStatus.BLOCKED };
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
            Conversation_1.Conversation.find(query)
                .sort({ lastActivityAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Conversation_1.Conversation.countDocuments(query)
        ]);
        // Get summary
        const summary = await Conversation_1.Conversation.getConversationsSummary(new mongoose_1.Types.ObjectId(userId), status);
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversations',
            error: error.message,
        });
    }
};
exports.getConversations = getConversations;
/**
 * Get or create a conversation
 * POST /api/messages/conversations
 */
const getOrCreateConversation = async (req, res) => {
    try {
        const userId = req.userId;
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
        const conversation = await Conversation_1.Conversation.getOrCreate(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(storeId), { storeName, storeImage }, { customerName, customerImage });
        res.status(200).json({
            success: true,
            data: { conversation }
        });
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting/creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get or create conversation',
            error: error.message,
        });
    }
};
exports.getOrCreateConversation = getOrCreateConversation;
/**
 * Get conversation by ID
 * GET /api/messages/conversations/:id
 */
const getConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation',
            error: error.message,
        });
    }
};
exports.getConversation = getConversation;
/**
 * Get messages in a conversation
 * GET /api/messages/conversations/:id/messages
 */
const getMessages = async (req, res) => {
    try {
        const userId = req.userId;
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
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        // Build query
        const query = {
            conversationId: new mongoose_1.Types.ObjectId(id),
            deletedAt: { $exists: false }
        };
        // If 'before' timestamp is provided, get messages before that time
        if (before) {
            query.sentAt = { $lt: new Date(before) };
        }
        // Calculate pagination
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        // Get messages (newest first)
        const [messages, total] = await Promise.all([
            Message_1.Message.find(query)
                .sort({ sentAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Message_1.Message.countDocuments(query)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages',
            error: error.message,
        });
    }
};
exports.getMessages = getMessages;
/**
 * Send a message
 * POST /api/messages/conversations/:id/messages
 */
const sendMessage = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { content, type = Message_1.MessageType.TEXT, attachments, location, product, order } = req.body;
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
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        // Check if conversation is blocked
        if (conversation.status === Conversation_1.ConversationStatus.BLOCKED) {
            res.status(403).json({
                success: false,
                message: 'Cannot send message to blocked conversation',
            });
            return;
        }
        // Create message
        const message = new Message_1.Message({
            conversationId: new mongoose_1.Types.ObjectId(id),
            senderId: new mongoose_1.Types.ObjectId(userId),
            senderType: Message_1.SenderType.CUSTOMER,
            type,
            content,
            status: Message_1.MessageStatus.SENT,
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
            senderId: new mongoose_1.Types.ObjectId(userId),
            senderType: Message_1.SenderType.CUSTOMER,
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message,
        });
    }
};
exports.sendMessage = sendMessage;
/**
 * Mark conversation as read
 * PATCH /api/messages/conversations/:id/read
 */
const markConversationAsRead = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        // Verify conversation
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        // Mark all messages as read
        await Message_1.Message.markConversationAsRead(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId));
        // Update conversation unread count
        await conversation.markAsRead();
        res.status(200).json({
            success: true,
            message: 'Conversation marked as read'
        });
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error marking conversation as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark conversation as read',
            error: error.message,
        });
    }
};
exports.markConversationAsRead = markConversationAsRead;
/**
 * Archive conversation
 * PATCH /api/messages/conversations/:id/archive
 */
const archiveConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error archiving conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to archive conversation',
            error: error.message,
        });
    }
};
exports.archiveConversation = archiveConversation;
/**
 * Unarchive conversation
 * PATCH /api/messages/conversations/:id/unarchive
 */
const unarchiveConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error unarchiving conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unarchive conversation',
            error: error.message,
        });
    }
};
exports.unarchiveConversation = unarchiveConversation;
/**
 * Delete conversation
 * DELETE /api/messages/conversations/:id
 */
const deleteConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            _id: new mongoose_1.Types.ObjectId(id),
            customerId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        // Soft delete: mark messages as deleted
        await Message_1.Message.updateMany({ conversationId: new mongoose_1.Types.ObjectId(id) }, { $set: { deletedAt: new Date() } });
        // Delete conversation
        await Conversation_1.Conversation.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Conversation deleted successfully'
        });
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete conversation',
            error: error.message,
        });
    }
};
exports.deleteConversation = deleteConversation;
/**
 * Search messages
 * GET /api/messages/search
 */
const searchMessages = async (req, res) => {
    try {
        const userId = req.userId;
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
        const searchQuery = {
            content: { $regex: query, $options: 'i' },
            deletedAt: { $exists: false }
        };
        // If conversationId is provided, search within that conversation
        if (conversationId) {
            // Verify user has access to this conversation
            const conversation = await Conversation_1.Conversation.findOne({
                _id: new mongoose_1.Types.ObjectId(conversationId),
                customerId: new mongoose_1.Types.ObjectId(userId)
            });
            if (!conversation) {
                res.status(404).json({
                    success: false,
                    message: 'Conversation not found',
                });
                return;
            }
            searchQuery.conversationId = new mongoose_1.Types.ObjectId(conversationId);
        }
        else {
            // Search in all user's conversations
            const userConversations = await Conversation_1.Conversation.find({
                customerId: new mongoose_1.Types.ObjectId(userId)
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
            Message_1.Message.find(searchQuery)
                .sort({ sentAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('conversationId', 'storeName storeImage')
                .lean(),
            Message_1.Message.countDocuments(searchQuery)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error searching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search messages',
            error: error.message,
        });
    }
};
exports.searchMessages = searchMessages;
/**
 * Report a message
 * POST /api/messages/:id/report
 */
const reportMessage = async (req, res) => {
    try {
        const userId = req.userId;
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
        const message = await Message_1.Message.findById(id);
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found',
            });
            return;
        }
        // Verify user has access to this conversation
        const conversation = await Conversation_1.Conversation.findOne({
            _id: message.conversationId,
            customerId: new mongoose_1.Types.ObjectId(userId)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error reporting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report message',
            error: error.message,
        });
    }
};
exports.reportMessage = reportMessage;
/**
 * Get unread messages count
 * GET /api/messages/unread/count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const totalUnread = await Conversation_1.Conversation.getTotalUnreadCount(new mongoose_1.Types.ObjectId(userId));
        res.status(200).json({
            success: true,
            data: {
                unreadCount: totalUnread
            }
        });
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message,
        });
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Get store availability (business hours)
 * GET /api/stores/:id/availability
 */
const getStoreAvailability = async (req, res) => {
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error getting store availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get store availability',
            error: error.message,
        });
    }
};
exports.getStoreAvailability = getStoreAvailability;
/**
 * Block a store
 * POST /api/stores/:id/block
 */
const blockStore = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            customerId: new mongoose_1.Types.ObjectId(userId),
            storeId: new mongoose_1.Types.ObjectId(id)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error blocking store:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to block store',
            error: error.message,
        });
    }
};
exports.blockStore = blockStore;
/**
 * Unblock a store
 * POST /api/stores/:id/unblock
 */
const unblockStore = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const conversation = await Conversation_1.Conversation.findOne({
            customerId: new mongoose_1.Types.ObjectId(userId),
            storeId: new mongoose_1.Types.ObjectId(id)
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
    }
    catch (error) {
        console.error('❌ [MESSAGING CONTROLLER] Error unblocking store:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unblock store',
            error: error.message,
        });
    }
};
exports.unblockStore = unblockStore;
