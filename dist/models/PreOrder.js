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
// PreOrder Model - Menu Pre-order System
const mongoose_1 = __importStar(require("mongoose"));
const PreOrderItemSchema = new mongoose_1.Schema({
    menuItemId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String },
}, { _id: false });
const PreOrderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    items: [PreOrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending',
        index: true,
    },
    scheduledTime: { type: Date },
    deliveryType: {
        type: String,
        enum: ['pickup', 'delivery'],
        required: true,
    },
    deliveryAddress: {
        address: { type: String },
        city: { type: String },
        postalCode: { type: String },
        coordinates: {
            type: [Number],
            validate: {
                validator: function (v) {
                    return v.length === 2;
                },
                message: 'Coordinates must be [longitude, latitude]'
            }
        },
    },
    contactPhone: { type: String, required: true },
    notes: { type: String },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
    },
    paymentMethod: { type: String },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
PreOrderSchema.index({ storeId: 1, status: 1 });
PreOrderSchema.index({ userId: 1, createdAt: -1 });
PreOrderSchema.index({ orderNumber: 1 });
PreOrderSchema.index({ createdAt: -1 });
// Generate unique order number
PreOrderSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `PO-${timestamp}-${random}`;
    }
    next();
});
// Virtual for order age
PreOrderSchema.virtual('orderAge').get(function () {
    const now = new Date();
    const created = new Date(this.createdAt);
    const ageInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return ageInMinutes;
});
// Method to calculate totals
PreOrderSchema.methods.calculateTotals = function () {
    this.subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    this.tax = this.subtotal * 0.05; // 5% tax
    this.deliveryFee = this.deliveryType === 'delivery' ? 50 : 0; // ₹50 delivery fee
    this.total = this.subtotal + this.tax + this.deliveryFee;
};
// Method to update status
PreOrderSchema.methods.updateStatus = function (newStatus) {
    const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': [],
    };
    const currentStatus = this.status;
    if (!validTransitions[currentStatus].includes(newStatus)) {
        throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
    this.status = newStatus;
    return this.save();
};
// Static method to find by order number
PreOrderSchema.statics.findByOrderNumber = function (orderNumber) {
    return this.findOne({ orderNumber });
};
// Static method to find user orders
PreOrderSchema.statics.findUserOrders = function (userId, limit = 20) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('storeId', 'name logo location');
};
// Static method to find store orders
PreOrderSchema.statics.findStoreOrders = function (storeId, status) {
    const query = { storeId };
    if (status)
        query.status = status;
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar');
};
const PreOrder = mongoose_1.default.model('PreOrder', PreOrderSchema);
exports.default = PreOrder;
