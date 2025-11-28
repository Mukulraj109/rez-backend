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
exports.Message = exports.SenderType = exports.MessageStatus = exports.MessageType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Message Types
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["VIDEO"] = "VIDEO";
    MessageType["FILE"] = "FILE";
    MessageType["LOCATION"] = "LOCATION";
    MessageType["PRODUCT"] = "PRODUCT";
    MessageType["ORDER"] = "ORDER";
    MessageType["SYSTEM"] = "SYSTEM";
})(MessageType || (exports.MessageType = MessageType = {}));
// Message Status
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
    MessageStatus["FAILED"] = "FAILED";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
// Sender Type
var SenderType;
(function (SenderType) {
    SenderType["CUSTOMER"] = "CUSTOMER";
    SenderType["STORE"] = "STORE";
    SenderType["SYSTEM"] = "SYSTEM";
})(SenderType || (exports.SenderType = SenderType = {}));
// Message Schema
const MessageSchema = new mongoose_1.Schema({
    conversationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderType' // Dynamic reference based on senderType
    },
    senderType: {
        type: String,
        enum: Object.values(SenderType),
        required: true
    },
    type: {
        type: String,
        enum: Object.values(MessageType),
        default: MessageType.TEXT,
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: Object.values(MessageStatus),
        default: MessageStatus.SENT,
        required: true
    },
    attachments: [{
            url: {
                type: String,
                required: true
            },
            type: {
                type: String,
                required: true
            },
            name: String,
            size: Number,
            thumbnail: String
        }],
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    product: {
        id: mongoose_1.Schema.Types.ObjectId,
        name: String,
        price: Number,
        image: String
    },
    order: {
        id: mongoose_1.Schema.Types.ObjectId,
        orderNumber: String
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed
    },
    sentAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    deliveredAt: {
        type: Date
    },
    readAt: {
        type: Date
    },
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true
});
// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, sentAt: -1 });
MessageSchema.index({ conversationId: 1, status: 1 });
MessageSchema.index({ senderId: 1, senderType: 1, sentAt: -1 });
// Virtual for checking if message is read
MessageSchema.virtual('isRead').get(function () {
    return !!this.readAt;
});
// Virtual for checking if message is delivered
MessageSchema.virtual('isDelivered').get(function () {
    return !!this.deliveredAt;
});
// Instance method to mark as delivered
MessageSchema.methods.markAsDelivered = async function () {
    if (!this.deliveredAt) {
        this.deliveredAt = new Date();
        this.status = MessageStatus.DELIVERED;
        await this.save();
    }
    return this;
};
// Instance method to mark as read
MessageSchema.methods.markAsRead = async function () {
    if (!this.readAt) {
        this.readAt = new Date();
        this.status = MessageStatus.READ;
        if (!this.deliveredAt) {
            this.deliveredAt = new Date();
        }
        await this.save();
    }
    return this;
};
// Static method to get unread count for a user in a conversation
MessageSchema.statics.getUnreadCount = async function (conversationId, userId) {
    return await this.countDocuments({
        conversationId,
        senderId: { $ne: userId },
        status: { $in: [MessageStatus.SENT, MessageStatus.DELIVERED] }
    });
};
// Static method to mark all messages as read in a conversation
MessageSchema.statics.markConversationAsRead = async function (conversationId, userId) {
    const now = new Date();
    return await this.updateMany({
        conversationId,
        senderId: { $ne: userId },
        readAt: { $exists: false }
    }, {
        $set: {
            readAt: now,
            status: MessageStatus.READ
        }
    });
};
exports.Message = mongoose_1.default.model('Message', MessageSchema);
