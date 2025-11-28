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
exports.Article = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Article Schema
const ArticleSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    excerpt: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    coverImage: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    authorType: {
        type: String,
        enum: ['user', 'merchant'],
        required: true,
        default: 'user'
    },
    category: {
        type: String,
        required: true,
        enum: ['fashion', 'beauty', 'lifestyle', 'tech', 'general'],
        index: true
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
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
        likes: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        bookmarks: [{
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
        }
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
        avgReadTime: {
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
    readTime: {
        type: String,
        required: true,
        default: '5 min read'
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
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    moderationReasons: [String],
    publishedAt: {
        type: Date,
        index: true
    },
    scheduledAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
ArticleSchema.index({ author: 1, isPublished: 1, createdAt: -1 });
ArticleSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
ArticleSchema.index({ isFeatured: 1, isPublished: 1 });
ArticleSchema.index({ tags: 1, isPublished: 1 });
ArticleSchema.index({ 'analytics.totalViews': -1, isPublished: 1 });
ArticleSchema.index({ moderationStatus: 1 });
ArticleSchema.index({ publishedAt: -1 });
// Text search index
ArticleSchema.index({
    title: 'text',
    excerpt: 'text',
    content: 'text',
    tags: 'text'
}, {
    weights: {
        title: 10,
        excerpt: 5,
        tags: 3,
        content: 1
    }
});
// Compound indexes
ArticleSchema.index({ category: 1, 'analytics.totalViews': -1, publishedAt: -1 });
ArticleSchema.index({ author: 1, publishedAt: -1 });
// Virtual for like count
ArticleSchema.virtual('likeCount').get(function () {
    return this.engagement.likes.length;
});
// Virtual for bookmark count
ArticleSchema.virtual('bookmarkCount').get(function () {
    return this.engagement.bookmarks.length;
});
// Virtual for engagement score
ArticleSchema.virtual('engagementScore').get(function () {
    const views = this.analytics.totalViews || 1;
    const likes = this.engagement.likes.length;
    const bookmarks = this.engagement.bookmarks.length;
    const comments = this.engagement.comments;
    const shares = this.engagement.shares;
    return ((likes * 3 + bookmarks * 2 + comments * 2 + shares * 5) / views) * 100;
});
// Virtual for view count display
ArticleSchema.virtual('viewCount').get(function () {
    const views = this.analytics.totalViews;
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
});
// Pre-save hooks
ArticleSchema.pre('save', function (next) {
    // Set published date when first published
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    // Calculate read time based on content length
    if (this.isModified('content')) {
        const wordsPerMinute = 200;
        const wordCount = this.content.split(/\s+/).length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        this.readTime = `${minutes} min read`;
    }
    next();
});
// Method to increment views
ArticleSchema.methods.incrementViews = async function (userId) {
    // Update analytics
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    if (!this.analytics.viewsByDate)
        this.analytics.viewsByDate = new Map();
    this.analytics.totalViews += 1;
    this.analytics.viewsByDate.set(date, (this.analytics.viewsByDate.get(date) || 0) + 1);
    if (userId) {
        // Track unique views (simplified - in production, use a separate collection)
        this.analytics.uniqueViews += 1;
    }
    await this.save();
};
// Method to toggle like
ArticleSchema.methods.toggleLike = async function (userId) {
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const isLiked = this.engagement.likes.some((id) => id.equals(userObjectId));
    if (isLiked) {
        this.engagement.likes = this.engagement.likes.filter((id) => !id.equals(userObjectId));
    }
    else {
        this.engagement.likes.push(userObjectId);
    }
    await this.save();
    return !isLiked; // Return new like status
};
// Method to toggle bookmark
ArticleSchema.methods.toggleBookmark = async function (userId) {
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const isBookmarked = this.engagement.bookmarks.some((id) => id.equals(userObjectId));
    if (isBookmarked) {
        this.engagement.bookmarks = this.engagement.bookmarks.filter((id) => !id.equals(userObjectId));
    }
    else {
        this.engagement.bookmarks.push(userObjectId);
    }
    await this.save();
    return !isBookmarked; // Return new bookmark status
};
// Method to increment shares
ArticleSchema.methods.share = async function () {
    this.engagement.shares += 1;
    this.analytics.shareRate = (this.engagement.shares / this.analytics.totalViews) * 100;
    await this.save();
};
// Method to update analytics
ArticleSchema.methods.updateAnalytics = async function () {
    const views = this.analytics.totalViews || 1;
    const likes = this.engagement.likes.length;
    const bookmarks = this.engagement.bookmarks.length;
    const comments = this.engagement.comments;
    const shares = this.engagement.shares;
    this.analytics.engagementRate = ((likes + bookmarks + comments + shares) / views) * 100;
    this.analytics.likeRate = (likes / views) * 100;
    this.analytics.shareRate = (shares / views) * 100;
    await this.save();
};
// Method to check if article is viewable by user
ArticleSchema.methods.isViewableBy = function (userId) {
    if (!this.isPublished || !this.isApproved) {
        // Only author can view unpublished articles
        return this.author.toString() === userId;
    }
    return true;
};
// Static method to get featured articles
ArticleSchema.statics.getFeatured = function (limit = 10) {
    return this.find({
        isFeatured: true,
        isPublished: true,
        isApproved: true
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to get articles by category
ArticleSchema.statics.getByCategory = function (category, limit = 20) {
    return this.find({
        category,
        isPublished: true,
        isApproved: true
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to search articles
ArticleSchema.statics.searchArticles = function (searchText, filters = {}, options = {}) {
    const query = {
        $text: { $search: searchText },
        isPublished: true,
        isApproved: true
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.author) {
        query.author = filters.author;
    }
    if (filters.hasProducts) {
        query.products = { $exists: true, $not: { $size: 0 } };
    }
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
// Static method to get trending articles (most viewed in last 7 days)
ArticleSchema.statics.getTrending = function (limit = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.find({
        isPublished: true,
        isApproved: true,
        publishedAt: { $gte: sevenDaysAgo }
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'analytics.totalViews': -1, 'engagement.likes': -1 })
        .limit(limit);
};
exports.Article = mongoose_1.default.model('Article', ArticleSchema);
