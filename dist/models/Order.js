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
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Order Schema
const OrderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    items: [{
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            store: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store',
                required: true
            },
            name: {
                type: String,
                required: true,
                trim: true
            },
            image: {
                type: String,
                required: true
            },
            itemType: {
                type: String,
                enum: ['product', 'service', 'event'],
                default: 'product'
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            variant: {
                type: {
                    type: String,
                    trim: true
                },
                value: {
                    type: String,
                    trim: true
                }
            },
            price: {
                type: Number,
                required: true,
                min: 0
            },
            originalPrice: {
                type: Number,
                min: 0
            },
            discount: {
                type: Number,
                default: 0,
                min: 0
            },
            subtotal: {
                type: Number,
                required: true,
                min: 0
            },
            // Service booking specific fields
            serviceBookingId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'ServiceBooking'
            },
            serviceBookingDetails: {
                bookingDate: { type: Date },
                timeSlot: {
                    start: { type: String },
                    end: { type: String }
                },
                duration: { type: Number, min: 15 },
                serviceType: {
                    type: String,
                    enum: ['home', 'store', 'online']
                },
                customerNotes: { type: String, trim: true, maxlength: 500 },
                customerName: { type: String, trim: true },
                customerPhone: { type: String, trim: true },
                customerEmail: { type: String, trim: true, lowercase: true }
            }
        }],
    totals: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        tax: {
            type: Number,
            default: 0,
            min: 0
        },
        delivery: {
            type: Number,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        cashback: {
            type: Number,
            default: 0,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    payment: {
        method: {
            type: String,
            required: true,
            enum: ['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
            default: 'pending'
        },
        transactionId: String,
        paymentGateway: String,
        failureReason: String,
        paidAt: Date,
        refundId: String,
        refundedAt: Date,
        coinsUsed: {
            wasilCoins: { type: Number, default: 0, min: 0 },
            promoCoins: { type: Number, default: 0, min: 0 },
            totalCoinsValue: { type: Number, default: 0, min: 0 }
        }
    },
    delivery: {
        method: {
            type: String,
            required: true,
            enum: ['standard', 'express', 'pickup', 'scheduled'],
            default: 'standard'
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned'],
            default: 'pending'
        },
        address: {
            name: { type: String, required: true },
            phone: { type: String, required: true },
            email: String,
            addressLine1: { type: String, required: true },
            addressLine2: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            country: { type: String, default: 'India' },
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: '2dsphere'
            },
            landmark: String,
            addressType: {
                type: String,
                enum: ['home', 'work', 'other'],
                default: 'home'
            }
        },
        estimatedTime: Date,
        actualTime: Date,
        dispatchedAt: Date,
        deliveredAt: Date,
        trackingId: String,
        deliveryPartner: String,
        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },
        instructions: String,
        deliveryOTP: String,
        attempts: [{
                attemptNumber: { type: Number, min: 1 },
                attemptedAt: { type: Date, required: true },
                status: {
                    type: String,
                    enum: ['successful', 'failed'],
                    required: true
                },
                reason: String,
                nextAttemptAt: Date
            }]
    },
    timeline: [{
            status: {
                type: String,
                required: true
            },
            message: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: true,
                default: Date.now
            },
            updatedBy: String,
            metadata: mongoose_1.Schema.Types.Mixed,
            location: {
                latitude: Number,
                longitude: Number,
                address: String
            },
            deliveryPartner: {
                name: String,
                phone: String,
                vehicleNumber: String,
                photo: String
            }
        }],
    analytics: {
        source: {
            type: String,
            enum: ['app', 'web', 'social', 'referral'],
            default: 'app'
        },
        campaign: String,
        referralCode: String,
        deviceInfo: {
            platform: String,
            version: String,
            userAgent: String
        }
    },
    status: {
        type: String,
        required: true,
        enum: ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'],
        default: 'placed',
        index: true
    },
    couponCode: {
        type: String,
        uppercase: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    specialInstructions: {
        type: String,
        trim: true,
        maxlength: 500
    },
    cancelReason: String,
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    returnReason: String,
    returnedAt: Date,
    // Invoice and document URLs
    invoiceUrl: String,
    invoiceGeneratedAt: Date,
    shippingLabelUrl: String,
    packingSlipUrl: String,
    // Additional fields for compatibility
    cancellation: {
        reason: String,
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        },
        refundAmount: {
            type: Number,
            min: 0
        }
    },
    tracking: {
        trackingId: String,
        estimatedDelivery: Date,
        deliveredAt: Date
    },
    rating: {
        score: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        ratedAt: {
            type: Date,
            default: Date.now
        }
    },
    // Payment gateway details
    paymentGateway: {
        gatewayOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String,
        gateway: {
            type: String,
            enum: ['razorpay', 'cod', 'wallet']
        },
        currency: String,
        amountPaid: Number,
        paidAt: Date,
        failureReason: String,
        refundId: String,
        refundedAt: Date,
        refundAmount: Number
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'delivery.status': 1 });
OrderSchema.index({ 'items.store': 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'delivery.estimatedTime': 1 });
// Compound indexes
OrderSchema.index({ user: 1, status: 1, createdAt: -1 });
OrderSchema.index({ 'items.store': 1, status: 1 });
// Analytics indexes for merchant dashboard
OrderSchema.index({ 'items.store': 1, createdAt: -1, status: 1 }); // Sales trends by store
OrderSchema.index({ 'items.store': 1, 'items.product': 1, createdAt: -1 }); // Product performance
OrderSchema.index({ 'items.store': 1, user: 1, createdAt: -1 }); // Customer insights
OrderSchema.index({ 'payment.method': 1, 'items.store': 1 }); // Payment analytics
// Virtual for order age in hours
OrderSchema.virtual('ageInHours').get(function () {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});
// Virtual for estimated delivery date
OrderSchema.virtual('estimatedDeliveryDate').get(function () {
    return this.delivery.estimatedTime || new Date(Date.now() + 24 * 60 * 60 * 1000);
});
// Virtual properties for compatibility with controller
OrderSchema.virtual('paymentStatus').get(function () {
    return this.payment.status;
});
OrderSchema.virtual('estimatedDeliveryTime').get(function () {
    return this.delivery.estimatedTime;
});
OrderSchema.virtual('deliveredAt').get(function () {
    return this.delivery.deliveredAt;
});
OrderSchema.virtual('totalAmount').get(function () {
    return this.totals.total;
});
// Pre-save hook to generate order number and add timeline entry
OrderSchema.pre('save', async function (next) {
    // Generate order number for new orders
    if (this.isNew && !this.orderNumber) {
        const count = await this.constructor.countDocuments();
        this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }
    // Add timeline entry for status changes
    if (this.isModified('status') && !this.isNew) {
        const statusMessages = {
            placed: 'Order has been placed successfully',
            confirmed: 'Order has been confirmed by the store',
            preparing: 'Your order is being prepared',
            ready: 'Order is ready for pickup/dispatch',
            dispatched: 'Order has been dispatched',
            delivered: 'Order has been delivered successfully',
            cancelled: 'Order has been cancelled',
            returned: 'Order has been returned',
            refunded: 'Order amount has been refunded'
        };
        this.timeline.push({
            status: this.status,
            message: statusMessages[this.status] || `Order status updated to ${this.status}`,
            timestamp: new Date()
        });
    }
    next();
});
// Method to update order status
OrderSchema.methods.updateStatus = async function (newStatus, message, updatedBy) {
    this.status = newStatus;
    // Update delivery status based on order status
    const deliveryStatusMap = {
        confirmed: 'confirmed',
        preparing: 'preparing',
        ready: 'ready',
        dispatched: 'dispatched',
        delivered: 'delivered',
        cancelled: 'failed',
        returned: 'returned'
    };
    if (deliveryStatusMap[newStatus]) {
        this.delivery.status = deliveryStatusMap[newStatus];
    }
    // Set timestamps for specific statuses
    if (newStatus === 'dispatched') {
        this.delivery.dispatchedAt = new Date();
    }
    else if (newStatus === 'delivered') {
        this.delivery.deliveredAt = new Date();
        this.delivery.actualTime = new Date();
    }
    else if (newStatus === 'cancelled') {
        this.cancelledAt = new Date();
    }
    else if (newStatus === 'returned') {
        this.returnedAt = new Date();
    }
    // Add custom timeline message if provided
    if (message) {
        this.timeline.push({
            status: newStatus,
            message,
            timestamp: new Date(),
            updatedBy
        });
    }
    await this.save();
};
// Method to calculate refund amount
OrderSchema.methods.calculateRefund = function () {
    let refundAmount = this.totals.paidAmount;
    // Deduct delivery charges if order was dispatched
    if (this.status === 'dispatched' || this.status === 'delivered') {
        refundAmount -= this.totals.delivery;
    }
    // Apply cancellation charges based on timing
    const ageInHours = this.ageInHours;
    if (ageInHours > 24) {
        refundAmount *= 0.9; // 10% cancellation fee after 24 hours
    }
    else if (ageInHours > 2) {
        refundAmount *= 0.95; // 5% cancellation fee after 2 hours
    }
    return Math.max(0, Math.round(refundAmount * 100) / 100);
};
// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function () {
    const cancellableStatuses = ['placed', 'confirmed', 'preparing'];
    return cancellableStatuses.includes(this.status);
};
// Method to check if order can be returned
OrderSchema.methods.canBeReturned = function () {
    if (this.status !== 'delivered')
        return false;
    const deliveredAt = this.delivery.deliveredAt;
    if (!deliveredAt)
        return false;
    const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceDelivery <= 24; // 24 hours return window
};
// Method to generate invoice (placeholder)
OrderSchema.methods.generateInvoice = async function () {
    // This would typically generate a PDF invoice
    return `Invoice for order ${this.orderNumber}`;
};
// Method to send status update (placeholder)
OrderSchema.methods.sendStatusUpdate = async function () {
    // This would typically send push notification, SMS, or email
    console.log(`Status update sent for order ${this.orderNumber}: ${this.status}`);
};
// Static method to get user orders
OrderSchema.statics.getUserOrders = function (userId, status, limit = 20, skip = 0) {
    const query = { user: userId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate('items.product', 'name images')
        .populate('items.store', 'name logo')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};
// Static method to get store orders
OrderSchema.statics.getStoreOrders = function (storeId, status, limit = 50) {
    const query = { 'items.store': storeId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate('user', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(limit);
};
// Static method to get orders by date range
OrderSchema.statics.getOrdersByDateRange = function (startDate, endDate, filters = {}) {
    const query = {
        createdAt: { $gte: startDate, $lte: endDate },
        ...filters
    };
    return this.find(query)
        .populate('user', 'profile.firstName profile.lastName')
        .populate('items.store', 'name')
        .sort({ createdAt: -1 });
};
exports.Order = mongoose_1.default.model('Order', OrderSchema);
