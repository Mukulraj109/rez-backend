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
exports.TableBooking = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// TableBooking Schema
const TableBookingSchema = new mongoose_1.Schema({
    bookingNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bookingDate: {
        type: Date,
        required: true,
        index: true
    },
    bookingTime: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                // Validate time format HH:MM (24-hour format)
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Time must be in HH:MM format (24-hour)'
        }
    },
    partySize: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    specialRequests: {
        type: String,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            return ret;
        }
    },
    toObject: {
        virtuals: true
    }
});
// Indexes for performance
TableBookingSchema.index({ storeId: 1, bookingDate: 1 });
TableBookingSchema.index({ userId: 1, createdAt: -1 });
TableBookingSchema.index({ bookingNumber: 1 }, { unique: true });
TableBookingSchema.index({ status: 1, bookingDate: 1 });
// Virtual for formatted booking date/time
TableBookingSchema.virtual('formattedDateTime').get(function () {
    const date = new Date(this.bookingDate);
    const dateStr = date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    return `${dateStr} at ${this.bookingTime}`;
});
// Pre-save hook to generate booking number
TableBookingSchema.pre('save', async function (next) {
    if (this.isNew && !this.bookingNumber) {
        // Generate booking number: TB-TIMESTAMP-RANDOM
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.bookingNumber = `TB-${timestamp}-${random}`;
    }
    next();
});
// Instance method to update status
TableBookingSchema.methods.updateStatus = async function (newStatus) {
    this.status = newStatus;
    await this.save();
};
// Static method to find by booking number
TableBookingSchema.statics.findByBookingNumber = function (bookingNumber) {
    return this.findOne({ bookingNumber })
        .populate('storeId', 'name logo location contact')
        .populate('userId', 'profile.firstName profile.lastName phoneNumber email');
};
// Static method to find store bookings
TableBookingSchema.statics.findStoreBookings = function (storeId, date) {
    const query = { storeId };
    if (date) {
        // Find bookings for the specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.bookingDate = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }
    return this.find(query)
        .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
        .sort({ bookingDate: 1, bookingTime: 1 });
};
// Static method to find user bookings
TableBookingSchema.statics.findUserBookings = function (userId) {
    return this.find({ userId })
        .populate('storeId', 'name logo location contact')
        .sort({ bookingDate: -1, createdAt: -1 });
};
exports.TableBooking = mongoose_1.default.model('TableBooking', TableBookingSchema);
