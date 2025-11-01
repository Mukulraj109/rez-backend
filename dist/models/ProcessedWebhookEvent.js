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
exports.ProcessedWebhookEvent = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * ProcessedWebhookEvent Schema
 * Stores records of all processed webhooks to prevent duplicate processing
 */
const ProcessedWebhookEventSchema = new mongoose_1.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        description: 'Unique Razorpay event ID',
    },
    eventType: {
        type: String,
        required: true,
        trim: true,
        index: true,
        enum: [
            'subscription.activated',
            'subscription.charged',
            'subscription.completed',
            'subscription.cancelled',
            'subscription.paused',
            'subscription.resumed',
            'subscription.pending',
            'subscription.halted',
            'subscription.updated',
            'invoice.paid',
            'invoice.issued',
            'invoice.failed',
        ],
        description: 'Type of webhook event',
    },
    subscriptionId: {
        type: String,
        sparse: true,
        index: true,
        description: 'Associated Razorpay subscription ID',
    },
    razorpaySignature: {
        type: String,
        required: true,
        description: 'Razorpay webhook signature for audit purposes',
    },
    processedAt: {
        type: Date,
        required: true,
        default: () => new Date(),
        index: true,
        description: 'Timestamp when webhook was processed',
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => {
            const date = new Date();
            date.setDate(date.getDate() + 30); // Auto-delete after 30 days
            return date;
        },
        index: { expireAfterSeconds: 0 }, // TTL index - auto-delete
        description: 'Auto-expiration date for cleanup',
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success',
        index: true,
        description: 'Processing status of the webhook',
    },
    errorMessage: {
        type: String,
        sparse: true,
        description: 'Error message if processing failed',
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0,
        description: 'Number of retry attempts',
    },
    lastRetryAt: {
        type: Date,
        sparse: true,
        description: 'Timestamp of last retry attempt',
    },
    ipAddress: {
        type: String,
        sparse: true,
        description: 'IP address that sent the webhook',
    },
    userAgent: {
        type: String,
        sparse: true,
        description: 'User agent string from webhook request',
    },
}, {
    timestamps: true,
    collection: 'processed_webhook_events',
});
/**
 * Create indexes for efficient querying and automatic cleanup
 */
ProcessedWebhookEventSchema.index({ eventId: 1 }, { unique: true });
ProcessedWebhookEventSchema.index({ eventType: 1, processedAt: -1 });
ProcessedWebhookEventSchema.index({ subscriptionId: 1 });
ProcessedWebhookEventSchema.index({ status: 1 });
ProcessedWebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
/**
 * Static method to check if a webhook event has already been processed
 */
ProcessedWebhookEventSchema.statics.isEventProcessed = async function (eventId) {
    const existingEvent = await this.findOne({ eventId });
    return !!existingEvent;
};
/**
 * Static method to get event history for a subscription
 */
ProcessedWebhookEventSchema.statics.getSubscriptionEventHistory = async function (subscriptionId, limit = 50) {
    return await this.find({ subscriptionId })
        .sort({ processedAt: -1 })
        .limit(limit);
};
/**
 * Static method to record a processed webhook event
 */
ProcessedWebhookEventSchema.statics.recordEvent = async function (eventId, eventType, subscriptionId, razorpaySignature, ipAddress, userAgent) {
    try {
        const event = new this({
            eventId,
            eventType,
            subscriptionId,
            razorpaySignature,
            status: 'success',
            ipAddress,
            userAgent,
            processedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        return await event.save();
    }
    catch (error) {
        // If duplicate key error, the event was already recorded
        if (error.code === 11000) {
            console.warn(`[WEBHOOK] Event already recorded: ${eventId}`, { error: error.message });
            throw new Error(`Duplicate event: ${eventId}`);
        }
        throw error;
    }
};
/**
 * Static method to mark event as failed
 */
ProcessedWebhookEventSchema.statics.markEventFailed = async function (eventId, errorMessage) {
    return await this.findOneAndUpdate({ eventId }, {
        status: 'failed',
        errorMessage,
        lastRetryAt: new Date(),
        $inc: { retryCount: 1 },
    }, { new: true });
};
/**
 * Static method to get recent failed events
 */
ProcessedWebhookEventSchema.statics.getFailedEvents = async function (hoursAgo = 24) {
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return await this.find({
        status: 'failed',
        processedAt: { $gte: cutoffDate },
    }).sort({ processedAt: -1 });
};
/**
 * Static method to get event statistics
 */
ProcessedWebhookEventSchema.statics.getEventStats = async function (hoursAgo = 24) {
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const stats = await this.aggregate([
        {
            $match: { processedAt: { $gte: cutoffDate } },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);
    return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
    }, { success: 0, failed: 0, pending: 0 });
};
exports.ProcessedWebhookEvent = mongoose_1.default.model('ProcessedWebhookEvent', ProcessedWebhookEventSchema);
