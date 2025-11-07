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
exports.Payment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    orderId: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
        uppercase: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['upi', 'card', 'wallet', 'netbanking', 'stripe', 'razorpay', 'paypal']
    },
    paymentMethodId: {
        type: String,
        sparse: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'],
        default: 'pending',
        index: true
    },
    userDetails: {
        name: String,
        email: String,
        phone: String
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    gatewayResponse: {
        gateway: String,
        transactionId: String,
        paymentUrl: String,
        qrCode: String,
        upiId: String,
        expiryTime: Date,
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    failureReason: String,
    completedAt: Date,
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better query performance
PaymentSchema.index({ user: 1, status: 1 });
PaymentSchema.index({ paymentId: 1, user: 1 });
PaymentSchema.index({ orderId: 1, user: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Virtual for checking if payment is expired
PaymentSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date();
});
// Virtual for checking if payment is active (not completed, failed, or expired)
PaymentSchema.virtual('isActive').get(function () {
    return ['pending', 'processing'].includes(this.status) && !(this.expiresAt < new Date());
});
// Static method to find active payments for a user
PaymentSchema.statics.findActivePayments = function (userId) {
    return this.find({
        user: userId,
        status: { $in: ['pending', 'processing'] },
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};
// Static method to find payment by payment ID and user
PaymentSchema.statics.findByPaymentId = function (paymentId, userId) {
    return this.findOne({ paymentId, user: userId });
};
// Instance method to mark payment as completed
PaymentSchema.methods.markCompleted = function (transactionId) {
    this.status = 'completed';
    this.completedAt = new Date();
    if (transactionId) {
        this.gatewayResponse = this.gatewayResponse || {};
        this.gatewayResponse.transactionId = transactionId;
    }
    return this.save();
};
// Instance method to mark payment as failed
PaymentSchema.methods.markFailed = function (reason) {
    this.status = 'failed';
    this.failureReason = reason;
    return this.save();
};
// Instance method to mark payment as cancelled
PaymentSchema.methods.markCancelled = function () {
    this.status = 'cancelled';
    return this.save();
};
// Pre-save middleware to ensure payment ID is unique
PaymentSchema.pre('save', async function (next) {
    if (this.isNew && this.paymentId) {
        const PaymentModel = this.constructor;
        const existingPayment = await PaymentModel.findOne({ paymentId: this.paymentId });
        if (existingPayment) {
            const error = new Error('Payment ID already exists');
            return next(error);
        }
    }
    next();
});
// Pre-save middleware to set expiry time if not provided
PaymentSchema.pre('save', function (next) {
    if (this.isNew && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    }
    next();
});
exports.Payment = mongoose_1.default.model('Payment', PaymentSchema);
exports.default = exports.Payment;
