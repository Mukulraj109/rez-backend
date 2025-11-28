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
exports.Store = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Store Schema
const StoreSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    logo: {
        type: String,
        trim: true
    },
    banner: {
        type: [String], // Array of banner image URLs
        default: []
    },
    videos: [{
            url: {
                type: String,
                required: true,
                trim: true
            },
            thumbnail: {
                type: String,
                trim: true
            },
            title: {
                type: String,
                trim: true,
                maxlength: 200
            },
            duration: {
                type: Number,
                min: 0
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategories: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category'
        }],
    location: {
        address: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        pincode: {
            type: String,
            trim: true,
            match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere',
            validate: {
                validator: function (v) {
                    // Allow null/undefined/empty coordinates
                    if (!v || v.length === 0)
                        return true;
                    return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
                },
                message: 'Coordinates must be [longitude, latitude] with valid ranges'
            }
        },
        deliveryRadius: {
            type: Number,
            default: 5, // 5 km default
            min: 0,
            max: 500 // Allow up to 500km for regional delivery
        },
        landmark: {
            type: String,
            trim: true
        }
    },
    contact: {
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        website: {
            type: String,
            trim: true
        },
        whatsapp: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid WhatsApp number']
        }
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        distribution: {
            5: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            1: { type: Number, default: 0 }
        }
    },
    offers: {
        cashback: {
            type: Number,
            min: 0,
            max: 100 // Percentage
        },
        minOrderAmount: {
            type: Number,
            min: 0
        },
        maxCashback: {
            type: Number,
            min: 0
        },
        discounts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Offer'
            }],
        isPartner: {
            type: Boolean,
            default: false
        },
        partnerLevel: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum']
        }
    },
    operationalInfo: {
        hours: {
            monday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            tuesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            wednesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            thursday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            friday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            saturday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            sunday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            }
        },
        deliveryTime: {
            type: String,
            default: '30-45 mins'
        },
        minimumOrder: {
            type: Number,
            default: 0,
            min: 0
        },
        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },
        freeDeliveryAbove: {
            type: Number,
            min: 0
        },
        acceptsWalletPayment: {
            type: Boolean,
            default: true
        },
        paymentMethods: [{
                type: String,
                enum: ['cash', 'card', 'upi', 'wallet', 'netbanking']
            }]
    },
    deliveryCategories: {
        fastDelivery: {
            type: Boolean,
            default: false
        },
        budgetFriendly: {
            type: Boolean,
            default: false
        },
        ninetyNineStore: {
            type: Boolean,
            default: false
        },
        premium: {
            type: Boolean,
            default: false
        },
        organic: {
            type: Boolean,
            default: false
        },
        alliance: {
            type: Boolean,
            default: false
        },
        lowestPrice: {
            type: Boolean,
            default: false
        },
        mall: {
            type: Boolean,
            default: false
        },
        cashStore: {
            type: Boolean,
            default: false
        }
    },
    analytics: {
        totalOrders: {
            type: Number,
            default: 0,
            min: 0
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0
        },
        avgOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        repeatCustomers: {
            type: Number,
            default: 0,
            min: 0
        },
        followersCount: {
            type: Number,
            default: 0,
            min: 0
        },
        popularProducts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        peakHours: [String],
        monthlyStats: [{
                month: { type: Number, min: 1, max: 12 },
                year: { type: Number, min: 2000 },
                orders: { type: Number, default: 0 },
                revenue: { type: Number, default: 0 }
            }]
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdViaOnboarding: {
        type: Boolean,
        default: false
    },
    // Menu fields
    hasMenu: {
        type: Boolean,
        default: false
    },
    menuCategories: [{
            type: String,
            trim: true
        }],
    // Booking & Store Visit fields
    bookingType: {
        type: String,
        enum: ['RESTAURANT', 'SERVICE', 'CONSULTATION', 'RETAIL', 'HYBRID'],
        default: 'RETAIL'
    },
    bookingConfig: {
        enabled: { type: Boolean, default: false },
        requiresAdvanceBooking: { type: Boolean, default: false },
        allowWalkIn: { type: Boolean, default: true },
        slotDuration: { type: Number, default: 30 }, // minutes
        advanceBookingDays: { type: Number, default: 7 }, // days
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        }
    },
    storeVisitConfig: {
        enabled: { type: Boolean, default: false },
        features: [{
                type: String,
                enum: ['queue_system', 'visit_scheduling', 'live_availability']
            }],
        maxVisitorsPerSlot: { type: Number, default: 10 },
        averageVisitDuration: { type: Number, default: 30 } // minutes
    },
    serviceTypes: [{
            type: String,
            trim: true
        }],
    consultationTypes: [{
            type: String,
            trim: true
        }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
StoreSchema.index({ slug: 1 });
StoreSchema.index({ category: 1, isActive: 1 });
StoreSchema.index({ 'location.coordinates': '2dsphere' });
StoreSchema.index({ 'location.city': 1, isActive: 1 });
StoreSchema.index({ 'location.pincode': 1 });
StoreSchema.index({ 'ratings.average': -1, isActive: 1 });
StoreSchema.index({ isFeatured: 1, isActive: 1 });
StoreSchema.index({ 'offers.isPartner': 1, isActive: 1 });
StoreSchema.index({ tags: 1, isActive: 1 });
StoreSchema.index({ createdAt: -1 });
StoreSchema.index({ hasMenu: 1, isActive: 1 }); // Menu index
StoreSchema.index({ bookingType: 1, isActive: 1 }); // Booking type index
// Delivery category indexes
StoreSchema.index({ 'deliveryCategories.fastDelivery': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.budgetFriendly': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.premium': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.organic': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.alliance': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.lowestPrice': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.mall': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.cashStore': 1, isActive: 1 });
// Compound indexes
StoreSchema.index({ category: 1, 'location.city': 1, isActive: 1 });
StoreSchema.index({ 'offers.isPartner': 1, 'ratings.average': -1 });
// Virtual for current operational status
StoreSchema.virtual('isCurrentlyOpen').get(function () {
    return this.isOpen();
});
// Pre-save hook to generate slug
StoreSchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
    next();
});
// Method to check if store is currently open
StoreSchema.methods.isOpen = function () {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const todayHours = this.operationalInfo.hours[dayName];
    if (!todayHours || todayHours.closed) {
        return false;
    }
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
};
// Method to calculate distance from user coordinates
StoreSchema.methods.calculateDistance = function (userCoordinates) {
    if (!this.location.coordinates)
        return Infinity;
    const [lon1, lat1] = userCoordinates;
    const [lon2, lat2] = this.location.coordinates;
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};
// Method to check delivery eligibility
StoreSchema.methods.isEligibleForDelivery = function (userCoordinates) {
    const distance = this.calculateDistance(userCoordinates);
    return distance <= (this.location.deliveryRadius || 5);
};
// Method to update ratings
StoreSchema.methods.updateRatings = async function () {
    const Review = this.model('Review');
    const reviews = await Review.find({
        targetType: 'Store',
        targetId: this._id,
        isApproved: true
    });
    if (reviews.length === 0) {
        this.ratings = {
            average: 0,
            count: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
        return;
    }
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;
    reviews.forEach((review) => {
        const rating = Math.round(review.rating);
        distribution[rating]++;
        totalRating += review.rating;
    });
    this.ratings = {
        average: Math.round((totalRating / reviews.length) * 10) / 10,
        count: reviews.length,
        distribution
    };
};
// Static method to find nearby stores
StoreSchema.statics.findNearby = function (coordinates, radius = 10, options = {}) {
    const query = {
        'location.coordinates': {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: coordinates
                },
                $maxDistance: radius * 1000 // Convert km to meters
            }
        },
        isActive: true
    };
    if (options.category) {
        query.category = options.category;
    }
    if (options.isPartner !== undefined) {
        query['offers.isPartner'] = options.isPartner;
    }
    return this.find(query)
        .populate('category')
        .sort({ 'ratings.average': -1 })
        .limit(options.limit || 50);
};
// Static method to get featured stores
StoreSchema.statics.getFeatured = function (limit = 10) {
    return this.find({
        isFeatured: true,
        isActive: true
    })
        .populate('category')
        .sort({ 'ratings.average': -1 })
        .limit(limit);
};
// Delete cached model to force schema update (for development)
if (mongoose_1.default.models.Store) {
    delete mongoose_1.default.models.Store;
}
exports.Store = mongoose_1.default.model('Store', StoreSchema);
