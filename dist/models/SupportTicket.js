"use strict";
// Support Ticket Model
// Manages customer support tickets and conversations
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicket = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TicketMessageSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    senderType: {
        type: String,
        enum: ['user', 'agent', 'system'],
        required: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    attachments: [{
            type: String, // URLs to uploaded files
        }],
    timestamp: {
        type: Date,
        default: Date.now,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { _id: true });
const SupportTicketSchema = new mongoose_1.Schema({
    ticketNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    category: {
        type: String,
        enum: ['order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other'],
        required: true,
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true,
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
        default: 'open',
        index: true,
    },
    relatedEntity: {
        type: {
            type: String,
            enum: ['order', 'product', 'transaction', 'none'],
            default: 'none',
        },
        id: {
            type: mongoose_1.Schema.Types.ObjectId,
            refPath: 'relatedEntity.type',
        },
    },
    messages: [TicketMessageSchema],
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // Agent/Admin
        index: true,
    },
    resolvedAt: {
        type: Date,
    },
    closedAt: {
        type: Date,
    },
    resolution: {
        type: String,
        maxlength: 2000,
    },
    rating: {
        score: {
            type: Number,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            maxlength: 1000,
        },
        ratedAt: {
            type: Date,
        },
    },
    attachments: [{
            type: String, // URLs to initial ticket attachments
        }],
    tags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
    internalNotes: [{
            type: String, // Agent-only notes
        }],
    responseTime: {
        type: Number, // Minutes from creation to first agent response
    },
    resolutionTime: {
        type: Number, // Minutes from creation to resolution
    },
}, {
    timestamps: true,
});
// Compound indexes
SupportTicketSchema.index({ user: 1, status: 1 });
SupportTicketSchema.index({ ticketNumber: 1, user: 1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ status: 1, priority: -1 });
// Virtual for unread message count (for user)
SupportTicketSchema.virtual('unreadCount').get(function () {
    return this.messages.filter(msg => msg.senderType !== 'user' && !msg.isRead).length;
});
// Virtual for last message
SupportTicketSchema.virtual('lastMessage').get(function () {
    if (this.messages.length === 0)
        return null;
    return this.messages[this.messages.length - 1];
});
// Virtual for is active
SupportTicketSchema.virtual('isActive').get(function () {
    return this.status !== 'closed' && this.status !== 'resolved';
});
// Instance method to add message
SupportTicketSchema.methods.addMessage = async function (senderId, senderType, message, attachments = []) {
    this.messages.push({
        sender: senderId,
        senderType,
        message,
        attachments,
        timestamp: new Date(),
        isRead: false,
    });
    // Update status if user responds while waiting
    if (senderType === 'user' && this.status === 'waiting_customer') {
        this.status = 'in_progress';
    }
    // Calculate response time if this is first agent response
    if (senderType === 'agent' && !this.responseTime) {
        const createdTime = this.createdAt.getTime();
        const responseTime = new Date().getTime();
        this.responseTime = Math.round((responseTime - createdTime) / (1000 * 60)); // minutes
    }
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Message added to ticket ${this.ticketNumber}`);
};
// Instance method to mark messages as read
SupportTicketSchema.methods.markMessagesAsRead = async function (userType) {
    const senderTypeToMarkRead = userType === 'user' ? ['agent', 'system'] : ['user'];
    this.messages.forEach((msg) => {
        if (senderTypeToMarkRead.includes(msg.senderType)) {
            msg.isRead = true;
        }
    });
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Messages marked as read for ${userType}`);
};
// Instance method to resolve ticket
SupportTicketSchema.methods.resolveTicket = async function (resolution, resolvedBy) {
    this.status = 'resolved';
    this.resolution = resolution;
    this.resolvedAt = new Date();
    // Calculate resolution time
    const createdTime = this.createdAt.getTime();
    const resolvedTime = this.resolvedAt.getTime();
    this.resolutionTime = Math.round((resolvedTime - createdTime) / (1000 * 60)); // minutes
    // Add system message
    this.messages.push({
        sender: resolvedBy,
        senderType: 'system',
        message: `Ticket has been resolved: ${resolution}`,
        attachments: [],
        timestamp: new Date(),
        isRead: false,
    });
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} resolved`);
};
// Instance method to close ticket
SupportTicketSchema.methods.closeTicket = async function () {
    this.status = 'closed';
    this.closedAt = new Date();
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} closed`);
};
// Instance method to reopen ticket
SupportTicketSchema.methods.reopenTicket = async function (userId, reason) {
    this.status = 'open';
    this.resolvedAt = undefined;
    this.closedAt = undefined;
    this.resolution = undefined;
    // Add system message
    this.messages.push({
        sender: userId,
        senderType: 'system',
        message: `Ticket has been reopened: ${reason}`,
        attachments: [],
        timestamp: new Date(),
        isRead: false,
    });
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} reopened`);
};
// Instance method to rate ticket
SupportTicketSchema.methods.rateTicket = async function (score, comment) {
    this.rating = {
        score,
        comment,
        ratedAt: new Date(),
    };
    await this.save();
    console.log(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} rated: ${score}/5`);
};
// Static method to generate ticket number
SupportTicketSchema.statics.generateTicketNumber = async function () {
    const year = new Date().getFullYear();
    const prefix = `SUPP-${year}`;
    // Get count of tickets this year
    const count = await this.countDocuments({
        ticketNumber: new RegExp(`^${prefix}`),
    });
    const ticketNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    return ticketNumber;
};
// Static method to get user's active tickets
SupportTicketSchema.statics.getUserActiveTickets = async function (userId) {
    return this.find({
        user: userId,
        status: { $nin: ['closed', 'resolved'] },
    })
        .sort({ updatedAt: -1 })
        .populate('assignedTo', 'profile.firstName profile.lastName')
        .lean();
};
// Static method to get tickets by status
SupportTicketSchema.statics.getTicketsByStatus = async function (userId, status) {
    return this.find({
        user: userId,
        status,
    })
        .sort({ updatedAt: -1 })
        .populate('assignedTo', 'profile.firstName profile.lastName')
        .lean();
};
// Static method to auto-assign ticket (round-robin)
SupportTicketSchema.statics.autoAssignTicket = async function (ticketId) {
    // This would integrate with an agent management system
    // For now, we'll leave unassigned
    console.log(`📋 [SUPPORT_TICKET] Auto-assign logic not yet implemented for ticket ${ticketId}`);
};
// Pre-save hook to set priority based on category
SupportTicketSchema.pre('save', function (next) {
    // Auto-set high priority for payment and refund issues
    if (!this.priority || this.priority === 'medium') {
        if (this.category === 'payment' || this.category === 'refund') {
            this.priority = 'high';
        }
    }
    next();
});
exports.SupportTicket = mongoose_1.default.model('SupportTicket', SupportTicketSchema);
