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
exports.Notification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Notification Schema
const NotificationSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    type: {
        type: String,
        required: true,
        enum: ['info', 'success', 'warning', 'error', 'promotional'],
        default: 'info',
        index: true
    },
    category: {
        type: String,
        required: true,
        enum: ['order', 'earning', 'general', 'promotional', 'social', 'security', 'system', 'reminder'],
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    data: {
        orderId: String,
        projectId: String,
        transactionId: String,
        storeId: String,
        productId: String,
        videoId: String,
        userId: String,
        amount: Number,
        imageUrl: String,
        deepLink: String,
        externalLink: String,
        actionButton: {
            text: String,
            action: {
                type: String,
                enum: ['navigate', 'api_call', 'external_link']
            },
            target: String
        },
        metadata: mongoose_1.Schema.Types.Mixed
    },
    pushSettings: {
        title: {
            type: String,
            trim: true,
            maxlength: 100
        },
        body: {
            type: String,
            trim: true,
            maxlength: 500
        },
        icon: String,
        image: String,
        badge: {
            type: Number,
            min: 0
        },
        sound: String,
        clickAction: String,
        tag: String,
        requireInteraction: {
            type: Boolean,
            default: false
        },
        silent: {
            type: Boolean,
            default: false
        },
        actions: [{
                action: { type: String, required: true },
                title: { type: String, required: true },
                icon: String
            }]
    },
    deliveryChannels: [{
            type: String,
            enum: ['push', 'email', 'sms', 'in_app'],
            required: true
        }],
    deliveryStatus: {
        push: {
            sent: { type: Boolean, default: false },
            sentAt: Date,
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            clicked: { type: Boolean, default: false },
            clickedAt: Date,
            failed: { type: Boolean, default: false },
            failureReason: String
        },
        email: {
            sent: { type: Boolean, default: false },
            sentAt: Date,
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            opened: { type: Boolean, default: false },
            openedAt: Date,
            clicked: { type: Boolean, default: false },
            clickedAt: Date,
            failed: { type: Boolean, default: false },
            failureReason: String
        },
        sms: {
            sent: { type: Boolean, default: false },
            sentAt: Date,
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            failed: { type: Boolean, default: false },
            failureReason: String
        },
        inApp: {
            delivered: { type: Boolean, default: true },
            deliveredAt: { type: Date, default: Date.now },
            read: { type: Boolean, default: false },
            readAt: Date
        }
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: Date,
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    },
    archivedAt: Date,
    deletedAt: {
        type: Date,
        index: true
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    },
    scheduledAt: {
        type: Date,
        index: true
    },
    sentAt: Date,
    batchId: {
        type: String,
        index: true
    },
    campaignId: {
        type: String,
        index: true
    },
    segmentId: String,
    source: {
        type: String,
        required: true,
        enum: ['system', 'admin', 'automated', 'campaign'],
        default: 'system'
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    template: String,
    variables: {
        type: Map,
        of: mongoose_1.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ batchId: 1 });
NotificationSchema.index({ campaignId: 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ source: 1, createdAt: -1 });
// Compound indexes
NotificationSchema.index({ user: 1, isRead: 1, isArchived: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1, isArchived: 1, deletedAt: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, priority: 1, createdAt: -1 });
// Virtual for age in hours
NotificationSchema.virtual('ageInHours').get(function () {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});
// Virtual for delivery success rate
NotificationSchema.virtual('deliverySuccessRate').get(function () {
    const channels = this.deliveryChannels.length;
    if (channels === 0)
        return 0;
    let successful = 0;
    if (this.deliveryChannels.includes('push') && this.deliveryStatus.push?.delivered)
        successful++;
    if (this.deliveryChannels.includes('email') && this.deliveryStatus.email?.delivered)
        successful++;
    if (this.deliveryChannels.includes('sms') && this.deliveryStatus.sms?.delivered)
        successful++;
    if (this.deliveryChannels.includes('in_app') && this.deliveryStatus.inApp?.delivered)
        successful++;
    return (successful / channels) * 100;
});
// Pre-save hook
NotificationSchema.pre('save', function (next) {
    // Set default push settings if not provided but push is in delivery channels
    if (this.deliveryChannels.includes('push') && !this.pushSettings) {
        this.pushSettings = {
            title: this.title,
            body: this.message
        };
    }
    // Set default expiry (30 days for regular, 7 days for promotional)
    if (!this.expiresAt) {
        const daysToExpire = this.category === 'promotional' ? 7 : 30;
        this.expiresAt = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
    }
    next();
});
// Method to mark notification as read
NotificationSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        this.deliveryStatus.inApp.read = true;
        this.deliveryStatus.inApp.readAt = new Date();
        await this.save();
    }
};
// Method to mark as delivered for specific channel
NotificationSchema.methods.markAsDelivered = async function (channel) {
    const now = new Date();
    switch (channel) {
        case 'push':
            if (this.deliveryStatus.push) {
                this.deliveryStatus.push.delivered = true;
                this.deliveryStatus.push.deliveredAt = now;
            }
            break;
        case 'email':
            if (this.deliveryStatus.email) {
                this.deliveryStatus.email.delivered = true;
                this.deliveryStatus.email.deliveredAt = now;
            }
            break;
        case 'sms':
            if (this.deliveryStatus.sms) {
                this.deliveryStatus.sms.delivered = true;
                this.deliveryStatus.sms.deliveredAt = now;
            }
            break;
    }
    if (!this.sentAt) {
        this.sentAt = now;
    }
    await this.save();
};
// Method to mark as clicked for specific channel
NotificationSchema.methods.markAsClicked = async function (channel) {
    const now = new Date();
    switch (channel) {
        case 'push':
            if (this.deliveryStatus.push) {
                this.deliveryStatus.push.clicked = true;
                this.deliveryStatus.push.clickedAt = now;
            }
            break;
        case 'email':
            if (this.deliveryStatus.email) {
                this.deliveryStatus.email.clicked = true;
                this.deliveryStatus.email.clickedAt = now;
            }
            break;
    }
    // Mark as read when clicked
    if (!this.isRead) {
        await this.markAsRead();
    }
    await this.save();
};
// Method to archive notification
NotificationSchema.methods.archive = async function () {
    this.isArchived = true;
    this.archivedAt = new Date();
    await this.save();
};
// Method to check if notification can be delivered
NotificationSchema.methods.canBeDelivered = function () {
    // Check if scheduled time has passed
    if (this.scheduledAt && this.scheduledAt > new Date()) {
        return false;
    }
    // Check if expired
    if (this.expiresAt && this.expiresAt < new Date()) {
        return false;
    }
    // Check if already sent
    if (this.sentAt) {
        return false;
    }
    return true;
};
// Method to get formatted message with variables replaced
NotificationSchema.methods.getFormattedMessage = function () {
    let message = this.message;
    if (this.variables) {
        this.variables.forEach((value, key) => {
            const placeholder = `{{${key}}}`;
            message = message.replace(new RegExp(placeholder, 'g'), value);
        });
    }
    return message;
};
// Static method to get user notifications
NotificationSchema.statics.getUserNotifications = function (userId, filters = {}, limit = 50, skip = 0) {
    const query = {
        user: userId,
        isArchived: false,
        deletedAt: { $exists: false }
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.type) {
        query.type = filters.type;
    }
    if (filters.isRead !== undefined) {
        query.isRead = filters.isRead;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }
    return this.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip);
};
// Static method to get unread count
NotificationSchema.statics.getUnreadCount = function (userId, category) {
    const query = {
        user: userId,
        isRead: false,
        isArchived: false,
        deletedAt: { $exists: false }
    };
    if (category) {
        query.category = category;
    }
    return this.countDocuments(query);
};
// Static method to mark all as read
NotificationSchema.statics.markAllAsRead = function (userId, category) {
    const query = {
        user: userId,
        isRead: false,
        isArchived: false,
        deletedAt: { $exists: false }
    };
    if (category) {
        query.category = category;
    }
    return this.updateMany(query, {
        $set: {
            isRead: true,
            readAt: new Date(),
            'deliveryStatus.inApp.read': true,
            'deliveryStatus.inApp.readAt': new Date()
        }
    });
};
// Static method to get scheduled notifications ready for delivery
NotificationSchema.statics.getScheduledForDelivery = function (limit = 100) {
    return this.find({
        scheduledAt: { $lte: new Date() },
        sentAt: { $exists: false },
        expiresAt: { $gt: new Date() }
    })
        .limit(limit)
        .sort({ priority: -1, scheduledAt: 1 });
};
// Static method to cleanup expired notifications
NotificationSchema.statics.cleanupExpired = function () {
    return this.deleteMany({
        expiresAt: { $lt: new Date() },
        isRead: true,
        isArchived: true
    });
};
// Static method to create bulk notifications
NotificationSchema.statics.createBulkNotifications = async function (notifications, batchId) {
    const batch = batchId || `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationDocs = notifications.map(notification => ({
        ...notification,
        batchId: batch,
        source: notification.source || 'system'
    }));
    return this.insertMany(notificationDocs);
};
// Static method to get notification analytics
NotificationSchema.statics.getAnalytics = function (filters = {}, dateRange) {
    const matchStage = {
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    };
    if (filters.category) {
        matchStage.category = filters.category;
    }
    if (filters.source) {
        matchStage.source = filters.source;
    }
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    category: '$category',
                    type: '$type'
                },
                totalSent: { $sum: 1 },
                totalRead: { $sum: { $cond: ['$isRead', 1, 0] } },
                totalDelivered: {
                    $sum: {
                        $cond: ['$deliveryStatus.inApp.delivered', 1, 0]
                    }
                },
                avgReadTime: {
                    $avg: {
                        $cond: [
                            '$readAt',
                            { $subtract: ['$readAt', '$createdAt'] },
                            null
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                readRate: { $multiply: [{ $divide: ['$totalRead', '$totalSent'] }, 100] },
                deliveryRate: { $multiply: [{ $divide: ['$totalDelivered', '$totalSent'] }, 100] }
            }
        },
        {
            $sort: { '_id.category': 1, '_id.type': 1 }
        }
    ]);
};
exports.Notification = mongoose_1.default.model('Notification', NotificationSchema);
