"use strict";
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
exports.Conversation = exports.ConversationStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Conversation Status
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["ACTIVE"] = "ACTIVE";
    ConversationStatus["ARCHIVED"] = "ARCHIVED";
    ConversationStatus["BLOCKED"] = "BLOCKED";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
// Conversation Schema
const ConversationSchema = new mongoose_1.Schema({
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    storeName: {
        type: String,
        required: true,
        trim: true
    },
    storeImage: {
        type: String
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerImage: {
        type: String
    },
    lastMessage: {
        content: {
            type: String,
            maxlength: 500
        },
        senderId: mongoose_1.Schema.Types.ObjectId,
        senderType: String,
        timestamp: Date,
        type: String
    },
    status: {
        type: String,
        enum: Object.values(ConversationStatus),
        default: ConversationStatus.ACTIVE,
        required: true,
        index: true
    },
    unreadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalMessages: {
        type: Number,
        default: 0,
        min: 0
    },
    businessHours: {
        isOpen: {
            type: Boolean,
            default: true
        },
        openTime: String,
        closeTime: String,
        timezone: String
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed
    },
    archivedAt: {
        type: Date
    },
    blockedAt: {
        type: Date
    },
    lastActivityAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});
// Compound Indexes
ConversationSchema.index({ customerId: 1, storeId: 1 }, { unique: true });
ConversationSchema.index({ customerId: 1, status: 1, lastActivityAt: -1 });
ConversationSchema.index({ customerId: 1, unreadCount: 1 });
ConversationSchema.index({ storeId: 1, status: 1, lastActivityAt: -1 });
// Virtual for checking if conversation is archived
ConversationSchema.virtual('isArchived').get(function () {
    return this.status === ConversationStatus.ARCHIVED;
});
// Virtual for checking if conversation is blocked
ConversationSchema.virtual('isBlocked').get(function () {
    return this.status === ConversationStatus.BLOCKED;
});
// Virtual for checking if store is currently open
ConversationSchema.virtual('isStoreOpen').get(function () {
    if (!this.businessHours)
        return true;
    if (!this.businessHours.isOpen)
        return false;
    if (!this.businessHours.openTime || !this.businessHours.closeTime) {
        return this.businessHours.isOpen;
    }
    // Simple time check (can be enhanced with timezone support)
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= this.businessHours.openTime &&
        currentTime <= this.businessHours.closeTime;
});
// Instance method to update last message
ConversationSchema.methods.updateLastMessage = async function (message) {
    this.lastMessage = message;
    this.lastActivityAt = message.timestamp;
    this.totalMessages += 1;
    // Increment unread count if message is not from customer
    if (message.senderId.toString() !== this.customerId.toString()) {
        this.unreadCount += 1;
    }
    await this.save();
    return this;
};
// Instance method to mark as read
ConversationSchema.methods.markAsRead = async function () {
    if (this.unreadCount > 0) {
        this.unreadCount = 0;
        await this.save();
    }
    return this;
};
// Instance method to archive conversation
ConversationSchema.methods.archive = async function () {
    this.status = ConversationStatus.ARCHIVED;
    this.archivedAt = new Date();
    await this.save();
    return this;
};
// Instance method to unarchive conversation
ConversationSchema.methods.unarchive = async function () {
    this.status = ConversationStatus.ACTIVE;
    this.archivedAt = undefined;
    await this.save();
    return this;
};
// Instance method to block conversation
ConversationSchema.methods.block = async function () {
    this.status = ConversationStatus.BLOCKED;
    this.blockedAt = new Date();
    await this.save();
    return this;
};
// Instance method to unblock conversation
ConversationSchema.methods.unblock = async function () {
    this.status = ConversationStatus.ACTIVE;
    this.blockedAt = undefined;
    await this.save();
    return this;
};
// Static method to get or create conversation
ConversationSchema.statics.getOrCreate = async function (customerId, storeId, storeData, customerData) {
    let conversation = await this.findOne({
        customerId,
        storeId
    });
    if (!conversation) {
        conversation = new this({
            customerId,
            storeId,
            storeName: storeData.storeName,
            storeImage: storeData.storeImage,
            customerName: customerData.customerName,
            customerImage: customerData.customerImage,
            status: ConversationStatus.ACTIVE,
            unreadCount: 0,
            totalMessages: 0,
            lastActivityAt: new Date()
        });
        await conversation.save();
    }
    return conversation;
};
// Static method to get total unread count for a customer
ConversationSchema.statics.getTotalUnreadCount = async function (customerId) {
    const result = await this.aggregate([
        {
            $match: {
                customerId,
                status: { $ne: ConversationStatus.BLOCKED }
            }
        },
        {
            $group: {
                _id: null,
                totalUnread: { $sum: '$unreadCount' }
            }
        }
    ]);
    return result.length > 0 ? result[0].totalUnread : 0;
};
// Static method to get conversations summary
ConversationSchema.statics.getConversationsSummary = async function (customerId, status) {
    const match = { customerId };
    if (status) {
        match.status = status;
    }
    else {
        match.status = { $ne: ConversationStatus.BLOCKED };
    }
    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                unreadCount: { $sum: '$unreadCount' },
                activeConversations: {
                    $sum: {
                        $cond: [{ $eq: ['$status', ConversationStatus.ACTIVE] }, 1, 0]
                    }
                }
            }
        }
    ]);
    return result.length > 0 ? result[0] : {
        totalConversations: 0,
        unreadCount: 0,
        activeConversations: 0
    };
};
exports.Conversation = mongoose_1.default.model('Conversation', ConversationSchema);
