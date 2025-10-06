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
exports.StockNotification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Stock Notification Schema
const StockNotificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
    },
    notificationMethod: {
        type: String,
        enum: ['email', 'sms', 'both', 'push'],
        default: 'push',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'cancelled'],
        default: 'pending',
        required: true,
        index: true
    },
    notifiedAt: {
        type: Date
    },
    product: {
        name: {
            type: String
        },
        image: {
            type: String
        },
        price: {
            type: Number
        }
    }
}, {
    timestamps: true
});
// Compound indexes for performance
StockNotificationSchema.index({ userId: 1, productId: 1 });
StockNotificationSchema.index({ productId: 1, status: 1 });
StockNotificationSchema.index({ userId: 1, status: 1 });
StockNotificationSchema.index({ createdAt: -1 });
// Ensure unique subscription per user-product combination
StockNotificationSchema.index({ userId: 1, productId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'pending' }
});
exports.StockNotification = mongoose_1.default.model('StockNotification', StockNotificationSchema);
