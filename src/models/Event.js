"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
// Event Schema
var EventSlotSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
    maxCapacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 }
}, { _id: false });
var EventLocationSchema = new mongoose_1.Schema({
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
var EventOrganizerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    website: { type: String },
    description: { type: String },
    logo: { type: String }
}, { _id: false });
var EventPriceSchema = new mongoose_1.Schema({
    amount: { type: Number, required: true },
    currency: { type: String, default: '₹' },
    isFree: { type: Boolean, default: false },
    originalPrice: { type: Number },
    discount: { type: Number }
}, { _id: false });
var EventAnalyticsSchema = new mongoose_1.Schema({
    views: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    lastViewed: { type: Date }
}, { _id: false });
var EventSchema = new mongoose_1.Schema({
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
        default: function () { return ({}); }
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
        var totalBooked = this.availableSlots.reduce(function (sum, slot) { return sum + slot.bookedCount; }, 0);
        return this.maxCapacity - totalBooked;
    }
    return null;
});
// Virtual for is sold out
EventSchema.virtual('isSoldOut').get(function () {
    if (this.maxCapacity && this.availableSlots) {
        var totalBooked = this.availableSlots.reduce(function (sum, slot) { return sum + slot.bookedCount; }, 0);
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
    return this.find({ category: category, status: 'published' });
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
var Event = mongoose_1.default.model('Event', EventSchema);
exports.default = Event;
