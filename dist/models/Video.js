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
exports.Video = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Video Schema
const VideoSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    creator: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    videoUrl: {
        type: String,
        required: true,
        trim: true
    },
    thumbnail: {
        type: String,
        required: true,
        trim: true
    },
    preview: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'],
        index: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    hashtags: [{
            type: String,
            trim: true,
            match: [/^#[\w\d_]+$/, 'Hashtags must start with # and contain only letters, numbers, and underscores']
        }],
    products: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    stores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store'
        }],
    engagement: {
        views: {
            type: Number,
            default: 0,
            min: 0
        },
        likes: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        shares: {
            type: Number,
            default: 0,
            min: 0
        },
        comments: {
            type: Number,
            default: 0,
            min: 0
        },
        saves: {
            type: Number,
            default: 0,
            min: 0
        },
        reports: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    metadata: {
        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 300 // 5 minutes max
        },
        resolution: {
            type: String,
            enum: ['480p', '720p', '1080p', '4K']
        },
        fileSize: {
            type: Number,
            min: 0
        },
        format: {
            type: String,
            enum: ['mp4', 'mov', 'avi', 'webm'],
            default: 'mp4'
        },
        aspectRatio: {
            type: String,
            enum: ['16:9', '9:16', '4:3', '1:1'],
            default: '9:16'
        },
        fps: {
            type: Number,
            min: 24,
            max: 60,
            default: 30
        }
    },
    processing: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        originalUrl: String,
        processedUrl: String,
        thumbnailUrl: String,
        previewUrl: String,
        errorMessage: String,
        processedAt: Date
    },
    analytics: {
        totalViews: {
            type: Number,
            default: 0,
            min: 0
        },
        uniqueViews: {
            type: Number,
            default: 0,
            min: 0
        },
        avgWatchTime: {
            type: Number,
            default: 0,
            min: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        engagementRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        shareRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        likeRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        viewsByHour: {
            type: Map,
            of: Number,
            default: {}
        },
        viewsByDate: {
            type: Map,
            of: Number,
            default: {}
        },
        topLocations: [String],
        deviceBreakdown: {
            mobile: { type: Number, default: 0 },
            tablet: { type: Number, default: 0 },
            desktop: { type: Number, default: 0 }
        }
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isTrending: {
        type: Boolean,
        default: false,
        index: true
    },
    isSponsored: {
        type: Boolean,
        default: false
    },
    sponsorInfo: {
        brand: String,
        campaignId: String,
        isDisclosed: {
            type: Boolean,
            default: true
        }
    },
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    moderationReasons: [String],
    location: {
        name: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        },
        city: String,
        country: String
    },
    music: {
        title: String,
        artist: String,
        url: String,
        startTime: {
            type: Number,
            min: 0
        },
        duration: {
            type: Number,
            min: 1
        }
    },
    effects: [String],
    privacy: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    allowComments: {
        type: Boolean,
        default: true
    },
    allowSharing: {
        type: Boolean,
        default: true
    },
    ageRestriction: {
        type: Number,
        min: 13,
        max: 21
    },
    publishedAt: {
        type: Date,
        index: true
    },
    scheduledAt: Date,
    expiresAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
VideoSchema.index({ creator: 1, isPublished: 1, createdAt: -1 });
VideoSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
VideoSchema.index({ isFeatured: 1, isPublished: 1 });
VideoSchema.index({ isTrending: 1, isPublished: 1 });
VideoSchema.index({ tags: 1, isPublished: 1 });
VideoSchema.index({ hashtags: 1, isPublished: 1 });
VideoSchema.index({ 'engagement.views': -1, isPublished: 1 });
VideoSchema.index({ 'engagement.likes': -1, isPublished: 1 });
VideoSchema.index({ moderationStatus: 1 });
VideoSchema.index({ publishedAt: -1 });
// Text search index
VideoSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text',
    hashtags: 'text'
}, {
    weights: {
        title: 10,
        tags: 5,
        hashtags: 3,
        description: 1
    }
});
// Compound indexes
VideoSchema.index({ category: 1, 'engagement.views': -1, publishedAt: -1 });
VideoSchema.index({ creator: 1, privacy: 1, publishedAt: -1 });
// Virtual for like count
VideoSchema.virtual('likeCount').get(function () {
    return this.engagement.likes.length;
});
// Virtual for engagement score
VideoSchema.virtual('engagementScore').get(function () {
    const views = this.engagement.views || 1;
    const likes = this.engagement.likes.length;
    const comments = this.engagement.comments;
    const shares = this.engagement.shares;
    return ((likes * 3 + comments * 2 + shares * 5) / views) * 100;
});
// Virtual for trending score
VideoSchema.virtual('trendingScore').get(function () {
    const ageInHours = (Date.now() - (this.publishedAt?.getTime() || this.createdAt.getTime())) / (1000 * 60 * 60);
    if (ageInHours > 72)
        return 0; // Only consider videos from last 72 hours
    const views = this.engagement.views || 0;
    const likes = this.engagement.likes.length;
    const shares = this.engagement.shares;
    // Time decay factor - newer videos get higher score
    const timeFactor = Math.max(0, (72 - ageInHours) / 72);
    return (views + likes * 10 + shares * 20) * timeFactor;
});
// Pre-save hooks
VideoSchema.pre('save', function (next) {
    // Set published date when first published
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    // Update processing status
    if (this.isModified('processing.status') && this.processing.status === 'completed') {
        this.processing.processedAt = new Date();
    }
    next();
});
// Method to increment views
VideoSchema.methods.incrementViews = async function (userId) {
    this.engagement.views += 1;
    // Update analytics
    const now = new Date();
    const hour = now.getHours().toString();
    const date = now.toISOString().split('T')[0];
    if (!this.analytics.viewsByHour)
        this.analytics.viewsByHour = new Map();
    if (!this.analytics.viewsByDate)
        this.analytics.viewsByDate = new Map();
    this.analytics.totalViews += 1;
    this.analytics.viewsByHour.set(hour, (this.analytics.viewsByHour.get(hour) || 0) + 1);
    this.analytics.viewsByDate.set(date, (this.analytics.viewsByDate.get(date) || 0) + 1);
    if (userId) {
        // Track unique views (simplified - in production, use a separate collection)
        this.analytics.uniqueViews += 1;
    }
    await this.save();
};
// Method to toggle like
VideoSchema.methods.toggleLike = async function (userId) {
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const isLiked = this.engagement.likes.includes(userObjectId);
    if (isLiked) {
        this.engagement.likes = this.engagement.likes.filter((id) => !id.equals(userObjectId));
    }
    else {
        this.engagement.likes.push(userObjectId);
    }
    await this.save();
    return !isLiked; // Return new like status
};
// Method to add comment (simplified)
VideoSchema.methods.addComment = async function (userId, content) {
    // In a full implementation, this would create a Comment document
    this.engagement.comments += 1;
    await this.save();
};
// Method to increment shares
VideoSchema.methods.share = async function () {
    this.engagement.shares += 1;
    this.analytics.shareRate = (this.engagement.shares / this.engagement.views) * 100;
    await this.save();
};
// Method to update analytics
VideoSchema.methods.updateAnalytics = async function () {
    const views = this.engagement.views || 1;
    const likes = this.engagement.likes.length;
    const comments = this.engagement.comments;
    const shares = this.engagement.shares;
    this.analytics.engagementRate = ((likes + comments + shares) / views) * 100;
    this.analytics.likeRate = (likes / views) * 100;
    this.analytics.shareRate = (shares / views) * 100;
    await this.save();
};
// Method to check if video is viewable by user
VideoSchema.methods.isViewableBy = function (userId) {
    if (!this.isPublished || !this.isApproved)
        return false;
    if (this.privacy === 'private' && this.creator.toString() !== userId)
        return false;
    if (this.expiresAt && this.expiresAt < new Date())
        return false;
    return true;
};
// Static method to get trending videos
VideoSchema.statics.getTrending = function (category, limit = 20) {
    const query = {
        isPublished: true,
        isApproved: true,
        privacy: 'public',
        publishedAt: { $gte: new Date(Date.now() - 72 * 60 * 60 * 1000) } // Last 72 hours
    };
    if (category && category !== 'all') {
        query.category = category;
    }
    return this.find(query)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
        .limit(limit);
};
// Static method to get featured videos
VideoSchema.statics.getFeatured = function (limit = 10) {
    return this.find({
        isFeatured: true,
        isPublished: true,
        isApproved: true,
        privacy: 'public'
    })
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to search videos
VideoSchema.statics.searchVideos = function (searchText, filters = {}, options = {}) {
    const query = {
        $text: { $search: searchText },
        isPublished: true,
        isApproved: true,
        privacy: 'public'
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.creator) {
        query.creator = filters.creator;
    }
    if (filters.hasProducts) {
        query.products = { $exists: true, $not: { $size: 0 } };
    }
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
exports.Video = mongoose_1.default.model('Video', VideoSchema);
