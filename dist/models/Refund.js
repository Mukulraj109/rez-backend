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
exports.Refund = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RefundSchema = new mongoose_1.Schema({
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    orderNumber: {
        type: String,
        required: true,
        uppercase: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['razorpay', 'stripe', 'wallet', 'cod']
    },
    refundAmount: {
        type: Number,
        required: true,
        min: 0
    },
    refundType: {
        type: String,
        required: true,
        enum: ['full', 'partial']
    },
    refundReason: {
        type: String,
        required: true,
        trim: true
    },
    gatewayRefundId: String,
    gatewayStatus: String,
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    failureReason: String,
    refundedItems: [{
            itemId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 },
            refundAmount: { type: Number, required: true, min: 0 }
        }],
    requestedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    notificationsSent: {
        sms: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sentAt: Date
    },
    processedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    metadata: mongoose_1.Schema.Types.Mixed
}, {
    timestamps: true
});
// Indexes for efficient queries
RefundSchema.index({ user: 1, createdAt: -1 });
RefundSchema.index({ order: 1 });
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ gatewayRefundId: 1 }, { sparse: true });
RefundSchema.index({ paymentMethod: 1, status: 1 });
exports.Refund = mongoose_1.default.model('Refund', RefundSchema);
