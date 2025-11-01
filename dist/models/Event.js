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
// Event Schema
const EventSlotSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
    maxCapacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 }
}, { _id: false });
const EventLocationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, default: 'India' },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    isOnline: { type: Boolean, default: false },
    meetingUrl: { type: String }
}, { _id: false });
const EventOrganizerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    website: { type: String },
    description: { type: String },
    logo: { type: String }
}, { _id: false });
const EventPriceSchema = new mongoose_1.Schema({
    amount: { type: Number, required: true },
    currency: { type: String, default: '₹' },
    isFree: { type: Boolean, default: false },
    originalPrice: { type: Number },
    discount: { type: Number }
}, { _id: false });
const EventAnalyticsSchema = new mongoose_1.Schema({
    views: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    lastViewed: { type: Date }
}, { _id: false });
const EventSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    image: {
        type: String,
        required: true
    },
    images: [{ type: String }],
    price: {
        type: EventPriceSchema,
        required: true
    },
    location: {
        type: EventLocationSchema,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    endTime: { type: String },
    category: {
        type: String,
        required: true,
        enum: ['Music', 'Technology', 'Wellness', 'Sports', 'Education', 'Business', 'Arts', 'Food', 'Entertainment', 'Other']
    },
    subcategory: { type: String },
    organizer: {
        type: EventOrganizerSchema,
        required: true
    },
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        index: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    registrationRequired: {
        type: Boolean,
        default: true
    },
    bookingUrl: { type: String },
    availableSlots: [EventSlotSchema],
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled', 'completed', 'sold_out'],
        default: 'draft'
    },
    tags: [{ type: String }],
    maxCapacity: { type: Number },
    minAge: { type: Number },
    requirements: [{ type: String }],
    includes: [{ type: String }],
    refundPolicy: { type: String },
    cancellationPolicy: { type: String },
    analytics: {
        type: EventAnalyticsSchema,
        default: () => ({})
    },
    featured: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 0
    },
    publishedAt: { type: Date },
    expiresAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better performance
EventSchema.index({ status: 1, date: 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({ 'location.city': 1, status: 1 });
EventSchema.index({ featured: 1, status: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ title: 'text', description: 'text' });
EventSchema.index({ date: 1, status: 1, featured: 1 });
// Virtual for available capacity
EventSchema.virtual('availableCapacity').get(function () {
    if (this.maxCapacity && this.availableSlots) {
        const totalBooked = this.availableSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
        return this.maxCapacity - totalBooked;
    }
    return null;
});
// Virtual for is sold out
EventSchema.virtual('isSoldOut').get(function () {
    if (this.maxCapacity && this.availableSlots) {
        const totalBooked = this.availableSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
        return totalBooked >= this.maxCapacity;
    }
    return false;
});
// Pre-save middleware
EventSchema.pre('save', function (next) {
    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    // Auto-set isOnline based on location
    if (this.location && this.location.isOnline !== undefined) {
        this.isOnline = this.location.isOnline;
    }
    next();
});
// Static methods
EventSchema.statics.findPublished = function () {
    return this.find({ status: 'published' });
};
EventSchema.statics.findByCategory = function (category) {
    return this.find({ category, status: 'published' });
};
EventSchema.statics.findFeatured = function () {
    return this.find({ featured: true, status: 'published' });
};
EventSchema.statics.findUpcoming = function () {
    return this.find({
        status: 'published',
        date: { $gte: new Date() }
    });
};
// Instance methods
EventSchema.methods.incrementViews = function () {
    this.analytics.views += 1;
    this.analytics.lastViewed = new Date();
    return this.save();
};
EventSchema.methods.incrementBookings = function () {
    this.analytics.bookings += 1;
    return this.save();
};
EventSchema.methods.incrementShares = function () {
    this.analytics.shares += 1;
    return this.save();
};
EventSchema.methods.incrementFavorites = function () {
    this.analytics.favorites += 1;
    return this.save();
};
// Create and export the model
const Event = mongoose_1.default.model('Event', EventSchema);
exports.default = Event;
