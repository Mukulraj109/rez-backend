"use strict";
// HeroBanner Model
// Manages hero banners for the offers page and other promotional content
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
const HeroBannerSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Banner title is required'],
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
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        type: String,
        required: [true, 'Banner image is required'],
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(v);
            },
            message: 'Image must be a valid URL'
        }
    },
    ctaText: {
        type: String,
        required: [true, 'CTA text is required'],
        trim: true,
        maxlength: [50, 'CTA text cannot exceed 50 characters']
    },
    ctaAction: {
        type: String,
        required: [true, 'CTA action is required'],
        enum: ['navigate', 'external_link', 'modal', 'download', 'share'],
        default: 'navigate'
    },
    ctaUrl: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^https?:\/\/.+/.test(v) || /^\/.+/.test(v);
            },
            message: 'CTA URL must be a valid URL or path'
        }
    },
    backgroundColor: {
        type: String,
        required: [true, 'Background color is required'],
        validate: {
            validator: function (v) {
                return /^#[0-9A-F]{6}$/i.test(v) || /^rgb\(/.test(v) || /^rgba\(/.test(v);
            },
            message: 'Background color must be a valid color code'
        }
    },
    textColor: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^#[0-9A-F]{6}$/i.test(v) || /^rgb\(/.test(v) || /^rgba\(/.test(v);
            },
            message: 'Text color must be a valid color code'
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    priority: {
        type: Number,
        default: 0,
        index: true
    },
    validFrom: {
        type: Date,
        required: [true, 'Valid from date is required'],
        index: true
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required'],
        index: true
    },
    targetAudience: {
        userTypes: [{
                type: String,
                enum: ['student', 'new_user', 'premium', 'all']
            }],
        ageRange: {
            min: {
                type: Number,
                min: [0, 'Minimum age cannot be negative'],
                max: [120, 'Minimum age cannot exceed 120']
            },
            max: {
                type: Number,
                min: [0, 'Maximum age cannot be negative'],
                max: [120, 'Maximum age cannot exceed 120']
            }
        },
        locations: [{
                type: String,
                trim: true
            }],
        categories: [{
                type: String,
                trim: true
            }]
    },
    analytics: {
        views: {
            type: Number,
            default: 0,
            min: [0, 'Views count cannot be negative']
        },
        clicks: {
            type: Number,
            default: 0,
            min: [0, 'Clicks count cannot be negative']
        },
        conversions: {
            type: Number,
            default: 0,
            min: [0, 'Conversions count cannot be negative']
        }
    },
    metadata: {
        page: {
            type: String,
            enum: ['offers', 'home', 'category', 'product', 'all'],
            default: 'all',
            index: true
        },
        position: {
            type: String,
            enum: ['top', 'middle', 'bottom'],
            default: 'top',
            index: true
        },
        size: {
            type: String,
            enum: ['small', 'medium', 'large', 'full'],
            default: 'medium'
        },
        animation: {
            type: String,
            enum: ['fade', 'slide', 'bounce', 'pulse', 'none'],
            default: 'fade'
        },
        tags: [{
                type: String,
                trim: true,
                lowercase: true
            }]
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
// Indexes for efficient queries
HeroBannerSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
HeroBannerSchema.index({ 'metadata.page': 1, 'metadata.position': 1, isActive: 1 });
HeroBannerSchema.index({ priority: -1, isActive: 1 });
HeroBannerSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });
// Instance methods
HeroBannerSchema.methods.isCurrentlyActive = function () {
    const now = new Date();
    return this.isActive &&
        now >= this.validFrom &&
        now <= this.validUntil;
};
HeroBannerSchema.methods.incrementView = async function () {
    this.analytics.views += 1;
    await this.save();
};
HeroBannerSchema.methods.incrementClick = async function () {
    this.analytics.clicks += 1;
    await this.save();
};
HeroBannerSchema.methods.incrementConversion = async function () {
    this.analytics.conversions += 1;
    await this.save();
};
HeroBannerSchema.methods.isTargetedForUser = function (userData) {
    // If no targeting criteria, show to all users
    if (!this.targetAudience.userTypes?.length &&
        !this.targetAudience.ageRange &&
        !this.targetAudience.locations?.length &&
        !this.targetAudience.categories?.length) {
        return true;
    }
    // Check user type targeting
    if (this.targetAudience.userTypes?.length) {
        if (!this.targetAudience.userTypes.includes('all')) {
            if (!userData?.userType || !this.targetAudience.userTypes.includes(userData.userType)) {
                return false;
            }
        }
    }
    // Check age targeting
    if (this.targetAudience.ageRange) {
        const userAge = userData?.age;
        if (userAge) {
            if (this.targetAudience.ageRange.min && userAge < this.targetAudience.ageRange.min) {
                return false;
            }
            if (this.targetAudience.ageRange.max && userAge > this.targetAudience.ageRange.max) {
                return false;
            }
        }
    }
    // Check location targeting
    if (this.targetAudience.locations?.length) {
        const userLocation = userData?.location;
        if (userLocation) {
            const userCity = userLocation.city || userLocation.state;
            if (!this.targetAudience.locations.some((loc) => loc.toLowerCase().includes(userCity?.toLowerCase() || ''))) {
                return false;
            }
        }
    }
    // Check category targeting
    if (this.targetAudience.categories?.length) {
        const userInterests = userData?.interests || userData?.categories;
        if (userInterests) {
            const hasMatchingInterest = this.targetAudience.categories.some((cat) => userInterests.some((interest) => interest.toLowerCase().includes(cat.toLowerCase())));
            if (!hasMatchingInterest) {
                return false;
            }
        }
    }
    return true;
};
// Static methods
HeroBannerSchema.statics.findActiveBanners = function (page, position) {
    const now = new Date();
    const query = {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
    };
    if (page) {
        query.$or = [
            { 'metadata.page': page },
            { 'metadata.page': 'all' }
        ];
    }
    if (position) {
        query['metadata.position'] = position;
    }
    return this.find(query)
        .sort({ priority: -1, createdAt: -1 });
};
HeroBannerSchema.statics.findBannersForUser = function (userData, page) {
    const now = new Date();
    const query = {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
    };
    if (page) {
        query.$or = [
            { 'metadata.page': page },
            { 'metadata.page': 'all' }
        ];
    }
    return this.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .lean()
        .then((banners) => banners.filter((banner) => banner.isTargetedForUser(userData)));
};
HeroBannerSchema.statics.findExpiredBanners = function () {
    const now = new Date();
    return this.find({
        validUntil: { $lt: now },
        isActive: true
    });
};
HeroBannerSchema.statics.findUpcomingBanners = function () {
    const now = new Date();
    return this.find({
        validFrom: { $gt: now },
        isActive: true
    }).sort({ validFrom: 1 });
};
// Pre-save middleware
HeroBannerSchema.pre('save', function (next) {
    // Validate that end date is after start date
    if (this.validUntil <= this.validFrom) {
        next(new Error('Valid until date must be after valid from date'));
        return;
    }
    // Set default text color if not provided
    if (!this.textColor) {
        // Simple logic to determine text color based on background
        const bgColor = this.backgroundColor;
        if (bgColor.startsWith('#')) {
            const hex = bgColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            this.textColor = brightness > 128 ? '#000000' : '#FFFFFF';
        }
        else {
            this.textColor = '#FFFFFF';
        }
    }
    next();
});
// Create and export the model
const HeroBanner = mongoose_1.default.model('HeroBanner', HeroBannerSchema);
exports.default = HeroBanner;
