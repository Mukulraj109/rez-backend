"use strict";
// Offer Model
// Main model for managing all types of offers (mega, student, new arrival, etc.)
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
const OfferSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Offer title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
        index: true
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: [200, 'Subtitle cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
        type: String,
        required: [true, 'Offer image is required'],
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
            },
            message: 'Image must be a valid URL'
        }
    },
    category: {
        type: String,
        enum: ['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general'],
        required: [true, 'Offer category is required'],
        index: true
    },
    type: {
        type: String,
        enum: ['cashback', 'discount', 'voucher', 'combo', 'special'],
        required: [true, 'Offer type is required'],
        default: 'cashback'
    },
    cashbackPercentage: {
        type: Number,
        required: [true, 'Cashback percentage is required'],
        min: [0, 'Cashback percentage cannot be negative'],
        max: [100, 'Cashback percentage cannot exceed 100%']
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative']
    },
    discountedPrice: {
        type: Number,
        min: [0, 'Discounted price cannot be negative']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates format'
            }
        }
    },
    distance: {
        type: Number,
        min: [0, 'Distance cannot be negative']
    },
    store: {
        id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store',
            required: [true, 'Store reference is required'],
            index: true
        },
        name: {
            type: String,
            required: [true, 'Store name is required'],
            trim: true
        },
        logo: {
            type: String,
            validate: {
                validator: function (v) {
                    return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
                },
                message: 'Logo must be a valid URL'
            }
        },
        rating: {
            type: Number,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5']
        },
        verified: {
            type: Boolean,
            default: false
        }
    },
    validity: {
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            index: true
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    engagement: {
        likesCount: {
            type: Number,
            default: 0,
            min: [0, 'Likes count cannot be negative']
        },
        sharesCount: {
            type: Number,
            default: 0,
            min: [0, 'Shares count cannot be negative']
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: [0, 'Views count cannot be negative']
        }
    },
    restrictions: {
        minOrderValue: {
            type: Number,
            min: [0, 'Minimum order value cannot be negative']
        },
        maxDiscountAmount: {
            type: Number,
            min: [0, 'Maximum discount amount cannot be negative']
        },
        applicableOn: [{
                type: String,
                enum: ['online', 'offline', 'both']
            }],
        excludedProducts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        ageRestriction: {
            minAge: {
                type: Number,
                min: [0, 'Minimum age cannot be negative'],
                max: [120, 'Minimum age cannot exceed 120']
            },
            maxAge: {
                type: Number,
                min: [0, 'Maximum age cannot be negative'],
                max: [120, 'Maximum age cannot exceed 120']
            }
        },
        userTypeRestriction: {
            type: String,
            enum: ['student', 'new_user', 'premium', 'all'],
            default: 'all'
        },
        usageLimitPerUser: {
            type: Number,
            min: [1, 'Usage limit per user must be at least 1']
        },
        usageLimit: {
            type: Number,
            min: [1, 'Total usage limit must be at least 1']
        }
    },
    metadata: {
        isNew: {
            type: Boolean,
            default: false,
            index: true
        },
        isTrending: {
            type: Boolean,
            default: false,
            index: true
        },
        isBestSeller: {
            type: Boolean,
            default: false,
            index: true
        },
        isSpecial: {
            type: Boolean,
            default: false,
            index: true
        },
        priority: {
            type: Number,
            default: 0,
            index: true
        },
        tags: [{
                type: String,
                trim: true,
                lowercase: true
            }],
        featured: {
            type: Boolean,
            default: false,
            index: true
        },
        flashSale: {
            isActive: {
                type: Boolean,
                default: false
            },
            endTime: {
                type: Date
            },
            originalPrice: {
                type: Number,
                min: [0, 'Flash sale original price cannot be negative']
            },
            salePrice: {
                type: Number,
                min: [0, 'Flash sale price cannot be negative']
            }
        }
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user is required'],
        index: true
    }
}, {
    timestamps: true
});
// Geospatial index for location-based queries
OfferSchema.index({ location: '2dsphere' });
// Compound indexes for efficient queries
OfferSchema.index({ category: 1, 'validity.isActive': 1, 'validity.endDate': 1 });
OfferSchema.index({ 'metadata.isTrending': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.isNew': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.featured': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'store.id': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.priority': -1, 'validity.isActive': 1 });
// Instance methods
OfferSchema.methods.calculateDistance = function (userLocation) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(userLocation[1] - this.location.coordinates[1]);
    const dLon = this.toRadians(userLocation[0] - this.location.coordinates[0]);
    const lat1 = this.toRadians(this.location.coordinates[1]);
    const lat2 = this.toRadians(userLocation[1]);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
};
OfferSchema.methods.toRadians = function (degrees) {
    return degrees * (Math.PI / 180);
};
OfferSchema.methods.isExpired = function () {
    return new Date() > this.validity.endDate;
};
OfferSchema.methods.isActiveForUser = async function (userId) {
    const now = new Date();
    // Check if offer is expired
    if (now > this.validity.endDate) {
        return { canUse: false, reason: 'Offer has expired' };
    }
    // Check if offer is not yet active
    if (now < this.validity.startDate) {
        return { canUse: false, reason: 'Offer is not yet active' };
    }
    // Check if offer is active
    if (!this.validity.isActive) {
        return { canUse: false, reason: 'Offer is not active' };
    }
    // Check user type restrictions
    if (this.restrictions.userTypeRestriction && this.restrictions.userTypeRestriction !== 'all') {
        // This would need to be implemented based on user data
        // For now, we'll assume all users can use the offer
    }
    return { canUse: true };
};
OfferSchema.methods.incrementEngagement = async function (action) {
    const updateField = `${action}Count`;
    if (updateField in this.engagement) {
        this.engagement[updateField] = this.engagement[updateField] + 1;
        await this.save();
    }
};
// Static methods
OfferSchema.statics.findActiveOffers = function () {
    const now = new Date();
    return this.find({
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findOffersByCategory = function (category) {
    const now = new Date();
    return this.find({
        category,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findNearbyOffers = function (userLocation, maxDistance = 10) {
    const now = new Date();
    return this.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: userLocation
                },
                $maxDistance: maxDistance * 1000 // Convert km to meters
            }
        },
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findTrendingOffers = function (limit = 10) {
    const now = new Date();
    return this.find({
        'metadata.isTrending': true,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    })
        .sort({ 'engagement.likesCount': -1, 'metadata.priority': -1 })
        .limit(limit)
        .lean();
};
OfferSchema.statics.findNewArrivals = function (limit = 10) {
    const now = new Date();
    return this.find({
        'metadata.isNew': true,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    })
        .sort({ createdAt: -1, 'metadata.priority': -1 })
        .limit(limit)
        .lean();
};
OfferSchema.statics.findStudentOffers = function () {
    const now = new Date();
    return this.find({
        $or: [
            { category: 'student' },
            { 'restrictions.userTypeRestriction': 'student' }
        ],
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};
OfferSchema.statics.findMegaOffers = function () {
    const now = new Date();
    return this.find({
        category: 'mega',
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};
OfferSchema.statics.searchOffers = function (query, filters = {}) {
    const now = new Date();
    const searchQuery = {
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    };
    // Text search
    if (query) {
        searchQuery.$or = [
            { title: { $regex: query, $options: 'i' } },
            { subtitle: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { 'store.name': { $regex: query, $options: 'i' } },
            { 'metadata.tags': { $in: [new RegExp(query, 'i')] } }
        ];
    }
    // Apply filters
    if (filters.category) {
        searchQuery.category = filters.category;
    }
    if (filters.type) {
        searchQuery.type = filters.type;
    }
    if (filters.minCashback) {
        searchQuery.cashbackPercentage = { $gte: filters.minCashback };
    }
    if (filters.maxCashback) {
        searchQuery.cashbackPercentage = { ...searchQuery.cashbackPercentage, $lte: filters.maxCashback };
    }
    return this.find(searchQuery).sort({ 'metadata.priority': -1, createdAt: -1 });
};
// Pre-save middleware
OfferSchema.pre('save', function (next) {
    // Validate that end date is after start date
    if (this.validity.endDate <= this.validity.startDate) {
        next(new Error('End date must be after start date'));
        return;
    }
    // Validate flash sale dates
    if (this.metadata.flashSale?.isActive && this.metadata.flashSale?.endTime) {
        if (this.metadata.flashSale.endTime <= new Date()) {
            this.metadata.flashSale.isActive = false;
        }
    }
    next();
});
// Create and export the model
const Offer = mongoose_1.default.model('Offer', OfferSchema);
exports.default = Offer;
