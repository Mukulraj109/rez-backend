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
const mongoose_1 = __importStar(require("mongoose"));
// Event Booking Schema
const EventBookingSchema = new mongoose_1.Schema({
    eventId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slotId: { type: String },
    bookingDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
        default: 'pending'
    },
    paymentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: '₹'
    },
    attendeeInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String },
        age: { type: Number },
        specialRequirements: { type: String }
    },
    bookingReference: {
        type: String,
        required: true,
        unique: true
    },
    qrCode: { type: String },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    notes: { type: String },
    refundAmount: { type: Number },
    refundReason: { type: String },
    refundedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
EventBookingSchema.index({ eventId: 1, userId: 1 });
EventBookingSchema.index({ userId: 1, status: 1 });
EventBookingSchema.index({ bookingReference: 1 });
EventBookingSchema.index({ status: 1, bookingDate: 1 });
EventBookingSchema.index({ paymentStatus: 1 });
// Pre-save middleware to generate booking reference
EventBookingSchema.pre('save', function (next) {
    if (!this.bookingReference) {
        // Generate unique booking reference: EVT + timestamp + random string
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.bookingReference = `EVT${timestamp}${random}`;
    }
    next();
});
// Static methods
EventBookingSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).populate('eventId');
};
EventBookingSchema.statics.findByEvent = function (eventId) {
    return this.find({ eventId }).populate('userId');
};
EventBookingSchema.statics.findByStatus = function (status) {
    return this.find({ status }).populate('eventId userId');
};
// Instance methods
EventBookingSchema.methods.confirm = function () {
    this.status = 'confirmed';
    this.paymentStatus = 'completed';
    return this.save();
};
EventBookingSchema.methods.cancel = function (reason) {
    this.status = 'cancelled';
    this.notes = reason || 'Booking cancelled';
    return this.save();
};
EventBookingSchema.methods.checkIn = function () {
    this.checkInTime = new Date();
    this.status = 'completed';
    return this.save();
};
EventBookingSchema.methods.checkOut = function () {
    this.checkOutTime = new Date();
    return this.save();
};
// Create and export the model
const EventBooking = mongoose_1.default.model('EventBooking', EventBookingSchema);
exports.default = EventBooking;
