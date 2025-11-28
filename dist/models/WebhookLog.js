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
exports.WebhookLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WebhookLogSchema = new mongoose_1.Schema({
    provider: {
        type: String,
        enum: ['razorpay', 'stripe'],
        required: true,
        index: true
    },
    eventId: {
        type: String,
        required: true,
        unique: true, // Ensures idempotency - same event can't be processed twice
        index: true
    },
    eventType: {
        type: String,
        required: true,
        index: true
    },
    payload: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
    signature: {
        type: String,
        required: true
    },
    signatureValid: {
        type: Boolean,
        required: true,
        default: false
    },
    processed: {
        type: Boolean,
        default: false,
        index: true
    },
    processedAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'success', 'failed', 'duplicate'],
        default: 'pending',
        index: true
    },
    errorMessage: {
        type: String
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    metadata: {
        orderId: String,
        paymentId: String,
        amount: Number,
        currency: String
    }
}, {
    timestamps: true
});
// Compound indexes for efficient queries
WebhookLogSchema.index({ provider: 1, eventType: 1, createdAt: -1 });
WebhookLogSchema.index({ provider: 1, processed: 1, createdAt: -1 });
WebhookLogSchema.index({ 'metadata.orderId': 1 });
WebhookLogSchema.index({ 'metadata.paymentId': 1 });
// TTL index - automatically delete logs older than 90 days
WebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
// Static method to check if event was already processed
WebhookLogSchema.statics.isEventProcessed = async function (eventId) {
    const existingLog = await this.findOne({
        eventId,
        $or: [
            { processed: true },
            { status: 'success' }
        ]
    });
    return !!existingLog;
};
// Static method to mark event as duplicate
WebhookLogSchema.statics.markAsDuplicate = async function (eventId) {
    await this.findOneAndUpdate({ eventId }, {
        status: 'duplicate',
        errorMessage: 'Duplicate webhook event detected'
    });
};
exports.WebhookLog = mongoose_1.default.model('WebhookLog', WebhookLogSchema);
